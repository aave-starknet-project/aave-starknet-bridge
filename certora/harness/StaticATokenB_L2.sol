// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import "./DummyStaticATokenImpl.sol";

contract StaticATokenB_L2 is DummyStaticATokenImpl {
    constructor(address Owner, IBridge_L2 L2Bridge)
        DummyStaticATokenImpl(Owner, L2Bridge)
    {}
}
