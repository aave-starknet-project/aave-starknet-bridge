%lang starknet

struct StorageSlot:
    member word_1 : felt
    member word_2 : felt
    member word_3 : felt
    member word_4 : felt
end

@contract_interface
namespace IFossil:
    func get_storage(
        block: felt,
        account_160: felt,
        slot: StorageSlot,
        proof_sizes_bytes_len : felt,
        proof_sizes_bytes : felt*,
        proof_sizes_words_len : felt,
        proof_sizes_words : felt*,
        proofs_concat_len : felt,
        proofs_concat : felt*
    ) -> (
        res_bytes_len: felt,
        res_len: felt,
        res: felt*
    ):
    end
end

@contract_interface
namespace IETHStaticAToken:
    func pushAccRewardsPerToken(amount: Uint256):
    end
end


@external
func push_asset_update{
    syscall_ptr : felt*,
    pedersen_ptr : HashBuiltin*,
    range_check_ptr,
}(
    block: felt,
    account_160: felt,
    slot: StorageSlot,
    proof_sizes_bytes_len : felt,
    proof_sizes_bytes : felt*,
    proof_sizes_words_len : felt,
    proof_sizes_words : felt*,
    proofs_concat_len : felt,
    proofs_concat : felt*
):
  let (fossil_address) = fossil.read()

  ## show that account_160 is an l1 contract
  # let l2_token = l1_l2_token_map[account_160]
  # assert l2_token != 0

  let (res_bytes_len, res_len, res) = Fossil.get_storage(
    fossil_addres,
    block,
    account_160,
    slot,
    proof_sizes_bytes_len,
    proof_sizes_bytes,
    proof_sizes_words_len,
    proof_sizes_words,
    proofs_concat_len,
    proofs_concat
  )

  # convert res to Uint256
  let amount = bytes_to_uint256(res)
  IETHStaticAToken.pushAccRewardsPerToken(
    l2_token,
    amount
  )

  return ()
end


