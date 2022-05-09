import { starknet } from "hardhat";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import fs from "fs";

/**
 * deploys and initializes ETHStaticAToken on L2
 * @param deployer the deployer starknet account
 * @param name token's name
 * @param symbol token's symbol
 * @param decimals  token's symbol
 * @param initial_supply oken's initial supply
 */
export async function deployETHStaticAToken(
  deployer: Account,
  name: string,
  symbol: string,
  decimals: bigint,
  initial_supply: { low: bigint; high: bigint },
  owner: bigint,
  l2_token_bridge: bigint,
) {
  let proxiedETHStaticAToken: StarknetContract;
  let tokenImplementation: StarknetContract;
  let proxyFactoryL2: StarknetContractFactory;
  let proxyToken: StarknetContract;

  const L2TokenFactory = await starknet.getContractFactory("ETHstaticAToken");
  proxyFactoryL2 = await starknet.getContractFactory("proxy");

  proxyToken = await proxyFactoryL2.deploy({
    proxy_admin: BigInt(deployer.starknetContract.address),
  });

  tokenImplementation = await L2TokenFactory.deploy();

  await deployer.invoke(proxyToken, "initialize_proxy", {
    implementation_address: BigInt(tokenImplementation.address),
  });

  fs.writeFileSync(
    `deployment/${name}.json`,
    JSON.stringify({
      token: name,
      proxy: proxyToken.address,
      implementation: tokenImplementation.address,
    })
  );
  proxiedETHStaticAToken = L2TokenFactory.getContractAt(proxyToken.address);

  await deployer.invoke(proxiedETHStaticAToken, "initialize_ETHstaticAToken", {
    name: stringToBigInt(name),
    symbol: stringToBigInt(symbol),
    decimals: decimals,
    initial_supply: initial_supply,
    recipient: BigInt(deployer.starknetContract.address),
    owner: owner,
    l2_token_bridge: l2_token_bridge,
  });
}

export async function deployL2RewAaveToken(
  deployer: Account,
  name: string,
  symbol: string,
  decimals: bigint,
  initial_supply: { low: bigint; high: bigint },
  owner: bigint
) {
  let rewAaveTokenImplementation: StarknetContract;
  let proxyFactoryL2: StarknetContractFactory;
  let proxyToken: StarknetContract;
  let proxiedRewAAVE: StarknetContract;
  const rewAaveContractFactory = await starknet.getContractFactory("rewAAVE");
  proxyFactoryL2 = await starknet.getContractFactory("proxy");

  console.log("deploying rewAAVE token proxy ...");
  proxyToken = await proxyFactoryL2.deploy({
    proxy_admin: BigInt(deployer.starknetContract.address),
  });

  console.log("deploying rewAAVE token implementation ...");
  rewAaveTokenImplementation = await rewAaveContractFactory.deploy();

  fs.writeFileSync(
    `deployment/${name}.json`,
    JSON.stringify({
      token: name,
      proxy: proxyToken.address,
      implementation: rewAaveTokenImplementation.address,
    })
  );

  console.log("initializing rewAAVE token proxy...");
  await deployer.invoke(proxyToken, "initialize_proxy", {
    implementation_address: BigInt(rewAaveTokenImplementation.address),
  });

  proxiedRewAAVE = rewAaveContractFactory.getContractAt(proxyToken.address);

  await deployer.invoke(proxiedRewAAVE, "initialize_rewAAVE", {
    name: stringToBigInt(name),
    symbol: stringToBigInt(symbol),
    decimals: decimals,
    initial_supply: initial_supply,
    recipient: BigInt(deployer.starknetContract.address),
    owner: owner,
  });
  return proxyToken;
}

function stringToBigInt(str: string) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return BigInt(parseInt(result, 16));
}
