%lang starknet

from starkware.cairo.common.uint256 import Uint256
from contracts.l2.lib.wad_ray_math import Ray
from contracts.l2.fossil import StorageSlot

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

    func push_rewards_index(block_number : Uint256, rewards_index : Ray):
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

    func get_rewards_index() -> (rewards_index : Ray):
    end

    func get_fossil() -> (fossil : felt):
    end

    func get_slot() -> (slot : StorageSlot):
    end

    func get_incentives_controller() -> (controller : felt):
    end

    func set_l2_bridge(l2_bridge : felt):
    end

    func set_slot(slot : StorageSlot):
    end

    func set_fossil(fossil_ : felt):
    end

    func set_incentives_controller(controller : felt):
    end
end
