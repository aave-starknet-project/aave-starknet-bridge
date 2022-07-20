# Aave Starknet Bridge

[![Tests](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/e2e-tests.yml)
[![Check](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/code-check.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/code-check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/blob/main/LICENSE.md)

:warning: This codebase is still in an experimental phase, has not been audited, might contain bugs and should not be used in production.

## Table of contents

- [Introduction](#introduction)
- [Architecture](#architecture)
- [Contracts](#contracts)
  - [Overview](#overview)
  - [More about static_a_token on L2](#more-about-static_a_token-on-l2)
  - [Proxies](#proxies)
  - [Governance](#governance)
- [How it works](#how-it-works)
  - [Bridging aTokens from L1 to L2](#bridging-atokens-from-l1-to-l2)
    - [Approve bridge tokens](#approve-bridge-tokens)
    - [Transfer from L1 to L2](#transfer-from-l1-to-l2)
    - [Transfer from L2 to L1](#transfer-from-l2-to-l1)
  - [Synchronisation of rewards on L1 and L2](#synchronisation-of-rewards-on-l1-and-l2)
  - [Claiming rewards on L2](#claiming-rewards-on-l2)
  - [Bridging rewards from L2 to L1](#bridging-rewards-from-l2-to-l1)
- [Installation](#installation)
  - [Environment](#environment)
  - [Build the cairo files](#build-cairo-files)
  - [Start testnets](#start-testnets)
  - [Run tests](#run-tests)

## Introduction

This bridge project is the first step of Aave in Starknet ecosystem. The bridge allows users to deposit or withdraw their [aTokens](https://docs.aave.com/developers/tokens/atoken), and only `aTokens`, on Ethereum side, then mints or burns them wrapped aTokens named `static_a_tokens` on Starknet side. `static_a_tokens` are equivalent to `aTokens` except that the former grow in value when the latter grow in balance.

Holding L1 aTokens lets you earn more tokens via two different mechanisms: (i) the amount of aTokens you hold increases over time and (ii) holding aTokens allows you to claim an accruing amount of Aave reward tokens. This bridge offers both mechanisms thanks to `static_a_tokens` on L2, and the equivalent of L1 Aave reward token on L2.

The bridge is also shaped for liquidity providers who are able to assume the Ethereum gas cost of deposits and withdrawals as they transact large enough amounts. They will deposit on Aave Ethereum, bridge the `static_a_tokens` to Starknet and make them available for users there to buy and hold, thus accruing yield from L1.

We assume that L1 tokens approved by the bridge are pre-validated tokens, and that they are not deflationary.

## Architecture

![aave_bridge](https://user-images.githubusercontent.com/37840702/167398308-3b7145f0-20e3-4f35-8b0b-17d52285595a.png)

## Contracts

### Overview

**L1**

- `Bridge` - handles deposit of `aTokens` on L1, withdrawal of `static_a_tokens` from L2, and update of L2 rewards index. L1 deposits and withdrawals can be done with `aToken` or with their underlying asset.

**L2**

- `static_a_token` - exchange-rate-increasing wrapper of `aTokens` on L2.
- `incentivized_erc20` - ERC20-compliant token, tracks claimable rewards and stores the last updated rewards index for each `static_a_token` holder.
- `rewAAVE` - ERC20 representing Aave reward token on L2.
- `bridge` - bridge responsible for:
  - minting and burning `static_a_tokens` on message from L1.
  - bridging `rewAAVE` tokens back to L1.
  - updating `rewards_index` for each `static_a_token` on message from L1.
- `proxy` - generic implementation of a proxy in cairo.

### More about static_a_token on L2

These `static_a_tokens` are a starting point for almost any cross-chain liquidity development to minimize “active” communication between chains. By design, a holder of those tokens - on Ethereum or after bridging somewhere else - will be passively accumulating yield from Aave on Ethereum.

More precisely, `static_a_tokens` are wrapped `aTokens` that grow in value while `aTokens` grow in balance. Such behavior is possible because `static_a_tokens` are backed by increasing amounts of `aTokens` locked in the L1 part of the bridge. `static_a_tokens` living on L2 can be bridged back to `aTokens`.

### Proxies

Each of the following contracts is deployed behind a proxy:

- `bridge` on L2
- `static_a_token` on L2
- `rewAAVE` token on L2
- `Bridge` on L1

### Governance

- `static_a_token` deployed contracts are controlled by L2 `bridge`.
- `rewAAVE` token is owned by L2 `bridge`.

## How it works

### Bridging aTokens from L1 to L2

<a name="approve-bridge-tokens"></a>
**Approve bridge tokens**

L1 aTokens and their corresponding L2 static_a_tokens are approved on L1 bridge in `initialize` function. The function `_approveBridgeTokens` is called internally to approve an array of aTokens with their corresponding static_a_tokens on L2.

<a name="transfer-from-l1-to-l2"></a>
**Transfer from L1 to L2**

Users can either deposit their `aTokens` (let's say aDai) or deposit the corresponding underlying asset (i.e Dai). Users first have to approve the bridge to spend the tokens - `aTokens` or the underlying `asset`. Calling `deposit` function, the following actions happen:

- If the user deposits underlying `asset`:

  1. `asset` tokens will be transferred from the user account to L1 bridge.
  2. The bridge will convert `asset` tokens to aTokens - by depositing in Aave's lending pool.
  3. A message will be sent to L2 bridge with the amount of `static_a_token` to be minted, L1 token address, L2 recipient address, L1 block number and L1 rewards index.
  4. L2 bridge will mint to L2 recipient the given amount of corresponding `static_a_tokens`.
     &nbsp;

- If the user deposits `aToken`:

  1. `aTokens` will be transferred from the user account to L1 bridge.
  2. A message will be sent to L2 bridge with the amount of `static_a_token` to be minted, L1 token address, L2 recipient address, L1 block number and L1 rewards index.
  3. L2 bridge will mint to L2 recipient the given amount of corresponding `static_a_tokens`.

<a name="transfer-from-l2-to-l1"></a>
**Transfer from L2 to L1**

To bridge their `static_a_tokens` back to L1, users should initiate a withdrawal on the L2 bridge. Calling `initiate_withdraw` results in the following:

1. The amount of `static_a_tokens` to withdraw will be burned by L2 bridge.
2. A message will be sent to L1 with L1 aToken address, L1 recipient, L2 rewards index and the amount.
3. L1 bridge will then transfer `aTokens` to the L1 recipient.
4. L1 bridge will also check for any difference in the L1/L2 rewards index and transfer any unclaimed rewards to L1 recipient.

### Synchronisation of rewards index on L1 and L2

Starknet users will keep enjoying the same rewards as on L1 after bridging their assets. To do so, L1 rewards index is stored in the state of `static_a_tokens`. The index is updated every time a user deposits or withdraw the corresponding `aToken`, and can also be updated in a permissionless manner by calling the function `updateL2State` in L1 bridge. Rewards on L1 are sent to L1 recipient either when withdrawing `static_a_tokens` from L2 or when calling and then bridging rewards on L2 as described below.

### Claiming rewards on L2

To claim rewards, an L2 user should call `claim_rewards` on `static_a_token` contract which calls L2 bridge in return. L2 bridge then mints due `rewAAVE` tokens to the L2 user.

### Bridging rewards from L2 to L1

Calling `bridge_rewards` on L2 token bridge results in:

1. The bridged amount of `rewAAVE` tokens will be burned.
2. L1 bridge receives the bridging message and claims the rewards amount to
   self by calling `claimRewards` on Aave `IncentivesController` contract.
3. Rewards are then transferred to L1 recipient.

## Installation

### Environment

**Install Node 16**

Our codebase relies on Node 16. To install it, you can first install [nvm](https://github.com/nvm-sh/nvm) and then run the following commands:

```bash
nvm install 16
nvm use 16
```

**Install Python 3.7.12**

Our codebase relies on Python 3.7.12. To install it, you can first install [pyenv](https://github.com/pyenv/pyenv) and then run the following commands:

```bash
pyenv install 3.7.12
pyenv local 3.7.12
```

**Install GMP (needed for Cairo)**

Before installing Cairo you need to install GMP. Run one of the following command depending on your OS.

```bash
sudo apt install -y libgmp3-dev # linux
brew install gmp # mac
```

**Install Node dependencies**

Let's install all our project dependencies:

```bash
yarn install
```

**Install Python dependencies**

Let’s create a virtual environment to isolate your project’s requirements from your global Python environment.

```bash
python -m venv .venv
source .venv/bin/activate
```

Install poetry for dependencies management

```bash
python -m pip install --upgrade pip
pip install poetry
poetry install
```

### Build Cairo files

Solidity files are automatically compiled before running the tests, but Cairo files are not. To compile them, run:

```bash
yarn compile:l2
```

### Start testnets

We recommend to run L1 and L2 testnets in different terminals.

**Start L2 testnet**

In a terminal where `venv` is activated, run:

```bash
yarn testnet:l2
```

**Start L1 testnet**

Create a `.env` file from the sample (`cp .env.sample .env`), and fill a value for the variable `ALCHEMY KEY` - you can get one [here](https://www.alchemy.com/). Then, load all the environment variables.

```bash
source .env
```

And start L1 testnet in the same terminal by running:

```bash
yarn testnet:l1
```

### Run tests

The project is tested using [hardhat](https://hardhat.org/), the [starknet hardhat plugin](https://github.com/Shard-Labs/starknet-hardhat-plugin) and [starknet-devnet](https://github.com/Shard-Labs/starknet-devnet). We created a Docker Compose file to run tests easily: we start L1 and L2 test networks in two separate containers and run the tests from a third one. To run all tests, simply run the following commands:

```
docker compose up --build
docker exec -ti $(docker ps -f name=test-runner -q) bash
yarn test
```

### Deployment

First make sure to set the aTokens addresses to be approved on the bridge as well as the metadata related to the `staticATokens` to be deployed on l2 in `./scripts/allowlistedTokens.ts`.

```bash
yarn deploy-bridge:testnet #deploys bridge on l1 & l2 testnets
```

Contributors

<a href = "https://github.com/aave-starknet-project/aave-starknet-bridge/graphs/contributors">
<img src = "https://contrib.rocks/image?repo=aave-starknet-project/aave-starknet-bridge"/>
</a>
