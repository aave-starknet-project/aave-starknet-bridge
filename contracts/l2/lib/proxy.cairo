%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_not_zero
from starkware.starknet.common.syscalls import delegate_l1_handler, delegate_call
from starkware.cairo.common.bool import TRUE, FALSE

from contracts.l2.dependencies.openzeppelin.upgrades.library import Proxy

# events

@event
func proxy_deployed(proxy_admin : felt):
end

@event
func implementation_updated(implementation_address : felt):
end

@event
func admin_changed(new_admin : felt):
end

#
# Constructor
#

@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    proxy_admin : felt
):
    with_attr error_message("Proxy: proxy admin address should be non zero."):
        assert_not_zero(proxy_admin)
    end
    Proxy._set_admin(proxy_admin)
    proxy_deployed.emit(proxy_admin)
    return ()
end

@external
func set_implementation{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    implementation_address : felt
):
    with_attr error_message("Proxy: implementation address should be non zero."):
        assert_not_zero(implementation_address)
    end
    Proxy.assert_only_admin()
    Proxy._set_implementation(implementation_address)
    implementation_updated.emit(implementation_address)
    return ()
end

#
# Getters
#

@view
func get_admin{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    admin : felt
):
    let (admin) = Proxy.get_admin()
    return (admin)
end

@view
func get_implementation{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
    implementation : felt
):
    let (implementation) = Proxy.get_implementation()
    return (implementation)
end

#
# Setters
#

@external
func change_proxy_admin{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    new_admin : felt
):
    with_attr error_message("Proxy: new admin address should be non zero."):
        assert_not_zero(new_admin)
    end
    Proxy.assert_only_admin()
    Proxy._set_admin(new_admin)
    admin_changed.emit(new_admin)
    return ()
end

#
# Fallback functions
#

@external
@raw_input
@raw_output
func __default__{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    selector : felt, calldata_size : felt, calldata : felt*
) -> (retdata_size : felt, retdata : felt*):
    let (address) = Proxy.get_implementation()
    with_attr error_message("Proxy: does not have an implementation."):
        assert_not_zero(address)
    end

    let (retdata_size : felt, retdata : felt*) = delegate_call(
        contract_address=address,
        function_selector=selector,
        calldata_size=calldata_size,
        calldata=calldata,
    )

    return (retdata_size=retdata_size, retdata=retdata)
end

@l1_handler
@raw_input
func __l1_default__{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    selector : felt, calldata_size : felt, calldata : felt*
):
    let (address) = Proxy.get_implementation()
    with_attr error_message("Proxy: does not have an implementation."):
        assert_not_zero(address)
    end

    delegate_l1_handler(
        contract_address=address,
        function_selector=selector,
        calldata_size=calldata_size,
        calldata=calldata,
    )

    return ()
end
