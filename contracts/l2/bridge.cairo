%lang starknet

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_lt_felt, assert_not_zero
from starkware.cairo.common.math_cmp import is_le
from starkware.cairo.common.uint256 import (
    Uint256,
    uint256_check,
    uint256_le,
    uint256_sub,
    uint256_mul,
)
from starkware.starknet.common.messages import send_message_to_l1
from starkware.starknet.common.syscalls import get_caller_address

from contracts.l2.lib.wad_ray_math import (
    Wad,
    wad_sub,
    wad_to_ray,
    ray_mul_no_rounding,
    wad_le,
    ray_to_wad_no_rounding,
    wad_mul,
)
from contracts.l2.interfaces.IERC20 import IERC20
from contracts.l2.interfaces.Istatic_a_token import Istatic_a_token

const WITHDRAW_MESSAGE = 0
const BRIDGE_REWARD_MESSAGE = 1
const ETH_ADDRESS_BOUND = 2 ** 160

# Storage.

@storage_var
func governor() -> (res : felt):
end

@storage_var
func l1_bridge() -> (res : felt):
end

@storage_var
func l2_token_to_l1_token(l2_token : felt) -> (l1_token : felt):
end

@storage_var
func rewAAVE() -> (address : felt):
end

# Events.

@event
func withdraw_initiated(
    l2_token : felt,
    l1_recipient : felt,
    amount : Uint256,
    caller : felt,
    current_rewards_index : Uint256,
):
end

@event
func deposit_handled(
    l2_token : felt,
    l1_sender : felt,
    account : felt,
    amount : Uint256,
    block_number : Uint256,
    l1_rewards_index : Uint256,
):
end

@event
func minted_rewards(l2_reward_token : felt, account : felt, amount : Uint256):
end

@event
func bridged_rewards(caller : felt, l1_recipient : felt, amount : Uint256):
end

# Getters.

@view
func get_governor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    res : felt
):
    let (res) = governor.read()
    return (res)
end

@view
func get_l1_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    res : felt
):
    let (res) = l1_bridge.read()
    return (res)
end

# Internals

func is_valid_l1_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l2_token : felt
):
    let (l1_token) = l2_token_to_l1_token.read(l2_token)
    with_attr error_message("No l1 token found for {l2_token}"):
        assert_not_zero(l1_token)
    end
    return ()
end

func only_governor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}():
    let (caller_address) = get_caller_address()
    let (governor_) = get_governor()
    with_attr error_message("Caller address should be {governor_}"):
        assert caller_address = governor_
    end
    return ()
end

func only_l1_handler{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    from_address_ : felt
):
    let (expected_from_address) = get_l1_bridge()
    with_attr error_message("Expected deposit from l1_bridge: {expected_from_address}"):
        assert from_address_ = expected_from_address
    end
    return ()
end

# Externals

@external
func initialize_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    governor_address : felt
):
    let (governor_) = governor.read()
    with_attr error_message("Bridge already initialized"):
        assert governor_ = 0
    end
    assert_not_zero(governor_address)
    governor.write(value=governor_address)
    return ()
end

@external
func set_l1_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l1_bridge_address : felt
):
    only_governor()

    # Check l1_bridge isn't already set.
    let (l1_bridge_) = get_l1_bridge()
    assert l1_bridge_ = 0

    # Check new address is valid.
    assert_lt_felt(l1_bridge_address, ETH_ADDRESS_BOUND)
    assert_not_zero(l1_bridge_address)

    # Set new value.
    l1_bridge.write(value=l1_bridge_address)
    return ()
end

@external
func set_reward_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    reward_token : felt
):
    alloc_locals

    only_governor()

    rewAAVE.write(reward_token)
    return ()
end

@external
func approve_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l1_token : felt, l2_token : felt
):
    # the call is restricted to the governor.
    only_governor()

    # verify that the l2 token address was provided
    assert_not_zero(l2_token)

    let (l1_token_) = l2_token_to_l1_token.read(l2_token)
    with_attr error_message("L2 to L1 Bridge already setup"):
        assert l1_token_ = 0
    end

    assert_not_zero(l1_token)
    assert_lt_felt(l1_token, ETH_ADDRESS_BOUND)
    l2_token_to_l1_token.write(l2_token, l1_token)
    return ()
end

@external
func initiate_withdraw{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l2_token : felt, l1_recipient : felt, amount : Uint256
):
    assert_not_zero(l2_token)

    let (to_address) = get_l1_bridge()

    # check l1 address is valid.
    assert_lt_felt(l1_recipient, ETH_ADDRESS_BOUND)

    let (l1_token) = l2_token_to_l1_token.read(l2_token)
    with_attr error_message("No l1 token found for {l2_token}"):
        assert_not_zero(l1_token)
    end

    let (current_rewards_index) = Istatic_a_token.get_rewards_index(contract_address=l2_token)

    # call burn on l2_token contract.
    let (caller_address) = get_caller_address()

    # prepare l1 message
    let (message_payload : felt*) = alloc()
    assert message_payload[0] = WITHDRAW_MESSAGE
    assert message_payload[1] = l1_token
    assert message_payload[2] = caller_address
    assert message_payload[3] = l1_recipient
    assert message_payload[4] = amount.low
    assert message_payload[5] = amount.high
    assert message_payload[6] = current_rewards_index.wad.low
    assert message_payload[7] = current_rewards_index.wad.high

    # burn static_a_tokens
    IERC20.burn(contract_address=l2_token, account=caller_address, amount=amount)

    # send witdraw message to l1
    send_message_to_l1(to_address=to_address, payload_size=8, payload=message_payload)

    withdraw_initiated.emit(
        l2_token, l1_recipient, amount, caller_address, current_rewards_index.wad
    )
    return ()
end

@external
func bridge_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l1_recipient : felt, amount : Uint256
):
    let (to_address) = get_l1_bridge()

    let (token_owner) = get_caller_address()

    let (reward_token) = rewAAVE.read()

    # prepare l1 message for bridging tokens
    let (message_payload : felt*) = alloc()
    assert message_payload[0] = BRIDGE_REWARD_MESSAGE
    assert message_payload[1] = token_owner
    assert message_payload[2] = l1_recipient
    assert message_payload[3] = amount.low
    assert message_payload[4] = amount.high

    # burn rewards
    IERC20.burn(contract_address=reward_token, account=token_owner, amount=amount)

    # send message to l1
    send_message_to_l1(to_address=to_address, payload_size=5, payload=message_payload)

    bridged_rewards.emit(token_owner, l1_recipient, amount)

    return ()
end

@l1_handler
func handle_deposit{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    from_address : felt,
    l1_sender : felt,
    l2_recipient : felt,
    l2_token : felt,
    amount_low : felt,
    amount_high : felt,
    block_number_low : felt,
    block_number_high : felt,
    l1_rewards_index_low : felt,
    l1_rewards_index_high : felt,
):
    alloc_locals
    only_l1_handler(from_address_=from_address)

    let amount_ = Uint256(low=amount_low, high=amount_high)
    local amount : Wad = Wad(amount_)

    let l1_rewards_index_ = Uint256(low=l1_rewards_index_low, high=l1_rewards_index_high)
    local l1_rewards_index : Wad = Wad(l1_rewards_index_)

    let block_number = Uint256(low=block_number_low, high=block_number_high)

    with_attr error_message("High or low overflows 128 bit bound {amount_}"):
        uint256_check(amount_)
    end

    with_attr error_message("High or low overflows 128 bit bound {l1_rewards_index_}"):
        uint256_check(l1_rewards_index_)
    end

    with_attr error_message("High or low overflows 128 bit bound {block_number}"):
        uint256_check(block_number)
    end

    assert_not_zero(l2_token)

    let (reward_token) = rewAAVE.read()

    # handle the difference of the index at send and recieve
    let (current_index) = Istatic_a_token.get_rewards_index(l2_token)
    let (le) = wad_le(current_index, l1_rewards_index)
    if le == 1:
        Istatic_a_token.push_rewards_index(
            contract_address=l2_token, block_number=block_number, rewards_index=l1_rewards_index
        )
    else:
        let (reward_diff) = wad_sub(current_index, l1_rewards_index)
        let (reward_outstanding) = wad_mul(reward_diff, amount)
        IERC20.mint(reward_token, l2_recipient, reward_outstanding.wad)
    end

    # Call mint on l2_token contract.
    IERC20.mint(l2_token, l2_recipient, amount.wad)
    deposit_handled.emit(
        l2_token, l1_sender, l2_recipient, amount.wad, block_number, l1_rewards_index.wad
    )
    return ()
end

@external
func mint_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt, amount : Uint256
):
    # get the address of the ETHStaticAToken
    let (l2_token) = get_caller_address()
    # check if l1 token exists
    is_valid_l1_token(l2_token)
    let (reward_token) = rewAAVE.read()
    # mints rewAAVE for user
    IERC20.mint(reward_token, recipient, amount)
    minted_rewards.emit(reward_token, recipient, amount)
    return ()
end

@l1_handler
func handle_index_update{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    from_address : felt,
    l1_sender : felt,
    l2_token : felt,
    block_number_low : felt,
    block_number_high : felt,
    l1_rewards_index_low : felt,
    l1_rewards_index_high : felt,
):
    alloc_locals
    only_l1_handler(from_address_=from_address)

    let l1_rewards_index_ = Uint256(low=l1_rewards_index_low, high=l1_rewards_index_high)
    local l1_rewards_index : Wad = Wad(l1_rewards_index_)

    let block_number = Uint256(low=block_number_low, high=block_number_high)

    with_attr error_message("High or low overflows 128 bit bound {l1_rewards_index_}"):
        uint256_check(l1_rewards_index_)
    end

    with_attr error_message("High or low overflows 128 bit bound {block_number}"):
        uint256_check(block_number)
    end

    assert_not_zero(l2_token)

    Istatic_a_token.push_rewards_index(
        contract_address=l2_token, block_number=block_number, rewards_index=l1_rewards_index
    )

    return ()
end
