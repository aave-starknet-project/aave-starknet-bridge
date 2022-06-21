%lang starknet

from starkware.cairo.common.uint256 import Uint256
from contracts.l2.lib.wad_ray_math import Wad

@contract_interface
namespace Istatic_a_token:
    func name() -> (name : felt):
    end

    func symbol() -> (symbol : felt):
    end

    func totalSupply() -> (totalSupply : Uint256):
    end

    func decimals() -> (decimals : felt):
    end

    func balanceOf(account : felt) -> (balance : Uint256):
    end

    func allowance(owner : felt, spender : felt) -> (remaining : Uint256):
    end

    func transfer(recipient : felt, amount : Uint256) -> (success : felt):
    end

    func transferFrom(sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
    end

    func approve(spender : felt, amount : Uint256) -> (success : felt):
    end

    func increaseAllowance(spender : felt, added_value : Uint256) -> (success : felt):
    end

    func decreaseAllowance(spender : felt, subtracted_value : Uint256) -> (success : felt):
    end

    func mint(recipient : felt, amount : Uint256):
    end

    func claim_rewards(recipient : felt) -> (claimed : Uint256):
    end

    func increaseLifetimeRewards(amount : Uint256):
    end

    func burn(account : felt, amount : Uint256):
    end

    func push_rewards_index(block_number : Uint256, rewards_index : Wad):
    end

    func initialize_static_a_token(
        name : felt,
        symbol : felt,
        decimals : felt,
        initial_supply : Uint256,
        recipient : felt,
        controller : felt,
    ):
    end

    func get_rewards_index() -> (rewards_index : Wad):
    end
end
