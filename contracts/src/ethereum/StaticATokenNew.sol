// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {ILendingPool} from "@swp0x0/protocol-v2/contracts/interfaces/ILendingPool.sol";
import {StaticAToken} from "@swp0x0/protocol-v2/contracts/protocol/tokenization/StaticAToken.sol";

contract StaticATokenNew is StaticAToken {
    address private _l1TokenBridge;

    constructor(
        ILendingPool lendingPool,
        address aToken,
        string memory wrappedTokenName,
        string memory wrappedTokenSymbol,
        address l1TokenBridge
    )
        public
        StaticAToken(lendingPool, aToken, wrappedTokenName, wrappedTokenSymbol)
    {
        _l1TokenBridge = l1TokenBridge;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (_l1TokenBridge != address(0x0)) {
            _updateL2TokenState();
        }
    }

    function _updateL2TokenState() internal {
        (bool success, ) = _l1TokenBridge.call(
            abi.encodeWithSignature(
                "sendMessageStaticAToken(address,uint256)",
                address(this),
                // the function getAccRewardsPerToken is not implemented yet
                100
            )
        );
        require(success, "External call to TokenBridge failed");
    }
}
