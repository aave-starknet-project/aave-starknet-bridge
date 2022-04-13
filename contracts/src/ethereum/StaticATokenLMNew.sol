// SPDX-License-Identifier: Apache-2.0.
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// import {StaticATokenLM} from "@swp0x0/protocol-v2/contracts/protocol/tokenization/StaticATokenLM.sol";
import "./mocks/StaticATokenLMMock.sol";

contract StaticATokenLMNew is StaticATokenLMMock {
    address private _l1TokenBridge;

    constructor(address l1TokenBridge) public StaticATokenLMMock() {
        _l1TokenBridge = l1TokenBridge;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        _beforeBeforeTokenTransfer();
        super._transfer(sender, recipient, amount);
    }

    function _beforeBeforeTokenTransfer() internal {
        if (_l1TokenBridge != address(0x0)) {
            (bool success, ) = _l1TokenBridge.call(
                abi.encodeWithSignature(
                    "sendMessageStaticAToken(address,uint256)",
                    address(this),
                    // the function getAccRewardsPerToken is not implemented yet
                    // this.getAccRewardsPerToken()
                    100
                )
            );
            require(success, "External call to TokenBridge failed");
        }
    }
}
