import { Contract } from "ethers";
import {
  STARKNET_MESSAGING_CONTRACT_MAINNET,
  INCENTIVES_CONTROLLER_MAINNET,
  L2_GOVERNANCE_RELAY_MAINNET,
  AAVE_SHORT_EXECUTOR_MAINNET,
  L2_BRIDGE_MAINNET,
  L1_FORWARDER_STARKNET_MAINNET,
  L2_REWAAVE_MAINNET,
  TRANSPARENT_PROXY_FACTORY_MAINNET,
} from "./addresses";
import {
  allowlistedATokensAddresses,
  allowlistedStaticATokensData,
  ceilings,
} from "./allowlistedTokens";
import { Account, StarknetContract } from "hardhat/types";
import fs from "fs";
import { deployStaticAToken, deployL2rewAAVE } from "./deployTokens";
import {
  deployL1Bridge,
  deployL1ForwarderStarknet,
  deployL2Bridge,
  deployL2GovernanceRelay,
  deploySpellContract,
} from "./deployBridge";
import { starknet, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const { L2_DEPLOYER_PRIVATE_KEY, L2_DEPLOYER_ADDRESS } = process.env;

const maxFee = 5e16;

async function deployAll() {
  try {
    let l2deployer: Account;
    let l1deployer: SignerWithAddress;
    let staticATokensAddresses: BigInt[];
    let l2GovRelay: StarknetContract;
    let l1ForwarderStarknet: Contract;

    if (!L2_DEPLOYER_PRIVATE_KEY || !L2_DEPLOYER_ADDRESS) {
      throw new Error(
        "Please set your L2 deployer private key & address in your .env file"
      );
    }

    l2deployer = await starknet.getAccountFromAddress(
      L2_DEPLOYER_ADDRESS,
      L2_DEPLOYER_PRIVATE_KEY,
      "OpenZeppelin"
    );

    [l1deployer] = await ethers.getSigners();

    if (!fs.existsSync("./deployment")) {
      fs.mkdirSync("./deployment");
    }

    fs.writeFileSync(
      "deployment/L2deployer.json",
      JSON.stringify({
        publicKey: l2deployer.publicKey,
        privateKey: l2deployer.privateKey,
      })
    );

    /////////////////////////
    // L2 Governance Relay //
    /////////////////////////

    // l2GovRelay = await deployL2GovernanceRelay(AAVE_SHORT_EXECUTOR_MAINNET);
    // console.log(l2GovRelay.address);
    const l2GovRelayFactory = await starknet.getContractFactory(
      "l2_governance_relay"
    );
    l2GovRelay = l2GovRelayFactory.getContractAt(L2_GOVERNANCE_RELAY_MAINNET);

    ///////////////////////////
    // L1 Forwarder Starknet //
    ///////////////////////////

    // l1ForwarderStarknet = await deployL1ForwarderStarknet(
    //   l1deployer,
    //   STARKNET_MESSAGING_CONTRACT_MAINNET,
    //   l2GovRelay.address
    // );
    // console.log(
    //   "To verify L1 ForwarderStarknet contract: npx hardhat verify --network mainnet ",
    //   l1ForwarderStarknet.address
    // );
    l1ForwarderStarknet = await ethers.getContractAt(
      "CrosschainForwarderStarknet",
      L1_FORWARDER_STARKNET_MAINNET,
      l1deployer
    );

    ///////////////
    // L2 Bridge //
    ///////////////

    // const l2Bridge = await deployL2Bridge(
    //   l2deployer,
    //   BigInt(l2deployer.address),
    //   BigInt(l2GovRelay.address),
    //   maxFee
    // );
    const l2BridgeFactory = await starknet.getContractFactory("bridge");
    const l2Bridge = l2BridgeFactory.getContractAt(L2_BRIDGE_MAINNET);

    //////////////////////
    // L2 RewAave token //
    //////////////////////

    await deployL2rewAAVE(
      l2deployer,
      BigInt(l2GovRelay.address),
      BigInt(l2Bridge.address),
      maxFee
    );

    ///////////////////////
    // L2 Static aTokens //
    ///////////////////////

    // if (!fs.existsSync("./deployment/staticATokens")) {
    //   fs.mkdirSync("./deployment/staticATokens");
    // }

    staticATokensAddresses = [];
    // console.log("Deploying static_a_tokens...");
    // for (let i = 0; i < allowlistedATokensAddresses.length; i++) {
    //   let deployedTokenProxyAddress = await deployStaticAToken(
    //     l2deployer,
    //     allowlistedStaticATokensData[i].name,
    //     allowlistedStaticATokensData[i].symbol,
    //     allowlistedStaticATokensData[i].decimals,
    //     { high: 0n, low: 0n }, //total supply of all staticATokens defaulted to zero
    //     BigInt(l2deployer.starknetContract.address), //proxy admin
    //     BigInt(l2Bridge.address),
    //     BigInt(l2GovRelay.address),
    //     maxFee
    //   );
    //   staticATokensAddresses.push(deployedTokenProxyAddress);
    // }

    ///////////////////////
    // L1 Bridge //
    ///////////////////////

    await deployL1Bridge(
      l1deployer,
      l2Bridge.address, //Bridge proxy on Alpha mainnet
      STARKNET_MESSAGING_CONTRACT_MAINNET,
      INCENTIVES_CONTROLLER_MAINNET,
      l1deployer.address, // proxy admin
      allowlistedATokensAddresses, // l1 aTokens to be approved
      staticATokensAddresses, // l2 static_a_tokens to be approved
      ceilings, // Array containing a ceiling for each aToken
      TRANSPARENT_PROXY_FACTORY_MAINNET
    );

    /////////////////////////
    // L2 Governance Spell //
    /////////////////////////

    // await deploySpellContract("initialize_bridge");

    console.log("Protocol deployed successfully!");

    process.exit();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

deployAll();
