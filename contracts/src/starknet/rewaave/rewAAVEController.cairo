%lang starknet

from starkware.cairo.common.uint256 import Uint256
from starkware.cairo.common.cairo_builtins import HashBuiltin

from openzeppelin.access.ownable import Ownable_initializer, Ownable_only_owner

struct storage_slot:
    member word_1 : felt
    member word_2 : felt
    member word_3 : felt
    member word_4 : felt
end

@contract_interface
namespace IFossil:
    func get_storage(
            block : felt, account_160 : felt, slot : storage_slot, proof_sizes_bytes_len : felt,
            proof_sizes_bytes : felt*, proof_sizes_words_len : felt, proof_sizes_words : felt*,
            proofs_concat_len : felt, proofs_concat : felt*) -> (
            res_bytes_len : felt, res_len : felt, res : felt*):
    end
end

@contract_interface
namespace IETHStaticAToken:
    func push_accRewardsPerToken(block, amount : Uint256):
    end
end

@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, fossil_address : felt):
    Ownable_initializer(owner)
    fossil.write(fossil_address)
    return ()
end

@storage_var
func fossil() -> (address : felt):
end

@external
func setFossil{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(address : felt):
    Ownable_only_owner()
    fossil.write(address)
    return ()
end

@external
func push_asset_update{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        block : felt, account_160 : felt, slot : storage_slot, proof_sizes_bytes_len : felt,
        proof_sizes_bytes : felt*, proof_sizes_words_len : felt, proof_sizes_words : felt*,
        proofs_concat_len : felt, proofs_concat : felt*):
    alloc_locals
    Ownable_only_owner()
    let (fossil_address) = fossil.read()

    # # show that account_160 is an l1 contract
    # let l2_token = l1_l2_token_map[account_160]
    # assert l2_token != 0
    let l2_token = 0

    let (res_bytes_len, res_len, res) = IFossil.get_storage(
        fossil_address,
        block,
        account_160,
        slot,
        proof_sizes_bytes_len,
        proof_sizes_bytes,
        proof_sizes_words_len,
        proof_sizes_words,
        proofs_concat_len,
        proofs_concat)

    # convert res to Uint256
    let (amount) = bytes_to_uint256(res_bytes_len, res_len, res)
    IETHStaticAToken.push_accRewardsPerToken(l2_token, block, amount)

    return ()
end

func bytes_to_uint256(res_bytes_len, res_len, res : felt*) -> (uint : Uint256):
    with_attr error_message(
            "Error converting bytes to Uint256, expected no. bytes to be 32 not {res_bytes_len}"):
        assert res_bytes_len = 32
    end

    # TODO find out what the storage order is for uint256s

    return (Uint256(0, 0))
end
