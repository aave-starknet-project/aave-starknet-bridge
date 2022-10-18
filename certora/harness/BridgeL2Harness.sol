pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

import {IERC20_Extended} from "./IERC20_Extended.sol";
import {IBridge} from "../munged/l1/interfaces/IBridge.sol";
import "./IBridge_L2.sol";
import {IStaticAToken} from "./IStaticAToken.sol";

contract BridgeL2Harness is IBridge_L2 {
    mapping(address => address) public AtokenToStaticAToken_L2;
    IBridge public BRIDGE_L1;
    uint256 public l2RewardsIndex;
    IERC20_Extended public REW_AAVE;
    uint256 private _l1ToL2MessageNonce;

    modifier onlyL1Bridge() {
        require(msg.sender == address(BRIDGE_L1), "only owner can access");
        _;
    }

    /**
     * @dev Sets the `l2RewardsIndex`
     * @param value the value to be assigned to `l2RewardsIndex`
     **/
    function l2RewardsIndexSetter(uint256 value) external onlyL1Bridge {
        l2RewardsIndex = value;
    }

    /**
     * @dev retrieves the address of the StaticAToken on L2
     * @param AToken address of AToken on L1
     **/
    function getStaticATokenAddress(address AToken)
        public
        view
        returns (address)
    {
        return AtokenToStaticAToken_L2[AToken];
    }

    function getRewTokenAddress() external view returns (address) {
        return address(REW_AAVE);
    }

    function getL2Nonce() external view returns (uint256 nonce) {
        return _l1ToL2MessageNonce;
    }

    function address2uint256(address add) external pure returns (uint256) {
        return uint256(uint160(add));
    }

    function increaseNonce() external onlyL1Bridge {
        _l1ToL2MessageNonce++;
    }

    /**
     * @dev deposit on L2
     * @param asset The Atoken sent by the L1 bridge, to which staticAtoken shall be minted and connected
     * @param amount The amount of Atokens sent by the bridge
     * @param onBehalfOf The recipient of the minted staticAtokens
     **/
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external onlyL1Bridge {
        IERC20_Extended(AtokenToStaticAToken_L2[asset]).mint(
            onBehalfOf,
            amount
        );
    }

    /**
     * @dev Initiates a withdraw from the L2 side and gets all the way to the L1 side to withdraw Atokens/underlying for the users.
     * @param asset The L1 Atoken that is desired to be withdrawn
     * @param amount The amount of StaticAtokens desired to be withdrawn
     * @param caller Represents the caller on L2.
     * @param to The recipient of the minted staticAtokens on the L1 side
     * @param toUnderlyingAsset whether to withdraw in underlying asset (true) or in AToken (false).
     **/
    function initiateWithdraw(
        address asset,
        uint256 amount,
        address caller,
        address to,
        bool toUnderlyingAsset
    ) external onlyL1Bridge {
        IERC20_Extended(AtokenToStaticAToken_L2[asset]).burn(caller, amount);

        BRIDGE_L1.withdraw(
            asset,
            uint256(uint160(caller)),
            to,
            amount,
            l2RewardsIndex,
            toUnderlyingAsset
        );
    }

    /**
     * @dev Burns the reward tokens on the L2 side and initiate a withdraw of reward tokens on the L1 side
     * @param recipient The L1 user address that withdraws the reward
     * @param amount The amount of reward token desired to be withdrawn
     **/
    function bridgeRewards(
        address recipient,
        address caller,
        uint256 amount
    ) external onlyL1Bridge {
        IERC20_Extended(REW_AAVE).transferFrom(
            caller,
            address(BRIDGE_L1),
            amount
        );
        BRIDGE_L1.receiveRewards(uint256(uint160(caller)), recipient, amount);
    }

    /**
     * @dev Mints the unclaimed rewards on the L2 side accumulated by a user who owns staticAToken.
     * our harness assumes an arbitrary value to be claimed, and then it is set permanently to 0.
     * @param caller The L1 user address that withdraws the reward
     * @param staticAToken The staticAToken address
     **/
    function claimRewards(address caller, address staticAToken)
        external
        onlyL1Bridge
    {
        uint256 amount = IStaticAToken(staticAToken).claimRewards(caller);
        IERC20_Extended(REW_AAVE).mint(caller, amount);
    }
}
