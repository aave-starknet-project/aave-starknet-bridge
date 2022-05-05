// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.6.12;

import "@joriksch/sg-contracts/src/starkware/contracts/components/GenericGovernance.sol";
import "@joriksch/sg-contracts/src/starkware/contracts/interfaces/ContractInitializer.sol";
import "@joriksch/sg-contracts/src/starkware/contracts/interfaces/ProxySupport.sol";
import "@joriksch/sg-contracts/src/starkware/cairo/eth/CairoConstants.sol";
import "../../test/IStarknetMessaging.sol";

import "@swp0x0/protocol-v2/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import "@swp0x0/protocol-v2/contracts/dependencies/openzeppelin/contracts/SafeERC20.sol";
import {IStaticATokenLM} from "@swp0x0/protocol-v2/contracts/interfaces/IStaticATokenLM.sol";

contract TokenBridge is
    GenericGovernance,
    ContractInitializer,
    ProxySupport
{
    using SafeERC20 for IERC20;
    using SafeERC20 for IStaticATokenLM;

    event LogDeposit(address sender, IStaticATokenLM token, uint256 amount, uint256 l2Recipient);
    event LogWithdrawal(IStaticATokenLM token, uint256 l2sender, address recipient, uint256 amount);
    event LogBridgeReward(uint256 l2sender, address recipient, uint256 amount);
    event LogBridgeAdded(IStaticATokenLM l1Token, uint256 l2Token);

    mapping(IStaticATokenLM => uint256) public l1TokentoL2Token;
    IStarknetMessaging public messagingContract;
    uint256 l2TokenBridge;
    IStaticATokenLM[] approvedL1Tokens;
    IERC20 public rewardToken;

    // The selector of the "handle_deposit" l1_handler on L2.
    uint256 constant DEPOSIT_HANDLER =
        1285101517810983806491589552491143496277809242732141897358598292095611420389;
    // The selector of the "handle_rewards_update" l1_handler on L2.
    uint256 constant REWARDS_UPDATE_HANDLER = 1491809297313944980469767785261053487269663932577403898216430815040935905233;

    uint256 constant TRANSFER_FROM_STARKNET = 0;
    uint256 constant BRIDGE_REWARD_MESSAGE = 1;
    uint256 constant UINT256_PART_SIZE_BITS = 128;
    uint256 constant UINT256_PART_SIZE = 2**UINT256_PART_SIZE_BITS;

    constructor() public GenericGovernance("AAVE_BRIDGE_GOVERNANCE") {}

    function toSplitUint(uint256 value) internal pure returns (uint256, uint256) {
      uint256 low = value & ((1 << 128) - 1);
      uint256 high = value >> 128;
      return (low, high);
    }

    function isInitialized() internal view override returns (bool) {
        return messagingContract != IStarknetMessaging(0);
    }

    function numOfSubContracts() internal pure override returns (uint256) {
        return 0;
    }

    function validateInitData(bytes calldata data) internal pure override {
        require(data.length == 96, "ILLEGAL_DATA_SIZE");
    }

    function processSubContractAddresses(bytes calldata subContractAddresses) internal override {}

    function isValidL2Address(uint256 l2Address) internal returns (bool) {
        return (l2Address != 0) && (l2Address < CairoConstants.FIELD_PRIME);
    }

    modifier onlyValidL2Address(uint256 l2Address) {
        require(isValidL2Address(l2Address), "L2_ADDRESS_OUT_OF_RANGE");
        _;
    }

    modifier onlyApprovedToken(IStaticATokenLM token) {
        uint256 l2TokenAddress = l1TokentoL2Token[token];
        require(isValidL2Address(l2TokenAddress), "L2_TOKEN_HAS_NOT_BEEN_APPROVED");
        _;
    }

    /*
      Gets the addresses of bridgedToken & messagingContract from the ProxySupport initialize(),
      and sets the storage slot accordingly.
    */
    function initializeContractState(bytes calldata data) internal override {
        (uint256 l2TokenBridge_, IStarknetMessaging messagingContract_, IERC20 rewardToken_) = abi.decode(
            data,
            (uint256, IStarknetMessaging, IERC20)
        );

        require((l2TokenBridge_ != 0) && (l2TokenBridge_ < CairoConstants.FIELD_PRIME), "L2_ADDRESS_OUT_OF_RANGE");
        require(address(rewardToken_) != address(0x0), "INVALID ADDRESS FOR REWARD TOKEN");

        messagingContract = messagingContract_;
        l2TokenBridge = l2TokenBridge_;
        rewardToken = rewardToken_;
    }

    function approveBridge(IStaticATokenLM l1Token, uint256 l2Token)
        external
        onlyGovernance
        onlyValidL2Address(l2Token)
    {
        require(l1Token != IStaticATokenLM(0x0), "l1Token address cannot be 0x0");

        uint256 l2Token_ = l1TokentoL2Token[l1Token];
        require(l2Token_ == 0, "l2Token already set");

        require(IStaticATokenLM(l1Token).REWARD_TOKEN() == rewardToken, "L1 TOKEN CONFIGURED WITH WRONG REWARD TOKEN");

        l1Token.ASSET().safeApprove(address(l1Token), type(uint256).max);
        l1Token.ATOKEN().safeApprove(address(l1Token), type(uint256).max);

        emit LogBridgeAdded(l1Token, l2Token);
        l1TokentoL2Token[l1Token] = l2Token;
        approvedL1Tokens.push(l1Token);
    }

    function claimOrderSwap(uint256 idx1, uint256 idx2) external {
      require(idx1 < approvedL1Tokens.length, "INDEX OUT OF RANGE");
      require(idx2 < approvedL1Tokens.length, "INDEX OUT OF RANGE");

      (approvedL1Tokens[idx1], approvedL1Tokens[idx2]) =
        (approvedL1Tokens[idx2], approvedL1Tokens[idx1]);
    }

    function sendMessage(IStaticATokenLM l1Token, address from, uint256 l2Recipient, uint256 amount)
        internal
        onlyApprovedToken(l1Token)
        onlyValidL2Address(l2Recipient)
    {
        emit LogDeposit(from, l1Token, amount, l2Recipient);

        uint256 l2TokenAddress = l1TokentoL2Token[l1Token];

        uint256[] memory payload = new uint256[](5);
        payload[0] = uint256(from);
        payload[1] = l2Recipient;
        payload[2] = l2TokenAddress;
        (payload[3], payload[4]) = toSplitUint(amount);

        messagingContract.sendMessageToL2(l2TokenBridge, DEPOSIT_HANDLER, payload);
    }

    function sendMessageStaticAToken(uint256 rewardsIndex)
        external
    {
      uint256 l2Token = l1TokentoL2Token[IStaticATokenLM(msg.sender)];

      if (isValidL2Address(l2Token)) {
        uint256[] memory payload = new uint256[](5);
        (payload[0], payload[1]) = toSplitUint(block.number);
        payload[2] = l2Token;
        (payload[3], payload[4]) = toSplitUint(rewardsIndex);

        messagingContract.sendMessageToL2(l2TokenBridge, REWARDS_UPDATE_HANDLER, payload);
      }
    }

    function consumeMessage(
        IStaticATokenLM l1Token,
        uint256 l2sender,
        address recipient,
        uint256 amount
    ) internal {
        emit LogWithdrawal(l1Token, l2sender, recipient, amount);

        uint256[] memory payload = new uint256[](6);
        payload[0] = TRANSFER_FROM_STARKNET;
        payload[1] = uint256(address(l1Token));
        payload[2] = l2sender;
        payload[3] = uint256(recipient);
        (payload[4], payload[5]) = toSplitUint(amount);

        // Consume the message from the StarkNet core contract.
        // This will revert the (Ethereum) transaction if the message does not exist.
        messagingContract.consumeMessageFromL2(l2TokenBridge, payload);
    }

    function deposit(
        IStaticATokenLM l1Token,
        uint256 l2Recipient,
        uint256 amount
    )
        onlyApprovedToken(l1Token)
        onlyValidL2Address(l2Recipient)
        external
    {
        l1Token.safeTransferFrom(msg.sender, address(this), amount);
        sendMessage(l1Token, msg.sender, l2Recipient, amount);
    }

    function depositUnderlying(
        IStaticATokenLM l1Token,
        uint256 l2Recipient,
        uint256 amount,
        uint16 refferalCode,
        bool fromAsset
    )
        onlyApprovedToken(l1Token)
        onlyValidL2Address(l2Recipient)
        external
    {
        if (fromAsset) {
          l1Token.ASSET().safeTransferFrom(msg.sender, address(this), amount);
        } else {
          l1Token.ATOKEN().safeTransferFrom(msg.sender, address(this), amount);
        }
        amount = l1Token.deposit(address(this), amount, refferalCode, fromAsset);
        sendMessage(l1Token, msg.sender, l2Recipient, amount);
    }
}
    function withdrawUnderlying(
        IStaticATokenLM l1Token,
        uint256 l2sender,
        address recipient,
        uint256 amount,
        bool toAsset
    ) 
        onlyApprovedToken(l1Token)
        onlyValidL2Address(l2sender)
        external
    {
        consumeMessage(l1Token, l2sender, recipient, amount);
        require(recipient != address(0x0), "INVALID_RECIPIENT");
        require(
            l1Token.balanceOf(msg.sender) - amount <= l1Token.balanceOf(msg.sender),
            "WITHDRAW UNDERFLOW"
        );
        l1Token.withdraw(recipient, amount, toAsset);
    }

    function withdraw(
        IStaticATokenLM l1Token,
        uint256 l2sender,
        address recipient,
        uint256 amount
    )
        onlyApprovedToken(l1Token)
        onlyValidL2Address(l2sender)
        external
    {
        consumeMessage(l1Token, l2sender, recipient, amount);
        require(recipient != address(0x0), "INVALID_RECIPIENT");
        require(
            l1Token.balanceOf(msg.sender) - amount <= l1Token.balanceOf(msg.sender),
            "WITHDRAW UNDERFLOW"
        );
        l1Token.safeTransfer(recipient, amount);
    }

     function consumeBridgeRewardMessage(uint256 l2sender, address recipient, uint256 amount) internal {
        emit LogBridgeReward(l2sender, recipient, amount);

        uint256[] memory payload = new uint256[](5);
        payload[0] = BRIDGE_REWARD_MESSAGE;
        payload[1] = l2sender;
        payload[2] = uint256(recipient);
        payload[3] = amount & (UINT256_PART_SIZE - 1);
        payload[4] = amount >> UINT256_PART_SIZE_BITS;

        messagingContract.consumeMessageFromL2(l2TokenBridge, payload);
    }

    function receiveRewards(uint256 l2sender, address recipient, uint256 amount) onlyValidL2Address(l2sender) external {
        consumeBridgeRewardMessage(l2sender, recipient, amount);
        require(recipient != address(0x0), "INVALID_RECIPIENT");

        address self = address(this);

        uint256 rewardBalance = rewardToken.balanceOf(self);

        if (rewardBalance >= amount) {
          rewardToken.safeTransfer(recipient, amount);
          return;
        }

        for (uint256 i = 0; i < approvedL1Tokens.length; ++i) {
            approvedL1Tokens[i].claimRewardsToSelf();

            rewardBalance = rewardToken.balanceOf(self);

            if (rewardBalance >= amount) {
              rewardToken.safeTransfer(recipient, amount);
              return;
            }
        }

        revert("NOT ENOUGH REWARDS");
    }
}
