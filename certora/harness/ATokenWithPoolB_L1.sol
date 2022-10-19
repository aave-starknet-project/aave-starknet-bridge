// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {ATokenWithPool} from "./ATokenWithPool.sol";

contract ATokenWithPoolB_L1 is ATokenWithPool {
    constructor(address pool) ATokenWithPool(pool) {}
}
