%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.uint256 import Uint256
from starkware.cairo.common.bool import TRUE

from openzeppelin.token.erc20.library import (
    ERC20_name,
    ERC20_symbol,
    ERC20_totalSupply,
    ERC20_decimals,
    ERC20_balanceOf,
    ERC20_allowance,
    ERC20_initializer,
    ERC20_approve,
    ERC20_increaseAllowance,
    ERC20_decreaseAllowance,
    ERC20_transfer,
    ERC20_transferFrom,
    ERC20_mint,
    ERC20_burn,
)

from openzeppelin.access.ownable import Ownable_initializer, Ownable_only_owner

from rewaave.tokens.claimable import (
    claimable_claim_rewards,
    claimable_push_rewards_index,
    claimable_before_token_transfer,
    claimable_get_rewards_index,
    claimable_get_user_rewards_index,
    claimable_get_last_update,
    claimable_set_l2_bridge,
    claimable_get_l2_bridge,
    claimable_only_bridge,
    claimable_get_claimable_rewards,
)
from rewaave.lib.wad_ray_math import Ray

@contract_interface
namespace IBridge:
    func mint_rewards(recipient : felt, amount : Uint256):
    end
end

@external
func set_l2_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l2_bridge : felt
):
    Ownable_only_owner()
    claimable_set_l2_bridge(l2_bridge)
    return ()
end

#
# Getters
#

@view
func get_last_update{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    block_number : Uint256
):
    return claimable_get_last_update()
end

@view
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
    return ERC20_name()
end

@view
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
    return ERC20_symbol()
end

@view
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    totalSupply : Uint256
):
    return ERC20_totalSupply()
end

@view
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    decimals : felt
):
    return ERC20_decimals()
end

@view
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    account : felt
) -> (balance : Uint256):
    return ERC20_balanceOf(account)
end

@view
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    owner : felt, spender : felt
) -> (remaining : Uint256):
    return ERC20_allowance(owner, spender)
end

#
# Externals
#

@external
func initialize_static_a_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    name : felt,
    symbol : felt,
    decimals : felt,
    initial_supply : Uint256,
    recipient : felt,
    owner : felt,
    l2_bridge : felt,
):
    let (name_) = ERC20_name()
    let (symbol_) = ERC20_symbol()
    let (decimals_) = ERC20_decimals()

    with_attr error_message("static_a_token already initialized"):
        assert name_ = 0
        assert symbol_ = 0
        assert decimals_ = 0
    end

    ERC20_initializer(name, symbol, decimals)
    ERC20_mint(recipient, initial_supply)
    Ownable_initializer(owner)
    claimable_set_l2_bridge(l2_bridge)
    return ()
end

@external
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt, amount : Uint256
) -> (success : felt):
    let (from_) = get_caller_address()
    claimable_before_token_transfer(from_, recipient)
    ERC20_transfer(recipient, amount)
    return (TRUE)
end

@external
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    sender : felt, recipient : felt, amount : Uint256
) -> (success : felt):
    claimable_before_token_transfer(sender, recipient)
    ERC20_transferFrom(sender, recipient, amount)
    return (TRUE)
end

@external
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    spender : felt, amount : Uint256
) -> (success : felt):
    ERC20_approve(spender, amount)
    return (TRUE)
end

@external
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    spender : felt, added_value : Uint256
) -> (success : felt):
    ERC20_increaseAllowance(spender, added_value)
    return (TRUE)
end

@external
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    spender : felt, subtracted_value : Uint256
) -> (success : felt):
    ERC20_decreaseAllowance(spender, subtracted_value)
    return (TRUE)
end

@external
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt, amount : Uint256
):
    claimable_only_bridge()
    claimable_before_token_transfer(0, recipient)
    ERC20_mint(recipient, amount)
    return ()
end

@external
func burn{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    account : felt, amount : Uint256
):
    claimable_only_bridge()
    claimable_before_token_transfer(account, 0)
    ERC20_burn(account=account, amount=amount)
    return ()
end

@external
func claim_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt
):
    alloc_locals
    let (caller) = get_caller_address()
    let (rewards) = claimable_claim_rewards(caller)
    let (l2_bridge) = claimable_get_l2_bridge()
    IBridge.mint_rewards(l2_bridge, recipient, rewards.wad)
    return ()
end

@external
func push_rewards_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    block_number : Uint256, rewards_index : Ray
):
    claimable_push_rewards_index(block_number, rewards_index)
    return ()
end

@external
func get_rewards_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    rewards_index : Ray
):
    let (res) = claimable_get_rewards_index()
    return (res)
end

@external
func get_user_rewards_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user : felt
) -> (user_rewards_index : Uint256):
    let (res) = claimable_get_user_rewards_index(user)
    return (res.ray)
end

@view
func get_user_claimable_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user : felt
) -> (user_claimable_rewards : Uint256):
    alloc_locals
    let (res) = claimable_get_claimable_rewards(user)
    return (res.wad)
end
