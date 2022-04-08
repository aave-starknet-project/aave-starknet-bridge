%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_not_zero
from starkware.starknet.common.syscalls import delegate_l1_handler, delegate_call, get_caller_address
from openzeppelin.upgrades.library import (
    Proxy_initialized,
    Proxy_get_admin,
    Proxy_get_implementation,
    Proxy_initializer,
    Proxy_only_admin,
    Proxy_set_admin,
    Proxy_set_implementation
)

#
# Constructor
#

@constructor
func constructor{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }(proxy_admin: felt):
    Proxy_set_admin(proxy_admin)
    return ()
end

@external
func initialize_proxy{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }(implementation_address: felt):
    Proxy_only_admin()
    let (initialized) = Proxy_initialized.read()
    with_attr error_message("Proxy: contract already initialized"):
        assert initialized = 0
    end

    Proxy_initialized.write(1)
    Proxy_set_implementation(implementation_address)
    return ()
end

#
# Upgrades
#

@external
func upgrade_implementation{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }(new_implementation: felt):
    Proxy_only_admin()

    let (initialized) = Proxy_initialized.read()
    with_attr error_message("Proxy: contract not initialized"):
        assert initialized = 1
    end

    Proxy_set_implementation(new_implementation)
    return ()
end

#
# Getters
#

@view
func get_admin{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }() -> (admin: felt):
    let (admin) = Proxy_get_admin()
    return (admin)
end

@view
func get_implementation{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }() -> (implementation: felt):
    let (implementation) = Proxy_get_implementation()
    return (implementation)
end

#
# Setters
#

@external
func set_admin{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }(new_admin: felt):
    Proxy_only_admin()
    Proxy_set_admin(new_admin)
    return ()
end

#
# Fallback functions
#

@external
@raw_input
@raw_output
func __default__{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }(
        selector: felt,
        calldata_size: felt,
        calldata: felt*
    ) -> (
        retdata_size: felt,
        retdata: felt*
    ):
    let (address) = Proxy_get_implementation()
    with_attr error_message("Proxy: does not have an implementation."):
        assert_not_zero(address)
    end

    let (retdata_size: felt, retdata: felt*) = delegate_call(
        contract_address=address,
        function_selector=selector,
        calldata_size=calldata_size,
        calldata=calldata
    )

    return (retdata_size=retdata_size, retdata=retdata)
end

@l1_handler
@raw_input
func __l1_default__{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }(
        selector: felt,
        calldata_size: felt,
        calldata: felt*
    ):
    let (address) = Proxy_get_implementation()
    with_attr error_message("Proxy: does not have an implementation."):
        assert_not_zero(address)
    end

    delegate_l1_handler(
        contract_address=address,
        function_selector=selector,
        calldata_size=calldata_size,
        calldata=calldata
    )

    return ()
end
