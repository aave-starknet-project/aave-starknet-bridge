


# AAVE Starknet Bridge

[![Tests](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/cdnjs/cdnjs.svg?style=flat)](https://github.com/aave-starknet-project/aave-starknet-bridge/pulls)
[![Issues](https://img.shields.io/github/issues-raw/tterb/PlayMusic.svg?maxAge=25000)](https://github.com/aave-starknet-project/aave-starknet-bridge/issues)


:warning: This codebase is still in an experimental phase, has not been audited, might contain bugs and should not be used in production.

## Overview

For Aave, one of the main current and future goals is growth of liquidity and user base. As seen on side-chains with low transaction cost like Polygon or Avalanche, there is high demand to use the Aave protocol with small amounts to earn high yield.

As a rollup/execution layer, one of the main goals for Starknet in the medium term is more user acquisition, and that comes with use cases in the network; in this case being able to deposit on Aave Ethereum to earn high yield, without the Aave Ethereum high transaction costs.

Both previous points show that having an initial phase on the Aave <> Starknet integration allowing deposit/withdrawal on Aave Ethereum by exclusively transacting on Starknet can be a good idea, target-wise.

The bridge allows users to deposit and withdraw `staticATokens` - wrappers converting balance-increasing [aTokens]( https://docs.aave.com/developers/tokens/atoken) into exchange-rate-increasing staticATokens - on StarkNet and get wrapped tokens `ETHStaticATokens` that allow users to keep enjoying the same rewards as on L1. 

The bridge was also shaped for liquidity providers who are able to assume Ethereum cost of deposit/withdrawal, as they transact amounts big enough. They will deposit on Aave Ethereum, bridge the staticATokens to Starknet and make them available for users there to buy and hold, accruing this way yield from L1. 

## Architecture


![bridge_aave_v3](https://user-images.githubusercontent.com/37840702/164996342-d6deb978-e850-401f-8fb1-f91a11474784.png)

## Contracts

`L1`
  * `StaticATokenLMNew` - an updated implementation of staticATokens which makes it possible to update its respective L2 token by sending the latest `accRewardsPerToken` on token transfer or when explicitly triggered to do so.
  *  `TokenBridge` -  handles rewards update, deposit & withdrawal of staticATokens 
  *  `Proxy` - A proxy implementation 

`L2`
  * `ETHStaticAToken` - Tokens on Starknet equivalent to each staticAToken on Ethereum mainnet. Contains the same logic for tracking user rewards as staticATokens and has the same `_accRewardsPerToken`.
  * `claimable` - tracks users' pending rewards and tracks each user `_accRewardsPerToken`
  * `token_bridge` - is responsible for:
    * bridging the staticATokens to and from L2. Minting and burning ETHStaticATokens on message from L1. 
    * bridging rewAAVE token back to L1
    * updating `_accRewardsPerToken` for each ETHStaticAToken on message from L1 
  * `rewAAVE` - a very basic ERC20 to represent the rewards on L2
  *  `proxy` - a generic implementation of a proxy in starknet

## ETHStaticATokens on L2

Natively, on Aave aTokens grow in balance, not in value. To be able to create this kind of model, it is important to wrap them before bridging, converting them in a token that grows in value, not in balance.

ETHStaticATokens are an implementation of the wrapped aTokens that will continuously increase in value on Starknet because they are backed by the increasing StaticATokens amounts locked in the bridge contract on Ethereum. The ETHStaticATokens can then be converted back to staticATokens + rewards.

## Bridging staticATokens from L1<>L2

- To deposit: 

Users can either bridge their staticAToken to L2 by calling `deposit()` on `TokenBridge`, or deposit the underlying asset of the staticAToken directly by calling the `depositUnderlying()`.

- To withdraw:

To bridge their staticATokens back to L1, users need to call the `initiate_withdraw` on L2 `token_bridge`. 

 


## Synchronisation of rewards on L1 <> L2

The challenge here was to allow users to continue enjoying the same rewards as on L1 by continously updating -whenever is possible- the `acc_rewards_per_token` of all ETHStaticATokens to match the value of their respective StaticATokens on L1. To achieve that, we have updated the `_beforeBeforeTokenTransfer()` function on the new implementation of staticATokens (`StaticATokensLMNew.sol`) to send a message (through the bridge) with the latest `acc_rew_per_token` value. 
We update the `acc_rewards_per_token` on each ETHStaticAToken by calling `push_acc_rewards_per_token`, and
the tracking of rewards is ensured by `claimable.cairo`.

## Claiming rewards on L2


To claim rewards users need to call `claim_rewards` on ETHStaticAToken contract. The ETHStaticAToken will then be calling the bridge to mint the due `rewAAVE` tokens to the user.

## Bridging rewards from L2->L1

To bridge their rewards to L1, users will have to call `bridge_rewards` on the L2 `token_bridge` providing the `amount` to be bridged. The L1 bridge will be claiming pending rewards to self from all staticATokens in a loop until having enough rewards balance to transfer it to users. The claiming ans transferring of rewards is handled by `receiveRewards()` on `TokenBridge.sol`


## Proxies

All calls made to the following contracts will be handled by a proxy who delegates the calls to the available implementation of these contracts.
- Token bridge on L2 
- ETHStaticATokens 
- Token bridge on L1 

Using proxies during the early release of the bridge will allow us to upgrade and continuously improve the contracts implementations. 


## Governance

L2

* `ETHStaticATokens` are controlled by the `token_bridge`
* `rewAAVE` token is owned by the `token_bridge`

L1
  

## Deployment 


### Environment


Before installing cairo you'll need to install GMP

```bash
sudo apt install -y libgmp3-dev # linux
brew install gmp # mac
```

Install node

```bash
nvm install 16
```

First let's install all our project dependencies
```bash
yarn install
```

To enable our pre-hooks commits we need to install husky by running: 

```bash
yarn prepare
```

Let’s create a virtual environment. It helps isolate your project’s requirements from your global Python environment.

```bash
python3.7 -m venv .venv
source .venv/bin/activate
```
Install poetry for dependencies management

```bash
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
yarn testnet:starknet
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


