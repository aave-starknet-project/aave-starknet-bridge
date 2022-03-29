// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract L1Token is ERC20 {
    constructor(uint256 amount) ERC20("L1Token", "L1T") {
        _mint(msg.sender, amount);
    }
}