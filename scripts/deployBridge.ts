import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import fs from "fs";
import { Contract, ContractFactory } from "ethers";
import hre, { starknet, network, ethers } from "hardhat";

/**
 * deploys and initializes ETHStaticAToken on L2
 * @param deployer the deployer starknet account
 * @param proxy_admin address of the proxy owner
 */
export async function deployL2Bridge(deployer: Account, proxy_admin: bigint) {
  let proxiedBridge: StarknetContract;
  let bridgeImplementation: StarknetContract;
  let proxyFactoryL2: StarknetContractFactory;
  let proxyBridge: StarknetContract;

  const L2BridgeFactory = await starknet.getContractFactory("token_bridge");
  proxyFactoryL2 = await starknet.getContractFactory("proxy");

  console.log("deploying L2 proxy bridge...");
  proxyBridge = await proxyFactoryL2.deploy({
    proxy_admin: proxy_admin,
  });

  bridgeImplementation = await L2BridgeFactory.deploy();

  await deployer.invoke(proxyBridge, "initialize_proxy", {
    implementation_address: BigInt(bridgeImplementation.address),
  });

  fs.writeFileSync(
    `deployment/L2Bridge.json`,
    JSON.stringify({
      proxy: proxyBridge.address,
      implementation: bridgeImplementation.address,
    })
  );
  proxiedBridge = L2BridgeFactory.getContractAt(proxyBridge.address);

  console.log("initializing L2 bridge...");
  await deployer.invoke(proxiedBridge, "initialize_token_bridge", {
    governor_address: proxy_admin,
  });

  return proxiedBridge;
}

/**
 * deploys and initializes ETHStaticAToken on L2
 * @param signer the deployer starknet account
 * @param  proxyTokenBridgeL2 address of the proxy bridge on L2
 * @param starknetMessagingAddress
 */
export async function deployL1Bridge(
  signer: SignerWithAddress,
  proxyTokenBridgeL2: string,
  starknetMessagingAddress: string,
  incentivesController: string
) {
  let tokenBridgeL1: ContractFactory;
  let tokenBridgeL1Implementation: Contract;
  let tokenBridgeL1Proxy: Contract;
  let proxyBridgeFactory: ContractFactory;
  let proxiedBridge: Contract;

  try {
    const abiCoder = new ethers.utils.AbiCoder();
    tokenBridgeL1 = await ethers.getContractFactory("TokenBridge", signer);
    tokenBridgeL1Implementation = await tokenBridgeL1.deploy();
    await tokenBridgeL1Implementation.deployed();

    proxyBridgeFactory = await ethers.getContractFactory("ProxyBridge", signer);
    tokenBridgeL1Proxy = await proxyBridgeFactory.deploy();
    await tokenBridgeL1Proxy.deployed();

    const initData = abiCoder.encode(
      ["address", "uint256", "address", "address"],
      [
        "0x0000000000000000000000000000000000000000",
        proxyTokenBridgeL2,
        starknetMessagingAddress,
        incentivesController,
      ]
    );
    await tokenBridgeL1Proxy.addImplementation(
      tokenBridgeL1Implementation.address,
      initData,
      false
    );
    await tokenBridgeL1Proxy.upgradeTo(
      tokenBridgeL1Implementation.address,
      initData,
      false
    );

    proxiedBridge = await ethers.getContractAt(
      "TokenBridge",
      tokenBridgeL1Proxy.address,
      signer
    );

    const test = await proxiedBridge.incentivesController();
    console.log(test, "incentive controller");

    fs.writeFileSync(
      "deployment/L1Bridge.json",
      JSON.stringify({
        implementation: tokenBridgeL1Implementation.address,
        proxy: tokenBridgeL1Proxy.address,
        starknetMessagingAddress: starknetMessagingAddress,
        proxyTokenBridgeL2: proxyTokenBridgeL2,
      })
    );
  } catch (error) {
    console.log(error);
  }
}
