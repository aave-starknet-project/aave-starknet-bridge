import web3
from web3.exceptions import InvalidAddress
from typing import Dict, List
import os
from dotenv import load_dotenv
import logging
from typing import Dict, List
from web3._utils.encoding import (
    pad_bytes,
)
from trie import (
    HexaryTrie,
)
import rlp
from eth_utils import (
    keccak,
)
from eth_typing.encoding import HexStr
from web3 import Web3
from web3.contract import Contract
from starkware.starknet.public.abi import get_storage_var_address

logger = logging.getLogger(__name__)


def format_proof_nodes(proof):
    trie_proof = []
    for rlp_node in proof:
        trie_proof.append(rlp.decode(bytes(rlp_node)))
    return trie_proof


class Verifier:

    def __init__(
        self,
        web3: Web3,

    ):
        self.web3 = web3

    def get_proofs(self, account, block_number, slot):

        checkSumAddress = self.web3.toChecksumAddress(account)
        proof = self.web3.eth.get_proof(
            checkSumAddress, slot, block_number)

        proofs = {"account_proof": [x.hex() for x in proof.accountProof],
                  "storage_proof": {"key": proof.storageProof[0].key.hex(), "proof": [x.hex() for x in proof.storageProof[0].proof], "value": proof.storageProof[0].value.hex()},
                  "storageHash": proof.storageHash.hex()}

        return proofs

    def verify_storage(self, slot, value, account, block_number):
        checkSumAddress = self.web3.toChecksumAddress(account)
        proof = self.web3.eth.get_proof(
            checkSumAddress, [slot], block_number)
        trie_key = keccak(pad_bytes(b'\x00', 32, proof.storageProof[0].key))
        root = proof.storageHash
        rlp_value = rlp.encode(bytes.fromhex(value[2:]))
        if rlp_value == HexaryTrie.get_from_proof(
            root, trie_key, format_proof_nodes(proof.storageProof[0].proof)
        ):
            return {"valid": True}
        else:
            return {"valid": False}


def main():

    load_dotenv()
    INFURA_API_KEY = os.environ["INFURA_API_KEY"]
    http_provider = 'https://mainnet.infura.io/v3/%s' % (INFURA_API_KEY)
    w3 = web3.Web3(web3.HTTPProvider(http_provider))
    assert w3.isConnected(
    ), f"Cannot connect to http provider {http_provider}."

    proof_fetcher = Verifier(
        web3=w3)
    proof = proof_fetcher.get_proofs(
        "0x91a16914a7a3b5f0bFC66A12547D03DaB9bbb873", "latest", [0])
    isValid = proof_fetcher.verify_storage(
        0, "0x01", "0x91a16914a7a3b5f0bFC66A12547D03DaB9bbb873", "latest")

    # logger.info(isValid)
    print(proof)


if __name__ == "__main__":
    main()
