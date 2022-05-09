import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import fs from "fs";
import { Contract, ContractFactory } from "ethers";
import { starknet, ethers } from "hardhat";

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
 * @param  l2BridgeAddress address of the proxy bridge on L2
 * @param starknetMessagingAddress
 */
export async function deployL1Bridge(
  signer: SignerWithAddress,
  l2BridgeAddress: string,
  starknetMessagingAddress: string,
  incentivesController: string
) {
  let bridgeFactory: ContractFactory;
  let bridgeImpl: Contract;
  let bridgeProxy: Contract;
  let proxyFactory: ContractFactory;
  let bridge: Contract;

  try {
    const abiCoder = new ethers.utils.AbiCoder();
    bridgeFactory = await ethers.getContractFactory("TokenBridge", signer);
    bridgeImpl = await bridgeFactory.deploy();
    await bridgeImpl.deployed();

    proxyFactory = await ethers.getContractFactory("ProxyBridge", signer);
    bridgeProxy = await proxyFactory.deploy();
    await bridgeProxy.deployed();

    const initData = abiCoder.encode(
      ["address", "uint256", "address", "address"],
      [
        "0x0000000000000000000000000000000000000000",
        l2BridgeAddress,
        starknetMessagingAddress,
        incentivesController,
      ]
    );
    await bridgeProxy.addImplementation(
      bridgeImpl.address,
      initData,
      false
    );
    await bridgeProxy.upgradeTo(
      bridgeImpl.address,
      initData,
      false
    );

    bridge = await ethers.getContractAt(
      "TokenBridge",
      bridgeProxy.address,
      signer
    );

    fs.writeFileSync(
      "deployment/L1Bridge.json",
      JSON.stringify({
        implementation: bridgeImpl.address,
        proxy: bridgeProxy.address,
        starknetMessagingAddress: starknetMessagingAddress,
        l2Bridge: l2BridgeAddress,
      })
    );

    return bridge;
  } catch (error) {
    console.log(error);
  }
}
