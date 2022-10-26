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

const l1BridgeMockAddress = "999999";

describe("Governance", async function () {
  this.timeout(TIMEOUT);

  const networkUrl =
    (config as HardhatUserConfig).networks?.l1_testnet?.url ||
    "http://localhost:8545";

  let starknetMessagingAddress: string;
  let futurel1ExecutorAddress: string;

  let l2GovRelayFactory: StarknetContractFactory;
  let l2SpellFactory: StarknetContractFactory;
  let l1ExecutorFactory: ContractFactory;
  let l1ForwarderStarknetFactory: ContractFactory;

  let l1deployer: SignerWithAddress;
  let l2user: Account;

  let l2GovRelay: StarknetContract;
  let l2SpellHash: string;
  let l1Executor: Contract;
  let l1ForwarderStarknet: Contract;

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

    l2GovRelayFactory = await starknet.getContractFactory(
      "l2/governance/l2_governance_relay"
    );
    futurel1ExecutorAddress = await getAddressOfNextDeployedContract(
      l1deployer
    );
    l2GovRelay = await l2GovRelayFactory.deploy({
      l1_governance_relay: futurel1ExecutorAddress,
    });
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

    l1ForwarderStarknetFactory = await ethers.getContractFactory(
      "CrosschainForwarderStarknet",
      l1deployer
    );
    l1ForwarderStarknet = await l1ForwarderStarknetFactory.deploy(
      starknetMessagingAddress,
      BigInt(l2GovRelay.address)
    );
  });

  after(async function () {
    // store original bytecode again
    fs.writeFileSync(spellBytecodePath, originalBytecode);
  });

  it("Deploy Spell contract with updated parameters", async () => {
    let currentL2Bridge = adaptAddress("12345");
    let currentL1Bridge = adaptAddress("67890");

    let spellBytecode = JSON.parse(rawSpellBytecode.toString());
    let currentData = spellBytecode["program"]["data"];
    let newData = currentData.map((item: string) => {
      if (item == currentL2Bridge) {
        return adaptAddress(l2Bridge.address);
      } else if (item == currentL1Bridge) {
        return adaptAddress(l1BridgeMockAddress);
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

  it("Set l2 bridge governor to gov relay contract ", async () => {
    await l2user.invoke(l2Bridge, "initialize_bridge", {
      governor_address: BigInt(l2GovRelay.address),
    });

    currentBridgeGovernor = await l2Bridge.call("get_governor", {});
    expect(currentBridgeGovernor).to.deep.equal({
      res: BigInt(l2GovRelay.address),
    });
  });

  it("Check that l1 bridge address is not intialized and equal to zero ", async () => {
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
    const calldata = iface.encodeFunctionData("execute", [BigInt(l2SpellHash)]);

    await l1Executor.queueTransaction(
      l1ForwarderStarknet.address,
      0,
      "",
      calldata,
      executionTime,
      true
    );

    await provider.send("evm_increaseTime", [100_000]);
    await provider.send("evm_mine");

    await l1Executor.executeTransaction(
      l1ForwarderStarknet.address,
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

  it("Check that spell was executed correctly", async () => {
    l1BridgeAddress = await l2Bridge.call("get_l1_bridge", {});
    expect(l1BridgeAddress).to.deep.equal({
      res: BigInt(l1BridgeMockAddress),
    });
  });
});
