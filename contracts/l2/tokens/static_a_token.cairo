%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.uint256 import Uint256
from starkware.cairo.common.bool import TRUE
from starkware.cairo.common.math import assert_not_zero

from contracts.l2.dependencies.openzeppelin.token.erc20.library import ERC20

from contracts.l2.dependencies.openzeppelin.access.ownable import Ownable

from contracts.l2.tokens.incentivized_erc20 import (
    incentivized_erc20_claim_rewards,
    incentivized_erc20_push_rewards_index,
    incentivized_erc20_before_token_transfer,
    incentivized_erc20_get_rewards_index,
    incentivized_erc20_get_user_rewards_index,
    incentivized_erc20_get_last_update,
    incentivized_erc20_set_l2_bridge,
    incentivized_erc20_get_l2_bridge,
    incentivized_erc20_only_bridge,
    incentivized_erc20_get_claimable_rewards,
)
from contracts.l2.lib.wad_ray_math import Wad
from contracts.l2.lib.version_initializable import VersionedInitializable

@contract_interface
namespace IBridge:
    func mint_rewards(recipient : felt, amount : Uint256):
    end
end

@external
func set_l2_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l2_bridge : felt
):
    alloc_locals
    Ownable.assert_only_owner()
    incentivized_erc20_set_l2_bridge(l2_bridge)
    l2_bridge_updated.emit(l2_bridge)
    return ()
end

# version

const REVISION = 1

# events

@event
func rewards_index_updated(block_number : Uint256, rewards_index : Wad):
end

@event
func l2_bridge_updated(l2_bridge : felt):
end

@event
func static_a_token_initialized(
    name : felt,
    symbol : felt,
    decimals : felt,
    initial_supply : Uint256,
    recipient : felt,
    owner : felt,
    l2_bridge : felt,
):
end

#
# Getters
#

@view
func get_last_update{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    block_number : Uint256
):
    return incentivized_erc20_get_last_update()
end

@view
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
    return ERC20.name()
end

@view
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
    return ERC20.symbol()
end

@view
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    totalSupply : Uint256
):
    return ERC20.total_supply()
end

@view
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    decimals : felt
):
    return ERC20.decimals()
end

@view
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    account : felt
) -> (balance : Uint256):
    return ERC20.balance_of(account)
end

@view
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    owner : felt, spender : felt
) -> (remaining : Uint256):
    return ERC20.allowance(owner, spender)
end

@view
func get_rewards_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    rewards_index : Wad
):
    let (res) = incentivized_erc20_get_rewards_index()
    return (res)
end

@view
func get_user_rewards_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user : felt
) -> (user_rewards_index : Uint256):
    let (res) = incentivized_erc20_get_user_rewards_index(user)
    return (res.wad)
end

@view
func get_user_claimable_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user : felt
) -> (user_claimable_rewards : Uint256):
    alloc_locals
    let (res) = incentivized_erc20_get_claimable_rewards(user)
    return (res.wad)
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
    VersionedInitializable.initializer(REVISION)

    # check inputs
    with_attr error_message("static_a_token: name should be non zero"):
        assert_not_zero(name)
    end
    with_attr error_message("static_a_token: symbol should be non zero"):
        assert_not_zero(symbol)
    end
    with_attr error_message("static_a_token: decimals should be non zero"):
        assert_not_zero(decimals)
    end
    with_attr error_message("static_a_token: owner address should be non zero"):
        assert_not_zero(owner)
    end

    ERC20.initializer(name, symbol, decimals)
    ERC20._mint(recipient, initial_supply)
    Ownable.initializer(owner)
    incentivized_erc20_set_l2_bridge(l2_bridge)
    static_a_token_initialized.emit(
        name, symbol, decimals, initial_supply, recipient, owner, l2_bridge
    )
    return ()
end

@external
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt, amount : Uint256
) -> (success : felt):
    let (from_) = get_caller_address()
    incentivized_erc20_before_token_transfer(from_, recipient)
    ERC20.transfer(recipient, amount)
    return (TRUE)
end

@external
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    sender : felt, recipient : felt, amount : Uint256
) -> (success : felt):
    incentivized_erc20_before_token_transfer(sender, recipient)
    ERC20.transfer_from(sender, recipient, amount)
    return (TRUE)
end

@external
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    spender : felt, amount : Uint256
) -> (success : felt):
    ERC20.approve(spender, amount)
    return (TRUE)
end

@external
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    spender : felt, added_value : Uint256
) -> (success : felt):
    ERC20.increase_allowance(spender, added_value)
    return (TRUE)
end

@external
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    spender : felt, subtracted_value : Uint256
) -> (success : felt):
    ERC20.decrease_allowance(spender, subtracted_value)
    return (TRUE)
end

@external
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt, amount : Uint256
):
    incentivized_erc20_only_bridge()
    incentivized_erc20_before_token_transfer(0, recipient)
    ERC20._mint(recipient, amount)
    return ()
end

@external
func burn{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    account : felt, amount : Uint256
):
    incentivized_erc20_only_bridge()
    incentivized_erc20_before_token_transfer(account, 0)
    ERC20._burn(account=account, amount=amount)
    return ()
end

@external
func claim_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt
):
    alloc_locals
    let (caller) = get_caller_address()
    let (rewards) = incentivized_erc20_claim_rewards(caller)
    let (l2_bridge) = incentivized_erc20_get_l2_bridge()
    IBridge.mint_rewards(l2_bridge, recipient, rewards.wad)
    return ()
end

@external
func push_rewards_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    block_number : Uint256, rewards_index : Wad
):
    incentivized_erc20_push_rewards_index(block_number, rewards_index)
    rewards_index_updated.emit(block_number, rewards_index)
    return ()
end
