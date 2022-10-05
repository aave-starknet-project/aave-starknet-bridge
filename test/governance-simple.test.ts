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

describe("Governance", async function () {
  this.timeout(TIMEOUT);

  const networkUrl =
    (config as HardhatUserConfig).networks?.l1_testnet?.url ||
    "http://localhost:8545";

  let starknetMessagingAddress: string;
  let futureL1GovRelayAddress: string;

  let l2GovRelayFactory: StarknetContractFactory;
  let l2SpellFactory: StarknetContractFactory;
  let l1GovRelayFactory: ContractFactory;

  let l1deployer: SignerWithAddress;
  let l2owner: Account;
  let l2user: Account;

  let l2GovRelay: StarknetContract;
  let l2Spell: StarknetContract;
  let l1GovRelay: Contract;

  let l2rewAAVE: StarknetContract;

  let spellBytecodePath =
    "starknet-artifacts/contracts/l2/mocks/mock_spell.cairo/mock_spell.json";
  let rawSpellBytecode = fs.readFileSync(spellBytecodePath);
  let spellBytecode = JSON.parse(rawSpellBytecode.toString());
  let originalBytecode = JSON.stringify(spellBytecode, null, 2);

  let userBalance: any;
  let ownerResponse: any;

  before(async function () {
    // load L1 <--> L2 messaging contract

    starknetMessagingAddress = (
      await starknet.devnet.loadL1MessagingContract(networkUrl)
    ).address;

    // accounts
    [l1deployer] = await ethers.getSigners();
    l2owner = await starknet.deployAccount("OpenZeppelin");
    l2user = await starknet.deployAccount("OpenZeppelin");

    // L2 deployments

    l2GovRelayFactory = await starknet.getContractFactory(
      "l2/governance/l2_governance_relay"
    );
    futureL1GovRelayAddress = await getAddressOfNextDeployedContract(
      l1deployer
    );
    l2GovRelay = await l2GovRelayFactory.deploy({
      l1_governance_relay: futureL1GovRelayAddress,
    });
    const l2rewAaveContractFactory = await starknet.getContractFactory(
      "l2/tokens/rewAAVE"
    );
    l2rewAAVE = await l2rewAaveContractFactory.deploy();

    // L1 deployments

    l1GovRelayFactory = await ethers.getContractFactory(
      "L1GovernanceRelay",
      l1deployer
    );
    l1GovRelay = await l1GovRelayFactory.deploy(
      starknetMessagingAddress,
      BigInt(l2GovRelay.address)
    );
  });

  after(async function () {
    // store original bytecode again
    fs.writeFileSync(spellBytecodePath, originalBytecode);
  });

  it("Deploy Spell contract with updated parameters", async () => {
    let currentToken = adaptAddress("123456789");
    let currentRecipient = adaptAddress("987654321");
    let currentOwner = adaptAddress("999999999");

    let spellBytecode = JSON.parse(rawSpellBytecode.toString());
    let currentData = spellBytecode["program"]["data"];
    let newData = currentData.map((item: string) => {
      if (item == currentToken) {
        return adaptAddress(l2rewAAVE.address);
      } else if (item == currentRecipient) {
        return adaptAddress(l2user.address);
      } else if (item == currentOwner) {
        return adaptAddress(l2owner.address);
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
    l2Spell = await l2SpellFactory.deploy();
  });

  it("Check that initial balance of user is zero and owner is zero", async () => {
    userBalance = await l2rewAAVE.call("balanceOf", {
      account: BigInt(l2user.address),
    });
    expect(userBalance).to.deep.equal({
      balance: {
        low: 0n,
        high: 0n,
      },
    });

    ownerResponse = await l2rewAAVE.call("owner", {});
    expect(ownerResponse).to.deep.equal({
      owner: 0n,
    });
  });

  it("Send message from L1 to execute the spell", async () => {
    await l1GovRelay.relay(BigInt(l2Spell.address));

    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(1);
    expectAddressEquality(
      flushL1Messages[0].args.from_address,
      l1GovRelay.address
    );
    expectAddressEquality(
      flushL1Messages[0].args.to_address,
      l2GovRelay.address
    );
  });

  it("Check that spell worked correctly", async () => {
    userBalance = await l2rewAAVE.call("balanceOf", {
      account: BigInt(l2user.address),
    });
    expect(userBalance).to.deep.equal({
      balance: {
        low: 10000n,
        high: 0n,
      },
    });

    ownerResponse = await l2rewAAVE.call("owner", {});
    expect(ownerResponse).to.deep.equal({
      owner: BigInt(l2owner.address),
    });
  });
});
