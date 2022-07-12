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
  let bridgeImplHash: string;
  let proxyFactoryL2: StarknetContractFactory;
  let proxyBridge: StarknetContract;

  const L2BridgeFactory = await starknet.getContractFactory("bridge");
  proxyFactoryL2 = await starknet.getContractFactory("proxy");

  console.log("deploying L2 proxy bridge...");
  proxyBridge = await proxyFactoryL2.deploy({
    proxy_admin: proxy_admin,
  });

  bridgeImplHash = await L2BridgeFactory.declare();

  await deployer.invoke(proxyBridge, "set_implementation", {
    implementation_hash: BigInt(bridgeImplHash),
  });

  fs.writeFileSync(
    `deployment/L2Bridge.json`,
    JSON.stringify({
      proxy: proxyBridge.address,
      implementation_hash: bridgeImplHash,
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
 * @param proxyAdmin
 * @param l1Tokens array of aTokens to be approved on l1
 * @param l2Tokens array of static_a_tokens to be approved on l1
 */
export async function deployL1Bridge(
  signer: SignerWithAddress,
  l2BridgeAddress: string,
  starknetMessagingAddress: string,
  incentivesController: string,
  proxyAdmin: string,
  l1Tokens: string[],
  l2Tokens: BigInt[]
) {
  let bridgeFactory: ContractFactory;
  let bridgeImpl: Contract;
  let bridgeProxy: Contract;
  let proxyFactory: ContractFactory;
  let bridge: Contract;

  try {
    bridgeFactory = await ethers.getContractFactory("Bridge", signer);

    proxyFactory = await ethers.getContractFactory(
      "InitializableAdminUpgradeabilityProxy",
      signer
    );
    bridgeProxy = await proxyFactory.deploy();
    await bridgeProxy.deployed();

    bridgeImpl = await bridgeFactory.deploy();
    await bridgeImpl.deployed();

    let ABI = [
      "function initialize(uint256 l2Bridge, address messagingContract, address incentivesController, address[] calldata l1Tokens, uint256[] calldata l2Tokens) ",
    ];
    let iface = new ethers.utils.Interface(ABI);

    let encodedInitializedParams = iface.encodeFunctionData("initialize", [
      l2BridgeAddress,
      starknetMessagingAddress,
      incentivesController,
      l1Tokens,
      l2Tokens,
    ]);

    await bridgeProxy["initialize(address,address,bytes)"](
      bridgeImpl.address,
      proxyAdmin,
      encodedInitializedParams
    );

    bridge = await ethers.getContractAt("Bridge", bridgeProxy.address, signer);

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
