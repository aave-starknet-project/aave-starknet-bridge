pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

import {IERC20_Extended} from "./IERC20_Extended.sol";

interface IStaticAToken is IERC20_Extended {
    function claimRewards(address caller) external returns (uint256);
}
