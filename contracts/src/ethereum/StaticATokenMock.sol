// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import {StaticATokenLM} from "@swp0x0/protocol-v2/contracts/protocol/tokenization/StaticATokenLM.sol";

contract StaticATokenMock is StaticATokenLM {
    constructor() public StaticATokenLM() {}

    // address private _l1TokenBridge;

    // constructor(address l1TokenBridge) public StaticATokenLM() {
    //     _l1TokenBridge = l1TokenBridge;
    // }

    // function _transfer(
    //     address sender,
    //     address recipient,
    //     uint256 amount
    // ) internal override {
    //     _beforeBeforeTokenTransfer(sender, recipient, amount);
    //     super._transfer(sender, recipient, amount);
    // }

    // function _beforeBeforeTokenTransfer(
    //     address from,
    //     address to,
    //     uint256 amount
    // ) internal {
    //     if (_l1TokenBridge != address(0x0)) {
    //         _updateL2TokenState();
    //     }
    // }

    // function _updateL2TokenState() internal {
    //     (bool success, ) = _l1TokenBridge.call(
    //         abi.encodeWithSignature(
    //             "sendMessageStaticAToken(address,uint256)",
    //             address(this),
    //             // the function getAccRewardsPerToken is not implemented yet
    //             this.getAccRewardsPerToken()
    //         )
    //     );
    //     require(success, "External call to TokenBridge failed");
    // }
}
