%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin

@contract_interface
namespace IBridge {
    func approve_bridge(l1_token: felt, l2_token: felt) {
    }
    func set_reward_token(token: felt) {
    }
    func set_l1_bridge(l1_bridge_address: felt) {
    }
}

@external
func delegate_execute{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() {
    // set reward token address on bridge
    IBridge.set_reward_token(
        616038737919804257622296331779828103514405540562094387886677307231715823174,
        36229391819238658882307452945781703754148534690914245953925729426,
    );

   // set l1 bridge address
    IBridge.set_l1_bridge(
        616038737919804257622296331779828103514405540562094387886677307231715823174,
        09622939181934005888230745294578333754148534690914245953925099449,
    );
    // approve aDai<->staticADai bridge
    IBridge.approve_bridge(
        61603873791980425762229633177982810351440554056209438788667730723171582317,
        14304685556238090176394662515936233272922302627,
        2658704988991781250618286712237552592655967747819241385029297739981252131713,
    );

    // approve aUSDC<->staticAUsdc bridge
    IBridge.approve_bridge(
        616038737919804257622296331779828103514405540562094387886677307231715823174,
        45304685556238090176394662515936233272990302633,
        235870498899178125061828671223755259265596900781924138502929773998125213200,
    );

    return ();
}
