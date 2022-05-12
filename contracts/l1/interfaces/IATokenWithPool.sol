pragma solidity 0.6.12;

import {IAToken} from "@swp0x0/protocol-v2/contracts/interfaces/IAToken.sol";
import {ILendingPool} from "@swp0x0/protocol-v2/contracts/interfaces/ILendingPool.sol";

interface IATokenWithPool is IAToken {
    function POOL() external view returns (ILendingPool);
}
