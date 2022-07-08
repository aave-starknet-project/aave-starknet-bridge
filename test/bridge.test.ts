import {
  A_DAI,
  A_USDC,
  STKAAVE_WHALE,
  INCENTIVES_CONTROLLER,
  LENDING_POOL,
  DAI_WHALE,
  USDC_WHALE,
  EMISSION_MANAGER,
  DAI,
  USDC,
} from "./../constants/addresses";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { Contract, ContractFactory, providers, BigNumber } from "ethers";
import hre, { starknet, ethers } from "hardhat";
import {
  StarknetContractFactory,
  StarknetContract,
  HardhatUserConfig,
  Account,
  StringMap,
} from "hardhat/types";
import { solidity } from "ethereum-waffle";
import config from "../hardhat.config";
import "./wadraymath";
import { TIMEOUT } from "./constants";
import { expectAddressEquality, uintFromParts } from "./utils";

chai.use(solidity);

const MAX_UINT256 = hre.ethers.constants.MaxInt256;

// Amount of dai and usdc to transfer to the user. Issued twice for aDai and aUsdc
const DAI_UNIT = 1000n * BigInt(10 ** 18);
const USDC_UNIT = 1000n * BigInt(10 ** 6);
const daiAmount = 300n * DAI_UNIT;
const usdcAmount = 300n * USDC_UNIT;
describe("Bridge", async function () {
  this.timeout(TIMEOUT);

  const networkUrl =
    (config as HardhatUserConfig).networks?.l1_testnet?.url ||
    "http://localhost:8545";

  // users
  let l1user: SignerWithAddress;
  let l1ProxyAdmin: SignerWithAddress;
  let l2owner: Account;
  let l2user: Account;
  let signer: SignerWithAddress;
  let daiWhale: providers.JsonRpcSigner;
  let usdcWhale: providers.JsonRpcSigner;
  let stkaaveWhale: providers.JsonRpcSigner;
  let emissionManager: providers.JsonRpcSigner;

  // misk
  let provider: any;
  let blockNumberDai: number;
  let blockNumberUsdc: number;
  let txDai: any;
  let txUsdc: any;

  // L2
  //// factories
  let l2TokenFactory: StarknetContractFactory;
  let l2ProxyFactory: StarknetContractFactory;
  let l2BridgeFactory: StarknetContractFactory;

  //// tokens
  let l2StaticADaiImplHash: string;
  let l2StaticADaiProxy: StarknetContract;
  let l2StaticADai: StarknetContract;

  let l2StaticAUsdcImplHash: string;
  let l2StaticAUsdcProxy: StarknetContract;
  let l2StaticAUsdc: StarknetContract;

  let l2rewAAVEImplHash: string;
  let l2rewAAVEProxy: StarknetContract;
  let l2rewAAVE: StarknetContract;

  //// token bridge
  let l2BridgeImplHash: string;
  let l2BridgeProxy: StarknetContract;
  let l2Bridge: StarknetContract;

  //// balances
  let l2staticADaiBalance: StringMap;
  let l2staticAUsdcBalance: StringMap;

  // L1

  let mockStarknetMessagingAddress: string;

  //// factories
  let l1BridgeFactory: ContractFactory;
  let l1ProxyBridgeFactory: ContractFactory;

  //// token bridge
  let l1BridgeImpl: Contract;
  let l1BridgeProxy: Contract;
  let l1Bridge: Contract;

  //// AAVE contracts
  let pool: Contract;
  let incentives: Contract;
  let aDai: Contract;
  let dai: Contract;
  let aUsdc: Contract;
  let usdc: Contract;
  let stkaave: Contract;

  //// Initial balances
  let l1InitialDaiBalance: bigint;
  let l1InitialUsdcBalance: bigint;
  let l1InitialADaiBalance: bigint;
  let l1InitialAUsdcBalance: bigint;

  before(async function () {
    // load L1 <--> L2 messaging contract

    mockStarknetMessagingAddress = (
      await starknet.devnet.loadL1MessagingContract(networkUrl)
    ).address;

    // L2 deployments

    l2owner = await starknet.deployAccount("OpenZeppelin");
    l2user = await starknet.deployAccount("OpenZeppelin");

    l2BridgeFactory = await starknet.getContractFactory("bridge");
    l2BridgeImplHash = await l2BridgeFactory.declare();

    l2ProxyFactory = await starknet.getContractFactory("l2/lib/proxy");
    l2BridgeProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(l2user.starknetContract.address),
    });
    l2StaticADaiProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(l2user.starknetContract.address),
    });
    l2StaticAUsdcProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(l2user.starknetContract.address),
    });

    const rewAaveContractFactory = await starknet.getContractFactory(
      "l2/tokens/rewAAVE"
    );
    l2rewAAVEImplHash = await rewAaveContractFactory.declare();
    l2rewAAVEProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(l2owner.starknetContract.address),
    });

    await l2owner.invoke(l2rewAAVEProxy, "set_implementation", {
      implementation_hash: BigInt(l2rewAAVEImplHash),
    });
    l2rewAAVE = rewAaveContractFactory.getContractAt(l2rewAAVEProxy.address);

    await l2owner.invoke(l2rewAAVE, "initialize_rewAAVE", {
      name: 444,
      symbol: 444,
      decimals: 18n,
      initial_supply: { high: 0n, low: 0n },
      recipient: BigInt(l2user.starknetContract.address),
      owner: BigInt(l2BridgeProxy.address),
    });

    l2TokenFactory = await starknet.getContractFactory("static_a_token");
    l2StaticADaiImplHash = await l2TokenFactory.declare();
    l2StaticAUsdcImplHash = await l2TokenFactory.declare();

    // L1 deployments

    [signer, l1user, l1ProxyAdmin] = await ethers.getSigners();

    pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    incentives = await ethers.getContractAt(
      "IncentivesControllerMock",
      INCENTIVES_CONTROLLER
    );

    aDai = await ethers.getContractAt("AToken", A_DAI);
    dai = await ethers.getContractAt(
      "ERC20",
      await aDai.UNDERLYING_ASSET_ADDRESS()
    );
    aUsdc = await ethers.getContractAt("AToken", A_USDC);
    usdc = await ethers.getContractAt(
      "ERC20",
      await aUsdc.UNDERLYING_ASSET_ADDRESS()
    );

    provider = new ethers.providers.JsonRpcProvider(networkUrl);
    daiWhale = provider.getSigner(DAI_WHALE);
    usdcWhale = provider.getSigner(USDC_WHALE);
    stkaaveWhale = provider.getSigner(STKAAVE_WHALE);
    emissionManager = provider.getSigner(EMISSION_MANAGER);

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
    await signer.sendTransaction({
      from: signer.address,
      to: emissionManager._address,
      value: ethers.utils.parseEther("1.0"),
    });

    l1BridgeFactory = await ethers.getContractFactory("Bridge", signer);
    l1BridgeImpl = await l1BridgeFactory.deploy();
    await l1BridgeImpl.deployed();

    l1ProxyBridgeFactory = await ethers.getContractFactory(
      "InitializableAdminUpgradeabilityProxy",
      l1ProxyAdmin
    );
    l1BridgeProxy = await l1ProxyBridgeFactory.deploy();
    await l1BridgeProxy.deployed();
  });

  it("dai and usdc whales convert their tokens to aTokens", async () => {
    // daiWhale deposits dai and gets aDai
    await dai.connect(daiWhale).transfer(l1user.address, 3n * daiAmount);
    await dai.connect(l1user).approve(pool.address, MAX_UINT256);
    await pool
      .connect(l1user)
      .deposit(dai.address, 3n * daiAmount, l1user.address, 0);

    // usdcWhale deposits usdc and gets aUsdc
    await usdc.connect(usdcWhale).transfer(l1user.address, 3n * usdcAmount);
    await usdc.connect(l1user).approve(pool.address, MAX_UINT256);
    await pool
      .connect(l1user)
      .deposit(usdc.address, 3n * usdcAmount, l1user.address, 0);
  });

  it("set L2 implementation contracts", async () => {
    {
      await l2user.invoke(l2StaticADaiProxy, "set_implementation", {
        implementation_hash: BigInt(l2StaticADaiImplHash),
      });
      const { implementation } = await l2StaticADaiProxy.call(
        "get_implementation",
        {}
      );
      expect(implementation).to.equal(BigInt(l2StaticADaiImplHash));
      l2StaticADai = l2TokenFactory.getContractAt(l2StaticADaiProxy.address);
    }

    {
      await l2user.invoke(l2StaticAUsdcProxy, "set_implementation", {
        implementation_hash: BigInt(l2StaticAUsdcImplHash),
      });
      const { implementation } = await l2StaticAUsdcProxy.call(
        "get_implementation",
        {}
      );
      expect(implementation).to.equal(BigInt(l2StaticAUsdcImplHash));
      l2StaticAUsdc = l2TokenFactory.getContractAt(l2StaticAUsdcProxy.address);
    }

    {
      await l2user.invoke(l2BridgeProxy, "set_implementation", {
        implementation_hash: BigInt(l2BridgeImplHash),
      });
      const { implementation } = await l2BridgeProxy.call(
        "get_implementation",
        {}
      );
      expect(implementation).to.equal(BigInt(l2BridgeImplHash));
      l2Bridge = l2BridgeFactory.getContractAt(l2BridgeProxy.address);
    }
  });

  it("initialize L2 static_a_tokens", async () => {
    await l2user.invoke(l2StaticADai, "initialize_static_a_token", {
      name: 1234n,
      symbol: 123n,
      decimals: BigInt(await aDai.decimals()),
      initial_supply: { high: 0n, low: 0n },
      recipient: BigInt(l2Bridge.address),
      owner: BigInt(l2owner.starknetContract.address),
      l2_bridge: BigInt(l2Bridge.address),
    });

    {
      const { name } = await l2StaticADai.call("name");
      expect(name).to.equal(1234n);
      const { symbol } = await l2StaticADai.call("symbol");
      expect(symbol).to.equal(123n);
      const { decimals } = await l2StaticADai.call("decimals");
      expect(decimals).to.equal(18n);
    }

    await l2user.invoke(l2StaticAUsdc, "initialize_static_a_token", {
      name: 4321n,
      symbol: 321n,
      decimals: BigInt(await aUsdc.decimals()),
      initial_supply: { high: 0n, low: 0n },
      recipient: BigInt(l2Bridge.address),
      owner: BigInt(l2owner.starknetContract.address),
      l2_bridge: BigInt(l2Bridge.address),
    });

    {
      const { name } = await l2StaticAUsdc.call("name");
      expect(name).to.equal(4321n);
      const { symbol } = await l2StaticAUsdc.call("symbol");
      expect(symbol).to.equal(321n);
      const { decimals } = await l2StaticAUsdc.call("decimals");
      expect(decimals).to.equal(6n);
    }
  });

  it("set L1 token bridge as implementation contract", async () => {
    let ABI = [
      "function initialize(uint256 l2Bridge, address messagingContract, address incentivesController, address[] calldata l1Tokens, uint256[] calldata l2Tokens) ",
    ];
    let iface = new ethers.utils.Interface(ABI);

    let encodedInitializedParams = iface.encodeFunctionData("initialize", [
      l2BridgeProxy.address,
      mockStarknetMessagingAddress,
      INCENTIVES_CONTROLLER,
      [aDai.address, aUsdc.address],
      [l2StaticADai.address, l2StaticAUsdc.address],
    ]);
    await l1BridgeProxy["initialize(address,address,bytes)"](
      l1BridgeImpl.address,
      l1ProxyAdmin.address,
      encodedInitializedParams
    );
    //check that admin & implementation were set correctly
    expect(await l1BridgeProxy.callStatic.implementation()).to.eq(
      l1BridgeImpl.address
    );
    expect(await l1BridgeProxy.callStatic.admin()).to.eq(l1ProxyAdmin.address);
    l1Bridge = await ethers.getContractAt(
      "Bridge",
      l1BridgeProxy.address,
      signer
    );
    expect(await l1Bridge._messagingContract()).to.eq(
      mockStarknetMessagingAddress
    );
    expect(await l1Bridge._rewardToken()).to.eq(
      await incentives.REWARD_TOKEN()
    );
    expect(await incentives.EMISSION_MANAGER()).to.eq(EMISSION_MANAGER);
    stkaave = await ethers.getContractAt(
      "ERC20",
      await l1Bridge._rewardToken()
    );
    // doesn't initialize bridge when already initiliazed
    expect(
      l1BridgeProxy["initialize(address,address,bytes)"](
        l1BridgeImpl.address,
        l1ProxyAdmin.address,
        encodedInitializedParams
      )
    ).to.be.reverted;
  });

  it("initialize the bridge on L1 and L2", async () => {
    // set L1 token bridge from L2 bridge
    await l2user.invoke(l2Bridge, "initialize_bridge", {
      governor_address: BigInt(l2user.starknetContract.address),
    });
    await l2user.invoke(l2Bridge, "set_l1_bridge", {
      l1_bridge_address: BigInt(l1Bridge.address),
    });
    const { res: retrievedBridgeAddress } = await l2Bridge.call(
      "get_l1_bridge",
      {}
    );
    expect(retrievedBridgeAddress).to.equal(BigInt(l1Bridge.address));

    // map L1 tokens to L2 tokens on L2 bridge
    await l2user.invoke(l2Bridge, "set_reward_token", {
      reward_token: BigInt(l2rewAAVE.address),
    });
    await l2user.invoke(l2Bridge, "approve_bridge", {
      l1_token: BigInt(aDai.address),
      l2_token: BigInt(l2StaticADai.address),
    });
    await l2user.invoke(l2Bridge, "approve_bridge", {
      l1_token: BigInt(aUsdc.address),
      l2_token: BigInt(l2StaticAUsdc.address),
    });
  });

  it("set a distribution end in the future", async () => {
    const currentDistributionEnd = BigInt(await incentives.DISTRIBUTION_END());
    const futureDistributionEnd =
      currentDistributionEnd + 6n * 3600n * 24n * 30n; // we postpone distribution end by six months
    await incentives
      .connect(emissionManager)
      .setDistributionEnd(Number(futureDistributionEnd));
    expect(BigInt(await incentives.DISTRIBUTION_END())).to.eq(
      futureDistributionEnd
    );
  });

  it("deposit Dai and Usdc", async () => {
    // l1user withdraws dai from aDai
    await pool.connect(l1user).withdraw(dai.address, daiAmount, l1user.address);

    // l1user withdraws usdc from aUsdc
    await pool
      .connect(l1user)
      .withdraw(usdc.address, usdcAmount, l1user.address);

    // approve L1 bridge with max uint256 amount
    await dai.connect(l1user).approve(l1Bridge.address, MAX_UINT256);
    await usdc.connect(l1user).approve(l1Bridge.address, MAX_UINT256);
    const daiReserveNormalizedIncome = await pool.getReserveNormalizedIncome(
      DAI
    );
    const usdcReserveNormalizedIncome = await pool.getReserveNormalizedIncome(
      USDC
    );
    // l1user deposits 30 dai and 40 usdc on L1 for l2user on L2
    l1InitialDaiBalance = BigInt(await dai.balanceOf(l1user.address));
    txDai = await l1Bridge
      .connect(l1user)
      .deposit(
        aDai.address,
        BigInt(l2user.starknetContract.address),
        30n * DAI_UNIT,
        0,
        true
      );
    blockNumberDai = txDai.blockNumber;

    expect(await dai.balanceOf(l1user.address)).to.equal(
      l1InitialDaiBalance - 30n * DAI_UNIT
    );

    l1InitialUsdcBalance = BigInt(await usdc.balanceOf(l1user.address));
    txUsdc = await l1Bridge
      .connect(l1user)
      .deposit(
        aUsdc.address,
        BigInt(l2user.starknetContract.address),
        40n * USDC_UNIT,
        0,
        true
      );

    blockNumberUsdc = txUsdc.blockNumber;
    expect(await usdc.balanceOf(l1user.address)).to.equal(
      l1InitialUsdcBalance - 40n * USDC_UNIT
    );

    expect(await dai.balanceOf(l1Bridge.address)).to.equal(0);
    expect(await usdc.balanceOf(l1Bridge.address)).to.equal(0);

    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);
    expectAddressEquality(
      flushL1Messages[0].args.from_address,
      l1Bridge.address
    );
    expectAddressEquality(flushL1Messages[0].args.to_address, l2Bridge.address);
    expectAddressEquality(
      flushL1Messages[0].address,
      mockStarknetMessagingAddress
    );
    expectAddressEquality(
      flushL1Messages[1].args.from_address,
      l1Bridge.address
    );
    expectAddressEquality(flushL1Messages[1].args.to_address, l2Bridge.address);
    expectAddressEquality(
      flushL1Messages[1].address,
      mockStarknetMessagingAddress
    );

    // check balance and last update of L2 tokens

    l2staticADaiBalance = await l2StaticADai.call("balanceOf", {
      account: BigInt(l2user.starknetContract.address),
    });
    l2staticAUsdcBalance = await l2StaticAUsdc.call("balanceOf", {
      account: BigInt(l2user.starknetContract.address),
    });

    const daiBalance = BigNumber.from(30n * DAI_UNIT);
    const usdcBalance = BigNumber.from(40n * DAI_UNIT);

    expect(l2staticADaiBalance["balance"]["low"]).to.be.lte(
      daiBalance.rayDiv(daiReserveNormalizedIncome)
    );
    expect(l2staticAUsdcBalance["balance"]["low"]).to.be.lte(
      usdcBalance.rayDiv(usdcReserveNormalizedIncome)
    );
    expect(await l2StaticADai.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberDai) },
    });
    expect(await l2StaticAUsdc.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberUsdc) },
    });
  });

  it("deposit aDai and aUsdc", async () => {
    // approve L1 bridge with max uint256 amount
    await aDai.connect(l1user).approve(l1Bridge.address, MAX_UINT256);
    await aUsdc.connect(l1user).approve(l1Bridge.address, MAX_UINT256);
    const daiReserveNormalizedIncome = await pool.getReserveNormalizedIncome(
      DAI
    );
    const usdcReserveNormalizedIncome = await pool.getReserveNormalizedIncome(
      USDC
    );
    // l1user deposits 30 aDai and 40 aUsdc on L1 for l2user on L2
    l1InitialADaiBalance = BigInt(await aDai.balanceOf(l1user.address));
    txDai = await l1Bridge
      .connect(l1user)
      .deposit(
        aDai.address,
        BigInt(l2user.starknetContract.address),
        30n * DAI_UNIT,
        0,
        false
      );
    blockNumberDai = txDai.blockNumber;

    expect(BigNumber.from(l1InitialADaiBalance - 30n * DAI_UNIT)).to.be.lte(
      await aDai.balanceOf(l1user.address)
    );

    l1InitialAUsdcBalance = BigInt(await aUsdc.balanceOf(l1user.address));
    txUsdc = await l1Bridge
      .connect(l1user)
      .deposit(
        aUsdc.address,
        BigInt(l2user.starknetContract.address),
        40n * USDC_UNIT,
        0,
        false
      );
    blockNumberUsdc = txUsdc.blockNumber;
    expect(BigNumber.from(l1InitialAUsdcBalance - 40n * USDC_UNIT)).to.be.lte(
      await aUsdc.balanceOf(l1user.address)
    );

    //expected new balances on l2

    const staticADaiBalanceBeforeDeposit = await l2StaticADai.call(
      "balanceOf",
      {
        account: BigInt(l2user.starknetContract.address),
      }
    );
    const staticAUsdcBalanceBeforeDeposit = await l2StaticAUsdc.call(
      "balanceOf",
      {
        account: BigInt(l2user.starknetContract.address),
      }
    );

    const expectedaDaiBalanceOnL2 = BigNumber.from(30n * DAI_UNIT)
      .rayDiv(daiReserveNormalizedIncome)
      .add(staticADaiBalanceBeforeDeposit["balance"]["low"]);

    const expectedaUsdcBalanceOnL2 = BigNumber.from(40n * DAI_UNIT)
      .rayDiv(usdcReserveNormalizedIncome)
      .add(staticAUsdcBalanceBeforeDeposit["balance"]["low"]);

    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);
    expectAddressEquality(
      flushL1Messages[0].args.from_address,
      l1Bridge.address
    );
    expectAddressEquality(flushL1Messages[0].args.to_address, l2Bridge.address);
    expectAddressEquality(
      flushL1Messages[0].address,
      mockStarknetMessagingAddress
    );
    expectAddressEquality(
      flushL1Messages[1].args.from_address,
      l1Bridge.address
    );
    expectAddressEquality(flushL1Messages[1].args.to_address, l2Bridge.address);
    expectAddressEquality(
      flushL1Messages[1].address,
      mockStarknetMessagingAddress
    );

    l2staticADaiBalance = await l2StaticADai.call("balanceOf", {
      account: BigInt(l2user.starknetContract.address),
    });
    l2staticAUsdcBalance = await l2StaticAUsdc.call("balanceOf", {
      account: BigInt(l2user.starknetContract.address),
    });

    expect(l2staticADaiBalance["balance"]["low"]).to.be.lte(
      expectedaDaiBalanceOnL2
    );
    expect(l2staticAUsdcBalance["balance"]["low"]).to.be.lte(
      expectedaUsdcBalanceOnL2
    );

    expect(await l2StaticADai.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberDai) },
    });
    expect(await l2StaticAUsdc.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberUsdc) },
    });
  });

  it("jump into the future", async () => {
    await provider.send("evm_increaseTime", [31536000]); // one year in seconds
    await provider.send("evm_mine");
  });

  it("withdraw aDai and aUsdc to L1 user", async () => {
    // get balance of L2 tokens before message consumption
    let l2staticADaiBalanceBefore = await l2StaticADai.call("balanceOf", {
      account: BigInt(l2user.starknetContract.address),
    });
    let l2staticAUsdcBalanceBefore = await l2StaticAUsdc.call("balanceOf", {
      account: BigInt(l2user.starknetContract.address),
    });

    // withdraw some tokens from L2
    await l2user.invoke(l2Bridge, "initiate_withdraw", {
      l2_token: BigInt(l2StaticADai.address),
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0n, low: 27n * DAI_UNIT },
    });
    await l2user.invoke(l2Bridge, "initiate_withdraw", {
      l2_token: BigInt(l2StaticAUsdc.address),
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0n, low: 37n * USDC_UNIT },
    });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(2);
    const l2RewardsIndexDai = uintFromParts(
      flushL2Messages[0].payload[6],
      flushL2Messages[0].payload[7]
    );
    const l2RewardsIndexUsdc = uintFromParts(
      flushL2Messages[1].payload[6],
      flushL2Messages[1].payload[7]
    );

    // actually withdraw tokens
    txDai = await l1Bridge
      .connect(l1user)
      .withdraw(
        aDai.address,
        l2user.starknetContract.address,
        l1user.address,
        27n * DAI_UNIT,
        l2RewardsIndexDai,
        false
      );
    blockNumberDai = txDai.blockNumber;
    txUsdc = await l1Bridge
      .connect(l1user)
      .withdraw(
        aUsdc.address,
        l2user.starknetContract.address,
        l1user.address,
        37n * USDC_UNIT,
        l2RewardsIndexUsdc,
        false
      );
    blockNumberUsdc = txUsdc.blockNumber;

    // check that tokens have been transfered to l1user
    expect(BigNumber.from(l1InitialADaiBalance)).to.be.lte(
      BigNumber.from(await aDai.balanceOf(l1user.address))
    );
    expect(BigNumber.from(l1InitialAUsdcBalance)).to.be.lte(
      BigNumber.from(await aUsdc.balanceOf(l1user.address))
    );
    expect(BigNumber.from(30n * DAI_UNIT)).to.be.lte(
      BigNumber.from(await aDai.balanceOf(l1Bridge.address))
    );
    expect(BigNumber.from(40n * USDC_UNIT)).to.be.lte(
      BigNumber.from(await aUsdc.balanceOf(l1Bridge.address))
    );

    // flush L1 messages to be consumed by L2
    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);

    // check last update of L2 tokens
    expect(await l2StaticADai.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberDai) },
    });
    expect(await l2StaticAUsdc.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberUsdc) },
    });

    // check balance of L2 tokens
    l2staticADaiBalance = await l2StaticADai.call("balanceOf", {
      account: BigInt(l2user.starknetContract.address),
    });
    l2staticAUsdcBalance = await l2StaticAUsdc.call("balanceOf", {
      account: BigInt(l2user.starknetContract.address),
    });
    expect(BigNumber.from(27n * DAI_UNIT)).to.equal(
      l2staticADaiBalanceBefore["balance"]["low"] -
        l2staticADaiBalance["balance"]["low"]
    );
    expect(BigNumber.from(37n * USDC_UNIT)).to.equal(
      l2staticAUsdcBalanceBefore["balance"]["low"] -
        l2staticAUsdcBalance["balance"]["low"]
    );
  });

  it("withdraw Dai and Usdc", async () => {
    // withdraw some tokens from L2
    await l2user.invoke(l2Bridge, "initiate_withdraw", {
      l2_token: BigInt(l2StaticADai.address),
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0n, low: 27n * DAI_UNIT },
    });
    await l2user.invoke(l2Bridge, "initiate_withdraw", {
      l2_token: BigInt(l2StaticAUsdc.address),
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0n, low: 27n * USDC_UNIT },
    });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(2);
    const l2RewardsIndexDai = uintFromParts(
      flushL2Messages[0].payload[6],
      flushL2Messages[0].payload[7]
    );
    const l2RewardsIndexUsdc = uintFromParts(
      flushL2Messages[1].payload[6],
      flushL2Messages[1].payload[7]
    );

    // actually withdraw tokens
    txDai = await l1Bridge
      .connect(l1user)
      .withdraw(
        aDai.address,
        l2user.starknetContract.address,
        l1user.address,
        27n * DAI_UNIT,
        l2RewardsIndexDai,
        true
      );
    blockNumberDai = txDai.blockNumber;
    txUsdc = await l1Bridge
      .connect(l1user)
      .withdraw(
        aUsdc.address,
        l2user.starknetContract.address,
        l1user.address,
        27n * USDC_UNIT,
        l2RewardsIndexUsdc,
        true
      );
    blockNumberUsdc = txUsdc.blockNumber;

    // flush L1 messages to be consumed by L2
    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);

    // check last update of L2 tokens
    expect(await l2StaticADai.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberDai) },
    });
    expect(await l2StaticAUsdc.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberUsdc) },
    });
  });

  it("reverts withdrawal when wrong l2rewards index is provided", async () => {
    await l2user.invoke(l2Bridge, "initiate_withdraw", {
      l2_token: BigInt(l2StaticAUsdc.address),
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0n, low: 5n },
    });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(1);

    const falseL2RewardsIndexUsdc = 7; //incorrect value
    const correctL2RewardsIndexUsdc = uintFromParts(
      flushL2Messages[0].payload[6],
      flushL2Messages[0].payload[7]
    );

    await expect(
      l1Bridge
        .connect(l1user)
        .withdraw(
          aUsdc.address,
          l2user.starknetContract.address,
          l1user.address,
          5,
          falseL2RewardsIndexUsdc,
          true
        )
    ).to.be.reverted;

    txUsdc = await l1Bridge
      .connect(l1user)
      .withdraw(
        aUsdc.address,
        l2user.starknetContract.address,
        l1user.address,
        5,
        correctL2RewardsIndexUsdc,
        true
      );

    // flush L1 messages to be consumed by L2
    const flushL1Response = await starknet.devnet.flush();
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
  });

  it("L2 user sends back reward accrued to L1 user", async () => {
    // check claimable rewards
    let claimableADai = await l2StaticADai.call("get_user_claimable_rewards", {
      user: BigInt(l2user.starknetContract.address),
    });
    let claimableAUsdc = await l2StaticAUsdc.call(
      "get_user_claimable_rewards",
      { user: BigInt(l2user.starknetContract.address) }
    );

    // claim rewards on L2
    await l2user.invoke(l2StaticADai, "claim_rewards", {
      recipient: BigInt(l2user.starknetContract.address),
    });
    await l2user.invoke(l2StaticAUsdc, "claim_rewards", {
      recipient: BigInt(l2user.starknetContract.address),
    });

    const claimed = await l2rewAAVE.call("balanceOf", {
      account: BigInt(l2user.starknetContract.address),
    });

    expect(5n * BigInt(10 ** 8)).to.be.lte(
      BigNumber.from(claimed["balance"]["low"])
    );
    expect(claimed).to.deep.equal({
      balance: {
        low:
          claimableADai["user_claimable_rewards"]["low"] +
          claimableAUsdc["user_claimable_rewards"]["low"],
        high: 0n,
      },
    });

    // bridge rewards
    const l2ClaimedRewards = claimed["balance"]["low"];
    await l2user.invoke(l2Bridge, "bridge_rewards", {
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0n, low: l2ClaimedRewards },
    });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(1);

    //check that there are enough rewards on l1 bridge
    const bridgePendingRewards = await incentives.getRewardsBalance(
      [A_DAI, A_USDC],
      l1Bridge.address
    );
    expect(bridgePendingRewards).to.be.gte(l2ClaimedRewards);

    // call recieveRewards on L1 to consume messages from L2
    const rewardsBalanceBeforeClaim = BigInt(
      await stkaave.balanceOf(l1user.address)
    );
    await l1Bridge
      .connect(l1user)
      .receiveRewards(
        BigInt(l2user.starknetContract.address),
        l1user.address,
        l2ClaimedRewards
      );

    // check that the l1 user received reward tokens
    const currentRewardsTokenBalance = BigInt(
      await stkaave.balanceOf(l1user.address)
    );
    expect(currentRewardsTokenBalance).to.be.equal(
      rewardsBalanceBeforeClaim + l2ClaimedRewards
    );
  });
});
