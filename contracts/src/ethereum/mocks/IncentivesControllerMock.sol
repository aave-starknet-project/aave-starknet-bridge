// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@swp0x0/protocol-v2/contracts/dependencies/openzeppelin/contracts/ERC20.sol";
import "@swp0x0/protocol-v2/contracts/dependencies/openzeppelin/contracts/IERC20.sol";


contract IncentivesControllerMock {

    ERC20 public _REWARD_TOKEN;

    constructor (address rewardToken) public {
        _REWARD_TOKEN = ERC20(rewardToken);
    }

    function REWARD_TOKEN() external view returns (IERC20) {
        return _REWARD_TOKEN;
    }

    function DISTRIBUTION_END() external view returns (uint256) {
        return 5;
    }

}