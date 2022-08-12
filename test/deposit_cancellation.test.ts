import {
  A_DAI,
  STKAAVE_WHALE,
  INCENTIVES_CONTROLLER,
  LENDING_POOL,
  DAI_WHALE,
  EMISSION_MANAGER,
} from "../constants/addresses";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { Contract, ContractFactory, providers, BigNumber } from "ethers";
import hre, { starknet, network, ethers } from "hardhat";
import {
  StarknetContractFactory,
  StarknetContract,
  HardhatUserConfig,
  Account,
  StringMap,
} from "hardhat/types";
import { solidity } from "ethereum-waffle";
import config from "../hardhat.config";

import { TIMEOUT } from "./constants";

chai.use(solidity);

const MAX_UINT256 = hre.ethers.constants.MaxInt256;

// Amount of dai and usdc to transfer to the user. Issued twice for aDai and aUsdc
const DAI_UNIT = 1000n * BigInt(10 ** 18);
const daiAmount = 300n * DAI_UNIT;

describe("AToken deposit cancellation", async function () {
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
  let emissionManager: providers.JsonRpcSigner;

  // misk
  let provider: any;
  let txDai: any;

  // L2
  //// factories
  let l2TokenFactory: StarknetContractFactory;
  let l2ProxyFactory: StarknetContractFactory;
  let l2BridgeFactory: StarknetContractFactory;

  //// tokens
  let l2StaticADaiImplHash: string;
  let l2StaticADaiProxy: StarknetContract;
  let l2StaticADai: StarknetContract;

  let l2rewAAVEImplHash: string;
  let l2rewAAVEProxy: StarknetContract;
  let l2rewAAVE: StarknetContract;

  //// token bridge
  let l2BridgeImplHash: string;
  let l2BridgeProxy: StarknetContract;
  let l2Bridge: StarknetContract;

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

    provider = new ethers.providers.JsonRpcProvider(networkUrl);
    daiWhale = provider.getSigner(DAI_WHALE);

    emissionManager = provider.getSigner(EMISSION_MANAGER);

    await signer.sendTransaction({
      from: signer.address,
      to: daiWhale._address,
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

  it("dai whale converts its Dai to aDai", async () => {
    // daiWhale deposits dai and gets aDai
    await dai.connect(daiWhale).transfer(l1user.address, 3n * daiAmount);
    await dai.connect(l1user).approve(pool.address, MAX_UINT256);
    await pool
      .connect(l1user)
      .deposit(dai.address, 3n * daiAmount, l1user.address, 0);
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

  it("initialize L2 static_a_dai", async () => {
    await l2user.invoke(l2StaticADai, "initialize_static_a_token", {
      name: 1234n,
      symbol: 123n,
      decimals: BigInt(await aDai.decimals()),
      initial_supply: { high: 0n, low: 0n },
      recipient: BigInt(l2Bridge.address),
      owner: BigInt(l2owner.starknetContract.address),
      l2_bridge: BigInt(l2Bridge.address),
    });
  });

  it("set L1 token bridge as implementation contract", async () => {
    let ABI = [
      "function initialize(uint256 l2Bridge, address messagingContract, address incentivesController, address[] calldata l1Tokens, uint256[] calldata l2Tokens, uint256[] calldata ceilings) ",
    ];
    let iface = new ethers.utils.Interface(ABI);

    let encodedInitializedParams = iface.encodeFunctionData("initialize", [
      l2BridgeProxy.address,
      mockStarknetMessagingAddress,
      INCENTIVES_CONTROLLER,
      [aDai.address],
      [l2StaticADai.address],
      [MAX_UINT256],
    ]);
    await l1BridgeProxy["initialize(address,address,bytes)"](
      l1BridgeImpl.address,
      l1ProxyAdmin.address,
      encodedInitializedParams
    );
    l1Bridge = await ethers.getContractAt(
      "Bridge",
      l1BridgeProxy.address,
      signer
    );
  });

  it("initialize the bridge on L1 and L2", async () => {
    // set L1 token bridge from L2 bridge
    await l2user.invoke(l2Bridge, "initialize_bridge", {
      governor_address: BigInt(l2user.starknetContract.address),
    });
    await l2user.invoke(l2Bridge, "set_l1_bridge", {
      l1_bridge_address: BigInt(l1Bridge.address),
    });

    // map L1 tokens to L2 tokens on L2 bridge
    await l2user.invoke(l2Bridge, "set_reward_token", {
      reward_token: BigInt(l2rewAAVE.address),
    });
    await l2user.invoke(l2Bridge, "approve_bridge", {
      l1_token: BigInt(aDai.address),
      l2_token: BigInt(l2StaticADai.address),
    });
  });

  it("cancel aDai deposit", async () => {
    await aDai.connect(l1user).approve(l1Bridge.address, MAX_UINT256);
    const l1userBalanceBeforeDeposit = await aDai.balanceOf(l1user.address);
    txDai = await l1Bridge
      .connect(l1user)
      .deposit(
        aDai.address,
        BigInt(l2user.starknetContract.address),
        10n * DAI_UNIT,
        0,
        false
      );
    const receipt = await txDai.wait();

    const depositEvent = receipt.events
      .filter((x: any) => (x.event = "Deposit"))
      .at(-1);

    let deposit_amount = depositEvent.args[2];
    let current_rewards_index = depositEvent.args[5];
    let blockNumber = depositEvent.args[4];
    let nonce = 0;

    await l1Bridge
      .connect(l1user)
      .startDepositCancellation(
        aDai.address,
        deposit_amount,
        BigInt(l2user.starknetContract.address),
        current_rewards_index,
        blockNumber,
        nonce
      );

    await l1Bridge
      .connect(l1user)
      .cancelDeposit(
        aDai.address,
        deposit_amount,
        BigInt(l2user.starknetContract.address),
        current_rewards_index,
        blockNumber,
        nonce
      );
    const l1userBalanceAfterCancellation = BigNumber.from(
      await aDai.balanceOf(l1user.address)
    );

    //check that aTokens were safely transferred back to the user
    expect(l1userBalanceAfterCancellation).to.be.gte(
      l1userBalanceBeforeDeposit
    );
  });
});
