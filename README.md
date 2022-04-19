

# AAVE Starknet Bridge

[![Tests](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/cdnjs/cdnjs.svg?style=flat)](https://github.com/aave-starknet-project/aave-starknet-bridge/pulls)
[![Issues](https://img.shields.io/github/issues-raw/tterb/PlayMusic.svg?maxAge=25000)](https://github.com/aave-starknet-project/aave-starknet-bridge/issues)

:warning: This codebase is still in an experimental phase, has not been audited, might contain bugs and should not be used in production.

## Overview!


The bridge allows users to deposit and withdraw `staticATokens` - wrappers converting balance-increasing [aTokens]( https://docs.aave.com/developers/tokens/atoken) into exchange-rate-increasing staticATokens - on StarkNet and get wrapped tokens `ETHStaticATokens` that allow users to keep enjoying the same rewards as in L1. 


## Architecture


![aave_bridge_2](https://user-images.githubusercontent.com/37840702/164106887-8da4cafe-0d86-4299-95fc-edd3fbbdbee0.png)

## Contracts

`L1`
  * `StaticATokenLMNew` - an updated implementation of staticATokens which makes it possible to update its respective L2 token by sending the latest `accRewardsPerToken` on token transfer or when explicitly triggered to do so.
  *  `TokenBridge` -  handles rewards update on L2 and deposit of staticAToken on L2
  *  `Proxy`


`L2`
  * `ETHStaticAToken` - Tokens on Starknet equivalent to each staticAToken on Ethereum mainnet. Contains the same logic for tracking user rewards as staticATokens and has the same `_accRewardsPerToken`.
  * `claimable` - tracks users' pending rewards and tracks each user `_accRewardsPerToken`
  * `token_bridge` - is responsible for:
    * bridging the staticATokens to and from L2. Minting and burning ETHStaticATokens on message from L1. 
    * bridging rewAAVE token back to L1
    * updating `_accRewardsPerToken` for each ETHStaticAToken on message from L1 
  * `rewAAVE` - a very basic ERC20 to represent the rewards on L2
  *  `proxy` - a generic implementation of a proxy in starknet


### Prerequisites

Before installing cairo you'll need to install GMP

```bash
sudo apt install -y libgmp3-dev # linux
brew install gmp # mac
```

```bash
nvm install 16

yarn
yarn prepare

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
To enable lite mode

```bash
starknet-devnet --lite-mode
```


Then start the testnets. It's wise to do this in two separate shells.

```bash
yarn testnet:ganache
```

```bash
<<<<<<< HEAD
yarn testnet:starknet
=======
yarn compile
>>>>>>> 36e7e65... WIP
```

### Run the tests
The project is tested using [hardhat](https://hardhat.org/), the [starknet
hardhat plugin](https://github.com/Shard-Labs/starknet-hardhat-plugin) and
[starknet-devnet](https://github.com/Shard-Labs/starknet-devnet).

```
yarn test
```

Contributors

<a href = "https://github.com/aave-starknet-project/aave-starknet-bridge/graphs/contributors">
<img src = "https://contrib.rocks/image?repo=aave-starknet-project/aave-starknet-bridge"/>
</a>


