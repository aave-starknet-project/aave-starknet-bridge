// SPDX-License-Identifier: Apache-2.0.
pragma solidity 0.6.12;

import "@swp0x0/protocol-v2/contracts/dependencies/openzeppelin/contracts/ERC20.sol";
import "@swp0x0/protocol-v2/contracts/interfaces/IAaveIncentivesController.sol";
// import "./IncentivesControllerMock.sol";


contract ATokenMock is ERC20 {

    IAaveIncentivesController public INCENTIVES_CONTROLLER;
    address private _assetAddress;

    constructor (uint256 amount, address rewardToken, address assetAddress) public ERC20("ATokenMock", "ACM") {
        _mint(msg.sender, amount);
        _assetAddress = assetAddress;
    }

    function getIncentivesController() external view returns (IAaveIncentivesController) {
        return INCENTIVES_CONTROLLER;
    }

    function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
        return _assetAddress;
    }

}
