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

# @notice Sets the address of L2 bridge
# @param l2_bridge Address of the L2 bridge
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

# @notice Returns the last L1 block number for which token's state has been updated.
# @return The last block number the state has been updated.
@view
func get_last_update{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    block_number : Uint256
):
    return incentivized_erc20_get_last_update()
end

# @notice Returns the token name.
# @return The token name.
@view
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
    return ERC20.name()
end

# @notice Returns the token symbol.
# @return The token symbol.
@view
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
    return ERC20.symbol()
end

# @notice Returns the total supply of the token.
# @return The total supply.
@view
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    totalSupply : Uint256
):
    let (totalSupply) = ERC20.total_supply()
    return (totalSupply)
end

# @notice Returns the number of decimals the token uses.
# @return The number of decimals.
@view
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    decimals : felt
):
    return ERC20.decimals()
end

# @notice Returns the balance of static aTokens for a given user
# @param account Address we want to know the balance
# @return Balance of tokens
@view
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    account : felt
) -> (balance : Uint256):
    return ERC20.balance_of(account)
end

# @notice Returns the amount which spender is allowed to withdraw from owner.
# @param owner Address of a token owner
# @param spender Address of a user
# @return Amount of tokens
@view
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    owner : felt, spender : felt
) -> (remaining : Uint256):
    return ERC20.allowance(owner, spender)
end

# @notice Returns last updated rewards index
# @return Rewards index in Wad
@view
func get_rewards_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    rewards_index : Wad
):
    let (res) = incentivized_erc20_get_rewards_index()
    return (res)
end

# @notice Returns last updated rewards index when a user interacted with the token
# @param user Address of the user
# @return Rewards index in Uint256
@view
func get_user_rewards_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    user : felt
) -> (user_rewards_index : Uint256):
    let (res) = incentivized_erc20_get_user_rewards_index(user)
    return (res.wad)
end

# @notice Returns amount of reward tokens a user can claim
# @param user Address of the user
# @return Amount of rewards tokens the user can claim
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

# @notice Returns amount of reward tokens a user can claim
# @param user Address of the user
# @return Amount of rewards tokens the user can claim
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

# @notice Transfers a given amount of tokens to a recipient.
# @param recipient Address of the recipient
# @param amount Amount of tokens to send
# @return Boolean TRUE
@external
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt, amount : Uint256
) -> (success : felt):
    let (from_) = get_caller_address()
    incentivized_erc20_before_token_transfer(from_, recipient)
    ERC20.transfer(recipient, amount)
    return (TRUE)
end

# @notice Transfers a given amount of tokens from a sender to a recipient.
# @param sender Address of the sender
# @param recipient Address of the recipient
# @param amount Amount of tokens to send
# @return Boolean TRUE
@external
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    sender : felt, recipient : felt, amount : Uint256
) -> (success : felt):
    incentivized_erc20_before_token_transfer(sender, recipient)
    ERC20.transfer_from(sender, recipient, amount)
    return (TRUE)
end

# @notice Allows spender to withdraw from your account multiple times, up to a given amount.
# @param spender Address of the spender
# @param amount Amount of tokens to send
# @return Boolean TRUE
@external
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    spender : felt, amount : Uint256
) -> (success : felt):
    ERC20.approve(spender, amount)
    return (TRUE)
end

# @notice Increases the amount of tokens a spender can withdraw from your account.
# @param spender Address of the spender
# @param added_value Amount of tokens to add
# @return Boolean TRUE
@external
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    spender : felt, added_value : Uint256
) -> (success : felt):
    ERC20.increase_allowance(spender, added_value)
    return (TRUE)
end

# @notice Decreases the amount of tokens a spender can withdraw from your account.
# @param spender Address of the spender
# @param subtracted_value Amount of tokens to substract
# @return Boolean TRUE
@external
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    spender : felt, subtracted_value : Uint256
) -> (success : felt):
    ERC20.decrease_allowance(spender, subtracted_value)
    return (TRUE)
end

# @notice Increases the token balance of a recipient by a given amount.
# @param recipient Address of the recipient
# @param amount Amount of tokens to add
@external
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt, amount : Uint256
):
    incentivized_erc20_only_bridge()
    incentivized_erc20_before_token_transfer(0, recipient)
    ERC20._mint(recipient, amount)
    return ()
end

# @notice Decreases the token balance of a user by a given amount.
# @param account Address of the user
# @param amount Amount of tokens to substract
@external
func burn{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    account : felt, amount : Uint256
):
    incentivized_erc20_only_bridge()
    incentivized_erc20_before_token_transfer(account, 0)
    ERC20._burn(account=account, amount=amount)
    return ()
end

# @notice Claims the amount of rewards a user can get, and mints the user its rewards.
# @param recipient Address of the user
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

# @notice Updates static aToken's state with last block number and rewards index.
# @param block_number L1 block number
# @param rewards_index L1 rewards index in Wad
@external
func push_rewards_index{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    block_number : Uint256, rewards_index : Wad
):
    incentivized_erc20_push_rewards_index(block_number, rewards_index)
    rewards_index_updated.emit(block_number, rewards_index)
    return ()
end
