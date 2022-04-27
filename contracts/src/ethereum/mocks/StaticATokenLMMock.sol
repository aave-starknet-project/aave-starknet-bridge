// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import {StaticATokenLM} from "@swp0x0/protocol-v2/contracts/protocol/tokenization/StaticATokenLM.sol";

contract StaticATokenLMMock is StaticATokenLM {
    constructor(address l1TokenBridge) public StaticATokenLM(l1TokenBridge) {}
}
