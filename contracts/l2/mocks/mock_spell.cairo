%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256

@contract_interface
namespace IRewAAVE {
    func initialize_rewAAVE(
        name: felt,
        symbol: felt,
        decimals: felt,
        initial_supply: Uint256,
        recipient: felt,
        owner: felt,
    ) {
    }
}

@external
func delegate_execute{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() {
    IRewAAVE.initialize_rewAAVE(123456789, 111, 222, 18, Uint256(10000, 0), 987654321, 999999999);
    return ();
}
