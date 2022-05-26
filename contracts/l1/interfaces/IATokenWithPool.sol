// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IAToken} from "./IAToken.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";

interface IATokenWithPool is IAToken {
    function POOL() external view returns (IPool);
}
