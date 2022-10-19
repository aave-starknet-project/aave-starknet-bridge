// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

// import {IScaledBalanceToken} from "@aave/core-v3/contracts/interfaces/IScaledBalanceToken.sol";
import {IATokenWithPool} from "../munged/l1/interfaces/IATokenWithPool.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {ILendingPool} from "../munged/l1/interfaces/ILendingPool.sol";
import {IAaveIncentivesController} from "../munged/l1/interfaces/IAaveIncentivesController.sol";
import "./DummyERC20ExtendedImpl.sol";

contract ATokenWithPoolImpl is DummyERC20ExtendedImpl {
    address public UNDERLYING_ASSET_ADDRESS;
    ILendingPool public POOL;
    IAaveIncentivesController public INCENTIVES_CONTROLLER;

    constructor(ILendingPool _POOL, address owner_)
        DummyERC20ExtendedImpl(owner_)
    {
        require(address(_POOL) == owner_, "wrong owner");
    }

    /**
     * @dev Burns aTokens from `user` and sends the equivalent amount of underlying to `receiverOfUnderlying`
     * - Only callable by the LendingPool, as extra state updates there need to be managed
     * @param user The owner of the aTokens, getting them burned
     * @param receiverOfUnderlying The address that will receive the underlying
     * @param amount The amount being burned
     * @param index The new liquidity index of the reserve
     **/
    function burn(
        address user,
        address receiverOfUnderlying,
        uint256 amount,
        uint256 index
    ) external onlyOwner {
        super.burn(user, amount);
        IERC20(UNDERLYING_ASSET_ADDRESS).transfer(receiverOfUnderlying, amount);
    }

    /**
     * @dev Mints aTokens to `user` and sends the equivalent amount of underlying to `receiverOfUnderlying`
     * - Only callable by the LendingPool, as extra state updates there need to be managed
     * @param user The owner of the aTokens, getting them burned
     * @param amount The amount being burned
     * @param index The new liquidity index of the reserve
     **/
    function mint(
        address user,
        uint256 amount,
        uint256 index
    ) external onlyOwner returns (bool) {
        return super.mint(user, amount);
    }

    /**
     * @dev Returns the scaled total supply of the variable debt token.
     * @return the scaled total supply
     **/
    function scaledTotalSupply() public view returns (uint256) {
        return super.totalSupply();
    }

    /**
     * @dev Returns the address of the incentives controller contract
     **/
    function getIncentivesController()
        external
        view
        returns (IAaveIncentivesController)
    {
        return INCENTIVES_CONTROLLER;
    }

    /**
     * @dev returns the underlying asset address
     **/
    function getUnderlyingAsset() external view returns (address) {
        return UNDERLYING_ASSET_ADDRESS;
    }
}
