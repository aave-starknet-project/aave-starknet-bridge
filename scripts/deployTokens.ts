import { starknet } from "hardhat";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import fs from "fs";
import { encodeShortString } from "../test/utils";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "./.env") });

const { STARKNET_DEPLOYMENT_TOKEN } = process.env;

/**
 * deploys and initializes static_a_token on L2
 * @param deployer the deployer starknet account
 * @param name token's name
 * @param symbol token's symbol
 * @param decimals  token's symbol
 * @param initialSupply token's initial supply
 */
export async function deployStaticAToken(
  deployer: Account,
  name: string,
  symbol: string,
  decimals: bigint,
  initialSupply: { low: bigint; high: bigint },
  l2Bridge: bigint,
  l2GovRelay: bigint,
  maxFee: number
): Promise<BigInt> {
  let proxyFactory: StarknetContractFactory;
  let staticATokenProxy: StarknetContract;
  let staticATokenImplHash: string;
  let staticAToken: StarknetContract;

  console.log("deploying", name);

  const staticATokenFactory = await starknet.getContractFactory(
    "static_a_token"
  );
  proxyFactory = await starknet.getContractFactory("proxy");

  staticATokenProxy = await proxyFactory.deploy(
    {
      proxy_admin: BigInt(deployer.starknetContract.address),
    },
    {
      token: STARKNET_DEPLOYMENT_TOKEN,
    }
  );

  console.log("declaring", name, " class hash");

  staticATokenImplHash = await deployer.declare(staticATokenFactory, {
    maxFee: maxFee,
    token: STARKNET_DEPLOYMENT_TOKEN,
  });

  await deployer.invoke(
    staticATokenProxy,
    "set_implementation",
    {
      implementation_hash: BigInt(staticATokenImplHash),
    },
    { maxFee: maxFee }
  );
  console.log("class hash", staticATokenImplHash);
  console.log("updating proxy admin to the l2 governance relay contract");

  await deployer.invoke(
    staticATokenProxy,
    "change_proxy_admin",
    {
      new_admin: l2GovRelay,
    },
    { maxFee: maxFee }
  );

  fs.writeFileSync(
    `deployment/staticATokens/${name}.json`,
    JSON.stringify({
      token: name,
      proxy: staticATokenProxy.address,
      implementation: staticATokenImplHash,
    })
  );

  staticAToken = staticATokenFactory.getContractAt(staticATokenProxy.address);
  console.log("proxy address", staticATokenProxy.address);

  await deployer.invoke(
    staticAToken,
    "initialize_static_a_token",
    {
      name: encodeShortString(name),
      symbol: encodeShortString(symbol),
      decimals: decimals,
      initial_supply: initialSupply,
      recipient: BigInt(deployer.starknetContract.address),
      owner: l2GovRelay,
      l2_bridge: l2Bridge,
    },
    { maxFee: maxFee }
  );

  return BigInt(staticATokenProxy.address);
}

export async function deployL2rewAAVE(
  deployer: Account,
  l2GovRelay: bigint,
  maxFee: number
) {
  console.log("Deploying L2 rewAAVE token...");

  let rewAAVEImplHash: string;
  let rewAAVEProxy: StarknetContract;
  let rewAAVE: StarknetContract;

  const rewAAVEFactory = await starknet.getContractFactory("rewAAVE");
  const proxyFactory = await starknet.getContractFactory("proxy");

  rewAAVEProxy = await proxyFactory.deploy(
    {
      proxy_admin: BigInt(deployer.address),
    },
    {
      token: STARKNET_DEPLOYMENT_TOKEN,
    }
  );

  rewAAVEImplHash = await deployer.declare(rewAAVEFactory, {
    maxFee: maxFee,
    token: STARKNET_DEPLOYMENT_TOKEN,
  });
  console.log("L2 rewAAVE class is declared at hash: ", rewAAVEImplHash);

  fs.writeFileSync(
    `deployment/rewAAVE.json`,
    JSON.stringify({
      token: "rewAAVE",
      proxy: rewAAVEProxy.address,
      implementation_hash: rewAAVEImplHash,
    })
  );

  await deployer.invoke(
    rewAAVEProxy,
    "set_implementation",
    {
      implementation_hash: BigInt(rewAAVEImplHash),
    },
    { maxFee }
  );

  await deployer.invoke(
    rewAAVEProxy,
    "change_proxy_admin",
    {
      new_admin: l2GovRelay,
    },
    { maxFee }
  );

  console.log(
    "L2 rewAave token is deployed behind a proxy with l2 governance relay as proxy admin."
  );

  rewAAVE = rewAAVEFactory.getContractAt(rewAAVEProxy.address);
  console.log("L2 rewaave token address is ", rewAAVE.address);

  return rewAAVE;
}
