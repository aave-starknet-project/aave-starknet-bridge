import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import console from 'console';
import { Contract, ContractFactory } from 'ethers';
import hre, { starknet, network, ethers } from 'hardhat';
import {
  StarknetContractFactory,
  StarknetContract,
  HttpNetworkConfig,
  Account
} from 'hardhat/types';

import { TIMEOUT } from './constants';

const MAX_UINT256 = hre.ethers.constants.MaxInt256;

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
 
  let l1user: SignerWithAddress;
  let l2user: Account;
  let signer: SignerWithAddress;
  const networkUrl: string = (network.config as HttpNetworkConfig).url;
  console.log(networkUrl)
  // L2
  let L2TokenFactory: StarknetContractFactory;
  let l2tokenA: StarknetContract;
  let l2tokenB: StarknetContract;
  let TokenBridgeL2: StarknetContractFactory;
  let tokenBridgeL2: StarknetContract;
  // L1
  let MockStarknetMessaging: ContractFactory;
  let mockStarknetMessaging: Contract;
  let L1TokenFactory: ContractFactory;
  let l1tokenA: Contract;
  let l1tokenB: Contract;
  let TokenBridgeL1: ContractFactory;
  let tokenBridgeL1: Contract;
  let messagingContractAddress: string;

  before(async function () {

    // L2 deployments

    l2user = await starknet.deployAccount("OpenZeppelin");

    L2TokenFactory = await starknet.getContractFactory('l2_token');
    l2tokenA = await L2TokenFactory.deploy(
        { name: 1234, symbol: 123, decimals: 18, minter_address: BigInt(l2user.starknetContract.address) });
    l2tokenB = await L2TokenFactory.deploy(
        { name: 4321, symbol: 321, decimals: 18, minter_address: BigInt(l2user.starknetContract.address) });
  
    TokenBridgeL2 = await starknet.getContractFactory('token_bridge');
    tokenBridgeL2 = await TokenBridgeL2.deploy({ governor_address: BigInt(l2user.starknetContract.address) });

    // L1 deployments

    [signer, l1user] = await ethers.getSigners();

    MockStarknetMessaging = await ethers.getContractFactory(
      'MockStarknetMessaging',
      signer,
    );
    mockStarknetMessaging = await MockStarknetMessaging.deploy();
    await mockStarknetMessaging.deployed();

    L1TokenFactory = await ethers.getContractFactory('L1Token', signer);
    l1tokenA = await L1TokenFactory.deploy(1000);
    l1tokenB = await L1TokenFactory.deploy(1000);

    TokenBridgeL1 = await ethers.getContractFactory('TokenBridge', signer);
    tokenBridgeL1 = await TokenBridgeL1.deploy();
    await tokenBridgeL1.deployed();
  });

  it('should deploy the messaging contract', async () => {
    const {
      address: deployedTo,
      l1_provider: L1Provider,
    } = await starknet.devnet.loadL1MessagingContract(networkUrl);
    expect(deployedTo).not.to.be.undefined;
    expect(L1Provider).to.equal(networkUrl);    
  });

  it('should load the already deployed contract if the address is provided', async () => {
    const {
      address: deployedTo,
    } = await starknet.devnet.loadL1MessagingContract(networkUrl);

    await tokenBridgeL1.initializeWithoutProxy(tokenBridgeL2.address, deployedTo);
    messagingContractAddress = await tokenBridgeL1.messagingContract();

    const {
      address: loadedFrom,
    } = await starknet.devnet.loadL1MessagingContract(
      networkUrl,
      messagingContractAddress,
    );
    expect(messagingContractAddress).to.equal(loadedFrom);
  });

  it('should exchange messages between L1 and L2', async () => {

    // on L1: send 200 tokens A and 300 tokens B to l1user
    await l1tokenA.transfer(l1user.address, 200);
    await l1tokenB.transfer(l1user.address, 300);
    expect(await l1tokenA.balanceOf(l1user.address)).to.equal(200);
    expect(await l1tokenB.balanceOf(l1user.address)).to.equal(300);    

    // load messaging contract
    await starknet.devnet.loadL1MessagingContract(networkUrl, mockStarknetMessaging.address);

    // this should initialize governance, set messaging contract address and L2 token bridge address
    // TODO: implement proper encoding
    // await tokenBridgeL1.initializeWithoutProxy(abiCoder.encode([ "string", "string" ], [tokenBridgeL2.address, mockStarknetMessaging.address]));
    await tokenBridgeL1.initializeWithoutProxy(tokenBridgeL2.address, mockStarknetMessaging.address);

    // map L2 tokens to L1 tokens on L1 bridge
    await tokenBridgeL1.approveBridge(l1tokenA.address, l2tokenA.address);
    await tokenBridgeL1.approveBridge(l1tokenB.address, l2tokenB.address);

    // set L1 token bridge from L2 bridge 
    await l2user.invoke(tokenBridgeL2, 'set_l1_token_bridge', { l1_bridge_address: BigInt(tokenBridgeL1.address) });
    const { res: retrievedBridgeAddress } = await tokenBridgeL2.call('get_l1_token_bridge', {});
    expect(retrievedBridgeAddress).to.equal(BigInt(tokenBridgeL1.address));

    // map L1 tokens to L2 tokens on L2 bridge
    await l2user.invoke(tokenBridgeL2, 'approve_bridge', { l1_token: BigInt(l1tokenA.address), l2_token: BigInt(l2tokenA.address) });
    await l2user.invoke(tokenBridgeL2, 'approve_bridge', { l1_token: BigInt(l1tokenB.address), l2_token: BigInt(l2tokenB.address) });

    // approve bridge with max uint256 amount
    await l1tokenA.connect(l1user).approve(tokenBridgeL1.address, MAX_UINT256);
    await l1tokenB.connect(l1user).approve(tokenBridgeL1.address, MAX_UINT256);

    // l1user deposits 30 tokens A and 50 tokens B on L1 for l2user on L2
    await tokenBridgeL1.connect(l1user).deposit(l1tokenA.address, BigInt(l2user.starknetContract.address), 30);
    await tokenBridgeL1.connect(l1user).deposit(l1tokenB.address, BigInt(l2user.starknetContract.address), 40);
    expect(await l1tokenA.balanceOf(l1user.address)).to.equal(170);
    expect(await l1tokenB.balanceOf(l1user.address)).to.equal(260);    
    expect(await l1tokenA.balanceOf(tokenBridgeL1.address)).to.equal(30);
    expect(await l1tokenB.balanceOf(tokenBridgeL1.address)).to.equal(40);    

    // flush L1 messages to be consumed by L2
    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);
    expectAddressEquality(flushL1Messages[0].args.from_address, tokenBridgeL1.address);
    expectAddressEquality(flushL1Messages[0].args.to_address, tokenBridgeL2.address);
    expectAddressEquality(flushL1Messages[0].address, mockStarknetMessaging.address);
    expectAddressEquality(flushL1Messages[1].args.from_address, tokenBridgeL1.address);
    expectAddressEquality(flushL1Messages[1].args.to_address, tokenBridgeL2.address);
    expectAddressEquality(flushL1Messages[1].address, mockStarknetMessaging.address);

    // check balance of L2 tokens
    expect(await l2tokenA.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  30n } });
    expect(await l2tokenB.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  40n } });

    // withdraw some tokens from L2
    await l2user.invoke(tokenBridgeL2, 'initiate_withdraw', { l2_token: BigInt(l2tokenA.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low:  20n } });
    await l2user.invoke(tokenBridgeL2, 'initiate_withdraw', { l2_token: BigInt(l2tokenB.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low:  25n } });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(2);

    // actually withdraw tokens
    await tokenBridgeL1.connect(l1user).withdraw(l1tokenA.address, l1user.address, 20);
    await tokenBridgeL1.connect(l1user).withdraw(l1tokenB.address, l1user.address, 25);

    // check that tokens have been transfered to l1user
    expect(await l1tokenA.balanceOf(l1user.address)).to.equal(190);
    expect(await l1tokenB.balanceOf(l1user.address)).to.equal(285);    
    expect(await l1tokenA.balanceOf(tokenBridgeL1.address)).to.equal(10);
    expect(await l1tokenB.balanceOf(tokenBridgeL1.address)).to.equal(15);    

  });
});
