// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Proxy.sol";

contract ProxyToken {
    address public implementation;

    constructor(address implementation_) {
        implementation = implementation_;
    }

    function _implementation() internal view virtual returns (address) {
        return implementation;
    }
}
