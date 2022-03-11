// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.8.9;

import "@joriksch/fossil/contracts/ethereum/L1MessagesSender.sol";
import "@joriksch/fossil/contracts/ethereum/interfaces/IStarknetCore.sol";

contract FossilL1 is L1MessagesSender {
    constructor(IStarknetCore starknetCore_, uint256 l2RecipientAddr_)
      L1MessagesSender(starknetCore_, l2RecipientAddr_) {
    }
}
