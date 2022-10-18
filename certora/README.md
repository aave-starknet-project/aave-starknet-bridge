# Aave Starknet Bridge - Certora verification
The current directory contains Certora's formal verification of AAVE Starknet L2 Bridge protocol.
In this directory you will find three subdirectories:

1. specs - Contains all the specification files that were written by Certora for the bridge protocol. We have created two spec files, `bridge.spec`, `erc20.spec`, the former is the main spec file used to verify the bridge contract and the latter is a small spec file containing declaration of ERC20 interface methods. This spec file is imported inside the former.

2. scripts - Contains all the necessary run scripts to execute the spec files on the Certora Prover. These scripts are composed of a run command of Certora Prover, contracts to take into account in the verification context, declaration of the compiler and a set of additional settings.

3. harness - The verification strategy of the AAVE Starknet L2 Bridge is described below.
The code of the layer2 contracts is written in cairo, which we don't verify.
We assume that the entire functionality encapsulated in the L2 files works as expected. Contains all the inheriting contracts that add/simplify functionalities to the original contract. You will also find a set of symbolic and dummy implementations of external contracts on which the executors rely.
These harnesses, i.e. extensions/simplifications, are necessary to run the verifications. Assumptions and under-approximations are also done in a few places, in order to supply partial coverage where full coverage is not achievable.

# Harness
Our main modification to the current system is the user L2-interface.
While in the original system a user can call transactions on L2, which in their turn sends messages to L1 contract bridge.sol, we have transferred the entire functionality of the L2 side to a Solidity contract.
In general, we do not mock the messaging between the two layers in a classical way, but assume immediate calls between the two sides.
Hence, we "mock" the second layer by a new contract BridgeL2Harness which interacts with the bridge.sol contract.

Using our certoraProver script, we link contracts instances defined in some contracts to other existing contracts in our scope. By doing so, we connect our implementations together such that the prover will be able to use the functions defined in these inter-connected contract in a logical way, being directed to the desired implementation.

## Basic assumptions and modeling architecture
As the whole system contains two layers in two different languages, we ought to make adjustments and simplifications for us to verify it using the CVT.
Our main adjustment to the system is transforming the L2 contracts to Soldiity contracts, instead of Cairo, and replacing the bridging and the messaging mechanisms by direct calls between the contracts.
Our main assumption behind this modification is that messaging works properly, in terms of correctness of data transfer between the two sides, and that no external player can fool the system by sending fake messages.

First we mock the L2 side, written in the cairo language by simple Solidity contracts.
We have created our own Solidity contract `BridgeL2Harness.sol` to represent the `bridge.cairo` contract, the layer 2 bridge endpoint. Additionaly, we have created a contract of staticAToken that originally is based on L2. Any deposit or withdrawal of tokens at one of the sides of the bridge will yield burning or minting of this token along with the immediate processing of tokens on L1.

We clarify that we not verify the cairo contracts since we replace them by our own version of the code. Hence we assume that these contracts function in the desired way. Also worth noting is the fact we created a simplified version of them, so not all functions in the original cairo contracts are implemented in our version. For example, we assume a single liquidity index value for all staticATokens.

## List of contracts
`BridgeHarness.sol` - inhertis from bridge.sol. Contains all the original implementation of bridge.sol, besides the messaging functions which are modified. Since we do not test the message processing, the overriding functions in our harnessed contract are either empty or directly call the functions on the other end of the bridge.

`BridgeL2Harness.sol` - A solidity mock of Cairo L2 Bridge (bridge.cairo). Holds an interface to "receive and send messages" from the L1 Bridge. The contract simply calls functions on BridgeHarness and get called from the same address to mock the messaging between the two layers. Also interacts with staticATokens which are also implemented as Solidity contracts. Doesn't implement all the functions in the original cairo file.

`SymbolicLendingPoolL1.sol` - a simple implementation of the AAVE lending pool. Includes the liquidity index for every underlying asset. Implements the deposit and withdraw functions to be used by the bridges contracts.

`IncentivesControllerMock_L1.sol` - used to obtain data of AToken and claim rewards (get rewards token).

`DummyERC20UnderlyingA_L1.sol` , `DummyERC20UnderlyingB_L1.sol` - instances of simple examples of ERC20 tokens to be used in the prover as underlying assets in the Aave lending pool.

`ATokenWithPoolA_L1.sol`, `ATokenWithPoolB_L1.sol` - instances of ATokens, holding the relevant interface for the bridge contract. Originally those contracts, in the aave implementation, include more functions and inheritance, while in our version we simply copied the relevant code.

`StaticATokenA_L2.sol`, `StaticATokenB_L2.sol` - instances of mocks of staticATokens. These tokens are minted\burned by the bridge L2 contract after a user deposits/withdraws ATokens into/from the bridge.

`DummyERC20RewardToken.sol` - a single instance of the ERC20 rewards token, common for both L1 and L2. Burnable and mintable by L2 bridge only.

## Functions - BridgeHarness.sol

#### initiateWithdraw_L2
Calls the `initiateWithdraw` function on the L2 Bridge. Supposed to mock the direct call from L2.

#### bridgeRewards_L2
Calls the `bridgeRewards` function on the L2 Bridge. Supposed to mock the direct call from L2.

#### claimRewardsStatic_L2
Calls the `claimRewards` function on the L2 Bridge. Supposed to mock the direct call from L2.

## Functions - BridgeL2Harness.sol

#### l2RewardsIndexSetter
Sets the value of `l2RewardsIndex` to `value`. Used by an indirect call from L1 to mock messaging of the index through the bridge.

#### getStaticATokenAddress
Gets the address of a staticAToken by its matching AToken address.

#### getRewTokenAddress
Gets the address of the reward Aave token.

#### address2uint256
Converts an address to uint256, by converting first to uint160. Used to translate addresses on L1 to L2 addresses (uint256).

#### deposit
Deposits `amount` of staticATokens represented by the Atokens of the underlying asset `asset` for the address `onBehalfOf`. Called by `deposit` on L1 instead of sending a message.

#### withdraw
Burns `amount` staticATokens for the caller and then calls withdraw on L1. Called first by initiateWithdraw_L2 on L1.

#### bridgeRewards
Transfers an `amount` of reward tokens for a caller, from its balance to the L1 bridge. Only called from L1, by the function bridgeRewards_L2.

#### claimRewards
Mints reward tokens for the caller for a specific staticAToken. Each staticAToken contract has a mapping that stores the rewards for each user, which could only be claimed once: after claiming the rewards, one could never claim another amount again (the value will be permanently set to zero).See `unclaimedRewards` mapping variable in `DummyStaticATokenImpl.sol`).

---

## Running Instructions
To run a verification job:

1. Open terminal and `cd` your way to the `certora` directory in the aave-starknet-bridge repository.

2. `touch` the `applyHarness.patch` file to make sure its last modification timestamp is later than your contracts:
    ```sh
    touch applyHarness.patch
    ```

3. Execute the `munged` command in the make file to copy the contracts to the munged directory and apply the changes in the patch:
    ```sh
    make munged
    ```

4. `cd` your way back to to the main aave-starknet-bridge directory.

5. Run the script you'd like to get results for:
    ```sh
    sh certora/scripts/verifyBridge.sh
    ```
</br>
