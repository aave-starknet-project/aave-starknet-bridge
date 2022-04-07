// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract L1Token is ERC20 {

    ERC20 public REWARD_TOKEN;

    constructor(uint256 amount, address rewardToken) ERC20("L1Token", "L1T") {
        _mint(msg.sender, amount);
        REWARD_TOKEN = RewAAVE(rewardToken);
    }

    function claimRewardsToSelf(bool forceUpdate) external {
      //noop
    }
}

contract RewAAVE is ERC20 {
    constructor(uint256 amount) ERC20("RewAave", "rAave") {
      _mint(msg.sender, amount);
    }
}
