
# AAVE Starknet Bridge

[![Tests](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/aave-starknet-project/aave-starknet-bridge/actions/workflows/ci.yml)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/cdnjs/cdnjs.svg?style=flat)](https://github.com/aave-starknet-project/aave-starknet-bridge/pulls)
[![Issues](https://img.shields.io/github/issues-raw/tterb/PlayMusic.svg?maxAge=25000)](https://github.com/aave-starknet-project/aave-starknet-bridge/issues)

 <a href="https://github.com/aave-starknet-project/aave-starknet-bridge/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/sourcerer-io/hall-of-fame.svg?colorB=ff0000"></a>

:warning: This codebase is still in an experimental phase, has not been audited, might contain bugs and should not be used in production.

## Overview

For Aave, one of the main current and future goals is growth of liquidity and user base. As seen on side-chains with low transaction cost like Polygon or Avalanche, there is high demand to use the Aave protocol with small amounts to earn high yield.

Both previous points show that having an initial phase on the Aave <> Starknet integration allowing deposit/withdrawal on Aave Ethereum by exclusively transacting on Starknet can be a good idea, target-wise.

The bridge allows users to deposit and withdraw `staticATokens` - wrappers converting balance-increasing [aTokens]( https://docs.aave.com/developers/tokens/atoken) into exchange-rate-increasing staticATokens - on StarkNet and get wrapped tokens `ETHStaticATokens` that allow users to keep enjoying the same rewards as on L1. 

The bridge was also shaped for liquidity providers who are able to assume Ethereum cost of deposit/withdrawal, as they transact amounts big enough. They will deposit on Aave Ethereum, bridge the staticATokens to Starknet and make them available for users there to buy and hold, accruing this way yield from L1. 

## Architecture

![aave_bridge_5](https://user-images.githubusercontent.com/37840702/165796331-f587b34c-74a4-4954-a05c-bf55705963d6.png)

## Contracts

`L1`
  * `StaticATokenLM` - an updated implementation of staticATokens which makes it possible to communicate with its respective L2 token by sending the latest `rewards_index` on token transfer or when explicitly triggered to do so.
  *  `TokenBridge` -  handles rewards update, deposit & withdrawal of staticATokens & their underlying assets
  *  `Proxy` - A proxy implementation 

`L2`
  * `ETHStaticAToken` - Tokens on Starknet equivalent to each staticAToken on Ethereum mainnet. Contains the same logic for tracking user rewards as staticATokens and has the same `rewards_index`.
  * `claimable` - tracks users' claimable rewards and current reward index for each `ETHStaticAToken`
  * `token_bridge` - is responsible for:
    * bridging the staticATokens to and from L2. Minting and burning ETHStaticATokens on message from L1. 
    * bridging rewAAVE token back to L1
    * updating `rewards_index` for each ETHStaticAToken on message from L1 
  * `rewAAVE` - a very basic ERC20 to represent the rewards on L2
  *  `proxy` - a generic implementation of a proxy in starknet

## ETHStaticATokens on L2

Natively, on Aave aTokens grow in balance, not in value. To be able to create this kind of model, it is important to wrap them before bridging, converting them in a token that grows in value, not in balance.

ETHStaticATokens are an implementation of the wrapped aTokens that will continuously increase in value on Starknet because they are backed by the increasing staticATokens amounts locked in the bridge contract on Ethereum. The ETHStaticATokens can then be bridged back to staticATokens.

## Bridging staticATokens from L1<>L2

### Transfer L1->L2: 

Users can either bridge their staticAToken to L2 by calling `deposit()` on `TokenBridge`, or deposit the underlying asset of the staticAToken directly by calling `depositUnderlying()`.

Calling `deposit` will result in the following:

- staticATokens will be transfered from the user account to the L1 bridge
- A `deposit` event will be emitted with the L1 token address, the recipient address on L2, and the amount
- A message will be sent to the  L2 bridge with the amount to be transferred, the L1 token address and the recipient address as parameters.
- The token bridge on L2 will then be minting the correspending ETHStaticAToken of the L1 token to the user.

Calling `depositUnderlying` will result in the following:

Users will have to approve the bridge to spend the underlying `asset` tokens or `aTokens`, depending on the provided value for `fromAsset` argument when depositing.

- the underlying asset of the staticAToken or the aToken (depending on the user's input )  will be transfered from the user account to the L1 bridge
- the bridge will then deposit the aTokens/asset on the staticAToken
- new staticATokens will be minted to the bridge
- A message will be sent to the  L2 bridge with the amount to be transferred, the L1 token address and the recipient address as parameters.
- The token bridge on L2 will then be minting the correspending ETHStaticAToken of the L1 token to the user.


### Transfer L2->L1:

To bridge their staticATokens back to L1, users need to call `initiate_withdraw()` on Starknet `token_bridge`. 

Calling `initiate_withdraw` will result in the following:

- The amount withdraw of ETHStaticAToken will be burned by the bridge
- A message will be sent to L1 with the L1 token address, the l1 recipient, and the amount

(@TODO: add more info on how we bridge the current rewards index when withdrawing..)
 


## Synchronisation of rewards on L1 <> L2

Starknet users will continue to enjoy the same rewards as on L1 after bridging their assets; To achieve that we continously update the `rewards_index` of all ETHStaticATokens to match the value of their respective StaticATokens on L1. 


## Claiming rewards on L2


To claim rewards users need to call `claim_rewards()` on ETHStaticAToken contract. The ETHStaticAToken will then be calling the bridge to mint the due `rewAAVE` tokens to the user.

## Bridging rewards from L2->L1

To bridge their rewards to L1, users will have to call `bridge_rewards()` on the L2 `token_bridge` providing the `amount` to be bridged. The L1 bridge will be claiming pending rewards to self from all staticATokens in a loop until having enough rewards balance to transfer it to users. The claiming ans transferring of rewards is handled by `receiveRewards()` on `TokenBridge.sol`


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
`.env`

```bash
export $ALCHEMY_KEY="<your key>"
```

Then load all the environment variables

```bash
source .evn
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


