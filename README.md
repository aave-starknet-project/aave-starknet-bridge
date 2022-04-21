

# AAVE Starknet Bridge

[![Tests](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/cdnjs/cdnjs.svg?style=flat)](https://github.com/aave-starknet-project/aave-starknet-bridge/pulls)
[![Issues](https://img.shields.io/github/issues-raw/tterb/PlayMusic.svg?maxAge=25000)](https://github.com/aave-starknet-project/aave-starknet-bridge/issues)

:warning: This codebase is still in an experimental phase, has not been audited, might contain bugs and should not be used in production.

## Overview!

For Aave, one of the main current and future goals is growth of liquidity and user base. As seen on side-chains with low transaction cost like Polygon or Avalanche, there is high demand to use the Aave protocol with small amounts to earn high yield.

As a rollup/execution layer, one of the main goals for Starknet in the medium term is more user acquisition, and that comes with use cases in the network; in this case being able to deposit on Aave Ethereum to earn high yield, without the Aave Ethereum high transaction costs.

Both previous points show that having an initial phase on the Aave <> Starknet integration allowing deposit/withdrawal on Aave Ethereum by exclusively transacting on Starknet can be a good idea, target-wise.

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

## Starknet ETHStaticATokens

Natively, on Aave aTokens grow in balance, not in value. To be able to create this kind of model, it is important to wrap them before bridging, converting them in a token that grows in value, not in balance. More information about something similar needed for the Aavegotchi gaming ecosystem can be found here [https://aavegotchi.substack.com/p/aaves-interest-bearing-atokens-on](https://aavegotchi.substack.com/p/aaves-interest-bearing-atokens-on), with ETHStaticATokens being quite close to the wrapped aToken just discussed.

ETHStaticATokens on L2 are an implementation of the wrapped aTokens that will continuously increase in value on Starknet because they are backed by the increasing StaticATokens amounts locked in the bridge contract on Ethereum. The ETHStaticATokens can then be converted back to staticATokens + rewards.

Main functions on the ETHStaticATokens: 
 - `claim_rewards` : allows users to claim rewAAVE to the provided recipient, the following function calls the `token_bridge` to mint reward tokens
 - `push_acc_rewards_per_token` : calling this function is restricted to the `token_bridge`
 
## Bridging tokens from L1 <> L2



## Synchronisation of rewards on L1 <> L2


## Claiming & bridging of rewards on L2

coming soon

## Proxies



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

### Start testnets

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


