%lang starknet

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_lt_felt, assert_not_zero
from starkware.cairo.common.uint256 import Uint256
from starkware.starknet.common.messages import send_message_to_l1
from starkware.starknet.common.syscalls import get_caller_address, get_contract_address
from rewaave.tokens.IERC20 import IERC20

const WITHDRAW_MESSAGE = 0
const BRIDGE_REWARD_MESSAGE = 1
const ETH_ADDRESS_BOUND = 2 ** 160

# Storage.

@storage_var
func governor() -> (res : felt):
end

@storage_var
func l1_token_bridge() -> (res : felt):
end

@storage_var
func l2_token_to_l1_token(l2_token : felt) -> (l1_token : felt):
end

@storage_var
func rewAAVE() -> (address : felt):
end

# Events.

@event
func withdraw_initiated(l2_token : felt, l1_recipient : felt, amount : Uint256, caller : felt):
end

@event
func deposit_handled(l2_token : felt, account : felt, amount : Uint256):
end

@event
func minted_rewards(l2_reward_token : felt, account : felt, amount : Uint256):
end

@event
func bridged_rewards(l2_token : felt, acocunt : felt, amount : Uint256):
end

# Constructor.

# To finish the init you have to initialize the L2 token contract and the L1 bridge contract.
@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    governor_address : felt
):
    assert_not_zero(governor_address)
    governor.write(value=governor_address)
    return ()
end

# Getters.

@view
func get_governor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    res : felt
):
    let (res) = governor.read()
    return (res)
end

func is_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(l2_token : felt):
    let (l1_token) = l2_token_to_l1_token.read(l2_token)
    with_attr error_message("No l1 token found for {l2_token}"):
        assert_not_zero(l1_token)
    end
    return ()
end

@view
func get_l1_token_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    res : felt
):
    let (res) = l1_token_bridge.read()
    return (res)
end

# Internals.

<<<<<<< HEAD
@external
func set_l1_token_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l1_bridge_address : felt
):
    # The call is restricted to the governor.
=======
func auth{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}():
>>>>>>> added l1 handler to handle transfer messages
    let (caller_address) = get_caller_address()
    let (governor_) = get_governor()
    with_attr error_message("caller address should be {governor_}"):
        assert caller_address = governor_
    end
    return ()
end

# Externals.

@external
func set_l1_token_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        l1_bridge_address : felt):
    # The call is restricted to the governor.
    auth()

    # Check l1_bridge isn't already set.
    let (l1_bridge_) = get_l1_token_bridge()
    assert l1_bridge_ = 0

    # Check new address is valid.
    assert_lt_felt(l1_bridge_address, ETH_ADDRESS_BOUND)
    assert_not_zero(l1_bridge_address)

    # Set new value.
    l1_token_bridge.write(value=l1_bridge_address)
    return ()
end

@external
func set_reward_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    reward_token : felt
):
    alloc_locals
    # The call is restricted to the governor.
    let (caller_address) = get_caller_address()
    let (governor_) = get_governor()
    with_attr error_message("caller address should be {governer_}"):
        assert caller_address = governor_
    end

    rewAAVE.write(reward_token)
    return ()
end

@external
func approve_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l1_token : felt, l2_token : felt
):
    # The call is restricted to the governor.
<<<<<<< HEAD
    let (caller_address) = get_caller_address()
    let (governor_) = get_governor()

    with_attr error_message("caller address should be {governor_}"):
        assert caller_address = governor_
    end
=======
    auth()
>>>>>>> added l1 handler to handle transfer messages

    let (l1_token_) = l2_token_to_l1_token.read(l2_token)
    with_attr error_message("L2 to L1 Bridge already setup"):
        assert l1_token_ = 0
    end

    assert_not_zero(l2_token)
    assert_not_zero(l1_token)
    assert_lt_felt(l1_token, ETH_ADDRESS_BOUND)

    l2_token_to_l1_token.write(l2_token, l1_token)
    l1_token_to_l2_token.write(l1_token, l2_token)
    return ()
end

@external
func initiate_withdraw{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l2_token : felt, l1_recipient : felt, amount : Uint256
):
    # The amount is validated (i.e. amount.low, amount.high < 2**128) by an inner call to
    # IMintableToken burn function.

    assert_not_zero(l2_token)

    let (to_address) = get_l1_token_bridge()

    # Check address is valid.
    assert_lt_felt(l1_recipient, ETH_ADDRESS_BOUND)

    let (l1_token) = l2_token_to_l1_token.read(l2_token)
    with_attr error_message("No l1 token found for {l2_token}"):
        assert_not_zero(l1_token)
    end

    # Call burn on l2_token contract.
    let (caller_address) = get_caller_address()

    IERC20.burn(contract_address=l2_token, account=caller_address, amount=amount)

    # Send the message.
    let (message_payload : felt*) = alloc()
    assert message_payload[0] = WITHDRAW_MESSAGE
    assert message_payload[1] = l1_token
    assert message_payload[2] = l1_recipient
    assert message_payload[3] = amount.low
    assert message_payload[4] = amount.high

    send_message_to_l1(to_address=to_address, payload_size=5, payload=message_payload)
    withdraw_initiated.emit(l2_token, l1_recipient, amount, caller_address)
    return ()
end

@external
func bridge_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    l2_token : felt, l1_recipient : felt, amount : Uint256
):
    let (to_address) = get_l1_token_bridge()

    is_token(l2_token)

    let (l1_token) = l2_token_to_l1_token.read(l2_token)

    let (token_owner) = get_caller_address()

    let (reward_token) = rewAAVE.read()

    # BURN REWARD TOKEN
    IERC20.burn(contract_address=reward_token, account=token_owner, amount=amount)

    # Send message for bridging tokens
    let (message_payload : felt*) = alloc()
    assert message_payload[0] = BRIDGE_REWARD_MESSAGE
    assert message_payload[1] = l1_token
    assert message_payload[2] = l1_recipient
    assert message_payload[3] = amount.low
    assert message_payload[4] = amount.high

    send_message_to_l1(to_address=to_address, payload_size=5, payload=message_payload)
    bridged_rewards.emit(l2_token, l1_recipient, amount)

    return ()
end

@l1_handler
func handle_deposit{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    from_address : felt,
    l2_recipient : felt,
    l2_token_address : felt,
    amount_low : felt,
    amount_high : felt,
):
    # The amount is validated (i.e. amount_low, amount_high < 2**128) by an inner call to
    # IMintableToken mint function.

    let (expected_from_address) = get_l1_token_bridge()
    with_attr error_message("Expected deposit from l1_token_bridge"):
        assert from_address = expected_from_address
    end
    let amount = Uint256(low=amount_low, high=amount_high)

    assert_not_zero(l2_token_address)

    # Call mint on l2_token contract.

    IERC20.mint(contract_address=l2_token_address, recipient=l2_recipient, amount=amount)
    deposit_handled.emit(l2_token_address, l2_recipient, amount)
    return ()
end

@external
func mint_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    recipient : felt, amount : Uint256
):
    # get the address of the ETHStaticAToken
    let (l2_token) = get_caller_address()
    # Verify that it's a valid token by checking for its counterpart on l1
    is_token(l2_token)
    let (reward_token) = rewAAVE.read()
    # mints rewAAVE for user
    IERC20.mint(reward_token, recipient, amount)
    minted_rewards.emit(reward_token, recipient, amount)

    # write block number event
    l1_block_number.write(value=block_number)

    # Emit event
    deposit_handled.emit(l2_token, l2_recipient, amount)

    return ()
end

@l1_handler
func handle_transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        from_address : felt, block_number : felt, l1_token : felt, sender : felt, sender_rewards : felt, recipient : felt, recipient_rewards : felt):

    with_attr error_message("Expected transfer call from L1 token {l1_token}"):
        assert from_address = l1_token
    end

    let (l2_token) = l1_token_to_l2_token.read(l1_token)
    with_attr error_message("L2 token {l2_token} not found"):
        assert_not_zero(l2_token)
    end

    IL2Token.set_block_number(contract_address=l2_token, block_number=block_number)
    IL2Token.set_user_acc_rewards(contract_address=l2_token, user=sender, rewards=sender_rewards)
    IL2Token.set_user_acc_rewards(contract_address=l2_token, user=recipient, rewards=recipient_rewards)

    return ()
end
