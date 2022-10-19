// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "./DummyERC20Impl.sol";

contract DummyERC20ExtendedImpl is DummyERC20Impl {
    address internal _owner;

    constructor(address owner_) {
        _owner = owner_;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "only owner can access");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Mints `amount` tokens to `user`
     * @param user The address receiving the minted tokens
     * @param amount The amount of tokens getting minted
     * @return `true` if the entire action executed successfully
     */
    function mint(address user, uint256 amount)
        public
        onlyOwner
        returns (bool)
    {
        require(user != address(0), "attempted to mint to the 0 address");
        // shortcut to save gas
        require(amount != 0, "attempt to mint 0 tokens");

        // Updating the total supply
        uint256 oldTotalSupply = totalSupply();
        t = oldTotalSupply + amount;

        // Updating the balance of user to which to tokens were minted
        uint256 oldAccountBalance = balanceOf(user);
        b[user] = oldAccountBalance + amount;

        return true;
    }

    /**
     * @dev Burns `amount` tokens from `user`
     * @param user The owner of the tokens, getting them burned
     * @param amount The amount being burned
     **/
    function burn(address user, uint256 amount) public onlyOwner {
        require(user != address(0), "attempted to burn funds from address 0");
        // shortcut to save gas
        require(amount != 0, "attempt to burn 0 tokens");

        // Updating the total supply
        uint256 oldTotalSupply = totalSupply();
        t = oldTotalSupply - amount;

        // Updating the balance of user to which to tokens were minted
        uint256 oldAccountBalance = balanceOf(user);
        b[user] = oldAccountBalance - amount;
    }
}
