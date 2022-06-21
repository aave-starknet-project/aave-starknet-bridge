%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256, uint256_add, uint256_sub, uint256_le
from starkware.starknet.common.syscalls import get_caller_address

from contracts.l2.lib.wad_ray_math import (
    Wad, wad_to_ray, wad_add, wad_sub, wad_mul, Ray, ray_add, ray_sub, ray_mul_no_rounding,
    ray_to_wad, ray_to_wad_no_rounding)
from openzeppelin.token.erc20.library import ERC20_balanceOf

@storage_var
func l2_bridge() -> (address : felt):
end

@storage_var
func last_update() -> (block_number : Uint256):
end

@storage_var
func rewards_index() -> (res : Wad):
end

# user => rewards index at last interaction (in RAYs)
@storage_var
func user_snapshot_rewards_index(user : felt) -> (rewards_index : Wad):
end

# user => unclaimed_rewards (in RAYs)
@storage_var
func unclaimed_rewards(user : felt) -> (unclaimed : Wad):
end

func update_user_snapshot_rewards_index{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(user : felt):
    let (rewards_index_) = rewards_index.read()
    user_snapshot_rewards_index.write(user, rewards_index_)
    return ()
end

func update_user{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(user : felt):
    alloc_locals
    let (balance) = ERC20_balanceOf(user)
    if balance.high + balance.low == 0:
        update_user_snapshot_rewards_index(user)
    else:
        let (pending) = incentivized_erc20_get_pending_rewards(user)
        let (unclaimed) = incentivized_erc20_get_user_unclaimed_rewards(user)
        let (unclaimed, overflow) = wad_add(unclaimed, pending)
        assert overflow = 0
        unclaimed_rewards.write(user, unclaimed)
        update_user_snapshot_rewards_index(user)
    end
    return ()
end

func incentivized_erc20_before_token_transfer{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(from_ : felt, to : felt):
    alloc_locals
    if from_ == 0:
        # do nothing
        tempvar syscall_ptr = syscall_ptr
        tempvar pedersen_ptr = pedersen_ptr
        tempvar range_check_ptr = range_check_ptr
    else:
        update_user(from_)
        tempvar syscall_ptr = syscall_ptr
        tempvar pedersen_ptr = pedersen_ptr
        tempvar range_check_ptr = range_check_ptr
    end
    if to == 0:
        # do nothing
    else:
        update_user(to)
    end
    return ()
end

func incentivized_erc20_get_pending_rewards{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(user : felt) -> (
        pending_rewards : Wad):
    alloc_locals
    let (balance) = ERC20_balanceOf(user)
    let (balance_in_ray) = wad_to_ray(Wad(balance))
    let (rewards_index_) = rewards_index.read()
    let (user_snapshot_rewards_index_) = user_snapshot_rewards_index.read(user)
    let (user_snapshot_rewards_index_ray) = wad_to_ray(user_snapshot_rewards_index_)
    let (rewards_index_ray) = wad_to_ray(rewards_index_)
    let (rewards_index_since_last_interaction) = ray_sub(
        rewards_index_ray, user_snapshot_rewards_index_ray)
    let (pending_rewards) = ray_mul_no_rounding(
        rewards_index_since_last_interaction, balance_in_ray)
    let (pending_) = ray_to_wad_no_rounding(pending_rewards)
    return (pending_)
end

func incentivized_erc20_get_claimable_rewards{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(user : felt) -> (
        incentivized_erc20_rewards : Wad):
    alloc_locals
    let (unclaimed_rewards_) = unclaimed_rewards.read(user)
    let (pending) = incentivized_erc20_get_pending_rewards(user)
    let (incentivized_erc20_rewards, overflow) = wad_add(unclaimed_rewards_, pending)
    assert overflow = 0

    return (incentivized_erc20_rewards)
end

func incentivized_erc20_claim_rewards{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(user : felt) -> (
        rewards : Wad):
    alloc_locals
    let (rewards) = incentivized_erc20_get_claimable_rewards(user)

    unclaimed_rewards.write(user, Wad(Uint256(0, 0)))

    if rewards.wad.high + rewards.wad.low == 0:
        return (Wad(Uint256(0, 0)))
    else:
        update_user_snapshot_rewards_index(user)
        return (rewards)
    end
end

func incentivized_erc20_push_rewards_index{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        block_number : Uint256, new_rewards_index : Wad):
    alloc_locals
    incentivized_erc20_only_bridge()
    let (last_block_number) = last_update.read()
    # This is le because the rewards may update in a block
    let (le) = uint256_le(last_block_number, block_number)
    if le == 1:
        let (prev_index) = rewards_index.read()
        let (le) = uint256_le(prev_index.wad, new_rewards_index.wad)
        if le == 1:
            last_update.write(block_number)
            rewards_index.write(new_rewards_index)
            return ()
        else:
            return ()
        end
    else:
        return ()
    end
end

func incentivized_erc20_get_rewards_index{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (res : Wad):
    return rewards_index.read()
end

func incentivized_erc20_get_user_rewards_index{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(user : felt) -> (
        res : Wad):
    return user_snapshot_rewards_index.read(user)
end

func incentivized_erc20_get_user_unclaimed_rewards{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(user : felt) -> (
        res : Wad):
    return unclaimed_rewards.read(user)
end

func incentivized_erc20_get_last_update{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        block_number : Uint256):
    return last_update.read()
end

func incentivized_erc20_set_l2_bridge{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(l2_bridge_ : felt):
    l2_bridge.write(l2_bridge_)
    return ()
end

func incentivized_erc20_get_l2_bridge{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (l2_bridge_ : felt):
    return l2_bridge.read()
end

func incentivized_erc20_only_bridge{
        syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}():
    let (caller_address) = get_caller_address()
    let (l2_bridge_) = l2_bridge.read()
    with_attr error_message("Caller address should be bridge: {l2_bridge_}"):
        assert caller_address = l2_bridge_
    end
    return ()
end
