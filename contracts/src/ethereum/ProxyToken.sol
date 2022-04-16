// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@swp0x0/protocol-v2/contracts/protocol/libraries/aave-upgradeability/InitializableImmutableAdminUpgradeabilityProxy.sol";

contract ProxyToken is InitializableImmutableAdminUpgradeabilityProxy {
    constructor(address admin)
        public
        InitializableImmutableAdminUpgradeabilityProxy(admin)
    {}
}
