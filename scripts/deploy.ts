import {
  whitelistedStaticATokens,
  whitelistedATokens,
} from "./whitelistedTokens";
import { Account } from "hardhat/types";
import fs from "fs";
import { deployStaticAToken, deployL2rewAAVE } from "./deployTokens";
import { deployL1Bridge, deployL2Bridge } from "./deployBridge";
import { starknet, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  STARKNET_MESSAGING_CONTRACT,
  INCENTIVES_CONTROLLER,
} from "../constants/addresses";

async function deployAll() {
  try {
    let l2deployer: Account;
    let l1deployer: SignerWithAddress;
    let staticATokensAddresses: BigInt[];

    [l1deployer] = await ethers.getSigners();
    l2deployer = await starknet.deployAccount("OpenZeppelin");

    staticATokensAddresses = [];

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

    //deploy L2 token bridge
    const l2Bridge = await deployL2Bridge(
      l2deployer,
      BigInt(l2deployer.starknetContract.address)
    );

    //deploy rewAAVE token on L2
    const l2rewAAVE = await deployL2rewAAVE(
      l2deployer,
      "rewAAVE Token",
      "rewAAVE",
      18n,
      { high: 0n, low: 0n },
      BigInt(l2Bridge.address)
    );

    console.log("setting reward token on L2 token bridge...");

    //set rewAAVE on L2 token bridge
    await l2deployer.invoke(l2Bridge, "set_reward_token", {
      reward_token: BigInt(l2rewAAVE.address),
    });

    if (!fs.existsSync("./deployment/staticATokens")) {
      fs.mkdirSync("./deployment/staticATokens");
    }

    console.log("Deploying static_a_tokens...");
    for (let i = 0; i < whitelistedATokens.length; i++) {
      await deployStaticAToken(
        l2deployer,
        whitelistedStaticATokens[i].name,
        whitelistedStaticATokens[i].symbol,
        whitelistedStaticATokens[i].decimals,
        { high: 0n, low: 0n }, //total supply of all staticATokens defaulted to zero
        BigInt(l2deployer.starknetContract.address), //proxy admin
        BigInt(l2Bridge.address)
      ).then((deployedTokenProxyAddress) => {
        staticATokensAddresses.push(deployedTokenProxyAddress);
      });
    }

    console.log("Deploying L1 token bridge...");
    const l1Bridge = await deployL1Bridge(
      l1deployer,
      l2Bridge.address,
      STARKNET_MESSAGING_CONTRACT,
      INCENTIVES_CONTROLLER,
      l1deployer.address, // @TBD: proxy admin
      whitelistedATokens, // l1 aTokens to be approved
      staticATokensAddresses // l2 static_a_tokens to be approved
    );
    console.log("setting l1 bridge address on l2 bridge...");
    if (l1Bridge) {
      await l2deployer.invoke(l2Bridge, "set_l1_bridge", {
        l1_bridge_address: BigInt(l1Bridge.address),
      });
    }
    console.log("deployed successfully");

    process.exit();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

deployAll();
