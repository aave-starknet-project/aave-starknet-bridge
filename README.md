# L2 AAVE rewards

This project aims to provide a bridge for staticATokens such that the rewards
for the token can be collected on Starknet and the tokens themselves can be
bought and sold without having to pay the high gas cost on Ethereum.

## Architecture

<!-- insert architecture image -->

## Testing

The project is tested using [hardhat](https://hardhat.org/), the [starknet
hardhat plugin](https://github.com/Shard-Labs/starknet-hardhat-plugin),
[starknet-devnet](https://github.com/Shard-Labs/starknet-devnet), and
[ganache](https://trufflesuite.com/ganache/index.html).

### Prerequisites

```bash
yarn global add ganache

python3.7 -m venv .venv
source .venv/bin/activate
pip install starknet-devnet
```

### Start the testnets

It's wise to do this in two separate shells

```bash
ganache
```

```bash
starknet-devnet
```

### Run the tests

```
yarn test
```
