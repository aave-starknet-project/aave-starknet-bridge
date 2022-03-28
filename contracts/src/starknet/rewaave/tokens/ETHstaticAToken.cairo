%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
<<<<<<< HEAD
from starkware.cairo.common.uint256 import Uint256, uint256_le
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.math_cmp import is_le

from openzeppelin.token.erc20.library import (
    ERC20_name, ERC20_symbol, ERC20_totalSupply, ERC20_decimals, ERC20_balanceOf, ERC20_allowance,
    ERC20_initializer, ERC20_approve, ERC20_increaseAllowance, ERC20_decreaseAllowance,
    ERC20_transfer, ERC20_transferFrom, ERC20_mint)

from openzeppelin.access.ownable import Ownable_initializer, Ownable_only_owner, Ownable_get_owner

from openzeppelin.utils.constants import TRUE

from rewaave.tokens.claimable import (
    claimable_claim_rewards, claimable_push_acc_rewards_per_token, claimable_before_token_transfer,
    claimable_get_acc_rewards_per_token)

@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        name : felt, symbol : felt, decimals : felt, initial_supply : Uint256, recipient : felt,
        controller : felt):
    ERC20_initializer(name, symbol, decimals)
    ERC20_mint(recipient, initial_supply)
    Ownable_initializer(controller)
    # TODO we either need to configure the last_update here, or pause the contract
    # until the first update somehow.
    # Actually we can just rely on the first bridger to give us the right rewards!
    return ()
end

@storage_var
func last_update() -> (block_number : felt):
end

=======
from starkware.cairo.common.uint256 import Uint256
from starkware.starknet.common.syscalls import get_caller_address

from openzeppelin.token.erc20.library import (
    ERC20_name, ERC20_symbol, ERC20_totalSupply, ERC20_decimals, ERC20_balanceOf, ERC20_allowance,
    ERC20_initializer, ERC20_approve, ERC20_increaseAllowance, ERC20_decreaseAllowance,
    ERC20_transfer, ERC20_transferFrom, ERC20_mint)

from openzeppelin.access.ownable import Ownable_initializer, Ownable_only_owner, Ownable_get_owner

from openzeppelin.utils.constants import TRUE

from rewaave.tokens.erc20.claimable.library import (
    ERC20_claimable_claimRewards, ERC20_claimable_increaseLifetimeRewards,
    ERC20_claimable_beforeTokenTransfer)

@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        name : felt, symbol : felt, decimals : felt, initial_supply : Uint256, recipient : felt,
        owner : felt, controller : felt):
    ERC20_initializer(name, symbol, decimals)
    ERC20_mint(recipient, initial_supply)
    Ownable_initializer(owner)
    return ()
end

>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
#
# Getters
#

@view
<<<<<<< HEAD
<<<<<<< HEAD
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
=======
func name{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (name: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
>>>>>>> e1ebfe9... Formatting
    let (name) = ERC20_name()
    return (name)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
=======
func symbol{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (symbol: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
>>>>>>> e1ebfe9... Formatting
    let (symbol) = ERC20_symbol()
    return (symbol)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        totalSupply : Uint256):
    let (totalSupply : Uint256) = ERC20_totalSupply()
=======
func totalSupply{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (totalSupply: Uint256):
    let (totalSupply: Uint256) = ERC20_totalSupply()
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        totalSupply : Uint256):
    let (totalSupply : Uint256) = ERC20_totalSupply()
>>>>>>> e1ebfe9... Formatting
    return (totalSupply)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        decimals : felt):
=======
func decimals{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (decimals: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        decimals : felt):
>>>>>>> e1ebfe9... Formatting
    let (decimals) = ERC20_decimals()
    return (decimals)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt) -> (balance : Uint256):
    let (balance : Uint256) = ERC20_balanceOf(account)
=======
func balanceOf{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(account: felt) -> (balance: Uint256):
    let (balance: Uint256) = ERC20_balanceOf(account)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt) -> (balance : Uint256):
    let (balance : Uint256) = ERC20_balanceOf(account)
>>>>>>> e1ebfe9... Formatting
    return (balance)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, spender : felt) -> (remaining : Uint256):
    let (remaining : Uint256) = ERC20_allowance(owner, spender)
=======
func allowance{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(owner: felt, spender: felt) -> (remaining: Uint256):
    let (remaining: Uint256) = ERC20_allowance(owner, spender)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, spender : felt) -> (remaining : Uint256):
    let (remaining : Uint256) = ERC20_allowance(owner, spender)
>>>>>>> e1ebfe9... Formatting
    return (remaining)
end

#
# Externals
#

@external
<<<<<<< HEAD
<<<<<<< HEAD
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256) -> (success : felt):
    let (from_) = get_caller_address()
    claimable_before_token_transfer(from_, recipient)
=======
func transfer{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(recipient: felt, amount: Uint256) -> (success: felt):
=======
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
    let (from_) = get_caller_address()
    ERC20_claimable_beforeTokenTransfer(from_, recipient)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
    ERC20_transfer(recipient, amount)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
    claimable_before_token_transfer(sender, recipient)
=======
func transferFrom{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(
        sender: felt, 
        recipient: felt, 
        amount: Uint256
    ) -> (success: felt):
=======
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
    ERC20_claimable_beforeTokenTransfer(sender, recipient)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
    ERC20_transferFrom(sender, recipient, amount)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, amount : Uint256) -> (success : felt):
=======
func approve{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(spender: felt, amount: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, amount : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
    ERC20_approve(spender, amount)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, added_value : Uint256) -> (success : felt):
=======
func increaseAllowance{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(spender: felt, added_value: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, added_value : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
    ERC20_increaseAllowance(spender, added_value)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, subtracted_value : Uint256) -> (success : felt):
=======
func decreaseAllowance{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(spender: felt, subtracted_value: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, subtracted_value : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
    ERC20_decreaseAllowance(spender, subtracted_value)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256):
    Ownable_only_owner()
    claimable_before_token_transfer(0, recipient)
=======
func mint{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(recipient: felt, amount: Uint256):
=======
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256):
>>>>>>> e1ebfe9... Formatting
    Ownable_only_owner()
    ERC20_claimable_beforeTokenTransfer(0, recipient)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
    ERC20_mint(recipient, amount)
    return ()
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
func claim_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        user : felt, recipient : felt) -> (claimed : Uint256):
    Ownable_only_owner()
    return claimable_claim_rewards(user, recipient)
end

@external
func push_acc_rewards_per_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        block : felt, acc_rewards_per_token : Uint256):
    alloc_locals
    Ownable_only_owner()
    let (last_block) = last_update.read()
    let (le) = is_le(last_block, block - 1)
    if le == 1:
        let (prev_acc) = claimable_get_acc_rewards_per_token()
        let (le) = uint256_le(prev_acc, acc_rewards_per_token)
        if le == 1:
            last_update.write(block)
            claimable_push_acc_rewards_per_token(acc_rewards_per_token)
            return ()
        else:
            return ()
        end
    else:
        return ()
    end
end

@external
func get_acc_rewards_per_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        ) -> (acc_rewards_per_token : Uint256):
    return claimable_get_acc_rewards_per_token()
end
=======
func claimRewards{
    syscall_ptr : felt*, 
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
}(user: felt, recipient: felt) -> (claimed: Uint256):
  Ownable_only_owner()
  return ERC20_claimable_claimRewards(user, recipient)
=======
func claimRewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        user : felt, recipient : felt) -> (claimed : Uint256):
    Ownable_only_owner()
    return ERC20_claimable_claimRewards(user, recipient)
>>>>>>> e1ebfe9... Formatting
end

@external
func pushAccRewardsPerToken{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        amount : Uint256):
    Ownable_only_owner()
    ERC20_claimable_pushAccRewardsPerToken(amount)
    return ()
end
<<<<<<< HEAD

>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
>>>>>>> e1ebfe9... Formatting
