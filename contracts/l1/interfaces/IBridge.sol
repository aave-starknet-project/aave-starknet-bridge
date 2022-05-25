// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import {IERC20} from "@aave/protocol-v2/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {ILendingPool} from "@aave/protocol-v2/contracts/interfaces/ILendingPool.sol";

interface IBridge {
    struct ATokenData {
        uint256 l2TokenAddress;
        IERC20 underlyingAsset;
        ILendingPool lendingPool;
    }

    event Deposit(
        address indexed sender,
        address indexed token,
        uint256 indexed amount,
        uint256 l2Recipient,
        uint256 blockNumber,
        uint256 rewardsIndex
    );
    event Withdrawal(
        address indexed token,
        uint256 l2sender,
        address indexed recipient,
        uint256 indexed amount
    );
    event RewardsTransferred(
        uint256 l2sender,
        address recipient,
        uint256 amount
    );
    event ApprovedBridge(address l1Token, uint256 l2Token);
    event L2StateUpdated(address indexed l1Token, uint256 rewardsIndex);

    /**
     * @notice allows deposits of aTokens or their underlying assets on L2
     * @param l1AToken aToken address
     * @param l2Recipient recipient address
     * @param amount to be minted on l2
     * @param referralCode of asset
     * @param fromUnderlyingAsset if set to true will accept deposit from underlying assets
     **/
    function deposit(
        address l1AToken,
        uint256 l2Recipient,
        uint256 amount,
        uint16 referralCode,
        bool fromUnderlyingAsset
    ) external returns (uint256);

    /**
     * @notice allows withdraw of aTokens or their underlying assets from L2
     * @param l1AToken aToken address
     * @param l2sender sender address
     * @param recipient l1 recipient
     * @param staticAmount amount to be withdraw
     * @param toUnderlyingAsset if set to true will withdraw underlying asset tokens from pool and transfer them to recipient
     **/
    function withdraw(
        address l1AToken,
        uint256 l2sender,
        address recipient,
        uint256 staticAmount,
        uint256 l2RewardsIndex,
        bool toUnderlyingAsset
    ) external;

    /**
     * @notice allows l1 user to receive the bridged rewards tokens from l2
     * @param l2sender sender on l2
     * @param recipient on l1
     * @param amount of tokens to be claimed to user on l1
     **/
    function receiveRewards(
        uint256 l2sender,
        address recipient,
        uint256 amount
    ) external;

    /**
     * @notice updates the rewards index of tokens on l2
     * @param l1AToken aToken address
     **/
    function updateL2State(address l1AToken) external;
}
