pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

interface IBridge_L2 {
    function l2RewardsIndexSetter(uint256 l1RewardsIndex) external;

    function getL2Nonce() external view returns (uint256 nonce);

    function increaseNonce() external;

    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external;

    function initiateWithdraw(
        address asset,
        uint256 amount,
        address caller,
        address to,
        bool toUnderlyingAsset
    ) external;

    function getRewTokenAddress() external view returns (address);

    function bridgeRewards(
        address recipient,
        address caller,
        uint256 amount
    ) external;

    function claimRewards(address recipient, address staticAToken) external;
}
