import { TRANSPARENT_PROXY_FACTORY_MAINNET } from "./../constants/addresses";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import fs from "fs";
import { Contract, ContractFactory, Signer } from "ethers";
import { starknet, ethers } from "hardhat";
import { getEventTopic } from "../test/utils";

/**
 * deploys and initializes static_a_token on L2
 * @param deployer the deployer starknet account
 * @param proxyAdmin address of the proxy owner
 */
export async function deployL2Bridge(
  deployer: Account,
  proxyAdmin: bigint,
  l2GovRelay: bigint,
  maxFee: number
) {
  let proxiedBridge: StarknetContract;
  let bridgeImplHash: string;
  let proxyFactoryL2: StarknetContractFactory;
  let proxyBridge: StarknetContract;

  const L2BridgeFactory = await starknet.getContractFactory("bridge");
  proxyFactoryL2 = await starknet.getContractFactory("proxy");

  console.log("deploying L2 proxy bridge...");
  proxyBridge = await proxyFactoryL2.deploy({
    proxy_admin: proxyAdmin,
  });

  bridgeImplHash = await deployer.declare(L2BridgeFactory, { maxFee: maxFee });

  await deployer.invoke(
    proxyBridge,
    "set_implementation",
    {
      implementation_hash: BigInt(bridgeImplHash),
    },
    { maxFee: maxFee }
  );
  console.log("updating proxy admin to the l2 governance relay contract");

  await deployer.invoke(
    proxyBridge,
    "change_proxy_admin",
    {
      new_admin: l2GovRelay,
    },
    { maxFee: maxFee }
  );

  fs.writeFileSync(
    `deployment/L2Bridge.json`,
    JSON.stringify({
      proxy: proxyBridge.address,
      implementation_hash: bridgeImplHash,
    })
  );
  proxiedBridge = L2BridgeFactory.getContractAt(proxyBridge.address);

  console.log("initializing L2 bridge...");
  await deployer.invoke(
    proxiedBridge,
    "initialize_bridge",
    {
      governor_address: l2GovRelay,
    },
    { maxFee: maxFee }
  );

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
  let bridge: Contract;

  try {
    bridgeFactory = await ethers.getContractFactory("Bridge", signer);

    console.log("Deploying Bridge contract implementation...");
    bridgeImpl = await bridgeFactory.deploy();
    await bridgeImpl.deployed();

    console.log(
      "To verify Bridge implementation contract: npx hardhat verify --network mainnet ",
      bridgeImpl.address
    );

    let ABI = [
      "function initialize(uint256 l2Bridge, address messagingContract, address incentivesController, address[] calldata l1Tokens, uint256[] calldata l2Tokens) ",
    ];
    let iface = new ethers.utils.Interface(ABI);

    let encodedInitializedParams = iface.encodeFunctionData("initialize", [
      BigInt(l2BridgeAddress),
      starknetMessagingAddress,
      incentivesController,
      l1Tokens,
      l2Tokens,
    ]);

    const proxyFactory = await ethers.getContractAt(
      "ITransparentProxyFactory",
      TRANSPARENT_PROXY_FACTORY_MAINNET,
      signer
    );

    console.log("Creating Bridge Proxy...");
    const tx = await proxyFactory.create(
      bridgeImpl.address,
      proxyAdmin,
      encodedInitializedParams
    );

    const receipt = await tx.wait();
    const proxyAddress = getEventTopic(receipt, "ProxyCreated", 0);

    console.log("Bridge proxy created at:", proxyAddress);
    console.log(
      "To verify deployed Bridge proxy contract: npx hardhat verify --network mainnet",
      proxyAddress
    );
    bridge = await ethers.getContractAt("Bridge", proxyAddress, signer);

    fs.writeFileSync(
      "deployment/L1Bridge.json",
      JSON.stringify({
        implementation: bridgeImpl.address,
        proxy: proxyAddress,
        starknetMessagingAddress: starknetMessagingAddress,
        l2Bridge: l2BridgeAddress,
      })
    );

    return bridge;
  } catch (error) {
    console.log(error);
  }
}

/**
 * deploys and initializes the l2 governance relay
 * @param l1GovRelay address

 */
export async function deployL2GovernanceRelay(l1GovRelay: string) {
  let l2GovRelayFactory: StarknetContractFactory;
  let l2GovRelay: StarknetContract;

  l2GovRelayFactory = await starknet.getContractFactory("l2_governance_relay");

  l2GovRelay = await l2GovRelayFactory.deploy({
    l1_governance_relay: BigInt(l1GovRelay),
  });

  fs.writeFileSync(
    "deployment/L2GovRelay.json",
    JSON.stringify({
      l2GovRelay: l2GovRelay.address,
    })
  );
  return l2GovRelay;
}

/**
 * deploys and initializes the L1 Forwarder Starknet
 * @param signer
 * @param starknetMessagingContract address
 * @param l2GovRelay address
 */
export async function deployL1ForwarderStarknet(
  signer: SignerWithAddress,
  starknetMessagingContract: string,
  l2GovRelay: string
) {
  let l1ForwarderStarknetFactory: ContractFactory;
  let l1ForwarderStarknet: Contract;

  l1ForwarderStarknetFactory = await ethers.getContractFactory(
    "CrosschainForwarderStarknet",
    signer
  );

  console.log("Deploying l1ForwarderStarknet contract ...");
  l1ForwarderStarknet = await l1ForwarderStarknetFactory.deploy(
    starknetMessagingContract,
    l2GovRelay
  );

  fs.writeFileSync(
    "deployment/L1ForwarderStarknet.json",
    JSON.stringify({
      l1ForwarderStarknet: l1ForwarderStarknet.address,
    })
  );
  return l1ForwarderStarknet;
}

/**
 * deploys a given spell contract
 */
export async function deploySpellContract(path: string) {
  let spell: StarknetContract;
  let spellFactory: StarknetContractFactory;

  spellFactory = await starknet.getContractFactory(path);

  spell = await spellFactory.deploy();

  fs.writeFileSync(
    `deployment/spells/${path}.json`,
    JSON.stringify({
      spellContract: spell.address,
    })
  );

  return spell;
}
