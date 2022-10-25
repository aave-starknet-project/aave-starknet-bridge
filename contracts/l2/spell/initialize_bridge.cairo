%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.bool import FALSE
from starkware.starknet.common.syscalls import deploy
from starkware.cairo.common.uint256 import Uint256

from contracts.l2.interfaces.Istatic_a_token import Istatic_a_token

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
    
    // bridge consts
    const l2_bridge_address = 512643767668542850549097422634216397205258954717544946979257998691407990076;
    const l1_bridge_address = 1034980665421734850219798662463523665156404235166;
    const reward_token_address = 748385390664023138263219943884390301742053651531724542658262601656818474994;//rewAAVE
    const aUSDC = 1077803441986936771120489637498156868855928333884;
    const aDAI = 14304685556238090176394662515936233272922302627;
    const aUSDT= 358678608052866257668291367909875857327283918865;
    const staticV2EthADAI=3553586841338115378468599953580856750318258053701918475973449405835849242565;
    const staticV2EthAUSDC=1877970670372008938438386847734197029013735878225782595520145731100643142366;
    const staticV2EthAUSDT=1661137485454751519787291787981103293017576272529248260206323714387315909354;

    // set reward token address on bridge
    IBridge.set_reward_token(l2_bridge_address, reward_token_address);

    // set l1 bridge address
    IBridge.set_l1_bridge(l2_bridge_address, l1_bridge_address);

    
    // approve aDAI<->staticADai bridge
    IBridge.approve_bridge(l2_bridge_address, aDAI, staticV2EthADAI);

    // approve aUSDC<->staticAUsdc bridge
    IBridge.approve_bridge(l2_bridge_address, aUSDC, staticV2EthAUSDC);
    
    // approve aUSDT<->staticV2EthAUSDT bridge
    IBridge.approve_bridge(l2_bridge_address, aUSDT, staticV2EthAUSDT);

    return ();
}
