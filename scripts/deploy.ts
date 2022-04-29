import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import fs from "fs";
import { deployETHStaticAToken, deployL2RewAaveToken } from "./deployTokens";
import { deployL1Bridge, deployL2Bridge } from "./deployBridge";
import hre, { starknet, network, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function deployAll() {
  let l2deployer: Account;
  let l1deployer: SignerWithAddress;

  //[l1deployer] = await ethers.getSigners();
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
    BigInt(l2deployer.starknetContract.address),
    BigInt(l2deployer.starknetContract.address)
  );

  //deploy rewAAVE token on L2

  const L2RewAaaveToken = await deployL2RewAaveToken(
    "rewAAVE Token",
    "rewAAVE",
    18n,
    { high: 0n, low: 0n },
    BigInt(l2deployer.starknetContract.address),
    BigInt(L2ProxyBridge.address)
  );

  console.log("setting reward token on L2 token bridge...");

  //set rewAAVE on L2 token bridge
  await l2deployer.invoke(L2ProxyBridge, "set_reward_token", {
    reward_token: BigInt(L2RewAaaveToken.address),
  });

  /* const tokenBridgeL1 = await deployL1Bridge(
    l1deployer,
    L2ProxyBridge.address,
    "", //messaging contract
    "" //rewards token on L1
  ); */
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
}

deployAll();
