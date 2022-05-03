// SPDX-License-Identifier: Apache-2.0.
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@swp0x0/protocol-v2/contracts/protocol/lendingpool/LendingPool.sol";

contract LendingPoolMock is LendingPool {
    constructor() public LendingPool() {}
}
