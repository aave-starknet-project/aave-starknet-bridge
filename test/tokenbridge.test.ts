import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, Contract, ContractFactory } from 'ethers';
import { starknet, network, ethers } from 'hardhat';
import {
  StarknetContractFactory,
  StarknetContract,
  HttpNetworkConfig
} from 'hardhat/types';
import { Account } from "hardhat/types/runtime";

import { TIMEOUT } from './constants';

/**
 * Receives a hex address, converts it to bigint, converts it back to hex.
 * This is done to strip leading zeros.
 * @param address a hex string representation of an address
 * @returns an adapted hex string representation of the address
 */
function adaptAddress(address: string) {
  return "0x" + BigInt(address).toString(16);
}

/**
 * Expects address equality after adapting them.
 * @param actual 
 * @param expected 
 */
function expectAddressEquality(actual: string, expected: string) {
  expect(adaptAddress(actual)).to.equal(adaptAddress(expected));
}

/**
 * Follows the example at https://www.cairo-lang.org/docs/hello_starknet/l1l2.html
 * Shows the communication between an L2 contract defined in l1l2.cairo
 * and an L1 contract defined in https://www.cairo-lang.org/docs/_static/L1L2Example.sol
 */
describe('TokenBridge', async function() {
  this.timeout(TIMEOUT);

  let l1user = 1;
  let l2user: Account;
  const networkUrl: string = (network.config as HttpNetworkConfig).url;
  console.log(networkUrl)
  // L2
  let L2TokenFactory: StarknetContractFactory;
  let l2tokenA: StarknetContract;
  let l2tokenB: StarknetContract;
  let TokenBridgeL2: StarknetContractFactory;
  let tokenBridgeL2: StarknetContract;
  // L1
  let L1TokenFactory: ContractFactory;
  let l1tokenA: Contract;
  let l1tokenB: Contract;
  let TokenBridgeL1: ContractFactory;
  let tokenBridgeL1: Contract;
  let messagingContractAddress: string;
  let signer: SignerWithAddress;

  before(async function () {

    // L2 deployments

    l2user = await (starknet as any).deployAccount("OpenZeppelin");

    L2TokenFactory = await starknet.getContractFactory('L2Token');
    l2tokenA = await L2TokenFactory.deploy(
        { name: 1234, symbol: 123, decimals: 18, minter_address: BigInt(l2user.starknetContract.address) });
    l2tokenB = await L2TokenFactory.deploy(
        { name: 4321, symbol: 321, decimals: 18, minter_address: BigInt(l2user.starknetContract.address) });
  
    TokenBridgeL2 = await starknet.getContractFactory('token_bridge');
    tokenBridgeL2 = await TokenBridgeL2.deploy({ governor_address: BigInt(l2user.starknetContract.address) });

    // L1 deployments

    const signers = await ethers.getSigners();
    signer = signers[0];

    L1TokenFactory = await ethers.getContractFactory('L1Token', signer,);
    l1tokenA = await L1TokenFactory.deploy(100);
    l1tokenB = await L1TokenFactory.deploy(200);

    TokenBridgeL1 = await ethers.getContractFactory('TokenBridge', signer);
    tokenBridgeL1 = await TokenBridgeL1.deploy();
    await tokenBridgeL1.deployed();
    messagingContractAddress = await tokenBridgeL1.messagingContract();

  });

  // it('should deploy the messaging contract', async () => {
  //   const {
  //     address: deployedTo,
  //     l1_provider: L1Provider,
  //   } = await starknet.devnet.loadL1MessagingContract(networkUrl);

  //   expect(deployedTo).not.to.be.undefined;
  //   expect(L1Provider).to.equal(networkUrl);    
  // });

  // it('should load the already deployed contract if the address is provided', async () => {

  //   const {
  //     address: loadedFrom,
  //   } = await starknet.devnet.loadL1MessagingContract(
  //     networkUrl,
  //     messagingContractAddress,
  //   );

  //   expect(messagingContractAddress).to.equal(loadedFrom);
  // });

  it('should exchange messages between L1 and L2', async () => {

    // set L1 token bridge from L2 bridge 
    await l2user.invoke(tokenBridgeL2, 'set_l1_token_bridge', { l1_bridge_address: BigInt(tokenBridgeL1.address) });

    // map L1 tokens to L2 tokens on L2 bridge
    await l2user.invoke(tokenBridgeL2, 'approve_bridge', { l1_token: BigInt(l1tokenA.address), l2_token: BigInt(l2tokenA.address) });
    await l2user.invoke(tokenBridgeL2, 'approve_bridge', { l1_token: BigInt(l1tokenA.address), l2_token: BigInt(l2tokenA.address) });

    // /**
    //  * Load the mock messaging contract
    //  */

    // await starknet.devnet.loadL1MessagingContract(
    //   networkUrl,
    //   messagingContractAddress,
    // );

    // /**
    //  * Increase the L2 contract balance to 100 and withdraw 10 from it.
    //  */

    // await l2contract.invoke('increase_balance', {
    //   user,
    //   amount: 100,
    // });
    // await l2contract.invoke('withdraw', {
    //   user,
    //   amount: 10,
    //   L1_CONTRACT_ADDRESS: BigInt(l1l2Example.address),
    // });
    // let userL2Balance = await l2contract.call('get_balance', {
    //   user,
    // });

    // expect(userL2Balance).to.deep.equal({ balance: 90n });

    // /**
    //  * Flushing the L2 messages so that they can be consumed by the L1.
    //  */

    // const flushL2Response = await starknet.devnet.flush();
    // expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    // const flushL2Messages = flushL2Response.consumed_messages.from_l2;

    // expect(flushL2Messages).to.have.a.lengthOf(1);
    // expectAddressEquality(flushL2Messages[0].from_address, l2contract.address);
    // expectAddressEquality(flushL2Messages[0].to_address, l1l2Example.address);

    // /**
    //  * Check the L1 balance and withdraw 10 which will consume the L2 message.
    //  */

    // let userL1Balance: BigNumber = await l1l2Example.userBalances(user);

    // expect(userL1Balance.eq(0)).to.be.true;

    // await l1l2Example.withdraw(l2contract.address, user, 10);
    // userL1Balance = await l1l2Example.userBalances(user);

    // expect(userL1Balance.eq(10)).to.be.true;

    // /**
    //  * Deposit to the L2 contract, L1 balance should be decreased by 2.
    //  */

    // await l1l2Example.deposit(l2contract.address, user, 2);

    // userL1Balance = await l1l2Example.userBalances(user);

    // expect(userL1Balance.eq(8)).to.be.true;

    // /**
    //  * Check if L2 balance increased after the deposit
    //  */

    // userL2Balance = await l2contract.call('get_balance', {
    //   user,
    // });

    // expect(userL2Balance).to.deep.equal({ balance: 90n });

    // /**
    //  * Flushing the L1 messages so that they can be consumed by the L2.
    //  */

    // const flushL1Response = await starknet.devnet.flush();
    // const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    // expect(flushL1Messages).to.have.a.lengthOf(1);
    // expect(flushL1Response.consumed_messages.from_l2).to.be.empty;

    // expectAddressEquality(flushL1Messages[0].args.from_address, l1l2Example.address);
    // expectAddressEquality(flushL1Messages[0].args.to_address, l2contract.address);
    // expectAddressEquality(flushL1Messages[0].address, messagingContractAddress);

    // userL2Balance = await l2contract.call('get_balance', {
    //   user,
    // });

    // expect(userL2Balance).to.deep.equal({ balance: 92n });
  });
});
