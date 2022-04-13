// SPDX-License-Identifier: Apache-2.0.
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@swp0x0/protocol-v2/contracts/dependencies/openzeppelin/contracts/ERC20.sol";
import "@swp0x0/protocol-v2/contracts/protocol/lendingpool/LendingPool.sol";
import "@swp0x0/protocol-v2/contracts/protocol/libraries/types/DataTypes.sol";
import "@swp0x0/protocol-v2/contracts/protocol/libraries/logic/ReserveLogic.sol";
import "@swp0x0/protocol-v2/contracts/protocol/libraries/logic/ValidationLogic.sol";
import "@swp0x0/protocol-v2/contracts/protocol/libraries/logic/GenericLogic.sol";

contract LendingPoolMock is LendingPool {
    constructor() public LendingPool() {}
}