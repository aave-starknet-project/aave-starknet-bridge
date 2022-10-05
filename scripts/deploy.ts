import { Contract } from "ethers";
import {
  STARKNET_MESSAGING_CONTRACT_MAINNET,
  INCENTIVES_CONTROLLER_MAINNET,
} from "./../constants/addresses";
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
  deployL1GovernanceRelay,
  deployL2Bridge,
  deployL2GovernanceRelay,
  deploySpellContract,
} from "./deployBridge";
import { starknet, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { getAddressOfNextDeployedContract } from "../test/utils";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const { L2_DEPLOYER_PRIVATE_KEY, L2_DEPLOYER_ADDRESS } = process.env;

const maxFee = 1e18;

async function deployAll() {
  try {
    let l2deployer: Account;
    let l1deployer: SignerWithAddress;
    let staticATokensAddresses: BigInt[];
    let l2GovRelay: StarknetContract;
    let l1GovRelay: Contract;

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

    console.log("Deploying L2 governance relay...");
    let futureL1GovRelayAddress = await getAddressOfNextDeployedContract(
      l1deployer
    );
    l2GovRelay = await deployL2GovernanceRelay(futureL1GovRelayAddress);

    console.log("Deploying L1 governance relay...");

    l1GovRelay = await deployL1GovernanceRelay(
      l1deployer,
      STARKNET_MESSAGING_CONTRACT_MAINNET,
      l2GovRelay.address
    );
    console.log(
      "To verify L1 governance relay contract: npx hardhat verify --network mainnet ",
      l1GovRelay.address
    );

    //deploy L2 token bridge
    const l2Bridge = await deployL2Bridge(
      l2deployer,
      BigInt(l2GovRelay.address),
      maxFee
    );

    //deploy rewAAVE token on L2
    const l2rewAAVE = await deployL2rewAAVE(
      l2deployer,
      "rewAAVE Token",
      "rewAAVE",
      18n,
      { high: 0n, low: 0n },
      BigInt(l2Bridge.address),
      maxFee
    );

    console.log("setting reward token on L2 token bridge...");

    //set rewAAVE on L2 token bridge
    await l2deployer.invoke(
      l2Bridge,
      "set_reward_token",
      {
        reward_token: BigInt(l2rewAAVE.address),
      },
      { maxFee: maxFee }
    );

    if (!fs.existsSync("./deployment/staticATokens")) {
      fs.mkdirSync("./deployment/staticATokens");
    }

    staticATokensAddresses = [];
    console.log("Deploying static_a_tokens...");
    for (let i = 0; i < allowlistedATokensAddresses.length; i++) {
      await deployStaticAToken(
        l2deployer,
        allowlistedStaticATokensData[i].name,
        allowlistedStaticATokensData[i].symbol,
        allowlistedStaticATokensData[i].decimals,
        { high: 0n, low: 0n }, //total supply of all staticATokens defaulted to zero
        BigInt(l2deployer.starknetContract.address), //proxy admin
        BigInt(l2Bridge.address),
        maxFee
      ).then((deployedTokenProxyAddress) => {
        staticATokensAddresses.push(deployedTokenProxyAddress);
      });
    }

    console.log("Deploying L1 token bridge...");
    const l1Bridge = await deployL1Bridge(
      l1deployer,
      l2Bridge.address,
      STARKNET_MESSAGING_CONTRACT_MAINNET,
      INCENTIVES_CONTROLLER_MAINNET,
      l1deployer.address, // proxy admin
      allowlistedATokensAddresses, // l1 aTokens to be approved
      staticATokensAddresses, // l2 static_a_tokens to be approved
      ceilings // Array containing a ceiling for each aToken
    );

    console.log("setting l1 bridge address on l2 bridge...");
    if (l1Bridge) {
      await l2deployer.invoke(
        l2Bridge,
        "set_l1_bridge",
        {
          l1_bridge_address: BigInt(l1Bridge.address),
        },
        { maxFee: maxFee }
      );
    }

    console.log("Relay initialization spell to L2...");

    let spell = await deploySpellContract("initialize_bridge");

    await l1GovRelay.relay(BigInt(spell.address));

    console.log("deployed successfully!");

    process.exit();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

deployAll();
