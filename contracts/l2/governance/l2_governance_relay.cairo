// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2021 Dai Foundation
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.alloc import alloc
from starkware.starknet.common.syscalls import  library_call

@storage_var
func _l1_governance_relay() -> (res: felt) {
}

@constructor
func constructor{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    l1_governance_relay: felt
) {
    _l1_governance_relay.write(l1_governance_relay);

    return ();
}

@l1_handler
func relay{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    from_address: felt, spell: felt
) {
    let (l1_governance_relay) = _l1_governance_relay.read();
    assert l1_governance_relay = from_address;
    
    //selector of delegate_execute() function on spell contracts 
    const DELEGATE_EXECUTE_SELECTOR=1715357134534920869852627606170305435965756153030215653526748248853578673782;
    
    library_call(
        class_hash=spell,
        function_selector=DELEGATE_EXECUTE_SELECTOR,
        calldata_size=0,
        calldata=new(),
    );

    return ();
}
