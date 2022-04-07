%lang starknet

from starkware.cairo.common.uint256 import Uint256

@contract_interface
namespace IETHStaticAToken:

    func name() -> (name: felt):
    end

    func symbol() -> (symbol: felt):
    end

    func totalSupply() -> (totalSupply: Uint256):
    end

    func decimals() -> (decimals: felt):
    end

    func balanceOf(account: felt) -> (balance: Uint256):
    end

    func allowance(owner: felt, spender: felt) -> (remaining: Uint256):
    end

    func transfer(recipient: felt, amount: Uint256) -> (success: felt):
    end

    func transferFrom(
            sender: felt, 
            recipient: felt, 
            amount: Uint256
        ) -> (success: felt):
    end

    func approve(spender: felt, amount: Uint256) -> (success: felt):
    end

    func increaseAllowance(spender: felt, added_value: Uint256) -> (success: felt):
    end

    func decreaseAllowance(spender: felt, subtracted_value: Uint256) -> (success: felt):
    end

    func mint(recipient: felt, amount: Uint256):
    end

    func claimRewards(user: felt, recipient: felt) -> (claimed: Uint256):
    end

    func increaseLifetimeRewards(amount: Uint256):
    end

    func burn(account : felt, amount : Uint256):
    end
end
