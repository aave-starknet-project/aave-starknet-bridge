pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

import {DummyERC20Impl} from "./DummyERC20Impl.sol";
import {IATokenWithPool} from "./IATokenWithPool.sol";
import {SafeCast} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/SafeCast.sol";
import {WadRayMath} from "@aave/core-v3/contracts/protocol/libraries/math/WadRayMath.sol";
import {IAaveIncentivesController} from "../munged/l1/interfaces/IAaveIncentivesController.sol";
import {ILendingPool} from "../munged/l1/interfaces/ILendingPool.sol";

contract ATokenWithPool is IATokenWithPool {
    using WadRayMath for uint256;
    using SafeCast for uint256;

    /**
     * @dev Only pool can call functions marked by this modifier.
     **/
    modifier onlyPool() {
        require(msg.sender == address(POOL), "CALLER_MUST_BE_POOL");
        _;
    }

    /**
     * @dev UserState - additionalData is a flexible field.
     * ATokens and VariableDebtTokens use this field store the index of the
     * user's last supply/withdrawal/borrow/repayment. StableDebtTokens use
     * this field to store the user's stable rate.
     */
    struct UserState {
        uint128 balance;
        uint128 additionalData;
    }
    // Map of users address and their state data (userAddress => userStateData)
    mapping(address => UserState) internal _userState;
    // Total supply
    uint256 t;
    // Allowances
    mapping(address => mapping(address => uint256)) a;

    string public name;
    string public symbol;
    uint256 public decimals;
    address internal _treasury;
    address internal _underlyingAsset;
    IAaveIncentivesController public _incentivesController;
    ILendingPool public POOL;

    constructor(address pool) {
        POOL = ILendingPool(pool);
    }

    /**
     * @notice Returns the address of the Incentives Controller contract
     * @return The address of the Incentives Controller
     **/
    function getIncentivesController()
        external
        view
        returns (IAaveIncentivesController)
    {
        return _incentivesController;
    }

    function totalSupply_super() public view virtual returns (uint256) {
        return t;
    }

    function scaledTotalSupply() public view returns (uint256) {
        return t;
    }

    function scaledBalanceOf(address user) external view returns (uint256) {
        return _userState[user].balance;
    }

    function balanceOf_super(address account)
        public
        view
        virtual
        returns (uint256)
    {
        return _userState[account].balance;
    }

    function _msgSender() internal view virtual returns (address payable) {
        return payable(msg.sender);
    }

    function allowance(address owner, address spender)
        external
        view
        returns (uint256)
    {
        return a[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        a[msg.sender][spender] = amount;
        return true;
    }

    function mint(
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) external virtual onlyPool returns (bool) {
        return _mintScaled(onBehalfOf, amount, index);
    }

    function burn(
        address from,
        address receiverOfUnderlying,
        uint256 amount,
        uint256 index
    ) external onlyPool {
        _burnScaled(from, receiverOfUnderlying, amount, index);
        if (receiverOfUnderlying != address(this)) {
            (DummyERC20Impl(_underlyingAsset)).transfer(
                receiverOfUnderlying,
                amount
            );
        }
    }

    /**
     * @notice Mints tokens to an account and apply incentives if defined
     * @param account The address receiving tokens
     * @param amount The amount of tokens to mint
     */
    function _mint(address account, uint128 amount) internal virtual {
        uint256 oldTotalSupply = t;
        t = oldTotalSupply + amount;

        uint128 oldAccountBalance = _userState[account].balance;
        _userState[account].balance = oldAccountBalance + amount;

        //IAaveIncentivesController incentivesControllerLocal = _incentivesController;
        //if (address(incentivesControllerLocal) != address(0)) {
        //    incentivesControllerLocal.handleAction(account, oldTotalSupply, oldAccountBalance);
        //}
    }

    /**
     * @notice Burns tokens from an account and apply incentives if defined
     * @param account The account whose tokens are burnt
     * @param amount The amount of tokens to burn
     */
    function _burn(address account, uint128 amount) internal virtual {
        uint256 oldTotalSupply = t;
        t = oldTotalSupply - amount;

        uint128 oldAccountBalance = _userState[account].balance;
        _userState[account].balance = oldAccountBalance - amount;

        //IAaveIncentivesController incentivesControllerLocal = _incentivesController;

        //if (address(incentivesControllerLocal) != address(0)) {
        //    incentivesControllerLocal.handleAction(account, oldTotalSupply, oldAccountBalance);
        //}
    }

    /**
     * @notice Implements the basic logic to mint a scaled balance token.
     * @param onBehalfOf The address of the user that will receive the scaled tokens
     * @param amount The amount of tokens getting minted
     * @param index The next liquidity index of the reserve
     * @return `true` if the the previous balance of the user was 0
     **/
    function _mintScaled(
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) internal returns (bool) {
        uint256 amountScaled = amount.rayDiv(index);
        require(amountScaled != 0, "INVALID_MINT_AMOUNT");

        uint256 scaledBalance = balanceOf_super(onBehalfOf);
        //uint256 balanceIncrease = scaledBalance.rayMul(index) -
        //    scaledBalance.rayMul(_userState[onBehalfOf].additionalData);

        _userState[onBehalfOf].additionalData = index.toUint128();

        _mint(onBehalfOf, amountScaled.toUint128());

        //uint256 amountToMint = amount + balanceIncrease;
        //emit Transfer(address(0), onBehalfOf, amountToMint);
        //emit Mint(msg.sender, onBehalfOf, amountToMint, balanceIncrease, index);

        return (scaledBalance == 0);
    }

    /**
     * @notice Implements the basic logic to burn a scaled balance token.
     * @dev In some instances, a burn transaction will emit a mint event
     * if the amount to burn is less than the interest that the user accrued
     * @param user The user which debt is burnt
     * @param amount The amount getting burned
     * @param index The variable debt index of the reserve
     **/
    function _burnScaled(
        address user,
        address target,
        uint256 amount,
        uint256 index
    ) internal {
        uint256 amountScaled = amount.rayDiv(index);
        require(amountScaled != 0, "INVALID_BURN_AMOUNT");

        //uint256 scaledBalance = balanceOf_super(user);
        //uint256 balanceIncrease = scaledBalance.rayMul(index) -
        //    scaledBalance.rayMul(_userState[user].additionalData);

        _userState[user].additionalData = index.toUint128();

        _burn(user, amountScaled.toUint128());

        /*
    if (balanceIncrease > amount) {
        uint256 amountToMint = balanceIncrease - amount;
        //emit Transfer(address(0), user, amountToMint);
        //emit Mint(user, user, amountToMint, balanceIncrease, index);
    } else {
        uint256 amountToBurn = amount - balanceIncrease;
        //emit Transfer(user, address(0), amountToBurn);
        //emit Burn(user, target, amountToBurn, balanceIncrease, index);
    }
    */
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external virtual override returns (bool) {
        uint128 castAmount = amount.toUint128();
        _approve(sender, msg.sender, a[sender][_msgSender()] - castAmount);
        _transfer(sender, recipient, castAmount);
        return true;
    }

    /**
     * @notice Approve `spender` to use `amount` of `owner`s balance
     * @param owner The address owning the tokens
     * @param spender The address approved for spending
     * @param amount The amount of tokens to approve spending of
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        a[owner][spender] = amount;
        //emit Approval(owner, spender, amount);
    }

    /**
     * @notice Overrides the parent _transfer to force validated transfer() and transferFrom()
     * @param from The source address
     * @param to The destination address
     * @param amount The amount getting transferred
     **/
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal {
        address underlyingAsset = _underlyingAsset;

        uint256 index = POOL.getReserveNormalizedIncome(underlyingAsset);

        //uint256 fromBalanceBefore = balanceOf_super(from).rayMul(index);
        //uint256 toBalanceBefore = balanceOf_super(to).rayMul(index);

        _transfer_super(from, to, amount.rayDiv(index).toUint128());
    }

    /**
     * @notice Transfers tokens between two users and apply incentives if defined.
     * @param sender The source address
     * @param recipient The destination address
     * @param amount The amount getting transferred
     */
    function _transfer_super(
        address sender,
        address recipient,
        uint128 amount
    ) internal virtual {
        uint128 oldSenderBalance = _userState[sender].balance;
        _userState[sender].balance = oldSenderBalance - amount;
        uint128 oldRecipientBalance = _userState[recipient].balance;
        _userState[recipient].balance = oldRecipientBalance + amount;

        /*
    IAaveIncentivesController incentivesControllerLocal = _incentivesController;
    if (address(incentivesControllerLocal) != address(0)) {
        uint256 currentTotalSupply = _totalSupply;
        incentivesControllerLocal.handleAction(sender, currentTotalSupply, oldSenderBalance);
        if (sender != recipient) {
        incentivesControllerLocal.handleAction(recipient, currentTotalSupply, oldRecipientBalance);
        }
    }
    emit Transfer(sender, recipient, amount);
    */
    }

    function balanceOf(address user) public view override returns (uint256) {
        return
            balanceOf_super(user).rayMul(
                POOL.getReserveNormalizedIncome(_underlyingAsset)
            );
    }

    function totalSupply() public view override returns (uint256) {
        uint256 currentSupplyScaled = totalSupply_super();

        if (currentSupplyScaled == 0) {
            return 0;
        }

        return
            currentSupplyScaled.rayMul(
                POOL.getReserveNormalizedIncome(_underlyingAsset)
            );
    }

    function RESERVE_TREASURY_ADDRESS() external view returns (address) {
        return _treasury;
    }

    function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
        return _underlyingAsset;
    }

    function transfer(address recipient, uint256 amount)
        external
        returns (bool)
    {
        uint128 castAmount = amount.toUint128();
        _transfer(_msgSender(), recipient, castAmount);
        return true;
    }
}
