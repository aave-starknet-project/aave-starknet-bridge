import { starknet } from "hardhat";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import fs from "fs";

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
  l2_bridge: bigint
) {
  let proxyFactory: StarknetContractFactory;
  let staticATokenProxy: StarknetContract;
  let staticATokenImpl: StarknetContract;
  let staticAToken: StarknetContract;

  const staticATokenFactory = await starknet.getContractFactory(
    "static_a_token"
  );
  proxyFactory = await starknet.getContractFactory("proxy");

  staticATokenProxy = await proxyFactory.deploy({
    proxy_admin: BigInt(deployer.starknetContract.address),
  });

  staticATokenImpl = await staticATokenFactory.deploy();

  await deployer.invoke(staticATokenProxy, "initialize_proxy", {
    implementation_address: BigInt(staticATokenImpl.address),
  });

  fs.writeFileSync(
    `deployment/${name}.json`,
    JSON.stringify({
      token: name,
      proxy: staticATokenProxy.address,
      implementation: staticATokenImpl.address,
    })
  );

  staticAToken = staticATokenFactory.getContractAt(staticATokenProxy.address);

  await deployer.invoke(staticAToken, "initialize_static_a_token", {
    name: stringToBigInt(name),
    symbol: stringToBigInt(symbol),
    decimals: decimals,
    initial_supply: initial_supply,
    recipient: BigInt(deployer.starknetContract.address),
    owner: owner,
    l2_bridge: l2_bridge,
  });
}

export async function deployL2rewAAVE(
  deployer: Account,
  name: string,
  symbol: string,
  decimals: bigint,
  initial_supply: { low: bigint; high: bigint },
  owner: bigint
) {
  let proxyFactory: StarknetContractFactory;
  let rewAAVEFactory: StarknetContractFactory;

  let rewAAVEImpl: StarknetContract;
  let rewAAVEProxy: StarknetContract;
  let rewAAVE: StarknetContract;

  rewAAVEFactory = await starknet.getContractFactory("rewAAVE");
  proxyFactory = await starknet.getContractFactory("proxy");

  console.log("deploying rewAAVE token proxy ...");
  rewAAVEProxy = await proxyFactory.deploy({
    proxy_admin: BigInt(deployer.starknetContract.address),
  });

  console.log("deploying rewAAVE token implementation ...");
  rewAAVEImpl = await rewAAVEFactory.deploy();

  fs.writeFileSync(
    `deployment/${name}.json`,
    JSON.stringify({
      token: name,
      proxy: rewAAVEProxy.address,
      implementation: rewAAVEImpl.address,
    })
  );

  console.log("initializing rewAAVE token proxy...");
  await deployer.invoke(rewAAVEProxy, "initialize_proxy", {
    implementation_address: BigInt(rewAAVEImpl.address),
  });

  rewAAVE = rewAAVEFactory.getContractAt(rewAAVEProxy.address);

  await deployer.invoke(rewAAVE, "initialize_rewAAVE", {
    name: stringToBigInt(name),
    symbol: stringToBigInt(symbol),
    decimals: decimals,
    initial_supply: initial_supply,
    recipient: BigInt(deployer.starknetContract.address),
    owner: owner,
  });
  return rewAAVEProxy;
}

function stringToBigInt(str: string) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return BigInt(parseInt(result, 16));
}
