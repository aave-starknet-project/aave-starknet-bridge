// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "./DummyERC20ExtendedImpl.sol";
import "./DummyERC20RewardToken.sol";
import "./IStaticAToken.sol";
import "./IBridge_L2.sol";
import {IBridge} from "../munged/l1/interfaces/IBridge.sol";

contract DummyStaticATokenImpl is DummyERC20ExtendedImpl {
    IBridge_L2 internal _L2Bridge;

    // user address -> the unclaimed rewards (assumed arbitrary value)
    mapping(address => uint256) internal unclaimedRewards;

    constructor(address owner_, IBridge_L2 L2Bridge)
        DummyERC20ExtendedImpl(owner_)
    {
        require(owner_ == address(L2Bridge), "only L2 Bridge is the owner");
        _L2Bridge = L2Bridge;
    }

    function claimRewards(address recipient)
        external
        onlyOwner
        returns (uint256)
    {
        address _rewAAVE = _L2Bridge.getRewTokenAddress();
        require(_rewAAVE != address(0), "Invalid rewards token");
        uint256 amount = unclaimedRewards[recipient];
        unclaimedRewards[recipient] = 0;
        return amount;
    }
}
