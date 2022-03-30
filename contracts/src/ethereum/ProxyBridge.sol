// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.6.12;

import "@joriksch/sg-contracts/src/starkware/contracts/upgrade/Proxy.sol";

contract ProxyBridge is Proxy {
    constructor() public Proxy(0) {}
}