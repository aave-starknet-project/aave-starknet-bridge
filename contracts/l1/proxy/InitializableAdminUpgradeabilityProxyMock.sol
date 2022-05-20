pragma solidity 0.6.12;

import "@aave/protocol-v2/contracts/dependencies/openzeppelin/upgradeability/InitializableAdminUpgradeabilityProxy.sol";

contract InitializableAdminUpgradeabilityProxyMock is
    InitializableAdminUpgradeabilityProxy
{
    constructor() public InitializableAdminUpgradeabilityProxy() {}
}
