# Aave StarkNet Bridge

[![Tests](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/e2e-tests.yml)
[![Check](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/code-check.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/code-check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/blob/main/LICENSE.md)

This codebase has been audited by three teams, whose reports are available in the repository: [Nethermind](https://github.com/aave-starknet-project/aave-starknet-bridge/blob/main/audit/nethermind_audit.pdf), [Peckshield](https://github.com/aave-starknet-project/aave-starknet-bridge/blob/main/audit/peckshield_audit.pdf) and [Certora](https://github.com/aave-starknet-project/aave-starknet-bridge/blob/main/audit/certora_report.pdf).

## Table of contents

- [Table of contents](#table-of-contents)
- [Introduction](#introduction)
- [Architecture](#architecture)
- [Contracts](#contracts)
  - [Overview](#overview)
  - [More about static_a_token on L2](#more-about-static_a_token-on-l2)
  - [Proxies](#proxies)
  - [Governance](#governance)
    - [Control](#control)
    - [Governance relayers](#governance-relayers)
- [Deployed Contracts](#deployed-contracts)
  - [Mainnet](#mainnet)
  - [Goerli](#goerli)
- [How it works](#how-it-works)
  - [Bridging aTokens from L1 to L2](#bridging-atokens-from-l1-to-l2)
  - [Synchronisation of rewards index on L1 and L2](#synchronisation-of-rewards-index-on-l1-and-l2)
  - [Claiming rewards on L2](#claiming-rewards-on-l2)
  - [Bridging rewards from L2 to L1](#bridging-rewards-from-l2-to-l1)
  - [ATokens deposit cancellation](#atokens-deposit-cancellation)
- [How to bridge without coding](#how-to-bridge-without-coding)
  - [Hold tokens that can be bridged](#1-hold-tokens-that-can-be-bridged)
  - [Get tokens' balance](#2-get-tokens-balance)
  - [Let the bridge transfer your tokens](#3-let-the-bridge-transfer-your-tokens)
  - [Deposit your tokens to the bridge](#4-deposit-your-tokens-to-the-bridge)
  - [Import token to your StarkNet wallet](#5-imports-token-to-your-starknet-wallet)
- [Installation](#installation)
  - [Environment](#environment)
  - [Build Cairo files](#build-cairo-files)
  - [Start testnets](#start-testnets)
  - [Run tests](#run-tests)
  - [Deployment](#deployment)


## Introduction

This bridge project is the first step of Aave in StarkNet ecosystem. The bridge allows users to deposit or withdraw their [aTokens](https://docs.aave.com/developers/tokens/atoken), and only `aTokens`, on Ethereum side, then mints or burns them wrapped aTokens named `static_a_tokens` on StarkNet side. `static_a_tokens` are equivalent to `aTokens` except that the former grow in value when the latter grow in balance.

Holding L1 aTokens lets you earn more tokens via two different mechanisms: (i) the amount of aTokens you hold increases over time and (ii) holding aTokens allows you to claim an accruing amount of Aave reward tokens. This bridge offers both mechanisms thanks to `static_a_tokens` on L2, and the equivalent of L1 Aave reward token on L2.

The bridge is also shaped for liquidity providers who are able to assume the Ethereum gas cost of deposits and withdrawals as they transact large enough amounts. They will deposit on Aave Ethereum, bridge the `static_a_tokens` to StarkNet and make them available for users there to buy and hold, thus accruing yield from L1.

We assume that L1 tokens approved by the bridge are pre-validated tokens, and that they are not deflationary.

## Architecture

![aave_bridge](https://user-images.githubusercontent.com/37840702/194517164-1318dd83-8d7b-4dda-95da-4c6d802e0d0b.png)

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

<a name="control"></a>
**Control**

- `static_a_token` deployed contracts are controlled by L2 `bridge`.
- `rewAAVE` token is controlled by L2 `bridge`.

<a name="governance-relayers"></a>
**Governance relayers**

- We rely on L1 -> L2 governance relayers to execute on L2 actions that have been decided on L1. In practice, we use two L1 contracts from Aave and one L2 contract from [StarkNet DAI Bridge](https://github.com/makerdao/starknet-dai-bridge):
  - `contracts/l1/governance/Executor.sol`: It corresponds to [Aave Short Executor](https://docs.aave.com/developers/v/2.0/protocol-governance/governance#short-time-lock-executor) whose goal is to execute payload that have been previously accepted by the DAO after a vote. One first need to queue the transaction to execute, and execute it after waiting enough time. Its code has been taken from Etherscan: [link](https://etherscan.io/address/0xee56e2b3d491590b5b31738cc34d5232f378a8d5#code).
  - `contracts/l1/governance/CrosschainForwarderStarknet.sol`: It contains a single function named `execute` that sends a message to execute a function `relay` of the contract `l2_governance_relay` with an input address. It has been adapted from [the one used for Polygon](https://github.com/bgd-labs/aave-v3-crosschain-listing-template/blob/master/src/contracts/polygon/CrosschainForwarderPolygon.sol).
  - `contracts/l2/governance/l2_governance_relay.cairo`: It contains a single L1 handler named `relay` as well that takes an address as argument, checks the origin of the call and executes the function `delegate_execute` of the contract that correspond to the input address.

## Deployed Contracts

### Mainnet

**Ethereum**

- Bridge: [proxy](https://etherscan.io/address/0x25c0667E46a704AfCF5305B0A586CC24c171E94D) and [implementation](https://etherscan.io/address/0x69F4057cC8A32bdE63c2d62724CE14Ed1aD4B93A)

- CrosschainForwarderStarknet: [implementation](https://etherscan.io/address/0x8c598667A5a6A14F04172326e62CE143BF8edaAB)

- AIP payload: [implementation](https://etherscan.io/address/0x4919E176f02142C20727da215e8dc1b3d046D026)

**StarkNet**

- bridge: [proxy](https://voyager.online/contract/0x0434ab0e4f2a743f871e4d57a16aef3df84c1a29b61565e016da91c1f824b021) and [implementation class](https://voyager.online/class/0x77cb72a5e969d13753eb4f999219811cd96b703586d6d1de8af7b6679f82a96)

- l2_governance_relay: [proxy](https://voyager.online/contract/0x07bbb769e53d886f77792d59b9cd65a2eb14a84c49a0942ba9577e291deefcec) and [implementation class](https://voyager.online/class/0x0431f8e4ac4298966bdf1d99ea273d9f22e72005874d76498bd630fcb806f605)

- static Aave v2 Ethereum aDAI: [proxy](https://voyager.online/contract/0x04212f12efcfc9e847bd98e58daff7dc588c4896f6cd320b74023ad5606f02fd) and [implementation class](https://voyager.online/class/0x60f3a90b235b6bed4cd55c36a0b48b8e6d075425bfa50105afca6ff1f45a09f)

- static Aave v2 Ethereum aUSDC: [proxy](https://voyager.online/contract/0x014cdaa224881ea760b055a50b7b8e65447d9310f5c637294e08a0fc0d04c0ce) and [implementation class](https://voyager.online/class/0x60f3a90b235b6bed4cd55c36a0b48b8e6d075425bfa50105afca6ff1f45a09f)

- static Aave v2 Ethereum aUSDT: [proxy](https://voyager.online/contract/0x02e905e3d2fcf4e5813fef9bfe528a304e8e5adc8cbdc247b3980d7a96a01b90) and [implementation class](https://voyager.online/class/0x60f3a90b235b6bed4cd55c36a0b48b8e6d075425bfa50105afca6ff1f45a09f)

- rewAAVE: [proxy](https://voyager.online/contract/0x047cd265d4ebf1daacd1cca98c0ecb018c3da5cec73a8638bd94d5acfdd78ec1) and [implementation class](https://voyager.online/class/0x22196a57f69dc51dc5087cb6c288db442a6bc45804502181f1e43da2c92679a)

- activate_bridge spell: [implementation class](https://voyager.online/class/0x00be3e7fe64939ef463bc80b76703b93c10a61944de34df5bb2dbc7b734e3159)

### Goerli

**Ethereum**

- Bridge: [proxy](https://goerli.etherscan.io/address/0xF36d7E4192d626b7Ffdc939FAC4B5ec1F3EFb0aF) and [implementation](https://goerli.etherscan.io/address/0xF4B237ebD51260791009AE6A0b8018E4781a6b33)

**StarkNet**

- bridge: [proxy](https://goerli.voyager.online/contract/0x0668856a2132c68506fbdfaa3847c79b715f8e555cd23963c300fcc83c6c49f6) and [implementation class](https://goerli.voyager.online/class/0x5644c303c5baba1f1aecb96e4d8681f3ae336788a8988a811af25c1302af1b2)

- static Aave v2 Ethereum aDAI: [proxy](https://goerli.voyager.online/contract/0x0073def9d19e7a9f89013f19d1610242bf33cee4d2eca36d41eb0c72ab99971d) and [implementation class](https://goerli.voyager.online/class/0x428766ff5ac3e42577f92b9bb868b645884e2c8727f5e1baa5c3bcec6bc66cb)

- static Aave v2 Ethereum aUSDC: [proxy](https://goerli.voyager.online/contract/0x04746d8e8742fea6276da0907d4987720726dfe8829826bba548d025806ecf92) and [implementation class](https://goerli.voyager.online/class/0x428766ff5ac3e42577f92b9bb868b645884e2c8727f5e1baa5c3bcec6bc66cb)

- static Aave v2 Ethereum aUSDT: [proxy](https://goerli.voyager.online/contract/0x07df5d9550b03b5b6e4c2b9b72739b251d10f5936ad0676bca0ada158aefe311) and [implementation class](https://goerli.voyager.online/class/0x428766ff5ac3e42577f92b9bb868b645884e2c8727f5e1baa5c3bcec6bc66cb)

- rewAAVE: [proxy](https://goerli.voyager.online/contract/0x01aa0b38b7dba062fcb6e66f6a4836690dc7b9e10488fe6ca9647123fc4f175c) and [implementation class](https://goerli.voyager.online/class/0x179db93ec338fcb39d7f14337176ba21b11b6ff5a44615856fdb4a48c5f33f6)

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

To bridge their `static_a_tokens` back to L1, users should first initiate a withdrawal on the L2 bridge. Calling `initiate_withdraw` results in the following:

1. The amount of `static_a_tokens` to withdraw will be burned by L2 bridge.
2. A message will be sent to L1 with L1 aToken address, L1 recipient, L2 rewards index and the amount.

Once the withdrawal is initiated on the L2 bridge, one can call the function `withdraw` on L1 bridge. Calling this function results in the following:

1. The message previously sent will be consumed: if function parameters and parameters sent in the message are not the same, the withdrawal fails, otherwise the rest follows.
2. L1 bridge will then transfer `aTokens` to the L1 recipient.
3. L1 bridge will also check for any difference in the L1/L2 rewards index and transfer any unclaimed rewards to L1 recipient.

### Synchronisation of rewards index on L1 and L2

StarkNet users will keep enjoying the same rewards as on L1 after bridging their assets. To do so, L1 rewards index is stored in the state of `static_a_tokens`. The index is updated every time a user deposits or withdraw the corresponding `aToken`, and can also be updated in a permissionless manner by calling the function `updateL2State` in L1 bridge. Rewards on L1 are sent to L1 recipient either when withdrawing `static_a_tokens` from L2 or when calling and then bridging rewards on L2 as described below.

### Claiming rewards on L2

To claim rewards, an L2 user should call `claim_rewards` on `static_a_token` contract which calls L2 bridge in return. L2 bridge then mints due `rewAAVE` tokens to the L2 user.

### Bridging rewards from L2 to L1

Calling `bridge_rewards` on L2 token bridge results in:

1. The bridged amount of `rewAAVE` tokens will be burned.
2. L1 bridge receives the bridging message and claims the rewards amount to
   self by calling `claimRewards` on Aave `IncentivesController` contract.
3. Rewards are then transferred to L1 recipient.

### ATokens deposit cancellation

If L1 -> L2 message consumption is unsuccessful, the user would lose custody over his aTokens forever.

That's why we have added support for the L1->L2 message cancellation on our L1 bridge contract, where users can cancel deposits of their aTokens by following the steps below:

1. The user calls `startDepositCancellation` on L1 bridge by providing the `message payload` and `nonce` of the `deposit` message.

2. After the `messageCancellationDelay` period has passed (defined on [StarknetMessaging](https://github.com/starkware-libs/starkgate-contracts/blob/c08863a1f08226c09f1d0748124192e848d73db9/src/starkware/starknet/solidity/StarknetMessaging.sol) contract), the user can finalize the aTokens deposit cancellation by calling `cancelDeposit` on L1 bridge.

### Bridge Ceiling

The amount of bridged aTokens is restricted to a certain amount set at the moment of deployment. We provide an array `ceilings` with a ceiling for each aToken to be approved on the L1 bridge, and we make sure that the bridge will only hold a scaled balance (without taking into account the interest growth) inferior or equal to the decided ceiling for each aToken.

## How to bridge without coding

This section explains how to bridge Ethereum aTokens to StarkNet staticATokens using Etherscan UI and wallets on both networks.

### 1. Hold tokens that can be bridged

The first step is to have an Ethereum-compatible wallet funded with one of the six following tokens: [DAI](https://etherscan.io/address/0x6B175474E89094C44Da98b954EedeAC495271d0F#code), [aDAI](https://etherscan.io/address/0x028171bca77440897b824ca71d1c56cac55b68a3#code), [USDC](https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48#code), [aUSDC](https://etherscan.io/address/0xbcca60bb61934080951369a648fb03df4f96263c#code), [USDT](https://etherscan.io/address/0xdAC17F958D2ee523a2206206994597C13D831ec7#code) or [aUSDT](https://etherscan.io/address/0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811#code).

### 2. Get tokens' balance

You should now select the amount you would like to bridge. Note that the tokens above do not have the same number of decimals. For this, go on the Etherscan page corresponding to your tokens, say [DAI](https://etherscan.io/address/0x6B175474E89094C44Da98b954EedeAC495271d0F#code) for instance, click on the tab "Read Contract" or "Read as Proxy" and call the function `balanceOf` with your wallet address.

If you hold $50 of DAI / aDAI, the output of `balanceOf` should be approximately `50000000000000000000`, and if you hold $50 of USDC / aUSDC / USDT / aUSDT, it should be about `50000000`.

### 3. Let the bridge transfer your tokens

Before depositing your tokens to the bridge, you should allow the bridge to spend your tokens. To do so, go on the token's Etherscan page, click on the tab "Write Contract" or "Write as Proxy", and then on "Connect to Web3" to connect your Ethereum wallet to Etherscan. Now, click on the function `approve`, and fill in the bridge's address (`0x25c0667E46a704AfCF5305B0A586CC24c171E94D`) as `spender` and the amount you would like to bridge as `amount`. Finally, click "Write" and accept the transaction on your wallet.


### 4. Deposit your tokens to the bridge

To deposit tokens to the bridge, go on the bridge contract Etherscan page [here](https://etherscan.io/address/0x25c0667E46a704AfCF5305B0A586CC24c171E94D#writeProxyContract). If your wallet is disconnected, click on "Connect to Web3" again, and click on the `deposit` function to display its arguments. You should then enter the following inputs:
- `l1AToken`: Fill in the address of the token you would like to bridge. For DAI, write `0x6B175474E89094C44Da98b954EedeAC495271d0F`.
- `l2Recipient`: Fill in your StarkNet wallet address, converted to decimal. For that, you can use [this website](https://www.rapidtables.com/convert/number/hex-to-decimal.html), or use `BigInt` function in JavaScript. For instance, if the StarkNet wallet address is `0x01270059Ea5843794F1130830800EcEF60B7D1AFd195f1847a884223a5B94f4A`, you should fill in `521222308224262530654458833061745344984501837223744122628617462097842360138`.
- `amount`: Fill in the amount you would like to bridge. This amount should be lower or equal to the amount you have approved in the previous step.
- `referralCode`: Fill in `0`. This argument is proper to identify future integrators.
- `fromUnderlyingAsset`: Fill in `false` if the token you bridge is an aToken (aDAI, aUSDC, aUSDT); otherwise, fill in `true`.

Finally, click on "Write", accept the transaction and wait for Ethereum and StarkNet transactions to finish.

### 5. Import token to your StarkNet wallet

On your StarkNet wallet, click on "+ New token" for Argent X or "+ Add token" for Braavos, and fill in staticAToken's address that corresponds to tokens you have deposited on the Ethereum side - see [this section](https://github.com/aave-starknet-project/aave-starknet-bridge#deployed-contracts) for deployed contracts' addresses.

## Installation

### Environment

**Install Node 16**

Our codebase relies on Node 16. To install it, you can first install [nvm](https://github.com/nvm-sh/nvm) and then run the following commands:

```bash
nvm install 16
nvm use 16
```

**Install Python 3.9.0**

Our codebase relies on Python 3.9.0. To install it, you can first install [pyenv](https://github.com/pyenv/pyenv) and then run the following commands:

```bash
pyenv install 3.9.0
pyenv local 3.9.0
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
