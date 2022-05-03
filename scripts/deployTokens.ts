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
 * @param recipient mints initial supply to recipient
 * @param controller the token controller/owner
 * @param proxy_admin address of the proxy owner
 */
export async function deployETHStaticAToken(
  deployer: Account,
  name: string,
  symbol: string,
  decimals: bigint,
  initial_supply: { low: bigint; high: bigint },
  recipient: bigint,
  controller: bigint,
  proxy_admin: bigint
) {
  let proxiedETHStaticAToken: StarknetContract;
  let tokenImplementation: StarknetContract;
  let proxyFactoryL2: StarknetContractFactory;
  let proxyToken: StarknetContract;

  const L2TokenFactory = await starknet.getContractFactory("ETHstaticAToken");
  proxyFactoryL2 = await starknet.getContractFactory("proxy");

  proxyToken = await proxyFactoryL2.deploy({
    proxy_admin: proxy_admin,
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
    recipient: recipient,
    controller: controller,
  });
}

export async function deployL2RewAaveToken(
  deployer: Account,
  name: string,
  symbol: string,
  decimals: bigint,
  initial_supply: { low: bigint; high: bigint },
  recipient: bigint,
  owner: bigint,
  proxy_admin: bigint
) {
  let rewAaveTokenL2: StarknetContract;
  let proxyFactoryL2: StarknetContractFactory;
  let proxyToken: StarknetContract;
  const rewAaveContractFactory = await starknet.getContractFactory("rewAAVE");
  proxyFactoryL2 = await starknet.getContractFactory("proxy");

  console.log("deploying rewAAVE token proxy on L2...");
  proxyToken = await proxyFactoryL2.deploy({
    proxy_admin: proxy_admin,
  });

  console.log("deploying rewAAVE token implementation on L2...");
  rewAaveTokenL2 = await rewAaveContractFactory.deploy({
    name: stringToBigInt(name),
    symbol: stringToBigInt(symbol),
    decimals: decimals,
    initial_supply: initial_supply,
    recipient: recipient,
    owner: owner,
  });

  fs.writeFileSync(
    `deployment/${name}.json`,
    JSON.stringify({
      token: name,
      proxy: proxyToken.address,
      implementation: rewAaveTokenL2.address,
    })
  );
  console.log("initializing rewAAVE token proxy...");
  await deployer.invoke(proxyToken, "initialize_proxy", {
    implementation_address: BigInt(rewAaveTokenL2.address),
  });

  return rewAaveTokenL2;
}

function stringToBigInt(str: string) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return BigInt(parseInt(result, 16));
}
