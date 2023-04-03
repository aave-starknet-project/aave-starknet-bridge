// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.8.0;

import {IBridge} from "./interfaces/IBridge.sol";
import {ITransparentUpgradeableProxy} from "./interfaces/IProxy.sol";

/**
 * @title AaveStarknetBridgeUpgradePayload
 * @author Aave on Starknet
 * @notice Aave governance proposal payload, upgrading the Aave <> Starknet Aave v2 Ethereum Bridge on Ethereum side
 */
contract AaveStarknetBridgeUpgradePayload {
    IBridge public constant L1_BRIDGE_NEW_IMPLEMENTATION = IBridge(address(0));
    ITransparentUpgradeableProxy public constant L1_BRIDGE_PROXY =
        ITransparentUpgradeableProxy(
            0x25c0667E46a704AfCF5305B0A586CC24c171E94D
        );

    function execute() external {
        try
            L1_BRIDGE_PROXY.upgradeToAndCall(
                address(L1_BRIDGE_NEW_IMPLEMENTATION),
                abi.encodeWithSelector(
                    L1_BRIDGE_NEW_IMPLEMENTATION.initialize.selector
                )
            )
        {} catch (bytes memory) {
            // Do nothing.
        }
    }
}
