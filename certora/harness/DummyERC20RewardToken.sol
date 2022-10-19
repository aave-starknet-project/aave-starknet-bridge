// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;
import "./DummyERC20ExtendedImpl.sol";

contract DummyERC20RewardToken is DummyERC20ExtendedImpl {
    constructor(address owner_) DummyERC20ExtendedImpl(owner_) {}
}
