import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractFactory, providers } from 'ethers';
import hre, { starknet, network, ethers } from 'hardhat';
import {
  StarknetContractFactory,
  StarknetContract,
  HttpNetworkConfig,
  Account
} from 'hardhat/types';

import { TIMEOUT } from './constants';
import { initStaticATokenProxy } from './helpers';

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

const LENDING_POOL = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9';
const INCENTIVES_CONTROLLER = '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5';
const A_DAI = '0x028171bCA77440897B824Ca71D1c56caC55b68A3';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const DAI_DEPLOYER = '0xdDb108893104dE4E1C6d0E47c42237dB4E617ACc';
const A_USDC = '0xBcca60bB61934080951369a648Fb03DF4F96263C';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_DEPLOYER = '0x95Ba4cF87D6723ad9C0Db21737D862bE80e93911';

describe('TokenBridge', async function() {
  this.timeout(TIMEOUT);
 
  let proxyAdmin: SignerWithAddress;
  let l1user: SignerWithAddress;
  let l2user: Account;
  let signer: SignerWithAddress;
  let daiDeployer: providers.JsonRpcSigner;
  let usdcDeployer: providers.JsonRpcSigner;
  const networkUrl: string = (network.config as HttpNetworkConfig).url;
  console.log(networkUrl)
  const abiCoder = new ethers.utils.AbiCoder();
  // L2
  let L2TokenFactory: StarknetContractFactory;
  let l2tokenA: StarknetContract;
  let l2tokenB: StarknetContract;
  let TokenBridgeL2: StarknetContractFactory;
  let tokenBridgeL2: StarknetContract;
  let rewAaveTokenL2: StarknetContract;
  // L1
  let mockStarknetMessagingAddress: string;
  let L1StaticATokenFactory: ContractFactory;
  let l1tokenDaiImplementation: Contract;
  let l1tokenDaiProxy: Contract;
  let l1tokenDai: Contract;
  let l1tokenUsdcImplementation: Contract;
  let l1tokenUsdcProxy: Contract;
  let l1tokenUsdc: Contract;
  let TokenBridgeL1: ContractFactory;
  let tokenBridgeL1Implementation: Contract;
  let tokenBridgeL1Proxy: Contract;
  let tokenBridgeL1Proxied: Contract;
  let ProxyBridgeFactory: ContractFactory;
  let ProxyTokenFactory: ContractFactory;
  let rewAaveTokenL1: Contract;
  let pool: Contract;
  let incentives: Contract;
  let aDai: Contract;
  let dai: Contract;
  let aUsdc: Contract;
  let usdc: Contract;

  before(async function () {

    // load L1 <--> L2 messaging contract

    mockStarknetMessagingAddress = (await starknet.devnet.loadL1MessagingContract(networkUrl)).address;

    // L2 deployments

    l2user = await starknet.deployAccount("OpenZeppelin");

    TokenBridgeL2 = await starknet.getContractFactory('rewaave/token_bridge');
    tokenBridgeL2 = await TokenBridgeL2.deploy({ governor_address: BigInt(l2user.starknetContract.address) });

    const rewAaveContractFactory = await starknet.getContractFactory('rewAAVE');
    rewAaveTokenL2 = await rewAaveContractFactory.deploy({
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: {high: 0, low: 1000},
      recipient: BigInt(l2user.starknetContract.address),
      owner: BigInt(tokenBridgeL2.address),
    });

    L2TokenFactory = await starknet.getContractFactory('ETHstaticAToken');
    l2tokenA = await L2TokenFactory.deploy(
        {
          name: 1234,
          symbol: 123,
          decimals: 18,
          initial_supply: {high:0, low:1000},
          recipient: BigInt(tokenBridgeL2.address),
          controller: BigInt(tokenBridgeL2.address),
        });
    l2tokenB = await L2TokenFactory.deploy(
        { name: 4321, symbol: 321, decimals: 18, initial_supply: {high:0, low:1000}, recipient: BigInt(tokenBridgeL2.address), controller: BigInt(tokenBridgeL2.address)});

    // L1 deployments

    [signer, l1user, proxyAdmin] = await ethers.getSigners();

    pool = await ethers.getContractAt("LendingPool", LENDING_POOL)
    incentives = await ethers.getContractAt("IncentivesControllerMock", INCENTIVES_CONTROLLER)
    rewAaveTokenL1 = await ethers.getContractAt("RewAAVE", await incentives.REWARD_TOKEN());

    aDai = await ethers.getContractAt("AToken", A_DAI);
    dai = await ethers.getContractAt("ERC20Mock", DAI);
    aUsdc = await ethers.getContractAt("AToken", A_USDC);
    usdc = await ethers.getContractAt("ERC20Mock", USDC);

    const provider = new ethers.providers.JsonRpcProvider(networkUrl);
    await provider.send("hardhat_impersonateAccount", [DAI_DEPLOYER]);
    daiDeployer = await provider.getSigner(DAI_DEPLOYER);
    await provider.send("hardhat_impersonateAccount", [USDC_DEPLOYER]);
    usdcDeployer = await provider.getSigner(USDC_DEPLOYER);

    await signer.sendTransaction({ from: signer.address, to: daiDeployer._address, value: ethers.utils.parseEther("1.0") });
    await signer.sendTransaction({ from: signer.address, to: usdcDeployer._address, value: ethers.utils.parseEther("1.0") });

    TokenBridgeL1 = await ethers.getContractFactory('TokenBridge', signer);
    tokenBridgeL1Implementation = await TokenBridgeL1.deploy();
    await tokenBridgeL1Implementation.deployed();

    ProxyBridgeFactory = await ethers.getContractFactory('ProxyBridge', signer);
    tokenBridgeL1Proxy = await ProxyBridgeFactory.deploy();
    await tokenBridgeL1Proxy.deployed();

    L1StaticATokenFactory = await ethers.getContractFactory('StaticATokenLMNew', signer);
    ProxyTokenFactory = await ethers.getContractFactory("ProxyToken", signer);

    l1tokenDaiImplementation = await L1StaticATokenFactory.deploy();
    l1tokenDaiProxy = await ProxyTokenFactory.deploy(proxyAdmin.address);

    l1tokenUsdcImplementation = await L1StaticATokenFactory.deploy();
    l1tokenUsdcProxy = await ProxyTokenFactory.deploy(proxyAdmin.address);

  });

  it('set L1 token bridge as implementation contract', async () => {
    const initData = abiCoder.encode([ "address", "uint256", "address"], ["0x0000000000000000000000000000000000000000", tokenBridgeL2.address, mockStarknetMessagingAddress]);
    await tokenBridgeL1Proxy.addImplementation(tokenBridgeL1Implementation.address, initData, false)
    await tokenBridgeL1Proxy.upgradeTo(tokenBridgeL1Implementation.address, initData, false);
    expect(await tokenBridgeL1Proxy.implementation()).to.eq(tokenBridgeL1Implementation.address);
    tokenBridgeL1Proxied = await ethers.getContractAt("TokenBridge", tokenBridgeL1Proxy.address, signer)
    expect(await tokenBridgeL1Proxied.messagingContract()).to.eq(mockStarknetMessagingAddress);
  })

  it('initialize StaticATokenLM tokens', async () => {
    const daiInitArgs = [pool.address, aDai.address, "Wrapped aDAI", "waaDAI", tokenBridgeL1Proxy.address];
    l1tokenDai = await initStaticATokenProxy(l1tokenDaiImplementation.address, l1tokenDaiProxy, daiInitArgs);
    expect(await l1tokenDai.isImplementation()).to.be.false;
    expect(await l1tokenDaiImplementation.isImplementation()).to.be.true;
    const usdcInitArgs = [pool.address, aUsdc.address, "Wrapped aUSDC", "waaUSDC", tokenBridgeL1Proxy.address];
    l1tokenUsdc = await initStaticATokenProxy(l1tokenUsdcImplementation.address, l1tokenUsdcProxy, usdcInitArgs);
    expect(await l1tokenUsdc.isImplementation()).to.be.false;
    expect(await l1tokenUsdcImplementation.isImplementation()).to.be.true;

    expect(await l1tokenDai.INCENTIVES_CONTROLLER()).to.eq(INCENTIVES_CONTROLLER);
    expect(await l1tokenDai.LENDING_POOL()).to.eq(LENDING_POOL);
    expect(await l1tokenDai.ATOKEN()).to.eq(A_DAI);
    expect(await l1tokenDai.ASSET()).to.eq(DAI);
    expect(await l1tokenDai.REWARD_TOKEN()).to.eq(rewAaveTokenL1.address);  
  })

  it('l1user receives tokens and converts them to staticATokens', async () => {
    // l1user receives tokens
    await dai.connect(daiDeployer).transfer(l1user.address, 1000);
    await usdc.connect(usdcDeployer).transfer(l1user.address, 1000);
    // l1user deposits tokens and gets staticATokens
    await dai.connect(l1user).approve(l1tokenDai.address, MAX_UINT256);
    await l1tokenDai.connect(l1user).deposit(l1user.address, 1000, 0, true);
    await usdc.connect(l1user).approve(l1tokenUsdc.address, MAX_UINT256);
    await l1tokenUsdc.connect(l1user).deposit(l1user.address, 1000, 0, true);
  })

    it('initialize the bridge on L1 and L2', async () => {
      // map L2 tokens to L1 tokens on L1 bridge
      await tokenBridgeL1Proxied.approveBridge(l1tokenDai.address, l2tokenA.address);
      await tokenBridgeL1Proxied.approveBridge(l1tokenUsdc.address, l2tokenB.address);

    // set L1 token bridge from L2 bridge
    await l2user.invoke(tokenBridgeL2, 'set_l1_token_bridge', { l1_bridge_address: BigInt(tokenBridgeL1Proxied.address) });
    const { res: retrievedBridgeAddress } = await tokenBridgeL2.call('get_l1_token_bridge', {});
    expect(retrievedBridgeAddress).to.equal(BigInt(tokenBridgeL1Proxied.address));

    // map L1 tokens to L2 tokens on L2 bridge
    await l2user.invoke(tokenBridgeL2, 'set_reward_token', { reward_token: BigInt(rewAaveTokenL2.address) });
    await l2user.invoke(tokenBridgeL2, 'approve_bridge', { l1_token: BigInt(l1tokenDai.address), l2_token: BigInt(l2tokenA.address) });
    await l2user.invoke(tokenBridgeL2, 'approve_bridge', { l1_token: BigInt(l1tokenUsdc.address), l2_token: BigInt(l2tokenB.address) });
  })

  // it('L1 user sends tokens A and tokens B to L2 user', async () => {
  //   // approve L1 bridge with max uint256 amount
  //   await l1tokenDai.connect(l1user).approve(tokenBridgeL1Proxied.address, MAX_UINT256);
  //   await l1tokenUsdc.connect(l1user).approve(tokenBridgeL1Proxied.address, MAX_UINT256);

  //   // on L1: send 200 tokens A and 300 tokens B to l1user
  //   await l1tokenDai.transfer(l1user.address, 200);
  //   await l1tokenUsdc.transfer(l1user.address, 300);
  //   expect(await l1tokenDai.balanceOf(l1user.address)).to.equal(200);
  //   expect(await l1tokenUsdc.balanceOf(l1user.address)).to.equal(300);

  //   // l1user deposits 30 tokens A and 50 tokens B on L1 for l2user on L2
  //   await tokenBridgeL1Proxied.connect(l1user).deposit(l1tokenDai.address, BigInt(l2user.starknetContract.address), 30);
  //   await tokenBridgeL1Proxied.connect(l1user).deposit(l1tokenUsdc.address, BigInt(l2user.starknetContract.address), 40);
  //   expect(await l1tokenDai.balanceOf(l1user.address)).to.equal(170);
  //   expect(await l1tokenUsdc.balanceOf(l1user.address)).to.equal(260);
  //   expect(await l1tokenDai.balanceOf(tokenBridgeL1Proxied.address)).to.equal(30);
  //   expect(await l1tokenUsdc.balanceOf(tokenBridgeL1Proxied.address)).to.equal(40);    

  //   // flush L1 messages to be consumed by L2
  //   expect(await l2tokenA.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  0n } });
  //   expect(await l2tokenB.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  0n } });
  //   const flushL1Response = await starknet.devnet.flush();
  //   const flushL1Messages = flushL1Response.consumed_messages.from_l1;
  //   expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
  //   expect(flushL1Messages).to.have.a.lengthOf(2);
  //   expectAddressEquality(flushL1Messages[0].args.from_address, tokenBridgeL1Proxied.address);
  //   expectAddressEquality(flushL1Messages[0].args.to_address, tokenBridgeL2.address);
  //   expectAddressEquality(flushL1Messages[0].address, mockStarknetMessagingAddress);
  //   expectAddressEquality(flushL1Messages[1].args.from_address, tokenBridgeL1Proxied.address);
  //   expectAddressEquality(flushL1Messages[1].args.to_address, tokenBridgeL2.address);
  //   expectAddressEquality(flushL1Messages[1].address, mockStarknetMessagingAddress);

  //   // check balance of L2 tokens
  //   expect(await l2tokenA.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  30n } });
  //   expect(await l2tokenB.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  40n } });
  // })

  // it('L2 user sends back tokens A and tokens B to L1 user', async () => {
  //   // approve L2 bridge with given amount
  //   await l2user.invoke(l2tokenA, 'approve', { spender: BigInt(l2tokenA.address), amount: { high: 0n, low:  20n } });
  //   await l2user.invoke(l2tokenB, 'approve', { spender: BigInt(l2tokenB.address), amount: { high: 0n, low:  25n } });

  //   // withdraw some tokens from L2
  //   await l2user.invoke(tokenBridgeL2, 'initiate_withdraw', { l2_token: BigInt(l2tokenA.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low:  20n } });
  //   await l2user.invoke(tokenBridgeL2, 'initiate_withdraw', { l2_token: BigInt(l2tokenB.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low:  25n } });

  //   // flush L2 messages to be consumed by L1
  //   const flushL2Response = await starknet.devnet.flush();
  //   const flushL2Messages = flushL2Response.consumed_messages.from_l2;
  //   expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
  //   expect(flushL2Messages).to.have.a.lengthOf(2);

  //   // actually withdraw tokens
  //   await tokenBridgeL1Proxied.connect(l1user).withdraw(l1tokenDai.address, l1user.address, 20);
  //   await tokenBridgeL1Proxied.connect(l1user).withdraw(l1tokenUsdc.address, l1user.address, 25);

  //   // check that tokens have been transfered to l1user
  //   expect(await l1tokenDai.balanceOf(l1user.address)).to.equal(190);
  //   expect(await l1tokenUsdc.balanceOf(l1user.address)).to.equal(285);
  //   expect(await l1tokenDai.balanceOf(tokenBridgeL1Proxied.address)).to.equal(10);
  //   expect(await l1tokenUsdc.balanceOf(tokenBridgeL1Proxied.address)).to.equal(15);
  // })

  // it('L2 users send back reward accrued to L1 user', async () => {
  //   // Give TokenBridge 100 reward token
  //   await rewAaveTokenL1.connect(l1user).approve(tokenBridgeL1Proxied.address, MAX_UINT256);
  //   await rewAaveTokenL1.transfer(tokenBridgeL1Proxied.address, 1000);

  //   // Initiate bridge back rewards from L2
  //   await l2user.invoke(tokenBridgeL2, 'bridge_rewards', {l2_token: BigInt(l2tokenA.address), l1_recipient: BigInt(l1user.address), amount: {high: 0, low: 30}});

  //   // flush L2 messages to be consumed by L1
  //   const flushL2Response = await starknet.devnet.flush();
  //   const flushL2Messages = flushL2Response.consumed_messages.from_l2;
  //   expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
  //   expect(flushL2Messages).to.have.a.lengthOf(1);

  //   // call recieveRewards on L1 to consume messages from L2
  //   await tokenBridgeL1Proxied.connect(l1user).receiveRewards(l1tokenDai.address, l1user.address, 30);

  //   // check that the l1 user received reward tokens
  //   expect(await rewAaveTokenL1.balanceOf(l1user.address)).to.be.equal(30);
  // })
});
