import { Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });

async function deployL1GovernancePayload() {
  try {
    let l1deployer: SignerWithAddress;
    let l1GovernancePayloadFactory: ContractFactory;
    let l1GovernancePayload: Contract;

    [l1deployer] = await ethers.getSigners();

    ///////////////////////////
    // L1 Governance Payload //
    ///////////////////////////

    console.log("Deploying L1 governance payload...");

    l1GovernancePayloadFactory = await ethers.getContractFactory(
      "AaveStarknetBridgeActivationPayload",
      l1deployer
    );

    l1GovernancePayload = await l1GovernancePayloadFactory.deploy();

    console.log(
      "L1 governance payload is deployed at address: ",
      l1GovernancePayload.address
    );

    process.exit();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

deployL1GovernancePayload();
