// SPDX-License-Identifier: Apache-2.0.
pragma solidity 0.6.12;

import "@aave/protocol-v2/contracts/dependencies/openzeppelin/contracts/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor(string memory name, string memory symbol)
        public
        ERC20(name, symbol)
    {}
}
