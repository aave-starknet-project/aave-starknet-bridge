import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
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

describe('TokenBridge', async function() {
  this.timeout(TIMEOUT);
 
  let l1user: SignerWithAddress;
  let l2user: Account;
  let signer: SignerWithAddress;
  const networkUrl: string = (network.config as HttpNetworkConfig).url;
  console.log(networkUrl)
  const abiCoder = new ethers.utils.AbiCoder();
  // L2
  let L2TokenFactory: StarknetContractFactory;
  let l2tokenA: StarknetContract;
  let l2tokenB: StarknetContract;
  let proxyL2TokenA: StarknetContract;
  let proxyL2TokenB: StarknetContract;
  let proxiedL2TokenA: StarknetContract;
  let proxiedL2TokenB: StarknetContract;
  let TokenBridgeL2: StarknetContractFactory;
  let tokenBridgeL2: StarknetContract;
  let rewAaveTokenL2: StarknetContract;
  let ProxyFactoryL2: StarknetContractFactory;
  let proxyTokenBridgeL2: StarknetContract;
  let proxiedTokenBridgeL2: StarknetContract;
  // L1
  let mockStarknetMessagingAddress: string;
  let L1TokenFactory: ContractFactory;
  let l1tokenA: Contract;
  let l1tokenB: Contract;
  let TokenBridgeL1: ContractFactory;
  let tokenBridgeL1: Contract;
  let ProxyFactory: ContractFactory;
  let proxy: Contract;
  let proxied: Contract;
  let L1RewAaveFactory: ContractFactory;
  let rewAaveTokenL1: Contract;

  before(async function () {

    mockStarknetMessagingAddress = (await starknet.devnet.loadL1MessagingContract(networkUrl)).address;

    // L2 deployments

    l2user = await starknet.deployAccount("OpenZeppelin");

    TokenBridgeL2 = await starknet.getContractFactory('token_bridge');
    tokenBridgeL2 = await TokenBridgeL2.deploy();

    ProxyFactoryL2 = await starknet.getContractFactory('proxy');
    proxyTokenBridgeL2 = await ProxyFactoryL2.deploy({proxy_admin: BigInt(l2user.starknetContract.address)});
    proxyL2TokenA = await ProxyFactoryL2.deploy({proxy_admin: BigInt(l2user.starknetContract.address)});
    proxyL2TokenB = await ProxyFactoryL2.deploy({proxy_admin: BigInt(l2user.starknetContract.address)});

    const rewAaveContractFactory = await starknet.getContractFactory('rewAAVE');
    rewAaveTokenL2 = await rewAaveContractFactory.deploy({
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: {high: 0, low: 1000},
      recipient: BigInt(l2user.starknetContract.address),
      owner: BigInt(proxyTokenBridgeL2.address),
    });

    L2TokenFactory = await starknet.getContractFactory('ETHstaticAToken');
    l2tokenA = await L2TokenFactory.deploy();
    l2tokenB = await L2TokenFactory.deploy();

    [signer, l1user] = await ethers.getSigners();


    L1RewAaveFactory = await ethers.getContractFactory('RewAAVE', signer);
    rewAaveTokenL1 = await L1RewAaveFactory.deploy(1000);

    L1TokenFactory = await ethers.getContractFactory('L1Token', signer);
    l1tokenA = await L1TokenFactory.deploy(1000, rewAaveTokenL1.address);
    l1tokenB = await L1TokenFactory.deploy(1000, rewAaveTokenL1.address);

    TokenBridgeL1 = await ethers.getContractFactory('TokenBridge', signer);
    tokenBridgeL1 = await TokenBridgeL1.deploy();
    await tokenBridgeL1.deployed();

    ProxyFactory = await ethers.getContractFactory('ProxyBridge', signer);
    proxy = await ProxyFactory.deploy();
    await proxy.deployed();

    // load L1 <--> L2 messaging contract

  });

  it('set L2  implementation contracts', async () => {
    {
      await l2user.invoke(proxyL2TokenA, 'initialize_proxy', {implementation_address: BigInt(l2tokenA.address)});
      const { implementation } = await proxyL2TokenA.call('get_implementation', {});
      expect(implementation).to.equal(BigInt(l2tokenA.address));
      proxiedL2TokenA = L2TokenFactory.getContractAt(proxyL2TokenA.address);
    }

    {
      await l2user.invoke(proxyL2TokenB, 'initialize_proxy', {implementation_address: BigInt(l2tokenB.address)});
      const { implementation } = await proxyL2TokenB.call('get_implementation', {});
      expect(implementation).to.equal(BigInt(l2tokenB.address));
      proxiedL2TokenB = L2TokenFactory.getContractAt(proxyL2TokenB.address);
    }

    {
      await l2user.invoke(proxyTokenBridgeL2, 'initialize_proxy', {implementation_address: BigInt(tokenBridgeL2.address)})
      const { implementation } = await proxyTokenBridgeL2.call('get_implementation', {});
      expect(implementation).to.equal(BigInt(tokenBridgeL2.address));
      proxiedTokenBridgeL2 = TokenBridgeL2.getContractAt(proxyTokenBridgeL2.address);
    }
  })

  it('initialise L2 ETHStaticATokens', async () => {
    await l2user.invoke(proxiedL2TokenA, 'initialize_ETHstaticAToken', {
          name: 1234n,
          symbol: 123n,
          decimals: 18n,
          initial_supply: {high:0n, low:1000n},
          recipient: BigInt(proxyTokenBridgeL2.address),
          controller: BigInt(proxyTokenBridgeL2.address),
        });

    {
      const { name } = await l2user.call(proxiedL2TokenA, 'name');
      expect(name).to.equal(1234n);
      const { symbol } = await l2user.call(proxiedL2TokenA, 'symbol');
      expect(symbol).to.equal(123n);
      const { decimals } = await l2user.call(proxiedL2TokenA, 'decimals');
      expect(decimals).to.equal(18n);
    }

    await l2user.invoke(proxiedL2TokenB, 'initialize_ETHstaticAToken', {
          name: 4321n,
          symbol: 321n,
          decimals: 18n,
          initial_supply: {high:0n, low:1000n},
          recipient: BigInt(proxyTokenBridgeL2.address),
          controller: BigInt(proxyTokenBridgeL2.address)
    });

    {
      const { name } = await l2user.call(proxiedL2TokenB, 'name');
      expect(name).to.equal(4321n);
      const { symbol } = await l2user.call(proxiedL2TokenB, 'symbol');
      expect(symbol).to.equal(321n);
      const { decimals } = await l2user.call(proxiedL2TokenB, 'decimals');
      expect(decimals).to.equal(18n);
    }
  })


  it('set L1 token bridge as implementation contract', async () => {
    const initData = abiCoder.encode([ "address", "uint256", "address"], ["0x0000000000000000000000000000000000000000", proxiedTokenBridgeL2.address, mockStarknetMessagingAddress]);
    await proxy.addImplementation(tokenBridgeL1.address, initData, false)
    await proxy.upgradeTo(tokenBridgeL1.address, initData, false);
    expect(await proxy.implementation()).to.eq(tokenBridgeL1.address);
    proxied = await ethers.getContractAt("TokenBridge", proxy.address, signer)
    expect(await proxied.messagingContract()).to.eq(mockStarknetMessagingAddress);
  })

  it('initialize the bridge on L1 and L2', async () => {
    // map L2 tokens to L1 tokens on L1 bridge
    await proxied.approveBridge(l1tokenA.address, proxiedL2TokenA.address);
    await proxied.approveBridge(l1tokenB.address, proxiedL2TokenB.address);

    // set L1 token bridge from L2 bridge
    await l2user.invoke(proxiedTokenBridgeL2, 'initialize_token_bridge', { governor_address: BigInt(l2user.starknetContract.address) });
    await l2user.invoke(proxiedTokenBridgeL2, 'set_l1_token_bridge', { l1_bridge_address: BigInt(proxied.address) });
    const { res: retrievedBridgeAddress } = await l2user.call(proxiedTokenBridgeL2, 'get_l1_token_bridge', {})
    expect(retrievedBridgeAddress).to.equal(BigInt(proxied.address));

    // map L1 tokens to L2 tokens on L2 bridge
    await l2user.invoke(proxiedTokenBridgeL2, 'set_reward_token', { reward_token: BigInt(rewAaveTokenL2.address) });
    await l2user.invoke(proxiedTokenBridgeL2, 'approve_bridge', { l1_token: BigInt(l1tokenA.address), l2_token: BigInt(proxiedL2TokenA.address) });
    await l2user.invoke(proxiedTokenBridgeL2, 'approve_bridge', { l1_token: BigInt(l1tokenB.address), l2_token: BigInt(proxiedL2TokenB.address) });
  })

  it('L1 user sends tokens A and tokens B to L2 user', async () => {
    // approve L1 bridge with max uint256 amount
    await l1tokenA.connect(l1user).approve(proxied.address, MAX_UINT256);
    await l1tokenB.connect(l1user).approve(proxied.address, MAX_UINT256);

    // on L1: send 200 tokens A and 300 tokens B to l1user
    await l1tokenA.transfer(l1user.address, 200);
    await l1tokenB.transfer(l1user.address, 300);
    expect(await l1tokenA.balanceOf(l1user.address)).to.equal(200);
    expect(await l1tokenB.balanceOf(l1user.address)).to.equal(300);

    // l1user deposits 30 tokens A and 50 tokens B on L1 for l2user on L2
    await proxied.connect(l1user).deposit(l1tokenA.address, BigInt(l2user.starknetContract.address), 30);
    await proxied.connect(l1user).deposit(l1tokenB.address, BigInt(l2user.starknetContract.address), 40);
    expect(await l1tokenA.balanceOf(l1user.address)).to.equal(170);
    expect(await l1tokenB.balanceOf(l1user.address)).to.equal(260);    
    expect(await l1tokenA.balanceOf(proxied.address)).to.equal(30);
    expect(await l1tokenB.balanceOf(proxied.address)).to.equal(40);    

    // flush L1 messages to be consumed by L2
    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);
    expectAddressEquality(flushL1Messages[0].args.from_address, proxied.address);
    expectAddressEquality(flushL1Messages[0].args.to_address, proxiedTokenBridgeL2.address);
    expectAddressEquality(flushL1Messages[0].address, mockStarknetMessagingAddress);
    expectAddressEquality(flushL1Messages[1].args.from_address, proxied.address);
    expectAddressEquality(flushL1Messages[1].args.to_address, proxiedTokenBridgeL2.address);
    expectAddressEquality(flushL1Messages[1].address, mockStarknetMessagingAddress);

    // check balance of L2 tokens
    expect(await proxiedL2TokenA.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  30n } });
    expect(await proxiedL2TokenB.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  40n } });
  })

  // it('L2 user sends back tokens A and tokens B to L1 user', async () => {
  //   // approve L2 bridge with given amount
  //   await l2user.invoke(proxiedL2TokenA, 'approve', { spender: BigInt(proxiedL2TokenA.address), amount: { high: 0n, low:  20n } });
  //   await l2user.invoke(proxiedL2TokenB, 'approve', { spender: BigInt(proxiedL2TokenB.address), amount: { high: 0n, low:  25n } });

  //   // withdraw some tokens from L2
  //   await l2user.invoke(proxiedTokenBridgeL2, 'initiate_withdraw', { l2_token: BigInt(proxiedL2TokenA.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low:  20n } });
  //   await l2user.invoke(proxiedTokenBridgeL2, 'initiate_withdraw', { l2_token: BigInt(proxiedL2TokenB.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low:  25n } });

  //   // flush L2 messages to be consumed by L1
  //   const flushL2Response = await starknet.devnet.flush();
  //   const flushL2Messages = flushL2Response.consumed_messages.from_l2;
  //   expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
  //   expect(flushL2Messages).to.have.a.lengthOf(2);

  //   // actually withdraw tokens
  //   await proxied.connect(l1user).withdraw(l1tokenA.address, l1user.address, 20);
  //   await proxied.connect(l1user).withdraw(l1tokenB.address, l1user.address, 25);

  //   // check that tokens have been transfered to l1user
  //   expect(await l1tokenA.balanceOf(l1user.address)).to.equal(190);
  //   expect(await l1tokenB.balanceOf(l1user.address)).to.equal(285);
  //   expect(await l1tokenA.balanceOf(proxied.address)).to.equal(10);
  //   expect(await l1tokenB.balanceOf(proxied.address)).to.equal(15);
  // })

  // it('L2 users send back reward accrued to L1 user', async () => {
  //   // Give TokenBridge 100 reward token
  //   await rewAaveTokenL1.connect(l1user).approve(proxied.address, MAX_UINT256);
  //   await rewAaveTokenL1.transfer(proxied.address, 1000);

  //   // Initiate bridge back rewards from L2
  //   await l2user.invoke(proxiedTokenBridgeL2, 'bridge_rewards', {l2_token: BigInt(proxiedL2TokenA.address), l1_recipient: BigInt(l1user.address), amount: {high: 0, low: 30}});

  //   // flush L2 messages to be consumed by L1
  //   const flushL2Response = await starknet.devnet.flush();
  //   const flushL2Messages = flushL2Response.consumed_messages.from_l2;
  //   expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
  //   expect(flushL2Messages).to.have.a.lengthOf(1);

  //   // call recieveRewards on L1 to consume messages from L2
  //   await proxied.connect(l1user).receiveRewards(l1tokenA.address, l1user.address, 30);

  //   // check that the l1 user received reward tokens
  //   expect(await rewAaveTokenL1.balanceOf(l1user.address)).to.be.equal(30);
  // })
});
