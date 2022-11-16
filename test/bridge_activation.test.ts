import {
  A_DAI,
  A_USDC,
  A_USDT,
  INCENTIVES_CONTROLLER_MAINNET,
} from "./../scripts/addresses";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import fs from "fs";
import chai, { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { starknet, ethers } from "hardhat";
import {
  StarknetContractFactory,
  StarknetContract,
  HardhatUserConfig,
  Account,
} from "hardhat/types";
import { solidity } from "ethereum-waffle";
import config from "../hardhat.config";
import { TIMEOUT } from "./constants";

import {
  getAddressOfNextDeployedContract,
  adaptAddress,
  expectAddressEquality,
} from "./utils";

chai.use(solidity);

describe("Bridge activation", async function () {
  this.timeout(TIMEOUT);

  const networkUrl =
    (config as HardhatUserConfig).networks?.l1_testnet?.url ||
    "http://localhost:8545";

  let starknetMessagingAddress: string;
  let futurel1ExecutorAddress: string;

  let l2GovRelayFactory: StarknetContractFactory;
  let l2ProxyFactory: StarknetContractFactory;
  let l2SpellFactory: StarknetContractFactory;
  let l1ExecutorFactory: ContractFactory;
  let l1ForwarderStarknetFactory: ContractFactory;
  let AaveStarknetBridgeActivationPayloadFactory: ContractFactory;
  let l1BridgeFactory: ContractFactory;

  let l1deployer: SignerWithAddress;
  let l2user: Account;

  let l2GovRelay: StarknetContract;
  let l2GovRelayProxy: StarknetContract;
  let l2GovRelayClassHash: string;
  let l2SpellHash: string;
  let l1Executor: Contract;
  let l1ForwarderStarknet: Contract;
  let AaveStarknetBridgeActivationPayload: Contract;
  let deterministicL1BridgeAddress: string;
  let incentives: Contract;
  let l1BridgeImpl: Contract;

  let l2Bridge: StarknetContract;

  let spellBytecodePath =
    "starknet-artifacts/contracts/l2/mocks/mock_spell.cairo/mock_spell.json";
  let rawSpellBytecode = fs.readFileSync(spellBytecodePath);
  let spellBytecode = JSON.parse(rawSpellBytecode.toString());
  let originalBytecode = JSON.stringify(spellBytecode, null, 2);

  let l1BridgeAddress: any;
  let provider: any;
  let currentBridgeGovernor: any;

  before(async function () {
    // load L1 <--> L2 messaging contract

    starknetMessagingAddress = (
      await starknet.devnet.loadL1MessagingContract(networkUrl)
    ).address;

    provider = new ethers.providers.JsonRpcProvider(networkUrl);

    // accounts
    [l1deployer] = await ethers.getSigners();
    l2user = await starknet.deployAccount("OpenZeppelin");

    // L2 deployments

    l2ProxyFactory = await starknet.getContractFactory("l2/lib/proxy");
    l2GovRelayFactory = await starknet.getContractFactory(
      "l2/governance/l2_governance_relay"
    );

    l2GovRelayProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(l2user.address),
    });
    l2GovRelayClassHash = await l2user.declare(l2GovRelayFactory);

    await l2user.invoke(l2GovRelayProxy, "set_implementation", {
      implementation_hash: BigInt(l2GovRelayClassHash),
    });

    l2GovRelay = l2GovRelayFactory.getContractAt(l2GovRelayProxy.address);
    futurel1ExecutorAddress = await getAddressOfNextDeployedContract(
      l1deployer
    );
    incentives = await ethers.getContractAt(
      "IncentivesControllerMock",
      INCENTIVES_CONTROLLER_MAINNET
    );

    const l2BridgeContractFactory = await starknet.getContractFactory(
      "l2/bridge"
    );
    l2Bridge = await l2BridgeContractFactory.deploy();

    // L1 deployments

    l1ExecutorFactory = await ethers.getContractFactory("Executor", l1deployer);
    l1Executor = await l1ExecutorFactory.deploy(
      l1deployer.address,
      10_000,
      100_000,
      0,
      50_000,
      1,
      10_000,
      10_000,
      1
    );
    await l1Executor.deployed();
    l1ForwarderStarknetFactory = await ethers.getContractFactory(
      "CrosschainForwarderStarknet",
      l1deployer
    );
    l1ForwarderStarknet = await l1ForwarderStarknetFactory.deploy(
      starknetMessagingAddress,
      BigInt(l2GovRelay.address)
    );

    l1BridgeFactory = await ethers.getContractFactory("Bridge", l1deployer);
    l1BridgeImpl = await l1BridgeFactory.deploy();
    await l1BridgeImpl.deployed();

    AaveStarknetBridgeActivationPayloadFactory =
      await ethers.getContractFactory(
        "MockAaveStarknetBridgeActivationPayload",
        l1deployer
      );

    AaveStarknetBridgeActivationPayload =
      await AaveStarknetBridgeActivationPayloadFactory.deploy(
        starknetMessagingAddress,
        l1ForwarderStarknet.address,
        l1BridgeImpl.address,
        l2Bridge.address,
        l1Executor.address
      );

    deterministicL1BridgeAddress =
      await AaveStarknetBridgeActivationPayload.callStatic.predictProxyAddress();
  });

  after(async function () {
    // store original bytecode again
    fs.writeFileSync(spellBytecodePath, originalBytecode);
  });

  it("Deploy Spell contract with updated parameters", async () => {
    let currentL2Bridge = adaptAddress("12345");
    let currentL1Bridge = adaptAddress("67890");
    let currentL2GovRelay = adaptAddress("54321");

    let spellBytecode = JSON.parse(rawSpellBytecode.toString());
    let currentData = spellBytecode["program"]["data"];
    let newData = currentData.map((item: string) => {
      if (item == currentL2Bridge) {
        return adaptAddress(l2Bridge.address);
      } else if (item == currentL1Bridge) {
        return adaptAddress(deterministicL1BridgeAddress);
      } else if (item == currentL2GovRelay) {
        return adaptAddress(l2GovRelay.address);
      } else {
        return item;
      }
    });
    let newSpellBytecode = {
      ...spellBytecode,
      program: { ...spellBytecode["program"], data: newData },
    };

    fs.writeFileSync(
      spellBytecodePath,
      JSON.stringify(newSpellBytecode, null, 2)
    );

    l2SpellFactory = await starknet.getContractFactory("l2/mocks/mock_spell");
    l2SpellHash = await l2user.declare(l2SpellFactory);
  });

  it("Set l2 bridge governor to gov relay contract", async () => {
    await l2user.invoke(l2Bridge, "initialize_bridge", {
      governor_address: BigInt(l2GovRelay.address),
    });

    currentBridgeGovernor = await l2Bridge.call("get_governor", {});
    expect(currentBridgeGovernor).to.deep.equal({
      res: BigInt(l2GovRelay.address),
    });
  });

  it("Check that l1 bridge address is not intialized and equal to zero", async () => {
    l1BridgeAddress = await l2Bridge.call("get_l1_bridge", {});
    expect(l1BridgeAddress).to.deep.equal({
      res: 0n,
    });
  });

  it("Send message from L1 to execute the spell", async () => {
    const executionTime = (await provider.getBlock()).timestamp + 15_000;

    // build calldata
    let ABI = ["function execute(uint256 spell)"];
    let iface = new ethers.utils.Interface(ABI);

    const calldata = iface.encodeFunctionData("execute", [l2SpellHash]);

    await l1Executor.queueTransaction(
      AaveStarknetBridgeActivationPayload.address,
      0,
      "",
      calldata,
      executionTime,
      true
    );

    await provider.send("evm_increaseTime", [100_000]);
    await provider.send("evm_mine");

    await l1Executor.executeTransaction(
      AaveStarknetBridgeActivationPayload.address,
      0,
      "",
      calldata,
      executionTime,
      true
    );

    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(1);
    expectAddressEquality(
      flushL1Messages[0].args.from_address,
      l1Executor.address
    );
    expectAddressEquality(
      flushL1Messages[0].args.to_address,
      l2GovRelay.address
    );
  });

  it("Check that l1 bridge was deployed and initialized correctly", async () => {
    const l1Bridge = await ethers.getContractAt(
      "Bridge",
      deterministicL1BridgeAddress
    );
    const l1BridgeProxy = await ethers.getContractAt(
      "InitializableAdminUpgradeabilityProxy",
      deterministicL1BridgeAddress
    );

    //mock msg sender since only admin can call implementation
    expect(
      await l1BridgeProxy
        .connect(l1Executor.address)
        .callStatic.implementation()
    ).to.eq(l1BridgeImpl.address);
    expect(
      await l1BridgeProxy.connect(l1Executor.address).callStatic.admin()
    ).to.eq(l1Executor.address);

    expect(await l1Bridge._messagingContract()).to.eq(starknetMessagingAddress);
    expect(await l1Bridge._rewardToken()).to.eq(
      await incentives.REWARD_TOKEN()
    );
    expect(await l1Bridge._incentivesController()).to.eq(
      INCENTIVES_CONTROLLER_MAINNET
    );

    //check approved tokens
    expect(await l1Bridge._approvedL1Tokens(0)).to.eq(A_USDC);
    expect(await l1Bridge._approvedL1Tokens(1)).to.eq(A_USDT);
    expect(await l1Bridge._approvedL1Tokens(2)).to.eq(A_DAI);
  });

  it("Check that spell was executed correctly", async () => {
    //check that the l1 bridge was set correctly on bridge
    l1BridgeAddress = await l2Bridge.call("get_l1_bridge", {});
    expect(l1BridgeAddress).to.deep.equal({
      res: BigInt(deterministicL1BridgeAddress),
    });
  });
});
