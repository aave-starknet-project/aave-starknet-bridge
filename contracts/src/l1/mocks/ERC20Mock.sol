// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor(string memory name, string memory symbol) public ERC20(name, symbol) {}
}
