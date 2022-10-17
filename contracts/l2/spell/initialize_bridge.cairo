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

@contract_interface
namespace IProxy {
    func set_implementation(implementation_hash: felt) {
    }
}

@event
func proxy_deployed(proxy_address: felt) {
}

@external
func delegate_execute{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() {
    // addresses to be set
    const l2_governance_relay = 0;
    const l2_bridge_address = 0;
    const l1_bridge_address = 0;
    const reward_token_address = 0;
    const proxy_class_hash = 0;
    const static_a_token_class_hash = 0;
    const aUSDC = 0;
    const aDAI = 0;

    // set reward token address on bridge
    IBridge.set_reward_token(l2_bridge_address, reward_token_address);

    // set l1 bridge address
    IBridge.set_l1_bridge(l2_bridge_address, l1_bridge_address);

    // deploy static_a_dai proxy
    let (static_a_dai_proxy_address) = deploy(
        class_hash=proxy_class_hash,
        contract_address_salt=1,
        constructor_calldata_size=1,
        constructor_calldata=cast(new (l2_governance_relay,), felt*),
        deploy_from_zero=FALSE,
    );
    proxy_deployed.emit(static_a_dai_proxy_address);

    // deploy static_a_usdc proxy
    let (static_a_usdc_proxy_address) = deploy(
        class_hash=proxy_class_hash,
        contract_address_salt=2,
        constructor_calldata_size=1,
        constructor_calldata=cast(new (l2_governance_relay,), felt*),
        deploy_from_zero=FALSE,
    );

    proxy_deployed.emit(static_a_usdc_proxy_address);

    // set implementations on proxies
    IProxy.set_implementation(static_a_dai_proxy_address, static_a_token_class_hash);
    IProxy.set_implementation(static_a_usdc_proxy_address, static_a_token_class_hash);

    // initalize static_a_tokens
    Istatic_a_token.initialize_static_a_token(
        static_a_dai_proxy_address, 0, 0, 0, Uint256(0, 0), 0, 0
    );

    Istatic_a_token.initialize_static_a_token(
        static_a_usdc_proxy_address, 0, 0, 0, Uint256(0, 0), 0, 0
    );

    // approve aDai<->staticADai bridge
    IBridge.approve_bridge(l2_bridge_address, aDAI, static_a_dai_proxy_address);

    // approve aUSDC<->staticAUsdc bridge
    IBridge.approve_bridge(l2_bridge_address, aUSDC, static_a_usdc_proxy_address);

    return ();
}
