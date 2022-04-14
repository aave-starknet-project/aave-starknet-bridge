// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import "@aave/core-v3/contracts/mocks/helpers/MockIncentivesController.sol";

contract IncentivesControllerMock is MockIncentivesController {
    constructor() public MockIncentivesController() {}
}
