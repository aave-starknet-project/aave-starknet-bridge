// SPDX-License-Identifier: Apache-2.0.
pragma solidity 0.6.12;

import "@swp0x0/protocol-v2/contracts/protocol/tokenization/AToken.sol";

contract ATokenMock is AToken {
    constructor() public AToken() {}
}
