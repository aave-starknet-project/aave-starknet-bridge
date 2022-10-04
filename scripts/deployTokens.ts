import { starknet } from "hardhat";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import fs from "fs";
import { encodeShortString } from "../test/utils";

/**
 * deploys and initializes static_a_token on L2
 * @param deployer the deployer starknet account
 * @param name token's name
 * @param symbol token's symbol
 * @param decimals  token's symbol
 * @param initial_supply oken's initial supply
 */
export async function deployStaticAToken(
  deployer: Account,
  name: string,
  symbol: string,
  decimals: bigint,
  initial_supply: { low: bigint; high: bigint },
  owner: bigint,
  l2_bridge: bigint,
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

  staticATokenProxy = await proxyFactory.deploy({
    proxy_admin: BigInt(deployer.starknetContract.address),
  });

  console.log("declaring", name, " class hash");

  staticATokenImplHash = await deployer.declare(staticATokenFactory, {
    maxFee: maxFee,
  });

  await deployer.invoke(
    staticATokenProxy,
    "set_implementation",
    {
      implementation_hash: BigInt(staticATokenImplHash),
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

  await deployer.invoke(
    staticAToken,
    "initialize_static_a_token",
    {
      name: encodeShortString(name),
      symbol: encodeShortString(symbol),
      decimals: decimals,
      initial_supply: initial_supply,
      recipient: BigInt(deployer.starknetContract.address),
      owner: owner,
      l2_bridge: l2_bridge,
    },
    { maxFee: maxFee }
  );

  return BigInt(staticATokenProxy.address);
}

export async function deployL2rewAAVE(
  deployer: Account,
  name: string,
  symbol: string,
  decimals: bigint,
  initial_supply: { low: bigint; high: bigint },
  owner: bigint,
  maxFee: number
) {
  let proxyFactory: StarknetContractFactory;
  let rewAAVEFactory: StarknetContractFactory;

  let rewAAVEImplHash: string;
  let rewAAVEProxy: StarknetContract;
  let rewAAVE: StarknetContract;

  rewAAVEFactory = await starknet.getContractFactory("rewAAVE");
  proxyFactory = await starknet.getContractFactory("proxy");

  console.log("deploying rewAAVE token proxy ...");
  rewAAVEProxy = await proxyFactory.deploy({
    proxy_admin: BigInt(deployer.starknetContract.address),
  });

  console.log("declaring rewAAVE token class hash ...");
  rewAAVEImplHash = await deployer.declare(rewAAVEFactory, { maxFee: maxFee });

  fs.writeFileSync(
    `deployment/${name}.json`,
    JSON.stringify({
      token: name,
      proxy: rewAAVEProxy.address,
      implementation_hash: rewAAVEImplHash,
    })
  );

  console.log("initializing rewAAVE token proxy...");
  await deployer.invoke(
    rewAAVEProxy,
    "set_implementation",
    {
      implementation_hash: BigInt(rewAAVEImplHash),
    },
    { maxFee: maxFee }
  );

  rewAAVE = rewAAVEFactory.getContractAt(rewAAVEProxy.address);

  await deployer.invoke(
    rewAAVE,
    "initialize_rewAAVE",
    {
      name: encodeShortString(name),
      symbol: encodeShortString(symbol),
      decimals: decimals,
      initial_supply: initial_supply,
      recipient: BigInt(deployer.starknetContract.address),
      owner: owner,
    },
    { maxFee: maxFee }
  );
  return rewAAVEProxy;
}
