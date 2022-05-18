pragma solidity 0.6.12;

import {IAToken} from "./IAToken.sol";
import {ILendingPool} from "./ILendingPool.sol";

interface IATokenWithPool is IAToken {
    function POOL() external view returns (ILendingPool);
}
