%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import (
  Uint256,
  uint256_add,
  uint256_sub,
  uint256_mul,
  uint256_unsigned_div_rem
)
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.math_cmp import is_le

from rewaave.math.wad_ray_math import (
    wadToRay,
    rayMulNoRounding,
    rayToWadNoRounding
)
from openzeppelin.token.erc20.library import (
    ERC20_totalSupply,
    ERC20_balanceOf,
    ERC20_mint
)
from openzeppelin.access.ownable import (
    Ownable_initializer,
    Ownable_only_owner,
    Ownable_get_owner
)

@storage_var
func accRewardsPerToken() -> (res: Uint256):
end
@storage_var
func lifetimeRewardsClaimed() -> (res: Uint256):
end
@storage_var
func lifetimeRewards() -> (res: Uint256):
end

# user => accRewardsPerToken at last interaction (in RAYs)
@storage_var
func userSnapshotRewardsPerToken(user: felt) -> (accRewardsPerToken: Uint256):
end
# user => unclaimedRewards (in RAYs)
@storage_var
func unclaimedRewards(user: felt) -> (unclaimed: Uint256):
end


func updateUserSnapshotRewardsPerToken{
  syscall_ptr : felt*,
  pedersen_ptr : HashBuiltin*,
  range_check_ptr
}(user: felt):
  let (accRewardsPerToken_) = accRewardsPerToken.read()
  userSnapshotRewardsPerToken.write(user, accRewardsPerToken_)
  return ()
end

func updateUser{
    syscall_ptr : felt*,
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
}(user: felt):
  alloc_locals
  let (balance) = ERC20_balanceOf(user)
  if balance.high + balance.low == 0:
    updateUserSnapshotRewardsPerToken(user)
  else:
    let (pending) = getPendingRewards(user)
    let (unclaimed) = unclaimedRewards.read(user)
    let (unclaimed, overflow) = uint256_add(unclaimed, pending)
    assert overflow = 0
    unclaimedRewards.write(user, unclaimed)
    updateUserSnapshotRewardsPerToken(user)
  end
  return ()
end

func ERC20_claimable_beforeTokenTransfer{
    syscall_ptr : felt*, 
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
}(from_ : felt, to: felt):
  alloc_locals
  if from_ == 0:
    # do nothing
    tempvar syscall_ptr = syscall_ptr
    tempvar pedersen_ptr = pedersen_ptr
    tempvar range_check_ptr = range_check_ptr
  else:
    updateUser(from_)
    tempvar syscall_ptr = syscall_ptr
    tempvar pedersen_ptr = pedersen_ptr
    tempvar range_check_ptr = range_check_ptr
  end
  if to == 0:
    # do nothing
  else:
    updateUser(to)
  end
  return ()
end

func getPendingRewards{
    syscall_ptr : felt*, 
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
}(user: felt) -> (pendingRewards: Uint256):
  alloc_locals
  let (balance) = ERC20_balanceOf(user)
  let (supply) = ERC20_totalSupply()
  let (accRewardsPerToken_) = accRewardsPerToken.read()
  let (userSnapshotRewardsPerToken_) = userSnapshotRewardsPerToken.read(user)
  let (accruedRewardPerTokenSinceLastInteraction) = uint256_sub(accRewardsPerToken_,  userSnapshotRewardsPerToken_)
  let (pendingRewards) = rayMulNoRounding(accruedRewardPerTokenSinceLastInteraction, balance)
  return (pendingRewards)
end

func getClaimableRewards{
    syscall_ptr : felt*, 
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
}(user: felt) -> (claimableRewards: Uint256):
  alloc_locals
  let (unclaimedRewards_) = unclaimedRewards.read(user)
  let (pending) = getPendingRewards(user)
  let (claimableRewards, overflow) = uint256_add(unclaimedRewards_, pending)
  assert overflow = 0
  let (claimableRewards) = rayToWadNoRounding(claimableRewards)
  return (claimableRewards)
end

func ERC20_claimable_claimRewards{
    syscall_ptr : felt*, 
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
}(user: felt, recipient: felt) -> (claimed: Uint256):
  let (claimed) = getClaimableRewards(user)
  let (rewardsController_) = Ownable_get_owner()

  unclaimedRewards.write(user, 0)

  if claimed.high + claimed.low == 0:
    return (0)
  else:
      updateUserSnapshotRewardsPerToken(user)
      return (claimed)
  end
end

func ERC20_claimable_increaseLifetimeRewards{
    syscall_ptr : felt*, 
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
}(amount: Uint256):
    alloc_locals
    let (lifetimeRewards_) = lifetimeRewards.read()
    let (lifetimeRewards_, overflow) = uint256_add(lifetimeRewards_, amount)
    assert overflow = 0
    lifetimeRewards.write(lifetimeRewards_)
    let (supply) = ERC20_totalSupply()
    let (accRewardsPerToken_, rem) = uint256_unsigned_div_rem(lifetimeRewards_, supply)
    assert rem.high = 0
    assert rem.low = 0
    accRewardsPerToken.write(accRewardsPerToken_)
    return ()
end
