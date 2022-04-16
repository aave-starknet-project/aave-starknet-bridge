// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RewAAVE is ERC20 {
    constructor(uint256 amount) ERC20("RewAave", "rAave") {
        _mint(msg.sender, amount);
    }
}
