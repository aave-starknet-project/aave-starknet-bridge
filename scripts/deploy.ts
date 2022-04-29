import { starknet } from "hardhat";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import fs from "fs";
import { deployETHStaticAToken } from "./deployETHStaticAToken";

async function deployAll() {
  let l2deployer: Account;

  l2deployer = await starknet.deployAccount("OpenZeppelin");
  fs.writeFileSync(
    `deployment/deployer.json`,
    JSON.stringify({
      publicKey: l2deployer.publicKey,
      privateKey: l2deployer.privateKey,
    })
  );

  //deploy first ETHStaticAToken
  deployETHStaticAToken(
    l2deployer,
    "ETHStaticAUSD",
    "ETHAUSD",
    18n,
    { high: 0n, low: 0n },
    BigInt(l2deployer.starknetContract.address),
    BigInt(l2deployer.starknetContract.address),
    BigInt(l2deployer.starknetContract.address)
  );
}

deployAll();
