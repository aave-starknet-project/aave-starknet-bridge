pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {Bridge} from "../munged/l1/Bridge.sol";

contract IncentivesControllerMock_L1 {
    uint256 public DISTRIBUTION_END;
    address public L1_Bridge;
    IERC20 public _rewardToken;
    mapping(address => assetData) public Asset_Data;
    mapping(address => uint256) private rewards;

    struct assetData {
        uint256 index;
        uint256 emissionPerSecond;
        uint256 lastUpdate;
    }

    /**
     * @dev Returns the configuration of the distribution for a certain asset
     * @param asset The address of the reference asset of the distribution
     * @return The asset index, the emission per second and the last updated timestamp
     **/
    function getAssetData(address asset)
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        return (
            Asset_Data[asset].index,
            Asset_Data[asset].emissionPerSecond,
            Asset_Data[asset].lastUpdate
        );
    }

    /**
     * @dev Claims reward for a user, on all the assets of the lending pool, accumulating the pending rewards
     * @param amount Amount of rewards to claim
     * @param to Address that will be receiving the rewards
     * @return Rewards claimed
     **/
    function claimRewards(
        address[] calldata assets,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(
            msg.sender == L1_Bridge,
            "only the L1 bridge interacts with the controller"
        );
        _rewardToken.transfer(to, amount);
        return amount;
    }

    function REWARD_TOKEN() external view returns (IERC20) {
        return _rewardToken;
    }

    function getRewardsBalance(address[] calldata assets, address user)
        external
        view
        returns (uint256)
    {
        return rewards[user];
    }
}
