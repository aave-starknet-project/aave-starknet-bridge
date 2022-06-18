%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin, BitwiseBuiltin
from starkware.cairo.common.uint256 import (
    Uint256,
    uint256_and,
    uint256_le,
    uint256_unsigned_div_rem,
)

from contracts.l2.tokens.incentivized_erc20 import last_update

struct StorageSlot:
    member word_1 : felt
    member word_2 : felt
    member word_3 : felt
    member word_4 : felt
end

@contract_interface
namespace IFossil:
    func get_storage_uint(
        block : felt,
        account_160 : felt,
        slot : StorageSlot,
        proof_sizes_bytes_len : felt,
        proof_sizes_bytes : felt*,
        proof_sizes_words_len : felt,
        proof_sizes_words : felt*,
        proofs_concat_len : felt,
        proofs_concat : felt*,
    ) -> (res : Uint256):
    end
end

@storage_var
func fossil() -> (address : felt):
end

@storage_var
func asset_data_slot() -> (slot : StorageSlot):
end

@storage_var
func incentives_controller() -> (controller : felt):
end

func get_asset_data{
    syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr, bitwise_ptr : BitwiseBuiltin*
}(
    block : Uint256,
    proof_sizes_bytes_len : felt,
    proof_sizes_bytes : felt*,
    proof_sizes_words_len : felt,
    proof_sizes_words : felt*,
    proofs_concat_len : felt,
    proofs_concat : felt*,
) -> (index : Uint256):
    alloc_locals

    # check the proof is for the right slot
    let (slot) = asset_data_slot.read()
    let (account_160) = incentives_controller.read()
    let (fossil_) = fossil.read()

    # check the proof is for a later block
    let (last_update_) = last_update.read()
    let (le) = uint256_le(last_update_, block)
    with_attr error_message("Rejecting old block"):
        assert le = 1
    end

    let (asset_data : Uint256) = IFossil.get_storage_uint(
        fossil_,
        block.low,
        account_160,
        slot,
        proof_sizes_bytes_len,
        proof_sizes_bytes,
        proof_sizes_words_len,
        proof_sizes_words,
        proofs_concat_len,
        proofs_concat,
    )

    # let mask_emission_per_second   = Uint256(low=0x00000000000000000000000000000000, high=0xffffffffffffffffffffffffff000000)
    # let emission_per_second_rs     = Uint256(low=0x00000000000000000000000000000000, high=0x00000000000000000000000001000000)
    let mask_index = Uint256(
        low=0xffffffffffffffffffff000000000000, high=0x00000000000000000000000000ffffff
    )
    let index_rs = Uint256(
        low=0x00000000000000000001000000000000, high=0x00000000000000000000000000000000
    )
    # let mask_last_update_timestamp = Uint256(low=0x00000000000000000000ffffffffff00, high=0x00000000000000000000000000000000)
    # let last_update_timestamp_rs   = Uint256(low=0x00000000000000000000000000000100, high=0x00000000000000000000000000000000)

    # let (masked_emission_per_second) = uint256_and(asset_data, mask_emission_per_second)
    let (masked_index) = uint256_and(asset_data, mask_index)
    # let (masked_last_update_timestamp) = uint256_and(asset_data, mask_last_update_timestamp)

    # let (emission_per_second)   = uint256_unsigned_div_rem(masked_emission_per_second, emission_per_second_rs)
    let (index, _) = uint256_unsigned_div_rem(masked_index, index_rs)
    # let (last_update_timestamp) = uint256_unsigned_div_rem(masked_last_update_timestamp, last_update_timestamp_rs)

    return (index)
end
