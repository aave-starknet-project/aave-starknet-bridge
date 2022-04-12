%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256, uint256_le
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.math_cmp import is_le

from openzeppelin.token.erc20.library import (
    ERC20_name, ERC20_symbol, ERC20_totalSupply, ERC20_decimals, ERC20_balanceOf, ERC20_allowance,
    ERC20_initializer, ERC20_approve, ERC20_increaseAllowance, ERC20_decreaseAllowance,
    ERC20_transfer, ERC20_transferFrom, ERC20_mint, ERC20_burn)

from openzeppelin.access.ownable import Ownable_initializer, Ownable_only_owner, Ownable_get_owner

from openzeppelin.utils.constants import TRUE

from rewaave.tokens.claimable import (
    claimable_claim_rewards, claimable_push_acc_rewards_per_token, claimable_before_token_transfer,
    claimable_get_acc_rewards_per_token, claimable_get_user_acc_rewards_per_token,
    get_pending_rewards)

@contract_interface
namespace ITokenBridge:
    func mint_rewards(recipient : felt, amount : Uint256):
    end
end

@storage_var
func l2_token_bridge() -> (address : felt):
end

@external
func set_l2_token_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        l2_token_bridge_ : felt):
    l2_token_bridge.write(l2_token_bridge_)
    return ()
end

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

#
# Getters
#

@view
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
    let (name) = ERC20_name()
    return (name)
end

@view
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
    let (symbol) = ERC20_symbol()
    return (symbol)
end

@view
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        totalSupply : Uint256):
    let (totalSupply : Uint256) = ERC20_totalSupply()
    return (totalSupply)
end

@view
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        decimals : felt):
    let (decimals) = ERC20_decimals()
    return (decimals)
end

@view
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt) -> (balance : Uint256):
    let (balance : Uint256) = ERC20_balanceOf(account)
    return (balance)
end

@view
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, spender : felt) -> (remaining : Uint256):
    let (remaining : Uint256) = ERC20_allowance(owner, spender)
    return (remaining)
end

#
# Externals
#

@external
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256) -> (success : felt):
    let (from_) = get_caller_address()
    claimable_before_token_transfer(from_, recipient)
    ERC20_transfer(recipient, amount)
    return (TRUE)
end

@external
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
    claimable_before_token_transfer(sender, recipient)
    ERC20_transferFrom(sender, recipient, amount)
    return (TRUE)
end

@external
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, amount : Uint256) -> (success : felt):
    ERC20_approve(spender, amount)
    return (TRUE)
end

@external
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, added_value : Uint256) -> (success : felt):
    ERC20_increaseAllowance(spender, added_value)
    return (TRUE)
end

@external
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, subtracted_value : Uint256) -> (success : felt):
    ERC20_decreaseAllowance(spender, subtracted_value)
    return (TRUE)
end

@external
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256):
    Ownable_only_owner()
    claimable_before_token_transfer(0, recipient)
    ERC20_mint(recipient, amount)
    return ()
end

@external
func burn{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt, amount : Uint256):
    Ownable_only_owner()
    claimable_before_token_transfer(account, 0)
    ERC20_burn(account=account, amount=amount)
    return ()
end

@external
func claim_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt):
    alloc_locals
    let (caller) = get_caller_address()
    let (rewards) = claimable_claim_rewards(caller)
    let (l2_token_bridge_) = l2_token_bridge.read()
    ITokenBridge.mint_rewards(l2_token_bridge_, recipient, rewards)
    return ()
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

@external
func get_user_acc_rewards_per_token{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(user : felt) -> (
        user_acc_rewards_per_token : Uint256):
    return claimable_get_user_acc_rewards_per_token(user)
end

@external
func get_user_pending_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        user : felt) -> (user_pending_rewards : Uint256):
    return get_pending_rewards(user)
end
