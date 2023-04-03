import { Contract } from "ethers";
import { STARKNET_MESSAGING_CONTRACT_MAINNET } from "./addresses";
import fs from "fs";
import {
  deployL1BridgeImplementation,
  deployL1ForwarderStarknet,
} from "./deployBridge";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });

async function deployAll() {
  try {
    let l1deployer: SignerWithAddress;
    let l1ForwarderStarknet: Contract;

    [l1deployer] = await ethers.getSigners();

    if (!fs.existsSync("./deployment")) {
      fs.mkdirSync("./deployment");
    }

    ///////////////////////////
    // L1 Forwarder Starknet //
    ///////////////////////////

    l1ForwarderStarknet = await deployL1ForwarderStarknet(
      l1deployer,
      STARKNET_MESSAGING_CONTRACT_MAINNET,
      "0x07bbb769e53d886f77792d59b9cd65a2eb14a84c49a0942ba9577e291deefcec"
    );

    //////////////////////////////
    // L1 Bridge implementation //
    //////////////////////////////

    await deployL1BridgeImplementation(l1deployer);

    console.log("Protocol deployed successfully!");

    process.exit();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

deployAll();
