// SPDX-License-Identifier: Apache-2.0.
pragma solidity 0.8.10;

import "../munged/l1/Bridge.sol";
import {IBridge_L2} from "./IBridge_L2.sol";
import {SymbolicLendingPoolL1} from "./SymbolicLendingPoolL1.sol";
import {IStaticAToken} from "./IStaticAToken.sol";
import {IATokenWithPool} from "../munged/l1/interfaces/IATokenWithPool.sol";
import {GPv2SafeERC20} from "@aave/core-v3/contracts/dependencies/gnosis/contracts/GPv2SafeERC20.sol";

contract BridgeHarness is Bridge {
    using GPv2SafeERC20 for IATokenWithPool;

    IBridge_L2 public BRIDGE_L2;
    bool private withdrawMessageSent;
    bool private bridgeRewardsMessageSent;
    uint256 private messageCounter; // Like nonce
    uint256 private messageCancellationDelay;
    mapping(uint256 => Message) messages;

    // Assuming there is only one L2 bridge (toAddress is fixed)
    struct Message {
        uint256 fromAddress;
        uint256 l2Recipient;
        uint256 l2TokenAddress;
        uint256 amount;
        uint256 blockNumber;
        uint256 currentRewardsIndex;
        uint8 selector;
        uint256 cancelTime;
    }

    /*************************
     *        Getters        *
     *************************/

    function withdrawMessageStatus() external view returns (bool) {
        return withdrawMessageSent;
    }

    function bridgeRewardsMessageStatus() external view returns (bool) {
        return bridgeRewardsMessageSent;
    }

    function getL2Nonce() public view returns (uint256 nonce) {
        nonce = BRIDGE_L2.getL2Nonce();
    }

    // Retrieving the UnderlyingAsset of the AToken
    function getUnderlyingAssetOfAToken(address AToken)
        public
        view
        returns (IERC20 underlyingAsset)
    {
        return _aTokenData[AToken].underlyingAsset;
    }

    /**
     * @dev Retrieving the AToken address of an underlying asset
     * @param lendPool lending pool to search the AToken for.
     * @param asset The underlying asset to which the Atoken is connected
     * @return Atoken the `atoken` address
     **/
    function getATokenOfUnderlyingAsset(
        SymbolicLendingPoolL1 lendPool,
        address asset
    ) public view returns (address) {
        return lendPool.underlyingtoAToken(asset);
    }

    // Retrieving the LendingPool of the AToken
    function getLendingPoolOfAToken(address AToken)
        public
        view
        returns (ILendingPool lendingPool)
    {
        return _aTokenData[AToken].lendingPool;
    }

    // Retrieving the UnderlyingAsset of the AToken
    function getL2TokenOfAToken(address AToken) public view returns (uint256) {
        return _aTokenData[AToken].l2TokenAddress;
    }

    // Retrieving the balance of a user with respect to a given token
    function tokenBalanceOf(IERC20 token, address user)
        public
        view
        returns (uint256)
    {
        return token.balanceOf(user);
    }

    function getApprovedL1TokensLength()
        external
        view
        returns (uint256 length)
    {
        length = _approvedL1Tokens.length;
    }

    /************************
     *       Wrappers       *
     ************************/
    /* Wrapper functions allow calling internal functions from within the spec */

    // A wrapper function for _dynamicToStaticAmount
    function _dynamicToStaticAmount_Wrapper(
        uint256 amount,
        address asset,
        ILendingPool lendingPool
    ) external view returns (uint256) {
        return super._dynamicToStaticAmount(amount, asset, lendingPool);
    }

    // A wrapper function for _staticToDynamicAmount
    function _staticToDynamicAmount_Wrapper(
        uint256 amount,
        address asset,
        ILendingPool lendingPool
    ) external view returns (uint256) {
        return super._staticToDynamicAmount(amount, asset, lendingPool);
    }

    // A wrapper function for _getCurrentRewardsIndex
    function _getCurrentRewardsIndex_Wrapper(address l1AToken)
        external
        view
        returns (uint256)
    {
        return super._getCurrentRewardsIndex(l1AToken);
    }

    // A wrapper function for _computeRewardsDiff
    function _computeRewardsDiff_Wrapper(
        uint256 amount,
        uint256 l2RewardsIndex,
        uint256 l1RewardsIndex
    ) external pure returns (uint256) {
        return
            super._computeRewardsDiff(amount, l2RewardsIndex, l1RewardsIndex);
    }

    /*****************************************
     *        Function Summarizations        *
     *****************************************/
    // When depositing tokens via the L1 bridge, a deposit on the L2 side is invoked from this side to save 2 step deposit.
    // The L2 deposit just mints static_Atoken on the L2 side.
    function _sendDepositMessage(
        address l1Token,
        address from,
        uint256 l2Recipient,
        uint256 amount,
        uint256 blockNumber,
        uint256 currentRewardsIndex
    ) internal override {
        messageCounter++;
        messages[messageCounter].fromAddress = uint256(uint160(from));
        messages[messageCounter].l2Recipient = l2Recipient;
        messages[messageCounter].l2TokenAddress = _aTokenData[l1Token]
            .l2TokenAddress;
        messages[messageCounter].amount = amount;
        messages[messageCounter].blockNumber = blockNumber;
        messages[messageCounter].currentRewardsIndex = currentRewardsIndex;
        messages[messageCounter].selector = 1;
        BRIDGE_L2.increaseNonce();
        BRIDGE_L2.deposit(l1Token, amount, address(uint160(l2Recipient)));
    }

    // To save the 2 step mechanism, a call to withdraw from the L2 side invokes the withdraw on the L1 side.
    // Therefore the consumeMessage method is unneeded
    function _consumeMessage(
        address l1Token,
        uint256 l2sender,
        address recipient,
        uint256 amount,
        uint256 l2RewardsIndex,
        uint256 toUnderlyingAsset
    ) internal override {
        require(withdrawMessageSent, "cannot consume unsent message");
    }

    // A L1-L2 RewardIndex sync. A call from L1 syncs the value with L2.
    function _sendIndexUpdateMessage(
        address l1Token,
        address from,
        uint256 blockNumber,
        uint256 currentRewardsIndex
    ) internal override {
        BRIDGE_L2.l2RewardsIndexSetter(currentRewardsIndex);
    }

    // To save the 2 step mechanism, a call to bridgeRewards on the L2 side burns the rewardToken and invokes receiveRewards
    // Therefore the consumeBridgeRewardMessage method is unneeded
    function _consumeBridgeRewardMessage(
        uint256 l2sender,
        address recipient,
        uint256 amount
    ) internal override {
        require(bridgeRewardsMessageSent, "cannot consume unsent message");
    }

    // =============== L2 interface ========================================
    // Called from this contract ===========================================

    function initiateWithdraw_L2(
        address asset,
        uint256 amount,
        address to,
        bool toUnderlyingAsset
    ) external returns (uint256) {
        require(!withdrawMessageSent, "A message is already being consumed");
        withdrawMessageSent = true;
        BRIDGE_L2.initiateWithdraw(
            asset,
            amount,
            msg.sender,
            to,
            toUnderlyingAsset
        );
        withdrawMessageSent = false;
        return amount;
    }

    function bridgeRewards_L2(address recipient, uint256 amount) external {
        require(
            !bridgeRewardsMessageSent,
            "A message is already being consumed"
        );
        bridgeRewardsMessageSent = true;
        BRIDGE_L2.bridgeRewards(recipient, msg.sender, amount);
        bridgeRewardsMessageSent = false;
    }

    function claimRewardsStatic_L2(address staticAToken) external {
        BRIDGE_L2.claimRewards(msg.sender, staticAToken);
    }

    // =============== Deposit cancellation ================================

    function emptyMessage(uint256 nonce) private {
        Message storage message = messages[nonce];
        message.fromAddress = 0;
        message.l2Recipient = 0;
        message.l2TokenAddress = 0;
        message.amount = 0;
        message.blockNumber = 0;
        message.currentRewardsIndex = 0;
        message.selector = 0;
    }

    function isMessageEmpty(uint256 nonce) public view returns (bool) {
        Message storage message = messages[nonce];
        return (message.fromAddress == 0 &&
            message.l2Recipient == 0 &&
            message.l2TokenAddress == 0 &&
            message.amount == 0 &&
            message.blockNumber == 0 &&
            message.currentRewardsIndex == 0);
    }

    function readyToCancel(uint256 nonce) public view returns (bool) {
        uint256 requestTime = messages[nonce].cancelTime;
        uint256 cancelAllowedTime = requestTime + messageCancellationDelay;
        return
            block.timestamp >= cancelAllowedTime &&
            cancelAllowedTime >= requestTime;
    }

    function startDepositCancellation(
        address l1Token,
        uint256 amount,
        uint256 l2Recipient,
        uint256 rewardsIndex,
        uint256 blockNumber,
        uint256 nonce
    ) external override {
        require(!isMessageEmpty(nonce), "message payload is empty");
        messages[nonce].cancelTime = block.timestamp;
    }

    function cancelDeposit(
        address l1AToken,
        uint256 amount,
        uint256 l2Recipient,
        uint256 rewardsIndex,
        uint256 blockNumber,
        uint256 nonce
    ) external override {
        // Replace cancelL1ToL2Message by our code:
        uint256 requestTime = messages[nonce].cancelTime;
        require(requestTime > 0, "Message was not requested to cancel");
        uint256 cancelAllowedTime = requestTime + messageCancellationDelay;
        require(
            cancelAllowedTime >= requestTime,
            "CANCEL_ALLOWED_TIME_OVERFLOW"
        );
        require(
            block.timestamp >= cancelAllowedTime,
            "MESSAGE_CANCELLATION_NOT_ALLOWED_YET"
        );

        address underlyingAsset = address(
            _aTokenData[l1AToken].underlyingAsset
        );
        ILendingPool lendingPool = _aTokenData[l1AToken].lendingPool;
        uint256 dynamicAmount = _staticToDynamicAmount(
            amount,
            underlyingAsset,
            lendingPool
        );

        //transfer aTokens back to depositor
        IATokenWithPool(l1AToken).safeTransfer(msg.sender, dynamicAmount);

        //claim any accrued rewards for the depositor during the cancellation period
        uint256 currentRewardsIndex = _getCurrentRewardsIndex(l1AToken);
        uint256 rewardsAmount = _computeRewardsDiff(
            amount,
            rewardsIndex,
            currentRewardsIndex
        );

        if (rewardsAmount > 0) {
            _transferRewards(msg.sender, rewardsAmount);
        }

        /*
        emit CancelledDeposit(
            l2Recipient,
            msg.sender,
            rewardsIndex,
            blockNumber,
            dynamicAmount,
            nonce
        );
        */
    }
}
