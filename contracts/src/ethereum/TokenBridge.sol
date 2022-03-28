// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.6.12;

import "@joriksch/sg-contracts/src/starkware/contracts/components/GenericGovernance.sol";
import "@joriksch/sg-contracts/src/starkware/contracts/interfaces/ContractInitializer.sol";
import "@joriksch/sg-contracts/src/starkware/contracts/interfaces/ProxySupport.sol";
import "@joriksch/sg-contracts/src/starkware/cairo/eth/CairoConstants.sol";
import "@joriksch/sg-contracts/src/starkware/starknet/eth/StarknetMessaging.sol";

interface IERC20 {
    function approve(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);    
    function transferFrom(address, address, uint256) external returns (bool);
}

contract TokenBridge is
    GenericGovernance,
    ContractInitializer,
    ProxySupport
{
    event LogDeposit(address sender, address token, uint256 amount, uint256 l2Recipient);
    event LogWithdrawal(address token, address recipient, uint256 amount);
    event LogBridgeAdded(address l1Token, uint256 l2Token);

    mapping(address => uint256) public l1TokentoL2Token;
    StarknetMessaging public messagingContract;
    uint256 l2TokenBridge;

    constructor() public GenericGovernance("AAVE_BRIDGE_GOVERNANCE") {}

    function toSplitUint(uint256 value) internal pure returns (uint256, uint256) {
      uint256 low = value & ((1 << 128) - 1);
      uint256 high = value >> 128;
      return (low, high);
    }

    function isInitialized() internal view override returns (bool) {
        return messagingContract != StarknetMessaging(0);
    }

    function numOfSubContracts() internal pure override returns (uint256) {
        return 0;
    }

    function validateInitData(bytes calldata data) internal pure override {
        require(data.length == 64, "ILLEGAL_DATA_SIZE");
    }

    function processSubContractAddresses(bytes calldata subContractAddresses) internal override {}

    modifier isApprovedToken(address token) {
        uint256 l2TokenAddress = l1TokentoL2Token[token];
        require((l2TokenAddress != 0) && (l2TokenAddress < CairoConstants.FIELD_PRIME), "L2_TOKEN_HAS_NOT_BEEN_APPROVED");
        _;
    }

    /*
      Gets the addresses of bridgedToken & messagingContract from the ProxySupport initialize(),
      and sets the storage slot accordingly.
    */
    function initializeContractState(bytes calldata data) internal override {
        (uint256 l2TokenBridge_, StarknetMessaging messagingContract_) = abi.decode(
            data,
            (uint256, StarknetMessaging)
        );

        require((l2TokenBridge_ != 0) && (l2TokenBridge_ < CairoConstants.FIELD_PRIME), "L2_ADDRESS_OUT_OF_RANGE");

        messagingContract = messagingContract_;
        l2TokenBridge = l2TokenBridge_;
    }

    // TODO: implement proper encoding on js side
    // function initializeWithoutProxy(bytes calldata data) public {
    function initializeWithoutProxy(uint256 l2TokenBridge_, StarknetMessaging messagingContract_) public {
        // following code initialize the state like`initialize()` function of ProxySupport contract
        // validateInitData(data);
        initGovernance();

        // this part corresponds to `initializeContractState()` function of StarknetTokenBridge contract
        // (uint256 l2TokenBridge_, StarknetMessaging messagingContract_) = abi.decode(
        //     data,
        //     (uint256, StarknetMessaging)
        // );
        require((l2TokenBridge_ != 0) && (l2TokenBridge_ < CairoConstants.FIELD_PRIME), "L2_ADDRESS_OUT_OF_RANGE");
        messagingContract = messagingContract_;
        l2TokenBridge = l2TokenBridge_;
    }


    // The selector of the "handle_deposit" l1_handler on L2.
    // TODO: Recompute hash when the signature is decided
    uint256 constant DEPOSIT_HANDLER =
        1285101517810983806491589552491143496277809242732141897358598292095611420389;
    uint256 constant TRANSFER_FROM_STARKNET = 0;

    modifier isValidL2Address(uint256 l2Address) {
        require((l2Address != 0) && (l2Address < CairoConstants.FIELD_PRIME), "L2_ADDRESS_OUT_OF_RANGE");
        _;
    }

    function approveBridge(address l1Token, uint256 l2Token)
        external
        onlyGovernance
        isValidL2Address(l2Token)
    {
        require(l1Token != address(0x0), "l1Token address cannot be 0x0");

        uint256 l2Token_ = l1TokentoL2Token[l1Token];
        require(l2Token_ == 0, "l2Token already set");

        emit LogBridgeAdded(l1Token, l2Token);
        l1TokentoL2Token[l1Token] = l2Token;
    }

    function sendMessage(address l1Token, uint256 l2Recipient, uint256 amount)
        internal
        isApprovedToken(l1Token)
        isValidL2Address(l2Recipient)
    {
        emit LogDeposit(msg.sender, l1Token, amount, l2Recipient);

        uint256 l2TokenAddress = l1TokentoL2Token[l1Token];

        uint256[] memory payload = new uint256[](4);
        payload[0] = l2Recipient;
        payload[1] = l2TokenAddress;
        (payload[2], payload[3]) = toSplitUint(amount);

        messagingContract.sendMessageToL2(l2TokenBridge, DEPOSIT_HANDLER, payload);
    }

    function consumeMessage(address l1Token, address recipient, uint256 amount) internal {
        emit LogWithdrawal(l1Token, recipient, amount);

        uint256[] memory payload = new uint256[](5);
        payload[0] = TRANSFER_FROM_STARKNET;
        payload[1] = uint256(l1Token);
        payload[2] = uint256(recipient);
        (payload[3], payload[4]) = toSplitUint(amount);

        // Consume the message from the StarkNet core contract.
        // This will revert the (Ethereum) transaction if the message does not exist.        
        messagingContract.consumeMessageFromL2(l2TokenBridge, payload);
    }

    function deposit(address l1Token_, uint256 l2Recipient, uint256 amount) external {
        IERC20 l1Token = IERC20(l1Token_);
        // l1Token.approve(address(this), amount);
        l1Token.transferFrom(msg.sender, address(this), amount);
        sendMessage(l1Token_, l2Recipient, amount);
    }
    
    function withdraw(address l1Token_, address recipient, uint256 amount) isApprovedToken(l1Token_) external {
        consumeMessage(l1Token_, recipient, amount);
        require(recipient != address(0x0), "INVALID_RECIPIENT");
        IERC20 l1Token = IERC20(l1Token_);
        require(l1Token.balanceOf(msg.sender) - amount <= l1Token.balanceOf(msg.sender), "UNDERFLOW");
        l1Token.transfer(recipient, amount);
    }
}
