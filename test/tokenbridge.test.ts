import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractFactory, providers } from "ethers";
import hre, { starknet, network, ethers } from "hardhat";
import {
  StarknetContractFactory,
  StarknetContract,
  HttpNetworkConfig,
  Account,
} from "hardhat/types";

import { TIMEOUT } from "./constants";
import { expectAddressEquality, uintFromParts } from "./utils";


const MAX_UINT256 = hre.ethers.constants.MaxInt256;

const LENDING_POOL = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9';
const INCENTIVES_CONTROLLER = '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5';
const A_DAI = '0x028171bCA77440897B824Ca71D1c56caC55b68A3';
const A_USDC = '0xBcca60bB61934080951369a648Fb03DF4F96263C';

const STKAAVE_WHALE = "0x32b61bb22cbe4834bc3e73dce85280037d944a4d";
const DAI_WHALE = "0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0";
const USDC_WHALE = "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503";

describe("TokenBridge", async function () {
  this.timeout(TIMEOUT);

  const networkUrl: string = (network.config as HttpNetworkConfig).url;
  const abiCoder = new ethers.utils.AbiCoder();

  // users
  let proxyAdmin: SignerWithAddress;

  let l1user: SignerWithAddress;
  let l2owner: Account;
  let l2user: Account;
  let signer: SignerWithAddress;
  let daiWhale: providers.JsonRpcSigner;
  let usdcWhale: providers.JsonRpcSigner;
  let stkaaveWhale: providers.JsonRpcSigner;

  // misk
  let blockNumberDai: number;
  let blockNumberUsdc: number;
  let txDai: any;
  let txUsdc: any;

  // L2
  //// factories
  let l2TokenFactory: StarknetContractFactory;
  let l2ProxyFactory: StarknetContractFactory;
  let l2TokenBridgeFactory: StarknetContractFactory;

  //// tokens
  let l2StaticADaiImpl: StarknetContract;
  let l2StaticADaiProxy: StarknetContract;
  let l2StaticADai: StarknetContract;

  let l2StaticAUsdcImpl: StarknetContract;
  let l2StaticAUsdcProxy: StarknetContract;
  let l2StaticAUsdc: StarknetContract;

  let l2rewAAVEImpl: StarknetContract;
  let l2rewAAVEProxy: StarknetContract;
  let l2rewAAVE: StarknetContract;

  //// token bridge
  let l2TokenBridgeImpl: StarknetContract;
  let l2TokenBridgeProxy: StarknetContract;
  let l2TokenBridge: StarknetContract;

  // L1

  let mockStarknetMessagingAddress: string;

  //// factories
  let l1TokenBridgeFactory: ContractFactory;
  let l1ProxyBridgeFactory: ContractFactory;

  //// token bridge
  let l1TokenBridgeImpl: Contract;
  let l1TokenBridgeProxy: Contract;
  let l1TokenBridge: Contract;

  //// AAVE contracts
  let pool: Contract;
  let incentives: Contract;
  let aDai: Contract;
  let dai: Contract;
  let aUsdc: Contract;
  let usdc: Contract;

  //// Initial balances
  let l1InitialDaiBalance: number;
  let l1InitialUsdcBalance: number;
  let l1InitialADaiBalance: number;
  let l1InitialAUsdcBalance: number;

  before(async function () {
    // load L1 <--> L2 messaging contract

    mockStarknetMessagingAddress = (
      await starknet.devnet.loadL1MessagingContract(networkUrl)
    ).address;

    // L2 deployments

    l2owner = await starknet.deployAccount("OpenZeppelin");
    l2user = await starknet.deployAccount("OpenZeppelin");

    l2TokenBridgeFactory = await starknet.getContractFactory('rewaave/token_bridge');
    l2TokenBridgeImpl = await l2TokenBridgeFactory.deploy();

    l2ProxyFactory = await starknet.getContractFactory('rewaave/proxy');
    l2TokenBridgeProxy = await l2ProxyFactory.deploy({proxy_admin: BigInt(l2user.starknetContract.address)});
    l2StaticADaiProxy = await l2ProxyFactory.deploy({proxy_admin: BigInt(l2user.starknetContract.address)});
    l2StaticAUsdcProxy = await l2ProxyFactory.deploy({proxy_admin: BigInt(l2user.starknetContract.address)});

    const rewAaveContractFactory = await starknet.getContractFactory('rewaave/tokens/rewAAVE');
    l2rewAAVEImpl = await rewAaveContractFactory.deploy();
    l2rewAAVEProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(l2owner.starknetContract.address),
    });

    await l2owner.invoke(l2rewAAVEProxy, "initialize_proxy", {
      implementation_address: BigInt(l2rewAAVEImpl.address),
    });
    l2rewAAVE = rewAaveContractFactory.getContractAt(
      l2rewAAVEProxy.address
    );

    await l2owner.invoke(l2rewAAVE, "initialize_rewAAVE", {
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: {high: 0, low: 0},
      recipient: BigInt(l2user.starknetContract.address),
      owner: BigInt(l2TokenBridgeProxy.address),
    });

    l2TokenFactory = await starknet.getContractFactory('static_a_token');
    l2StaticADaiImpl = await l2TokenFactory.deploy();
    l2StaticAUsdcImpl = await l2TokenFactory.deploy();

    // L1 deployments

    [signer, l1user, proxyAdmin] = await ethers.getSigners();

    pool = await ethers.getContractAt("LendingPool", LENDING_POOL)
    incentives = await ethers.getContractAt("IncentivesControllerMock", INCENTIVES_CONTROLLER)

    aDai = await ethers.getContractAt("AToken", A_DAI);
    dai = await ethers.getContractAt(
      "ERC20Mock",
      await aDai.UNDERLYING_ASSET_ADDRESS()
    );
    aUsdc = await ethers.getContractAt("AToken", A_USDC);
    usdc = await ethers.getContractAt(
      "ERC20Mock",
      await aUsdc.UNDERLYING_ASSET_ADDRESS()
    );

    const provider = new ethers.providers.JsonRpcProvider(networkUrl);
    daiWhale = provider.getSigner(DAI_WHALE);
    usdcWhale = provider.getSigner(USDC_WHALE);
    stkaaveWhale = provider.getSigner(STKAAVE_WHALE);

    await signer.sendTransaction({
      from: signer.address,
      to: daiWhale._address,
      value: ethers.utils.parseEther("1.0"),
    });
    await signer.sendTransaction({
      from: signer.address,
      to: usdcWhale._address,
      value: ethers.utils.parseEther("1.0"),
    });
    await signer.sendTransaction({
      from: signer.address,
      to: stkaaveWhale._address,
      value: ethers.utils.parseEther("1.0"),
    });

    l1TokenBridgeFactory = await ethers.getContractFactory('TokenBridge', signer);
    l1TokenBridgeImpl = await l1TokenBridgeFactory.deploy();
    await l1TokenBridgeImpl.deployed();

    l1ProxyBridgeFactory = await ethers.getContractFactory('ProxyBridge', signer);
    l1TokenBridgeProxy = await l1ProxyBridgeFactory.deploy();
    await l1TokenBridgeProxy.deployed();

  });

  it("set L2 implementation contracts", async () => {
    {
      await l2user.invoke(l2StaticADaiProxy, 'initialize_proxy', {implementation_address: BigInt(l2StaticADaiImpl.address)});
      const { implementation } = await l2StaticADaiProxy.call('get_implementation', {});
      expect(implementation).to.equal(BigInt(l2StaticADaiImpl.address));
      l2StaticADai = l2TokenFactory.getContractAt(l2StaticADaiProxy.address);
    }

    {
      await l2user.invoke(l2StaticAUsdcProxy, 'initialize_proxy', {implementation_address: BigInt(l2StaticAUsdcImpl.address)});
      const { implementation } = await l2StaticAUsdcProxy.call('get_implementation', {});
      expect(implementation).to.equal(BigInt(l2StaticAUsdcImpl.address));
      l2StaticAUsdc = l2TokenFactory.getContractAt(l2StaticAUsdcProxy.address);
    }

    {
      await l2user.invoke(l2TokenBridgeProxy, 'initialize_proxy', {implementation_address: BigInt(l2TokenBridgeImpl.address)})
      const { implementation } = await l2TokenBridgeProxy.call('get_implementation', {});
      expect(implementation).to.equal(BigInt(l2TokenBridgeImpl.address));
      l2TokenBridge = l2TokenBridgeFactory.getContractAt(l2TokenBridgeProxy.address);
    }
  });

  it('initialize L2 static_a_tokens', async () => {
    await l2user.invoke(l2StaticADai, 'initialize_static_a_token', {
          name: 1234n,
          symbol: 123n,
          decimals: 18n,
          initial_supply: {high:0n, low:0n},
          recipient: BigInt(l2TokenBridge.address),
          owner: BigInt(l2owner.starknetContract.address),
          l2_token_bridge: BigInt(l2TokenBridge.address),
        });

    {
      const { name } = await l2StaticADai.call('name');
      expect(name).to.equal(1234n);
      const { symbol } = await l2StaticADai.call('symbol');
      expect(symbol).to.equal(123n);
      const { decimals } = await l2StaticADai.call('decimals');
      expect(decimals).to.equal(18n);
    }

    await l2user.invoke(l2StaticAUsdc, 'initialize_static_a_token', {
          name: 4321n,
          symbol: 321n,
          decimals: 18n,
          initial_supply: {high:0n, low:0n},
          recipient: BigInt(l2TokenBridge.address),
          owner: BigInt(l2owner.starknetContract.address),
          l2_token_bridge: BigInt(l2TokenBridge.address),
    });

    {
      const { name } = await l2StaticAUsdc.call('name');
      expect(name).to.equal(4321n);
      const { symbol } = await l2StaticAUsdc.call('symbol');
      expect(symbol).to.equal(321n);
      const { decimals } = await l2StaticAUsdc.call('decimals');
      expect(decimals).to.equal(18n);
    }
  });

  it('set L1 token bridge as implementation contract', async () => {
    const initData = abiCoder.encode([ "address", "uint256", "address", "address"], ["0x0000000000000000000000000000000000000000", l2TokenBridgeProxy.address, mockStarknetMessagingAddress, INCENTIVES_CONTROLLER]);
    await l1TokenBridgeProxy.addImplementation(l1TokenBridgeImpl.address, initData, false)
    await l1TokenBridgeProxy.upgradeTo(l1TokenBridgeImpl.address, initData, false);
    expect(await l1TokenBridgeProxy.implementation()).to.eq(l1TokenBridgeImpl.address);
    l1TokenBridge = await ethers.getContractAt("TokenBridge", l1TokenBridgeProxy.address, signer)
    expect(await l1TokenBridge.messagingContract()).to.eq(mockStarknetMessagingAddress);
    expect(await l1TokenBridge.rewardToken()).to.eq(await incentives.REWARD_TOKEN());
  })

  it('l1user receives tokens and converts them to aTokens', async () => {
    // l1user receives dai and usdc
    await dai.connect(daiWhale).transfer(l1user.address, 3000);
    await usdc.connect(usdcWhale).transfer(l1user.address, 3000);

    // l1user deposits dai and gets aDai
    await dai.connect(l1user).approve(pool.address, MAX_UINT256);
    await pool.connect(l1user).deposit(dai.address, 1000, l1user.address, 0);

    // l1user deposits usdc and gets aUsdc
    await usdc.connect(l1user).approve(pool.address, MAX_UINT256);
    await pool.connect(l1user).deposit(usdc.address, 1000, l1user.address, 0);

  })

  it("initialize the bridge on L1 and L2", async () => {
    // map L2 tokens to L1 tokens on L1 bridge
    await l1TokenBridge.approveToken(aDai.address, l2StaticADai.address);
    await l1TokenBridge.approveToken(aUsdc.address, l2StaticAUsdc.address);

    // set L1 token bridge from L2 bridge
    await l2user.invoke(l2TokenBridge, 'initialize_token_bridge', { governor_address: BigInt(l2user.starknetContract.address) });
    await l2user.invoke(l2TokenBridge, 'set_l1_token_bridge', { l1_bridge_address: BigInt(l1TokenBridge.address) });
    const { res: retrievedBridgeAddress } = await l2TokenBridge.call('get_l1_token_bridge', {});
    expect(retrievedBridgeAddress).to.equal(BigInt(l1TokenBridge.address));

    // map L1 tokens to L2 tokens on L2 bridge
    await l2user.invoke(l2TokenBridge, 'set_reward_token', { reward_token: BigInt(l2rewAAVE.address) });
    await l2user.invoke(l2TokenBridge, 'approve_bridge', { l1_token: BigInt(aDai.address), l2_token: BigInt(l2StaticADai.address) });
    await l2user.invoke(l2TokenBridge, 'approve_bridge', { l1_token: BigInt(aUsdc.address), l2_token: BigInt(l2StaticAUsdc.address) });
  })

  it('Deposit aDai and aUsdc', async () => {
    // approve L1 bridge with max uint256 amount
    await aDai.connect(l1user).approve(l1TokenBridge.address, MAX_UINT256);
    await aUsdc.connect(l1user).approve(l1TokenBridge.address, MAX_UINT256);

    // l1user deposits 30 aDai and 40 aUsdc on L1 for l2user on L2
    l1InitialADaiBalance = await aDai.balanceOf(l1user.address);
    txDai = await l1TokenBridge.connect(l1user).deposit(aDai.address, BigInt(l2user.starknetContract.address), 30, 0, false);
    blockNumberDai = txDai.blockNumber;
    expect(await aDai.balanceOf(l1user.address)).to.equal(l1InitialADaiBalance-30);

    l1InitialAUsdcBalance = await aUsdc.balanceOf(l1user.address);
    txUsdc = await l1TokenBridge.connect(l1user).deposit(aUsdc.address, BigInt(l2user.starknetContract.address), 40, 0, false);
    blockNumberUsdc = txUsdc.blockNumber;
    /////// WARNING: there is an off by 1 here because the previous action updates the aToken rate
    expect(await aUsdc.balanceOf(l1user.address)).to.equal(l1InitialAUsdcBalance-40);

    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);
    expectAddressEquality(flushL1Messages[0].args.from_address, l1TokenBridge.address);
    expectAddressEquality(flushL1Messages[0].args.to_address, l2TokenBridge.address);
    expectAddressEquality(flushL1Messages[0].address, mockStarknetMessagingAddress);
    expectAddressEquality(flushL1Messages[1].args.from_address, l1TokenBridge.address);
    expectAddressEquality(flushL1Messages[1].args.to_address, l2TokenBridge.address);
    expectAddressEquality(flushL1Messages[1].address, mockStarknetMessagingAddress);

    // check balance and last update of L2 tokens
    expect(await l2StaticADai.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  28n } });
    expect(await l2StaticAUsdc.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  37n } });
    expect(await l2StaticADai.call('get_last_update', {})).to.deep.equal({ block_number: {high: 0n, low: BigInt(blockNumberDai)}});
    expect(await l2StaticAUsdc.call('get_last_update', {})).to.deep.equal({ block_number: {high: 0n, low: BigInt(blockNumberUsdc)}});
  });

  it('Deposit dai and usdc', async () => {
    // approve L1 bridge with max uint256 amount
    await dai.connect(l1user).approve(l1TokenBridge.address, MAX_UINT256);
    await usdc.connect(l1user).approve(l1TokenBridge.address, MAX_UINT256);

    // l1user deposits 30 dai and 40 usdc on L1 for l2user on L2
    l1InitialDaiBalance = await dai.balanceOf(l1user.address);
    txDai = await l1TokenBridge.connect(l1user).deposit(aDai.address, BigInt(l2user.starknetContract.address), 30, 0, true);
    blockNumberDai = txDai.blockNumber;
    expect(await dai.balanceOf(l1user.address)).to.equal(l1InitialDaiBalance-30);

    l1InitialUsdcBalance = await usdc.balanceOf(l1user.address);
    txUsdc = await l1TokenBridge.connect(l1user).deposit(aUsdc.address, BigInt(l2user.starknetContract.address), 40, 0, true);
    blockNumberUsdc = txUsdc.blockNumber;
    expect(await usdc.balanceOf(l1user.address)).to.equal(l1InitialUsdcBalance-40);

    expect(await dai.balanceOf(l1TokenBridge.address)).to.equal(0);
    expect(await usdc.balanceOf(l1TokenBridge.address)).to.equal(0);

    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);
    expectAddressEquality(flushL1Messages[0].args.from_address, l1TokenBridge.address);
    expectAddressEquality(flushL1Messages[0].args.to_address, l2TokenBridge.address);
    expectAddressEquality(flushL1Messages[0].address, mockStarknetMessagingAddress);
    expectAddressEquality(flushL1Messages[1].args.from_address, l1TokenBridge.address);
    expectAddressEquality(flushL1Messages[1].args.to_address, l2TokenBridge.address);
    expectAddressEquality(flushL1Messages[1].address, mockStarknetMessagingAddress);

    // check balance and last update of L2 tokens
    expect(await l2StaticADai.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  56n } });
    expect(await l2StaticAUsdc.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  74n } });
    expect(await l2StaticADai.call('get_last_update', {})).to.deep.equal({ block_number: {high: 0n, low: BigInt(blockNumberDai)}});
    expect(await l2StaticAUsdc.call('get_last_update', {})).to.deep.equal({ block_number: {high: 0n, low: BigInt(blockNumberUsdc)}});
  });

  it('Updates rewards on transfer', async () => {
    //////////////// Needs to be implemented once token_bridge is updated
    // await network.provider.send("evm_increaseTime", [1296000])
    // await network.provider.send("evm_mine")

    // let rewardsBalance = await l2rewAAVE.call("balanceOf", { account: BigInt(l2user.starknetContract.address) });
    // console.log("Rewards before", rewardsBalance)

    // l1StaticDai.connect(l1user).transfer(l1user.address, 10);
    // {
    // const flushL1Response = await starknet.devnet.flush();
    // const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    // expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    // console.log(flushL1Messages)
    // expect(flushL1Messages).to.have.a.lengthOf(1);
    // }

    // await starknet.devnet.flush();
    // {
    // const flushL1Response = await starknet.devnet.flush();
    // const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    // expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    // // expect(flushL1Messages).to.have.a.lengthOf(4);
    // }

    // // Initiate bridge back rewards from L2
    // await l2user.invoke(l2StaticADai, "claim_rewards", { recipient: BigInt(l2user.starknetContract.address) });
    // rewardsBalance = await l2rewAAVE.call("balanceOf", { account: BigInt(l2user.starknetContract.address) });
    // console.log("Rewards after dai", rewardsBalance)
    // await l2user.invoke(l2StaticAUsdc, "claim_rewards", { recipient: BigInt(l2user.starknetContract.address) });
    // rewardsBalance = await l2rewAAVE.call("balanceOf", { account: BigInt(l2user.starknetContract.address) });
    // console.log("Rewards", rewardsBalance)
    // await l2user.invoke(l2TokenBridge, 'bridge_rewards', { l1_recipient: BigInt(l1user.address), amount: {high: 0, low: 30} });
  });

  it('Withdraws aDai and aUsdc to L1 user', async () => {
    // approve L2 bridge with given amount
    await l2user.invoke(l2StaticADai, 'approve', { spender: BigInt(l2StaticADai.address), amount: { high: 0n, low: 30n } });
    await l2user.invoke(l2StaticAUsdc, 'approve', { spender: BigInt(l2StaticAUsdc.address), amount: { high: 0n, low: 40n } });

    // withdraw some tokens from L2
    await l2user.invoke(l2TokenBridge, 'initiate_withdraw', { l2_token: BigInt(l2StaticADai.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low: 28n } });
    await l2user.invoke(l2TokenBridge, 'initiate_withdraw', { l2_token: BigInt(l2StaticAUsdc.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low: 37n } });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(2);
    const l2RewardsIndexDai = uintFromParts(flushL2Messages[0].payload[6], flushL2Messages[0].payload[7]);
    const l2RewardsIndexUsdc = uintFromParts(flushL2Messages[1].payload[6], flushL2Messages[1].payload[7]);

    // actually withdraw tokens
    txDai = await l1TokenBridge.connect(l1user).withdraw(aDai.address, l2user.starknetContract.address, l1user.address, 28, l2RewardsIndexDai, false);
    blockNumberDai = txDai.blockNumber;
    txUsdc = await l1TokenBridge.connect(l1user).withdraw(aUsdc.address, l2user.starknetContract.address, l1user.address, 37, l2RewardsIndexUsdc, false);
    blockNumberUsdc = txUsdc.blockNumber;

    // check that tokens have been transfered to l1user
    expect(await aDai.balanceOf(l1user.address)).to.equal(l1InitialADaiBalance);
    expect(await aUsdc.balanceOf(l1user.address)).to.equal(l1InitialAUsdcBalance);
    expect(await aDai.balanceOf(l1TokenBridge.address)).to.equal(30);
    expect(await aUsdc.balanceOf(l1TokenBridge.address)).to.equal(40);

    // flush L1 messages to be consumed by L2
    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);

    // check last update of L2 tokens
    expect(await l2StaticADai.call('get_last_update', {})).to.deep.equal({ block_number: {high: 0n, low: BigInt(blockNumberDai) }});
    expect(await l2StaticAUsdc.call('get_last_update', {})).to.deep.equal({ block_number: {high: 0n, low: BigInt(blockNumberUsdc) }});

    // check balance of L2 tokens
    expect(await l2StaticADai.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  28n } });
    expect(await l2StaticAUsdc.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  37n } });
  })


  it('Withdraws Dai and Usdc', async () => {
    // approve L2 bridge with given amount
    await l2user.invoke(l2StaticADai, 'approve', { spender: BigInt(l2StaticADai.address), amount: { high: 0n, low:  28n } });
    await l2user.invoke(l2StaticAUsdc, 'approve', { spender: BigInt(l2StaticAUsdc.address), amount: { high: 0n, low:  37n } });

    // withdraw some tokens from L2
    await l2user.invoke(l2TokenBridge, 'initiate_withdraw', { l2_token: BigInt(l2StaticADai.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low:  28n } });
    await l2user.invoke(l2TokenBridge, 'initiate_withdraw', { l2_token: BigInt(l2StaticAUsdc.address), l1_recipient: BigInt(l1user.address), amount: { high: 0n, low:  37n } });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(2);
    const l2RewardsIndexDai = uintFromParts(flushL2Messages[0].payload[6], flushL2Messages[0].payload[7]);
    const l2RewardsIndexUsdc = uintFromParts(flushL2Messages[1].payload[6], flushL2Messages[1].payload[7]);

    // actually withdraw tokens
    txDai = await l1TokenBridge.connect(l1user).withdraw(aDai.address, l2user.starknetContract.address, l1user.address, 28, l2RewardsIndexDai, true);
    blockNumberDai = txDai.blockNumber;
    txUsdc = await l1TokenBridge.connect(l1user).withdraw(aUsdc.address, l2user.starknetContract.address, l1user.address, 37, l2RewardsIndexUsdc, true);
    blockNumberUsdc = txUsdc.blockNumber;

    // check that tokens have been transfered to l1user
    expect(await dai.balanceOf(l1user.address)).to.equal(l1InitialDaiBalance);
    expect(await usdc.balanceOf(l1user.address)).to.equal(l1InitialUsdcBalance);
    expect(await aDai.balanceOf(l1TokenBridge.address)).to.equal(0);
    expect(await aUsdc.balanceOf(l1TokenBridge.address)).to.equal(0);

    // flush L1 messages to be consumed by L2
    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);

    // check last update of L2 tokens
    expect(await l2StaticADai.call('get_last_update', {})).to.deep.equal({ block_number: {high: 0n, low: BigInt(blockNumberDai) }});
    expect(await l2StaticAUsdc.call('get_last_update', {})).to.deep.equal({ block_number: {high: 0n, low: BigInt(blockNumberUsdc) }});

    // check balance of L2 tokens
    expect(await l2StaticADai.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  0n } });
    expect(await l2StaticAUsdc.call('balanceOf', { account: BigInt(l2user.starknetContract.address) })).to.deep.equal({ balance: { high: 0n, low:  0n } });
  })

  it('L2 user sends back reward accrued to L1 user', async () => {
    ////// Needs to be implemented when token bridge is updated
   // // flush L2 messages to be consumed by L1
   //  const flushL2Response = await starknet.devnet.flush();
   //  const flushL2Messages = flushL2Response.consumed_messages.from_l2;
   //  expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
   //  expect(flushL2Messages).to.have.a.lengthOf(1);

   //  // call recieveRewards on L1 to consume messages from L2
   //  await l1TokenBridge.connect(l1user).receiveRewards(l1StaticDai.address, l1user.address, 30);

   //  // check that the l1 user received reward tokens
   //  expect(await l1AAVE.balanceOf(l1user.address)).to.be.equal(30);
  })
});
