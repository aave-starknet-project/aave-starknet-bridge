import { Account } from "hardhat/types";
import fs from "fs";
import { deployETHStaticAToken, deployL2RewAaveToken } from "./deployTokens";
import { deployL1Bridge, deployL2Bridge } from "./deployBridge";
import { starknet, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const starknetMessagingContract = "0xae0Ee0A63A2cE6BaeEFFE56e7714FB4EFE48D419";

async function deployAll() {
  try {
    let l2deployer: Account;
    let l1deployer: SignerWithAddress;

    [l1deployer] = await ethers.getSigners();
    l2deployer = await starknet.deployAccount("OpenZeppelin");

    fs.writeFileSync(
      `deployment/L2deployer.json`,
      JSON.stringify({
        publicKey: l2deployer.publicKey,
        privateKey: l2deployer.privateKey,
      })
    );

    //deploy L2 token bridge
    const L2ProxyBridge = await deployL2Bridge(
      l2deployer,
      BigInt(l2deployer.starknetContract.address)
    );

    //deploy rewAAVE token on L2

    const proxiedL2RewAaaveToken = await deployL2RewAaveToken(
      l2deployer,
      "rewAAVE Token",
      "rewAAVE",
      18n,
      { high: 0n, low: 0n },
      BigInt(l2deployer.starknetContract.address),
      BigInt(L2ProxyBridge.address),
      BigInt(l2deployer.starknetContract.address)
    );

    console.log("setting reward token on L2 token bridge...");

    //set rewAAVE on L2 token bridge
    await l2deployer.invoke(L2ProxyBridge, "set_reward_token", {
      reward_token: BigInt(proxiedL2RewAaaveToken.address),
    });

    console.log("Deploying L1 token bridge...");
    await deployL1Bridge(
      l1deployer,
      L2ProxyBridge.address,
      starknetMessagingContract
    );

    console.log("Deploying ETHStaticATokens...");
    //deploy first ETHStaticAToken
    deployETHStaticAToken(
      l2deployer,
      "ETHStaticAUSD",
      "ETHAUSD",
      18n,
      { high: 0n, low: 0n },
      BigInt(l2deployer.starknetContract.address),
      BigInt(L2ProxyBridge.address),
      BigInt(l2deployer.starknetContract.address)
    );
  } catch (error) {
    console.log(error);
  }
}

deployAll();
