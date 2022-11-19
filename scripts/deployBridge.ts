import { TRANSPARENT_PROXY_FACTORY_MAINNET } from "./addresses";
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
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "./.env") });

const { STARKNET_DEPLOYMENT_TOKEN } = process.env;

/**
 * deploys and initializes static_a_token on L2
 * @param deployer the deployer starknet account
 * @param proxyAdmin address of the proxy owner
 * @param l2GovRelay address of L2 governance relayer
 * @param maxFee maximal fee
 */
export async function deployL2Bridge(
  deployer: Account,
  proxyAdmin: bigint,
  l2GovRelay: bigint,
  maxFee: number
) {
  console.log("Deploying L2 bridge...");

  let bridge: StarknetContract;
  let bridgeProxy: StarknetContract;

  const L2BridgeFactory = await starknet.getContractFactory("bridge");
  const L2ProxyFactory = await starknet.getContractFactory("proxy");

  bridgeProxy = await L2ProxyFactory.deploy(
    {
      proxy_admin: proxyAdmin,
    },
    {
      token: STARKNET_DEPLOYMENT_TOKEN,
    }
  );
  console.log(
    "L2 proxy (for bridge) is deployed at address: ",
    bridgeProxy.address
  );

  const bridgeImplHash = await deployer.declare(L2BridgeFactory, {
    maxFee,
    token: STARKNET_DEPLOYMENT_TOKEN,
  });
  console.log("L2 bridge class is declared at hash: ", bridgeImplHash);

  fs.writeFileSync(
    `deployment/L2Bridge.json`,
    JSON.stringify({
      proxy: bridgeProxy.address,
      implementation_hash: bridgeImplHash,
    })
  );

  await deployer.invoke(
    bridgeProxy,
    "set_implementation",
    {
      implementation_hash: BigInt(bridgeImplHash),
    },
    { maxFee }
  );

  await deployer.invoke(
    bridgeProxy,
    "change_proxy_admin",
    {
      new_admin: l2GovRelay,
    },
    { maxFee }
  );

  console.log(
    "L2 bridge is deployed behind a proxy with l2 governance relay as proxy admin."
  );

  bridge = L2BridgeFactory.getContractAt(bridgeProxy.address);

  return bridge;
}

/**
 * deploys and initializes static_a_token on L2
 * @param signer the deployer starknet account
 * @param  l2BridgeAddress address of the proxy bridge on L2
 * @param starknetMessagingAddress
 * @param proxyAdmin
 * @param l1Tokens array of aTokens to be approved on l1
 * @param l2Tokens array of static_a_tokens to be approved on l1
 * @param ceilings array of ceilings for each pair (l1token, l2token)
 * @param proxyFactoryAddress address of factory to deploy proxies
 */
export async function deployL1Bridge(
  signer: SignerWithAddress,
  l2BridgeAddress: string,
  starknetMessagingAddress: string,
  incentivesController: string,
  proxyAdmin: string,
  l1Tokens: string[],
  l2Tokens: BigInt[],
  ceilings: BigInt[],
  proxyFactoryAddress: string
) {
  let bridgeFactory: ContractFactory;
  let bridgeImpl: Contract;
  let bridge: Contract;

  try {
    console.log("Deploying L1 bridge...");

    bridgeFactory = await ethers.getContractFactory("Bridge", signer);
    bridgeImpl = await bridgeFactory.deploy();
    await bridgeImpl.deployed();

    console.log(
      "L1 bridge implementation contract is deployed at address: ",
      bridgeImpl.address
    );
    console.log(
      "To verify L1 bridge implementation contract: npx hardhat verify --network mainnet ",
      bridgeImpl.address
    );

    // let ABI = [
    //   "function initialize(uint256 l2Bridge, address messagingContract, address incentivesController, address[] calldata l1Tokens, uint256[] calldata l2Tokens, uint256 calldata ceilings) ",
    // ];
    // let iface = new ethers.utils.Interface(ABI);
    // let encodedInitializedParams = iface.encodeFunctionData("initialize", [
    //   BigInt(l2BridgeAddress),
    //   starknetMessagingAddress,
    //   incentivesController,
    //   l1Tokens,
    //   l2Tokens,
    //   ceilings,
    // ]);
    let encodedInitializedParams = [] as any;

    const proxyFactory = await ethers.getContractAt(
      "ITransparentProxyFactory",
      proxyFactoryAddress,
      signer
    );

    const tx = await proxyFactory.create(
      bridgeImpl.address,
      proxyAdmin,
      encodedInitializedParams
    );

    const receipt = await tx.wait();
    const proxyAddress = getEventTopic(receipt, "ProxyCreated", 0);

    console.log(
      "L1 proxy contract in front of L1 bridge is deployed at address: ",
      proxyAddress
    );
    console.log(
      "To verify proxy contract: npx hardhat verify --network mainnet",
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
export async function deployL2GovernanceRelay(
  l1GovRelay: string,
  deployer: Account,
  maxFee: number
) {
  console.log("Deploying L2 governance relay...");

  let l2GovRelayFactory: StarknetContractFactory;
  let l2GovRelay: StarknetContract;

  let l2GovRelayProxy: StarknetContract;

  const l2ProxyFactory = await starknet.getContractFactory("proxy");

  l2GovRelayProxy = await l2ProxyFactory.deploy(
    {
      proxy_admin: BigInt(deployer.starknetContract.address),
    },
    {
      token: STARKNET_DEPLOYMENT_TOKEN,
    }
  );

  l2GovRelayFactory = await starknet.getContractFactory("l2_governance_relay");

  const l2GovImplHash = await deployer.declare(l2GovRelayFactory, {
    maxFee,
    token: STARKNET_DEPLOYMENT_TOKEN,
  });

  console.log("L2 governance relay class hash declared at: ", l2GovImplHash);

  await deployer.invoke(l2GovRelayProxy, "set_implementation", {
    implementation_hash: BigInt(l2GovImplHash),
  });

  l2GovRelay = l2GovRelayFactory.getContractAt(l2GovRelayProxy.address);

  await deployer.invoke(l2GovRelay, "initialize_governance_relay", {
    l1_governance_relay: BigInt(l1GovRelay),
  });

  await deployer.invoke(
    l2GovRelayProxy,
    "change_proxy_admin",
    {
      new_admin: BigInt(l2GovRelay.address),
    },
    { maxFee }
  );

  fs.writeFileSync(
    "deployment/L2GovRelay.json",
    JSON.stringify({
      l2GovRelayProxy: l2GovRelay.address,
    })
  );

  console.log(
    "L2 governance relay is deployed at address: ",
    l2GovRelay.address
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
  console.log("Deploying L1 forwarder starknet...");

  let l1ForwarderStarknetFactory: ContractFactory;
  let l1ForwarderStarknet: Contract;

  l1ForwarderStarknetFactory = await ethers.getContractFactory(
    "CrosschainForwarderStarknet",
    signer
  );

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

  console.log(
    "L1 forwarder starknet is deployed at address: ",
    l1ForwarderStarknet.address
  );
  console.log(
    "To verify L1 forwarder starknet contract: npx hardhat verify --network mainnet ",
    l1ForwarderStarknet.address
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

  spell = await spellFactory.deploy(undefined, {
    token: STARKNET_DEPLOYMENT_TOKEN,
  });

  fs.writeFileSync(
    `deployment/spells/${path}.json`,
    JSON.stringify({
      spellContract: spell.address,
    })
  );

  return spell;
}
