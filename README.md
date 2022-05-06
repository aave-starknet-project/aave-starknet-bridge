
# AAVE Starknet Bridge

[![Tests](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml)
[![Tests](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/deploy.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/deploy.yml)
<a href="https://github.com/aave-starknet-project/aave-starknet-bridge/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/sourcerer-io/hall-of-fame.svg?colorB=ff0000"></a>

:warning: This codebase is still in an experimental phase, has not been audited, might contain bugs and should not be used in production.


## Table of contents
  * [Overview](#overview)
  * [Architecture](#architecture)
  * [Contracts](#contracts)
  * [ETHStaticATokens on L2](#ethstaticatokens-on-l2)
  * [Bridging aTokens from L1<>L2](#bridging-atokens-from-l1--l2)
    + [Transfer L1->L2](#transfer-l1--l2-)
    + [Transfer L2->L1](#transfer-l2--l1-)
  * [Synchronisation of rewards on L1 <> L2](#synchronisation-of-rewards-on-l1----l2)
  * [Claiming rewards on L2](#claiming-rewards-on-l2)
  * [Bridging rewards from L2->L1](#bridging-rewards-from-l2--l1)
  * [Proxies](#proxies)
  * [Governance](#governance)
  * [Environment](#environment)
  * [Build](#build-the-cairo-files)
  * [Network](#start-testnets)
  * [Tests](#run-the-tests)
  * [Deployment](#deployment)



## Overview

For Aave, one of the main current and future goals is growth of liquidity and user base. As seen on side-chains with low transaction cost like Polygon or Avalanche, there is high demand to use the Aave protocol with small amounts to earn high yield. That's why we brought to you an initial phase of the Aave <> Starknet integration allowing deposit/withdrawal on Aave Ethereum by exclusively transacting on Starknet.

The bridge allows users to deposit and withdraw their `aTokens` on StarkNet and get wrapped tokens `ETHStaticATokens` that allow users to keep enjoying the same rewards as on L1. 

The bridge is also shaped for liquidity providers who are able to assume Ethereum cost of deposit/withdrawal, as they transact large amounts. They will deposit on Aave Ethereum, bridge the staticATokens to Starknet and make them available for users there to buy and hold, accruing this way yield from L1. 

## Architecture
![aave_bridge_v2](https://user-images.githubusercontent.com/37840702/167132315-70923006-e5ef-42a8-a431-37bdb6c252c8.png)


## Contracts

`L1`
  *  `TokenBridge` -  handles rewards update, deposit & withdrawal of staticATokens, their corresponding aTokens and their underlying assets
  *  `Proxy` - A proxy implementation 

`L2`
  * `ETHStaticAToken` - Tokens on Starknet equivalent to each staticAToken on Ethereum mainnet. Contains the same logic for tracking user rewards as staticATokens and whose `rewards_index` is updated at each transfer of its L1 counterpart.
  * `claimable` - tracks users' claimable rewards and current reward index for each `ETHStaticAToken`
  * `rewAAVE` - an ERC20 representing the rewards on L2
  * `token_bridge` - is responsible for:
    * bridging the staticATokens to and from L2. Minting and burning ETHStaticATokens on message from L1. 
    * bridging rewAAVE token back to L1
    * updating `rewards_index` for each ETHStaticAToken on message from L1 
  *  `proxy` - a generic implementation of a proxy in cairo

## ETHStaticATokens on L2

Natively, Aave tokens grow in balance, not in value. To be able to create this kind of model, it is important to wrap them before bridging, converting them in a token that grows in value, not in balance.

ETHStaticATokens are an implementation of the wrapped aTokens that will continuously increase in value on Starknet because they are backed by the increasing staticATokens amounts locked in the bridge contract on Ethereum. ETHStaticATokens can then be bridged back to aTokens.

## Bridging aTokens from L1<>L2 <a name="bridging-atokens-from-l1--l2"></a>

### Transfer L1->L2: <a name="transfer-l1--l2-"></a>


Users can either bridge their aToken (let's say aDai) to L2 by calling `deposit()` on `TokenBridge`, or deposit the underlying asset (i.e Dai).
Users wil have to approve the bridge to spend the underlying `asset` tokens or `aTokens`, depending on the provided value for `fromAsset` argument when depositing.


Calling `deposit` will result in the following: 

If depositing underlying `asset`:

- The `asset` token will be transfered from the user account to the L1 bridge.
- The bridge will then deposit the `asset` token in the aToken.
- A message will be sent to the  L2 bridge with the amount of `ETHstaticAToken` to be transferred, the L1 token address and the recipient address as parameters.
- The token bridge on L2 will then be minting the correspending ETHStaticAToken of the L1 token to the user.

If depositing `aTokens`:

- The `aTokens` will be transfered from the user account to the L1 bridge.
- A message will be sent to the  L2 bridge with the amount to be transferred, the L1 token address and the recipient address as parameters.
- The token bridge on L2 will then be minting the correspending ETHStaticAToken of the L1 token to the user.

### Transfer L2->L1: <a name="transfer-l2--l1-"></a>

To bridge their staticATokens back to L1, users need to call `initiate_withdraw` on Starknet. 

Calling `initiate_withdraw` will result in the following:

- The amount to withdraw will be burned by the bridge
- A message will be sent to L1 with the L1 token address, the L1 recipient, the L2 rewards index and the amount
- The L1 bridge will then transfer the aTokens to the L1 recipient
- The L1 bridge also checks for any difference in the L1/L2 rewards index and transfers any unclaimed rewards to the L1 user


## Synchronisation of rewards on L1 <> L2 <a name="synchronisation-of-rewards-on-l1----l2"></a>

Starknet users will continue to enjoy the same rewards as on L1 after bridging their assets. To achieve that we continously update the `rewards_index` of all ETHStaticATokens to match the value of their respective aTokens on L1, by tracking the reward index on departure of the static token and sending the rewards accrued during the bridging process to the recipients address.


## Claiming rewards on L2


To claim rewards users need to call `claim_rewards` on ETHStaticAToken contract. The ETHStaticAToken will then call the bridge to mint the due `rewAAVE` tokens to the user.

## Bridging rewards from L2->L1  <a name="bridging-rewards-from-l2--l1"></a>
 


Calling `bridge_rewards`on L2 token bridge results in: 

- The bridged amount of `rewAAVE` tokens will be burned.
- The L1 bridge receives the bridging message and claims the rewards amount to self by calling `claimRewards` on the `IncentivesController` contract.
- The rewards are then transferred to the L1 recipient. 



## Proxies

All calls made to the following contracts will be handled by a proxy who delegates the calls to the available implementation of these contracts.
- Token bridge on L2 
- ETHStaticATokens on L2
- Token bridge on L1 
- rewAAVE token on L2


## Governance


* `ETHStaticATokens` are controlled by the `token_bridge`
* `rewAAVE` token is owned by the `token_bridge`

  
## Setup

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

First make sure to create a `.env` file in your project (see [`.env.example`](https://github.com/aave-starknet-project/aave-starknet-bridge/blob/main/.env.example)for the needed variables in your environment).

You can get an `ALCHEMY KEY` [here](https://www.alchemy.com/) 


Then load all the environment variables

```bash
source .env/*
```

Then start the testnets. It's wise to do this in two separate shells.

```bash
yarn testnet:l1
```

```bash
yarn testnet:l2
```

### Run the tests
The project is tested using [hardhat](https://hardhat.org/), the [starknet
hardhat plugin](https://github.com/Shard-Labs/starknet-hardhat-plugin) and
[starknet-devnet](https://github.com/Shard-Labs/starknet-devnet).

```
yarn test
```


### Deployment 

To deploy the bridge on testnets:

```bash
yarn deploy-bridge
```

Contributors

<a href = "https://github.com/aave-starknet-project/aave-starknet-bridge/graphs/contributors">
<img src = "https://contrib.rocks/image?repo=aave-starknet-project/aave-starknet-bridge"/>
</a>


