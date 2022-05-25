import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { Contract, ContractFactory, providers, BigNumber } from "ethers";
import hre, { starknet, network, ethers } from "hardhat";
import {
  StarknetContractFactory,
  StarknetContract,
  HttpNetworkConfig,
  Account,
  StringMap,
} from "hardhat/types";
import { solidity } from "ethereum-waffle";

import { TIMEOUT } from "./constants";
import { expectAddressEquality, uintFromParts } from "./utils";

chai.use(solidity);

const MAX_UINT256 = hre.ethers.constants.MaxInt256;

const LENDING_POOL = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";
const INCENTIVES_CONTROLLER = "0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5";
const A_DAI = "0x028171bCA77440897B824Ca71D1c56caC55b68A3";
const A_USDC = "0xBcca60bB61934080951369a648Fb03DF4F96263C";

const STKAAVE_WHALE = "0x32b61bb22cbe4834bc3e73dce85280037d944a4d";
const DAI_WHALE = "0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0";
const USDC_WHALE = "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503";

// Amount of dai and usdc to transfer to the user. Issued twice for aDai and aUsdc
const DAI_UNIT = BigInt(10 ** 18);
const USDC_UNIT = BigInt(10 ** 6);
const daiAmount = 300n * DAI_UNIT;
const usdcAmount = 300n * USDC_UNIT;

describe("Bridge", async function () {
  this.timeout(TIMEOUT);

  const networkUrl: string = (network.config as HttpNetworkConfig).url;
  const abiCoder = new ethers.utils.AbiCoder();

  // users
  let l1user: SignerWithAddress;
  let l1ProxyAdmin: SignerWithAddress;
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
  let l2BridgeFactory: StarknetContractFactory;

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
  let l2BridgeImpl: StarknetContract;
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
    l2BridgeImpl = await l2BridgeFactory.deploy();

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
    l2rewAAVEImpl = await rewAaveContractFactory.deploy();
    l2rewAAVEProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(l2owner.starknetContract.address),
    });

    await l2owner.invoke(l2rewAAVEProxy, "initialize_proxy", {
      implementation_address: BigInt(l2rewAAVEImpl.address),
    });
    l2rewAAVE = rewAaveContractFactory.getContractAt(l2rewAAVEProxy.address);

    await l2owner.invoke(l2rewAAVE, "initialize_rewAAVE", {
      name: 444,
      symbol: 444,
      decimals: 18n,
      initial_supply: { high: 0, low: 0 },
      recipient: BigInt(l2user.starknetContract.address),
      owner: BigInt(l2BridgeProxy.address),
    });

    l2TokenFactory = await starknet.getContractFactory("static_a_token");
    l2StaticADaiImpl = await l2TokenFactory.deploy();
    l2StaticAUsdcImpl = await l2TokenFactory.deploy();

    // L1 deployments

    [signer, l1user, l1ProxyAdmin] = await ethers.getSigners();

    pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    incentives = await ethers.getContractAt(
      "IncentivesControllerMock",
      INCENTIVES_CONTROLLER
    );

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

    l1BridgeFactory = await ethers.getContractFactory("Bridge", signer);
    l1BridgeImpl = await l1BridgeFactory.deploy();
    await l1BridgeImpl.deployed();

    l1ProxyBridgeFactory = await ethers.getContractFactory(
      "InitializableAdminUpgradeabilityProxyMock",
      l1ProxyAdmin
    );
    l1BridgeProxy = await l1ProxyBridgeFactory.deploy();
    await l1BridgeProxy.deployed();
  });

  it("set L2 implementation contracts", async () => {
    {
      await l2user.invoke(l2StaticADaiProxy, "initialize_proxy", {
        implementation_address: BigInt(l2StaticADaiImpl.address),
      });
      const { implementation } = await l2StaticADaiProxy.call(
        "get_implementation",
        {}
      );
      expect(implementation).to.equal(BigInt(l2StaticADaiImpl.address));
      l2StaticADai = l2TokenFactory.getContractAt(l2StaticADaiProxy.address);
    }

    {
      await l2user.invoke(l2StaticAUsdcProxy, "initialize_proxy", {
        implementation_address: BigInt(l2StaticAUsdcImpl.address),
      });
      const { implementation } = await l2StaticAUsdcProxy.call(
        "get_implementation",
        {}
      );
      expect(implementation).to.equal(BigInt(l2StaticAUsdcImpl.address));
      l2StaticAUsdc = l2TokenFactory.getContractAt(l2StaticAUsdcProxy.address);
    }

    {
      await l2user.invoke(l2BridgeProxy, "initialize_proxy", {
        implementation_address: BigInt(l2BridgeImpl.address),
      });
      const { implementation } = await l2BridgeProxy.call(
        "get_implementation",
        {}
      );
      expect(implementation).to.equal(BigInt(l2BridgeImpl.address));
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
    let ABI = ["function initialize(bytes calldata data)"];
    let iface = new ethers.utils.Interface(ABI);
    const initData = abiCoder.encode(
      ["uint256", "address", "address", "address", "address[]", "uint256[]"],
      [
        l2BridgeProxy.address,
        mockStarknetMessagingAddress,
        INCENTIVES_CONTROLLER,
        signer.address,
        [aDai.address, aUsdc.address],
        [l2StaticADai.address, l2StaticAUsdc.address],
      ]
    );

    let encodedInitializedParams = iface.encodeFunctionData("initialize", [
      initData,
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
    stkaave = await ethers.getContractAt(
      "ERC20Mock",
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

  it("l1user receives tokens and converts them to aTokens", async () => {
    // l1user receives dai and usdc
    await dai.connect(daiWhale).transfer(l1user.address, 2n * daiAmount);
    await usdc.connect(usdcWhale).transfer(l1user.address, 2n * usdcAmount);

    // l1user deposits dai and gets aDai
    await dai.connect(l1user).approve(pool.address, MAX_UINT256);
    await pool
      .connect(l1user)
      .deposit(dai.address, daiAmount, l1user.address, 0);

    // l1user deposits usdc and gets aUsdc
    await usdc.connect(l1user).approve(pool.address, MAX_UINT256);
    await pool
      .connect(l1user)
      .deposit(usdc.address, usdcAmount, l1user.address, 0);
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

  it("Deposit aDai and aUsdc", async () => {
    // approve L1 bridge with max uint256 amount
    await aDai.connect(l1user).approve(l1Bridge.address, MAX_UINT256);
    await aUsdc.connect(l1user).approve(l1Bridge.address, MAX_UINT256);

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
    expect(l2staticADaiBalance["balance"]["low"]).to.be.lte(
      BigNumber.from(30n * DAI_UNIT)
    );
    expect(l2staticAUsdcBalance["balance"]["low"]).to.be.lte(
      BigNumber.from(40n * USDC_UNIT)
    );
    expect(await l2StaticADai.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberDai) },
    });
    expect(await l2StaticAUsdc.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberUsdc) },
    });
  });

  it("Deposit dai and usdc", async () => {
    // approve L1 bridge with max uint256 amount
    await dai.connect(l1user).approve(l1Bridge.address, MAX_UINT256);
    await usdc.connect(l1user).approve(l1Bridge.address, MAX_UINT256);

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
    expect(l2staticADaiBalance["balance"]["low"]).to.be.lte(
      BigNumber.from(2n * (30n * DAI_UNIT))
    );
    expect(l2staticAUsdcBalance["balance"]["low"]).to.be.lte(
      BigNumber.from(2n * (40n * USDC_UNIT))
    );
    expect(await l2StaticADai.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberDai) },
    });
    expect(await l2StaticAUsdc.call("get_last_update", {})).to.deep.equal({
      block_number: { high: 0n, low: BigInt(blockNumberUsdc) },
    });
  });

  it("Updates rewards on transfer", async () => {
    await network.provider.send("evm_increaseTime", [31536000]); // one year in seconds
    await network.provider.send("evm_mine");
  });

  it("Withdraws aDai and aUsdc to L1 user", async () => {
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
    expect(BigNumber.from(27n * DAI_UNIT)).to.be.lte(
      l2staticADaiBalance["balance"]["low"]
    );
    expect(BigNumber.from(37n * USDC_UNIT)).to.be.lte(
      l2staticAUsdcBalance["balance"]["low"]
    );
  });

  it("Withdraws Dai and Usdc", async () => {
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
        true
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
        true
      );
    blockNumberUsdc = txUsdc.blockNumber;

    // check that tokens have been transfered to l1user
    expect(BigNumber.from(await dai.balanceOf(l1user.address))).to.be.lte(
      BigNumber.from(l1InitialDaiBalance)
    );
    expect(BigNumber.from(l1InitialUsdcBalance)).to.be.lte(
      BigNumber.from(await usdc.balanceOf(l1user.address))
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
  });

  it("L2 user sends back reward accrued to L1 user", async () => {
    // check claimable rewards
    const claimableADai = await l2StaticADai.call(
      "get_user_claimable_rewards",
      { user: BigInt(l2user.starknetContract.address) }
    );
    const claimableAUsdc = await l2StaticAUsdc.call(
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
    expect(claimed).to.deep.equal({
      balance: {
        low:
          claimableADai["user_claimable_rewards"]["low"] +
          claimableAUsdc["user_claimable_rewards"]["low"],
        high: 0n,
      },
    });

    // bridge rewards
    const rewardsClaimed = claimed["balance"]["low"];
    await l2user.invoke(l2Bridge, "bridge_rewards", {
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0n, low: rewardsClaimed },
    });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(1);

    // call recieveRewards on L1 to consume messages from L2
    const rewardTokenBalance = BigInt(await stkaave.balanceOf(l1user.address));
    await l1Bridge
      .connect(l1user)
      .receiveRewards(
        BigInt(l2user.starknetContract.address),
        l1user.address,
        rewardsClaimed
      );

    // check that the l1 user received reward tokens
    expect(await stkaave.balanceOf(l1user.address)).to.be.equal(
      rewardTokenBalance + rewardsClaimed
    );
  });
});
