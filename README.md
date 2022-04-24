# Starknet AAVE rewards

A staticAToken bridge to Starknet for cheap AAVE rewards collection and token
exchange.

## Architecture

![Starknet AAVE rewards architectural diagram](resources/architecture.png)
## Testing

The project is tested using [hardhat](https://hardhat.org/), the [starknet
hardhat plugin](https://github.com/Shard-Labs/starknet-hardhat-plugin) and
[starknet-devnet](https://github.com/Shard-Labs/starknet-devnet).

### Prerequisites

Before installing cairo you'll need to install GMP

```bash
sudo apt install -y libgmp3-dev # linux
brew install gmp # mac
```

```bash
nvm install 16

yarn
yarn prepare # to setup the pre-commit hook

python3.7 -m venv .venv
source .venv/bin/activate
pip install poetry
poetry install
```

### Build the cairo files

```bash
yarn compile
```

### Start the testnets

First get an [alchemy](https://www.alchemy.com/) key and write the following to
`.env/private`

```bash
export $ALCHEMY_KEY="<your key>"
```

Then load all the environment variables

```bash
source .evn/*
```

Then start the testnets. It's wise to do this in two separate shells.

```bash
yarn testnet:ganache
```

```bash
yarn testnet:starknet
```

### Run the tests

```
yarn test
```

### Notes

When transferring the token across the bridge the unclaimed rewards to date
will still be associated with the owners account on L1. These old rewards can
not be claimed on Starknet.
