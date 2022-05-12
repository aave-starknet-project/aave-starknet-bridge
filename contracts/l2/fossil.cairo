%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256

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

func set_fossil{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(address : felt):
    fossil.write(address)
    return ()
end

func set_slot{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    slot : StorageSlot
):
    asset_data_slot.write(slot_)
    return ()
end

func get_asset_data{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
    block : felt,
    account_160 : felt,
    slot : StorageSlot,
    proof_sizes_bytes_len : felt,
    proof_sizes_bytes : felt*,
    proof_sizes_words_len : felt,
    proof_sizes_words : felt*,
    proofs_concat_len : felt,
    proofs_concat : felt*,
) -> (emissionPerSecond : felt, index : felt, lastUpdateTimestamp : felt):
    # check the proof is for the right slot
    let (slot_) = asset_data_slot.read()
    with_attr error_message("Wrong storage slot"):
        assert slot.word_1 = slot_.word_1
        assert slot.word_2 = slot_.word_2
        assert slot.word_3 = slot_.word_3
        assert slot.word_4 = slot_.word_4
    end

    # check the proof is for a later block
    let (last_update_) = last_update.read()
    let (le) = uint256_le(last_update_, last_update_)
    with_attr error_message("Rejecting old block"):
        assert le = 1
    end

    let (fossil_) = fossil.read()
    let (asset_data : Uint256) = IFossil.get_storage_uint(
        fossil_,
        block,
        account_160,
        slot,
        proof_sizes_bytes_len,
        proof_sizes_bytes,
        proof_sizes_words_len,
        proof_sizes_words,
        proofs_concat_len,
        proofs_concat,
    )
end
