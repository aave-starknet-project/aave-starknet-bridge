%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_not_zero
from starkware.starknet.common.syscalls import delegate_l1_handler, delegate_call
from starkware.cairo.common.bool import TRUE, FALSE

from contracts.l2.dependencies.openzeppelin.upgrades.library import Proxy, Proxy_initialized

# events

@event
func proxy_deployed(proxy_admin : felt):
end

@event
func proxy_initialized(implementation_address : felt):
end

@event
func implementation_upgraded(new_implementation : felt):
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
    Proxy._set_admin(proxy_admin)
    proxy_deployed.emit(proxy_admin)
    return ()
end

@external
func initialize_proxy{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    implementation_address : felt
):
    with_attr error_message("Proxy: initial implementation address should be non zero."):
        assert_not_zero(implementation_address)
    end
    Proxy.assert_only_admin()
    let (initialized) = Proxy_initialized.read()
    with_attr error_message("Proxy: contract already initialized"):
        assert initialized = FALSE
    end

    Proxy_initialized.write(TRUE)
    Proxy._set_implementation(implementation_address)
    proxy_initialized.emit(implementation_address)
    return ()
end

#
# Upgrades
#

@external
func upgrade_implementation{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    new_implementation : felt
):
    with_attr error_message("Proxy: new implementation address should be non zero."):
        assert_not_zero(new_implementation)
    end

    Proxy.assert_only_admin()

    let (initialized) = Proxy_initialized.read()
    with_attr error_message("Proxy: contract not initialized"):
        assert initialized = TRUE
    end

    Proxy._set_implementation(new_implementation)

    implementation_upgraded.emit(new_implementation)
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
