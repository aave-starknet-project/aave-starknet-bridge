%lang starknet

from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_lt_felt, assert_not_zero
from starkware.cairo.common.uint256 import Uint256
from starkware.starknet.common.messages import send_message_to_l1
from starkware.starknet.common.syscalls import get_caller_address, get_contract_address

from rewaave.tokens.IERC20 import IERC20

const WITHDRAW_MESSAGE = 0
const ETH_ADDRESS_BOUND = 2 ** 160

# Interface

@contract_interface
namespace IL2Token:
    func mint(recipient : felt, amount : Uint256):
    end

    func burn(account : felt, amount : Uint256):
    end

    func approve(spender : felt, amount : Uint256) -> (success : felt):
    end

    func permissionedMint(recipient : felt, amount : Uint256):
    end

    func permissionedBurn(account : felt, amount : Uint256):
    end
end

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

<<<<<<< HEAD
@event
func withdraw_initiated(l2_token : felt, l1_recipient : felt, amount : Uint256, caller : felt):
end

@event
func deposit_handled(l2_token : felt, account : felt, amount : Uint256):
=======
@storage_var
func rewAAVE_token() -> (rewAAVE : felt):
>>>>>>> c6b3d89... mint rewards on tokens bridge
end
# Constructor.

# To finish the init you have to initialize the L2 token contract and the L1 bridge contract.
@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        governor_address : felt, rewAAVE : felt):
    assert_not_zero(governor_address)
    governor.write(value=governor_address)
    rewAAVE_token.write(rewAAVE)
    return ()
end

# Getters.

@view
func get_governor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        res : felt):
    let (res) = governor.read()
    return (res)
end

@view
func get_l1_token_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        res : felt):
    let (res) = l1_token_bridge.read()
    return (res)
end

# Externals.

@external
func set_l1_token_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        l1_bridge_address : felt):
    # The call is restricted to the governor.
    let (caller_address) = get_caller_address()
    let (governor_) = get_governor()
    with_attr error_message("Called address should be {caller_address}"):
        assert caller_address = governor_
    end

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
func approve_bridge{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        l1_token : felt, l2_token : felt):
    # The call is restricted to the governor.
    let (caller_address) = get_caller_address()
    let (governor_) = get_governor()
    with_attr error_message("Called address should be {caller_address}"):
        assert caller_address = governor_
    end

    let (l1_token_) = l2_token_to_l1_token.read(l2_token)
    with_attr error_message("L2 to L1 Bridge already setup"):
        assert l1_token_ = 0
    end

    assert_not_zero(l2_token)
    assert_not_zero(l1_token)
    assert_lt_felt(l1_token, ETH_ADDRESS_BOUND)

    l2_token_to_l1_token.write(l2_token, l1_token)
    return ()
end

@external
func initiate_withdraw{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        l2_token : felt, l1_recipient : felt, amount : Uint256):
    # The amount is validated (i.e. amount.low, amount.high < 2**128) by an inner call to
    # IMintableToken permissionedBurn function.

    assert_not_zero(l2_token)

    let (to_address) = get_l1_token_bridge()
    # Check address is valid.
    assert_lt_felt(to_address, ETH_ADDRESS_BOUND)
    assert_not_zero(to_address)

    # Check address is valid.
    assert_lt_felt(l1_recipient, ETH_ADDRESS_BOUND)

    let (l1_token) = l2_token_to_l1_token.read(l2_token)
    with_attr error_message("L1 token {l1_token} not found"):
        assert_not_zero(l1_token)
    end

    # Call burn on l2_token contract.
    let (caller_address) = get_caller_address()

    IL2Token.burn(contract_address=l2_token, account=caller_address, amount=amount)

    # Send the message.
    let (message_payload : felt*) = alloc()
    assert message_payload[0] = WITHDRAW_MESSAGE
    assert message_payload[1] = l1_token
    assert message_payload[2] = l1_recipient
    assert message_payload[3] = amount.low
    assert message_payload[4] = amount.high
<<<<<<< HEAD
=======

    send_message_to_l1(to_address=to_address, payload_size=5, payload=message_payload)
>>>>>>> e1ebfe9... Formatting

    send_message_to_l1(to_address=to_address, payload_size=5, payload=message_payload)
    withdraw_initiated.emit(l2_token, l1_recipient, amount, caller_address)
    return ()
end

@l1_handler
func handle_deposit{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        from_address : felt, l2_recipient : felt, l2_token : felt, amount_low : felt,
        amount_high : felt):
=======
<<<<<<< HEAD
        from_address : felt, l2_recipient : felt, l2_token_address: felt, amount_low: felt, amount_high: felt):
=======
        from_address : felt, account : felt, l2_token_low : felt, l2_token_high : felt,
        amount_low : felt, amount_high : felt):
>>>>>>> d53da5b (Formatting)
>>>>>>> e1ebfe9... Formatting
=======
        from_address : felt, l2_recipient : felt, l2_token_address: felt, amount_low: felt, amount_high: felt):
>>>>>>> 56ee0d9... Fix rebase artifact
=======
        from_address : felt, l2_recipient : felt, l2_token_address : felt, amount_low : felt,
        amount_high : felt):
>>>>>>> c6b3d89... mint rewards on tokens bridge
    # The amount is validated (i.e. amount_low, amount_high < 2**128) by an inner call to
    # IMintableToken permissionedMint function.

    let (expected_from_address) = get_l1_token_bridge()
    with_attr error_message("Expected deposit from l1_token_bridge"):
        assert from_address = expected_from_address
    end
    let amount = Uint256(low=amount_low, high=amount_high)

<<<<<<< HEAD
    assert_not_zero(l2_token)

<<<<<<< HEAD
    # Call mint on l2_token contract.
    IL2Token.mint(contract_address=l2_token, recipient=l2_recipient, amount=amount)
    deposit_handled.emit(l2_token, l2_recipient, amount)
=======
<<<<<<< HEAD
=======
>>>>>>> 56ee0d9... Fix rebase artifact
    assert_not_zero(l2_token_address)

    # Call mint on l2_token contract.
    IL2Token.mint(contract_address=l2_token_address, recipient=l2_recipient, amount=amount)
<<<<<<< HEAD
=======
    # Call mint on l2_token contract.
    let l2_token_address = l2_token_high * 2 ** 128 + l2_token_low

    assert_not_zero(l2_token_address)

    let (contract_address) = get_caller_address()
    IERC20.transferFrom(
        contract_address=l2_token_address,
        sender=contract_address,
        recipient=account,
        amount=amount)
>>>>>>> d53da5b (Formatting)
>>>>>>> e1ebfe9... Formatting
=======
>>>>>>> 56ee0d9... Fix rebase artifact

    return ()
end

@external
func mint_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256):
    # get the address of the ETHStaticAToken
    let (l2_token) = get_caller_address()
    # Verify that it's a valid token by checking for its counterpart on l1
    let (l1_token) = l2_token_to_l1_token.read(l2_token)
    with_attr error_message("L1 token {l1_token} not found"):
        assert_not_zero(l1_token)
    end
    # mints rewAAVE for user
    IL2Token.mint(rewAAVE_token, recipient, amount)

    return ()
end
