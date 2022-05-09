%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256, uint256_add, uint256_sub, uint256_le
from rewaave.math.wad_ray_math import (
    Wad,
    Ray,
    wad_to_ray,
    ray_add,
    ray_sub,
    ray_mul_no_rounding,
    ray_to_wad_no_rounding,
)
from starkware.starknet.common.syscalls import get_caller_address
from openzeppelin.token.erc20.library import ERC20_balanceOf

@storage_var
func l2_token_bridge() -> (address : felt):
end

@storage_var
func last_update() -> (block_number : Uint256):
end

@storage_var
func acc_rewards_per_token() -> (res : Ray):
end

# user => accRewardsPerToken at last interaction (in RAYs)
@storage_var
func user_snapshot_rewards_per_token(user : felt) -> (acc_rewards_per_token : Ray):
end

# user => unclaimed_rewards (in RAYs)
@storage_var
func unclaimed_rewards(user : felt) -> (unclaimed : Ray):
end

func update_user_snapshot_rewards_per_token{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr
}(user : felt):
    let (acc_rewards_per_token_) = acc_rewards_per_token.read()
    user_snapshot_rewards_per_token.write(user, acc_rewards_per_token_)
    return ()
end

func update_user{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(user : felt):
    alloc_locals
    let (balance) = ERC20_balanceOf(user)
    if balance.high + balance.low == 0:
        update_user_snapshot_rewards_per_token(user)
    else:
        let (pending) = get_pending_rewards(user)
        let (unclaimed) = claimable_get_user_unclaimed_rewards(user)
        let (unclaimed, overflow) = ray_add(unclaimed, pending)
        assert overflow = 0
        unclaimed_rewards.write(user, unclaimed)
        update_user_snapshot_rewards_per_token(user)
    end
    return ()
end

func claimable_before_token_transfer{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr
}(from_ : felt, to : felt):
    alloc_locals
    if from_ == 0:
        # do nothing
        tempvar syscall_ptr = syscall_ptr
        tempvar pedersen_ptr = pedersen_ptr
        tempvar range_check_ptr = range_check_ptr
    else:
        update_user(from_)
        tempvar syscall_ptr = syscall_ptr
        tempvar pedersen_ptr = pedersen_ptr
        tempvar range_check_ptr = range_check_ptr
    end
    if to == 0:
        # do nothing
    else:
        update_user(to)
    end
    return ()
end

func get_pending_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user : felt
) -> (pending_rewards : Ray):
    alloc_locals
    let (balance) = ERC20_balanceOf(user)
    let (balance_in_ray) = wad_to_ray(Wad(balance))
    let (accRewardsPerToken_) = acc_rewards_per_token.read()
    let (user_snapshot_rewards_per_token_) = user_snapshot_rewards_per_token.read(user)
    let (accrued_since_last_interaction) = ray_sub(
        accRewardsPerToken_, user_snapshot_rewards_per_token_
    )
    let (pending_rewards) = ray_mul_no_rounding(accrued_since_last_interaction, balance_in_ray)

    return (pending_rewards)
end

func get_claimable_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user : felt
) -> (claimable_rewards : Wad):
    alloc_locals
    let (unclaimed_rewards_) = unclaimed_rewards.read(user)
    let (pending) = get_pending_rewards(user)
    let (claimable_rewards, overflow) = ray_add(unclaimed_rewards_, pending)
    assert overflow = 0
    let (claimable_rewards_) = ray_to_wad_no_rounding(claimable_rewards)
    return (claimable_rewards_)
end

func claimable_claim_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user : felt
) -> (rewards : Wad):
    alloc_locals
    let (rewards) = get_claimable_rewards(user)

    unclaimed_rewards.write(user, Ray(Uint256(0, 0)))

    if rewards.wad.high + rewards.wad.low == 0:
        return (Wad(Uint256(0, 0)))
    else:
        update_user_snapshot_rewards_per_token(user)
        return (rewards)
    end
end

func claimable_push_acc_rewards_per_token{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr
}(block_number : Uint256, acc_rewards_per_token_ : Ray):
    alloc_locals
    claimable_only_token_bridge()
    let (last_block_number) = last_update.read()
    let (block_number_1) = uint256_sub(block_number, Uint256(1, 0))
    let (le) = uint256_le(last_block_number, block_number_1)
    if le == 1:
        let (prev_acc) = acc_rewards_per_token.read()
        let (le) = uint256_le(prev_acc.ray, acc_rewards_per_token_.ray)
        if le == 1:
            last_update.write(block_number)
            acc_rewards_per_token.write(acc_rewards_per_token_)
            return ()
        else:
            return ()
        end
    else:
        return ()
    end
end

func claimable_get_acc_rewards_per_token{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr
}() -> (res : Ray):
    return acc_rewards_per_token.read()
end

func claimable_get_user_acc_rewards_per_token{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr
}(user : felt) -> (res : Ray):
    return user_snapshot_rewards_per_token.read(user)
end

func claimable_get_user_unclaimed_rewards{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr
}(user : felt) -> (res : Ray):
    return unclaimed_rewards.read(user)
end

func claimable_get_last_update{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    ) -> (block_number : Uint256):
    return last_update.read()
end

func claimable_set_l2_token_bridge{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr
}(l2_token_bridge_ : felt):
    l2_token_bridge.write(l2_token_bridge_)
    return ()
end

func claimable_get_l2_token_bridge{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr
}() -> (l2_token_bridge_ : felt):
    return l2_token_bridge.read()
end

func claimable_only_token_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    ):
    let (caller_address) = get_caller_address()
    let (l2_token_bridge_) = l2_token_bridge.read()
    with_attr error_message("Caller address should be token_bridge: {l2_token_bridge_}"):
        assert caller_address = l2_token_bridge_
    end
    return ()
end
