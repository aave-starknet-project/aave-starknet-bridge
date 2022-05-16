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
 * deploys and initializes static_a_token on L2
 * @param deployer the deployer starknet account
 * @param proxy_admin address of the proxy owner
 */
export async function deployL2Bridge(deployer: Account, proxy_admin: bigint) {
  let proxiedBridge: StarknetContract;
  let bridgeImplementation: StarknetContract;
  let proxyFactoryL2: StarknetContractFactory;
  let proxyBridge: StarknetContract;

  const L2BridgeFactory = await starknet.getContractFactory("bridge");
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
  await deployer.invoke(proxiedBridge, "initialize_bridge", {
    governor_address: proxy_admin,
  });

  return proxiedBridge;
}

/**
 * deploys and initializes static_a_token on L2
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
    bridgeFactory = await ethers.getContractFactory("Bridge", signer);

    proxyFactory = await ethers.getContractFactory(
      "InitializableAdminUpgradeabilityProxy",
      signer
    );
    bridgeProxy = await proxyFactory.deploy();
    await bridgeProxy.deployed();

    bridgeImpl = await bridgeFactory.deploy();
    await bridgeImpl.deployed();

    let ABI = ["function initialize(bytes calldata data)"];
    let iface = new ethers.utils.Interface(ABI);
    const initData = abiCoder.encode(
      ["uint256", "address", "address"],
      [l2BridgeAddress, starknetMessagingAddress, incentivesController]
    );

    let encodedInitializedParams = iface.encodeFunctionData("initialize", [
      initData,
    ]);

    await bridgeProxy["initialize(address,address,bytes)"](
      bridgeImpl.address,
      signer.address,
      encodedInitializedParams
    );

    // await bridgeProxy.upgradeTo(bridgeImpl.address, initData, false);
    let [l1deployer, l3] = await ethers.getSigners();
    bridge = await ethers.getContractAt("Bridge", bridgeProxy.address, l3);

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
