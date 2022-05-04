import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractFactory, providers } from "ethers";
import hre, { starknet, network, ethers } from "hardhat";
import {
  StarknetContractFactory,
  StarknetContract,
  HttpNetworkConfig,
  Account,
} from "hardhat/types";

import { TIMEOUT } from "./constants";
import { initStaticATokenProxy } from "./helpers";

const MAX_UINT256 = hre.ethers.constants.MaxInt256;

/**
 * Receives a hex address, converts it to bigint, converts it back to hex.
 * This is done to strip leading zeros.
 * @param address a hex string representation of an address
 * @returns an adapted hex string representation of the address
 */
function adaptAddress(address: string) {
  return "0x" + BigInt(address).toString(16);
}

/**
 * Expects address equality after adapting them.
 * @param actual
 * @param expected
 */
function expectAddressEquality(actual: string, expected: string) {
  expect(adaptAddress(actual)).to.equal(adaptAddress(expected));
}

const LENDING_POOL = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";
const INCENTIVES_CONTROLLER = "0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5";
const A_DAI = "0x028171bCA77440897B824Ca71D1c56caC55b68A3";
const A_USDC = "0xBcca60bB61934080951369a648Fb03DF4F96263C";

const STKAAVE_WHALE = "0x32b61bb22cbe4834bc3e73dce85280037d944a4d";
const DAI_WHALE = "0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0";
const USDC_WHALE = "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503";

describe("TokenBridge", async function () {
  this.timeout(TIMEOUT);

  let proxyAdmin: SignerWithAddress;
  let l1user: SignerWithAddress;
  let l2user: Account;
  let signer: SignerWithAddress;
  let daiWhale: providers.JsonRpcSigner;
  let usdcWhale: providers.JsonRpcSigner;
  let stkaaveWhale: providers.JsonRpcSigner;
  const networkUrl: string = (network.config as HttpNetworkConfig).url;
  console.log(networkUrl);
  const abiCoder = new ethers.utils.AbiCoder();
  let blockNumberDai: number;
  let blockNumberUsdc: number;
  let l1tokenDaiInitialBalance: number;
  let l1tokenUsdcInitialBalance: number;
  let txDai: any;
  let txUsdc: any;
  // L2
  let L2TokenFactory: StarknetContractFactory;
  let l2tokenDai: StarknetContract;
  let l2tokenUsdc: StarknetContract;
  let proxyL2TokenDai: StarknetContract;
  let proxyL2TokenUsdc: StarknetContract;
  let proxiedL2TokenDai: StarknetContract;
  let proxiedL2TokenUsdc: StarknetContract;
  let TokenBridgeL2: StarknetContractFactory;
  let tokenBridgeL2: StarknetContract;
  let proxiedRewAaveTokenL2: StarknetContract;
  let ProxyFactoryL2: StarknetContractFactory;
  let proxyTokenBridgeL2: StarknetContract;
  let proxiedTokenBridgeL2: StarknetContract;
  let rewAaveTokenImplementation: StarknetContract;
  let proxyRewAAVEToken: StarknetContract;
  // L1
  let mockStarknetMessagingAddress: string;
  let L1StaticATokenFactory: ContractFactory;
  let l1tokenDaiImplementation: Contract;
  let l1tokenDaiProxy: Contract;
  let l1tokenDai: Contract;
  let l1tokenUsdcImplementation: Contract;
  let l1tokenUsdcProxy: Contract;
  let l1tokenUsdc: Contract;
  let TokenBridgeL1: ContractFactory;
  let tokenBridgeL1Implementation: Contract;
  let tokenBridgeL1Proxy: Contract;
  let tokenBridgeL1Proxied: Contract;
  let ProxyBridgeFactory: ContractFactory;
  let ProxyTokenFactory: ContractFactory;
  let rewAaveTokenL1: Contract;
  let pool: Contract;
  let incentives: Contract;
  let aDai: Contract;
  let dai: Contract;
  let aUsdc: Contract;
  let usdc: Contract;

  before(async function () {
    // load L1 <--> L2 messaging contract

    mockStarknetMessagingAddress = (
      await starknet.devnet.loadL1MessagingContract(networkUrl)
    ).address;

    // L2 deployments

    l2user = await starknet.deployAccount("OpenZeppelin");

    TokenBridgeL2 = await starknet.getContractFactory("rewaave/token_bridge");
    tokenBridgeL2 = await TokenBridgeL2.deploy();

    ProxyFactoryL2 = await starknet.getContractFactory("proxy");
    proxyTokenBridgeL2 = await ProxyFactoryL2.deploy({
      proxy_admin: BigInt(l2user.starknetContract.address),
    });
    proxyL2TokenDai = await ProxyFactoryL2.deploy({
      proxy_admin: BigInt(l2user.starknetContract.address),
    });
    proxyL2TokenUsdc = await ProxyFactoryL2.deploy({
      proxy_admin: BigInt(l2user.starknetContract.address),
    });

    const rewAaveContractFactory = await starknet.getContractFactory("rewAAVE");

    rewAaveTokenImplementation = await rewAaveContractFactory.deploy();
    proxyRewAAVEToken = await ProxyFactoryL2.deploy({
      proxy_admin: BigInt(l2user.starknetContract.address),
    });

    await l2user.invoke(proxyRewAAVEToken, "initialize_proxy", {
      implementation_address: BigInt(rewAaveTokenImplementation.address),
    });

    proxiedRewAaveTokenL2 = rewAaveContractFactory.getContractAt(
      proxyRewAAVEToken.address
    );

    await l2user.invoke(proxiedRewAaveTokenL2, "initialize_rewAAVE", {
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: { high: 0, low: 1000 },
      recipient: BigInt(l2user.starknetContract.address),
      owner: BigInt(proxyTokenBridgeL2.address),
    });

    L2TokenFactory = await starknet.getContractFactory("ETHstaticAToken");
    l2tokenDai = await L2TokenFactory.deploy();
    l2tokenUsdc = await L2TokenFactory.deploy();

    // L1 deployments

    [signer, l1user, proxyAdmin] = await ethers.getSigners();

    pool = await ethers.getContractAt("LendingPool", LENDING_POOL);
    incentives = await ethers.getContractAt(
      "IncentivesControllerMock",
      INCENTIVES_CONTROLLER
    );
    rewAaveTokenL1 = await ethers.getContractAt(
      "ERC20Mock",
      await incentives.REWARD_TOKEN()
    );

    aDai = await ethers.getContractAt("AToken", A_DAI);
    dai = await ethers.getContractAt(
      "ERC20Mock",
      await aDai.UNDERLYING_ASSET_ADDRESS()
    );
    aUsdc = await ethers.getContractAt("AToken", A_USDC);
    usdc = await ethers.getContractAt(
      "ERC20Mock",
      await aUsdc.UNDERLYING_ASSET_ADDRESS()
    );

    const provider = new ethers.providers.JsonRpcProvider(networkUrl);
    // await provider.send("hardhat_impersonateAccount", [DAI_WHALE]);
    daiWhale = provider.getSigner(DAI_WHALE);
    // await provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    usdcWhale = provider.getSigner(USDC_WHALE);
    // await provider.send("hardhat_impersonateAccount", [STKAAVE_WHALE]);
    stkaaveWhale = provider.getSigner(STKAAVE_WHALE);

    await signer.sendTransaction({
      from: signer.address,
      to: daiWhale._address,
      value: ethers.utils.parseEther("1.0"),
    });
    await signer.sendTransaction({
      from: signer.address,
      to: usdcWhale._address,
      value: ethers.utils.parseEther("1.0"),
    });
    await signer.sendTransaction({
      from: signer.address,
      to: stkaaveWhale._address,
      value: ethers.utils.parseEther("1.0"),
    });

    TokenBridgeL1 = await ethers.getContractFactory("TokenBridge", signer);
    tokenBridgeL1Implementation = await TokenBridgeL1.deploy();
    await tokenBridgeL1Implementation.deployed();

    ProxyBridgeFactory = await ethers.getContractFactory("ProxyBridge", signer);
    tokenBridgeL1Proxy = await ProxyBridgeFactory.deploy();
    await tokenBridgeL1Proxy.deployed();

    L1StaticATokenFactory = await ethers.getContractFactory(
      "StaticATokenLM",
      signer
    );
    ProxyTokenFactory = await ethers.getContractFactory("ProxyToken", signer);

    l1tokenDaiImplementation = await L1StaticATokenFactory.deploy();
    l1tokenDaiProxy = await ProxyTokenFactory.deploy(proxyAdmin.address);

    l1tokenUsdcImplementation = await L1StaticATokenFactory.deploy();
    l1tokenUsdcProxy = await ProxyTokenFactory.deploy(proxyAdmin.address);
  });

  it("set L2 implementation contracts", async () => {
    {
      await l2user.invoke(proxyL2TokenDai, "initialize_proxy", {
        implementation_address: BigInt(l2tokenDai.address),
      });
      const { implementation } = await proxyL2TokenDai.call(
        "get_implementation",
        {}
      );
      expect(implementation).to.equal(BigInt(l2tokenDai.address));
      proxiedL2TokenDai = L2TokenFactory.getContractAt(proxyL2TokenDai.address);
    }

    {
      await l2user.invoke(proxyL2TokenUsdc, "initialize_proxy", {
        implementation_address: BigInt(l2tokenUsdc.address),
      });
      const { implementation } = await proxyL2TokenUsdc.call(
        "get_implementation",
        {}
      );
      expect(implementation).to.equal(BigInt(l2tokenUsdc.address));
      proxiedL2TokenUsdc = L2TokenFactory.getContractAt(
        proxyL2TokenUsdc.address
      );
    }

    {
      await l2user.invoke(proxyTokenBridgeL2, "initialize_proxy", {
        implementation_address: BigInt(tokenBridgeL2.address),
      });
      const { implementation } = await proxyTokenBridgeL2.call(
        "get_implementation",
        {}
      );
      expect(implementation).to.equal(BigInt(tokenBridgeL2.address));
      proxiedTokenBridgeL2 = TokenBridgeL2.getContractAt(
        proxyTokenBridgeL2.address
      );
    }
  });

  it("initialize L2 ETHStaticATokens", async () => {
    await l2user.invoke(proxiedL2TokenDai, "initialize_ETHstaticAToken", {
      name: 1234n,
      symbol: 123n,
      decimals: 18n,
      initial_supply: { high: 0n, low: 1000n },
      recipient: BigInt(proxyTokenBridgeL2.address),
      controller: BigInt(proxyTokenBridgeL2.address),
    });

    {
      const { name } = await proxiedL2TokenDai.call("name");
      expect(name).to.equal(1234n);
      const { symbol } = await proxiedL2TokenDai.call("symbol");
      expect(symbol).to.equal(123n);
      const { decimals } = await proxiedL2TokenDai.call("decimals");
      expect(decimals).to.equal(18n);
    }

    await l2user.invoke(proxiedL2TokenUsdc, "initialize_ETHstaticAToken", {
      name: 4321n,
      symbol: 321n,
      decimals: 18n,
      initial_supply: { high: 0n, low: 1000n },
      recipient: BigInt(proxyTokenBridgeL2.address),
      controller: BigInt(proxyTokenBridgeL2.address),
    });

    {
      const { name } = await proxiedL2TokenUsdc.call("name");
      expect(name).to.equal(4321n);
      const { symbol } = await proxiedL2TokenUsdc.call("symbol");
      expect(symbol).to.equal(321n);
      const { decimals } = await proxiedL2TokenUsdc.call("decimals");
      expect(decimals).to.equal(18n);
    }
  });

  it("set L1 token bridge as implementation contract", async () => {
    const initData = abiCoder.encode(
      ["address", "uint256", "address", "address"],
      [
        "0x0000000000000000000000000000000000000000",
        proxyTokenBridgeL2.address,
        mockStarknetMessagingAddress,
        rewAaveTokenL1.address,
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
    expect(await tokenBridgeL1Proxy.implementation()).to.eq(
      tokenBridgeL1Implementation.address
    );
    tokenBridgeL1Proxied = await ethers.getContractAt(
      "TokenBridge",
      tokenBridgeL1Proxy.address,
      signer
    );
    expect(await tokenBridgeL1Proxied.messagingContract()).to.eq(
      mockStarknetMessagingAddress
    );
    expect(await tokenBridgeL1Proxied.rewardToken()).to.eq(
      rewAaveTokenL1.address
    );
  });

  it("initialize StaticATokenLM tokens", async () => {
    const daiInitArgs = [
      pool.address,
      aDai.address,
      "Wrapped aDAI",
      "waaDAI",
      tokenBridgeL1Proxy.address,
    ];
    l1tokenDai = await initStaticATokenProxy(
      l1tokenDaiImplementation.address,
      l1tokenDaiProxy,
      daiInitArgs
    );
    expect(await l1tokenDai.isImplementation()).to.be.false;
    expect(await l1tokenDaiImplementation.isImplementation()).to.be.true;
    const usdcInitArgs = [
      pool.address,
      aUsdc.address,
      "Wrapped aUSDC",
      "waaUSDC",
      tokenBridgeL1Proxy.address,
    ];
    l1tokenUsdc = await initStaticATokenProxy(
      l1tokenUsdcImplementation.address,
      l1tokenUsdcProxy,
      usdcInitArgs
    );
    expect(await l1tokenUsdc.isImplementation()).to.be.false;
    expect(await l1tokenUsdcImplementation.isImplementation()).to.be.true;

    expect(await l1tokenDai.INCENTIVES_CONTROLLER()).to.eq(
      INCENTIVES_CONTROLLER
    );
    expect(await l1tokenDai.LENDING_POOL()).to.eq(LENDING_POOL);
    expect(await l1tokenDai.ATOKEN()).to.eq(A_DAI);
    expect(await l1tokenDai.ASSET()).to.eq(
      await aDai.UNDERLYING_ASSET_ADDRESS()
    );
    expect(await l1tokenDai.REWARD_TOKEN()).to.eq(rewAaveTokenL1.address);
  });

  it("l1user receives tokens and converts them to staticATokens", async () => {
    // l1user receives tokens
    await dai.connect(daiWhale).transfer(l1user.address, 1000);
    await usdc.connect(usdcWhale).transfer(l1user.address, 1000);
    await rewAaveTokenL1.connect(stkaaveWhale).transfer(signer.address, 1000);
    // l1user deposits dai and usdc and gets corresponding staticATokens
    await dai.connect(l1user).approve(l1tokenDai.address, MAX_UINT256);
    await l1tokenDai.connect(l1user).deposit(l1user.address, 1000, 0, true);
    for (let i = 0; i < 5; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    await usdc.connect(l1user).approve(l1tokenUsdc.address, MAX_UINT256);
    await l1tokenUsdc.connect(l1user).deposit(l1user.address, 1000, 0, true);
  });

  it("initialize the bridge on L1 and L2", async () => {
    // map L2 tokens to L1 tokens on L1 bridge
    await tokenBridgeL1Proxied.approveBridge(
      l1tokenDai.address,
      proxiedL2TokenDai.address
    );
    await tokenBridgeL1Proxied.approveBridge(
      l1tokenUsdc.address,
      proxiedL2TokenUsdc.address
    );

    // set L1 token bridge from L2 bridge
    await l2user.invoke(proxiedTokenBridgeL2, "initialize_token_bridge", {
      governor_address: BigInt(l2user.starknetContract.address),
    });
    await l2user.invoke(proxiedTokenBridgeL2, "set_l1_token_bridge", {
      l1_bridge_address: BigInt(tokenBridgeL1Proxied.address),
    });
    const { res: retrievedBridgeAddress } = await proxiedTokenBridgeL2.call(
      "get_l1_token_bridge",
      {}
    );
    expect(retrievedBridgeAddress).to.equal(
      BigInt(tokenBridgeL1Proxied.address)
    );

    // map L1 tokens to L2 tokens on L2 bridge
    await l2user.invoke(proxiedTokenBridgeL2, "set_reward_token", {
      reward_token: BigInt(proxiedRewAaveTokenL2.address),
    });
    await l2user.invoke(proxiedTokenBridgeL2, "approve_bridge", {
      l1_token: BigInt(l1tokenDai.address),
      l2_token: BigInt(proxiedL2TokenDai.address),
    });
    await l2user.invoke(proxiedTokenBridgeL2, "approve_bridge", {
      l1_token: BigInt(l1tokenUsdc.address),
      l2_token: BigInt(proxiedL2TokenUsdc.address),
    });
  });

  it("L1 user sends tokens A and tokens B to L2 user", async () => {
    // approve L1 bridge with max uint256 amount
    await l1tokenDai
      .connect(l1user)
      .approve(tokenBridgeL1Proxied.address, MAX_UINT256);
    await l1tokenUsdc
      .connect(l1user)
      .approve(tokenBridgeL1Proxied.address, MAX_UINT256);

    // l1user deposits 30 tokens A and 50 tokens B on L1 for l2user on L2
    l1tokenDaiInitialBalance = await l1tokenDai.balanceOf(l1user.address);
    l1tokenUsdcInitialBalance = await l1tokenUsdc.balanceOf(l1user.address);
    txDai = await tokenBridgeL1Proxied
      .connect(l1user)
      .deposit(l1tokenDai.address, BigInt(l2user.starknetContract.address), 30);
    blockNumberDai = txDai.blockNumber;
    txUsdc = await tokenBridgeL1Proxied
      .connect(l1user)
      .deposit(
        l1tokenUsdc.address,
        BigInt(l2user.starknetContract.address),
        40
      );
    blockNumberUsdc = txUsdc.blockNumber;
    expect(await l1tokenDai.balanceOf(l1user.address)).to.equal(
      l1tokenDaiInitialBalance - 30
    );
    expect(await l1tokenUsdc.balanceOf(l1user.address)).to.equal(
      l1tokenUsdcInitialBalance - 40
    );
    expect(await l1tokenDai.balanceOf(tokenBridgeL1Proxied.address)).to.equal(
      30
    );
    expect(await l1tokenUsdc.balanceOf(tokenBridgeL1Proxied.address)).to.equal(
      40
    );

    // flush L1 messages to be consumed by L2
    expect(
      await proxiedL2TokenDai.call("balanceOf", {
        account: BigInt(l2user.starknetContract.address),
      })
    ).to.deep.equal({ balance: { high: 0n, low: 0n } });
    expect(
      await proxiedL2TokenUsdc.call("balanceOf", {
        account: BigInt(l2user.starknetContract.address),
      })
    ).to.deep.equal({ balance: { high: 0n, low: 0n } });
    expect(await proxiedL2TokenDai.call("get_last_update", {})).to.deep.equal({
      block_number: 0n,
    });
    expect(await proxiedL2TokenUsdc.call("get_last_update", {})).to.deep.equal({
      block_number: 0n,
    });
    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(4);
    expectAddressEquality(
      flushL1Messages[0].args.from_address,
      tokenBridgeL1Proxied.address
    );
    expectAddressEquality(
      flushL1Messages[0].args.to_address,
      proxiedTokenBridgeL2.address
    );
    expectAddressEquality(
      flushL1Messages[0].address,
      mockStarknetMessagingAddress
    );
    expectAddressEquality(
      flushL1Messages[1].args.from_address,
      tokenBridgeL1Proxied.address
    );
    expectAddressEquality(
      flushL1Messages[1].args.to_address,
      proxiedTokenBridgeL2.address
    );
    expectAddressEquality(
      flushL1Messages[1].address,
      mockStarknetMessagingAddress
    );

    // check balance and last update of L2 tokens
    expect(
      await proxiedL2TokenDai.call("balanceOf", {
        account: BigInt(l2user.starknetContract.address),
      })
    ).to.deep.equal({ balance: { high: 0n, low: 30n } });
    expect(
      await proxiedL2TokenUsdc.call("balanceOf", {
        account: BigInt(l2user.starknetContract.address),
      })
    ).to.deep.equal({ balance: { high: 0n, low: 40n } });
    expect(await proxiedL2TokenDai.call("get_last_update", {})).to.deep.equal({
      block_number: BigInt(blockNumberDai),
    });
    expect(await proxiedL2TokenUsdc.call("get_last_update", {})).to.deep.equal({
      block_number: BigInt(blockNumberUsdc),
    });
  });

  it("L2 user sends back tokens A and tokens B to L1 user", async () => {
    // approve L2 bridge with given amount
    await l2user.invoke(proxiedL2TokenDai, "approve", {
      spender: BigInt(proxiedL2TokenDai.address),
      amount: { high: 0n, low: 20n },
    });
    await l2user.invoke(proxiedL2TokenUsdc, "approve", {
      spender: BigInt(proxiedL2TokenUsdc.address),
      amount: { high: 0n, low: 25n },
    });

    // withdraw some tokens from L2
    await l2user.invoke(proxiedTokenBridgeL2, "initiate_withdraw", {
      l2_token: BigInt(proxiedL2TokenDai.address),
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0n, low: 20n },
    });
    await l2user.invoke(proxiedTokenBridgeL2, "initiate_withdraw", {
      l2_token: BigInt(proxiedL2TokenUsdc.address),
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0n, low: 25n },
    });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(2);

    // actually withdraw tokens
    txDai = await tokenBridgeL1Proxied
      .connect(l1user)
      .withdraw(
        l1tokenDai.address,
        l2user.starknetContract.address,
        l1user.address,
        20
      );
    blockNumberDai = txDai.blockNumber;
    txUsdc = await tokenBridgeL1Proxied
      .connect(l1user)
      .withdraw(
        l1tokenUsdc.address,
        l2user.starknetContract.address,
        l1user.address,
        25
      );
    blockNumberUsdc = txUsdc.blockNumber;

    // check that tokens have been transfered to l1user
    expect(await l1tokenDai.balanceOf(l1user.address)).to.equal(
      l1tokenDaiInitialBalance - 30 + 20
    );
    expect(await l1tokenUsdc.balanceOf(l1user.address)).to.equal(
      l1tokenUsdcInitialBalance - 40 + 25
    );
    expect(await l1tokenDai.balanceOf(tokenBridgeL1Proxied.address)).to.equal(
      10
    );
    expect(await l1tokenUsdc.balanceOf(tokenBridgeL1Proxied.address)).to.equal(
      15
    );

    // flush L1 messages to be consumed by L2
    const flushL1Response = await starknet.devnet.flush();
    const flushL1Messages = flushL1Response.consumed_messages.from_l1;
    expect(flushL1Response.consumed_messages.from_l2).to.be.empty;
    expect(flushL1Messages).to.have.a.lengthOf(2);

    // check last update of L2 tokens
    expect(await proxiedL2TokenDai.call("get_last_update", {})).to.deep.equal({
      block_number: BigInt(blockNumberDai),
    });
    expect(await proxiedL2TokenUsdc.call("get_last_update", {})).to.deep.equal({
      block_number: BigInt(blockNumberUsdc),
    });

    // check balance of L2 tokens
    expect(
      await proxiedL2TokenDai.call("balanceOf", {
        account: BigInt(l2user.starknetContract.address),
      })
    ).to.deep.equal({ balance: { high: 0n, low: 10n } });
    expect(
      await proxiedL2TokenUsdc.call("balanceOf", {
        account: BigInt(l2user.starknetContract.address),
      })
    ).to.deep.equal({ balance: { high: 0n, low: 15n } });
  });

  it("L2 user sends back reward accrued to L1 user", async () => {
    // Give TokenBridge 1000 reward tokens
    await rewAaveTokenL1
      .connect(l1user)
      .approve(tokenBridgeL1Proxied.address, MAX_UINT256);
    await rewAaveTokenL1.transfer(tokenBridgeL1Proxied.address, 1000);

    // Initiate bridge back rewards from L2
    await l2user.invoke(proxiedTokenBridgeL2, "bridge_rewards", {
      l1_recipient: BigInt(l1user.address),
      amount: { high: 0, low: 30 },
    });

    // flush L2 messages to be consumed by L1
    const flushL2Response = await starknet.devnet.flush();
    const flushL2Messages = flushL2Response.consumed_messages.from_l2;
    expect(flushL2Response.consumed_messages.from_l1).to.be.empty;
    expect(flushL2Messages).to.have.a.lengthOf(1);

    // call recieveRewards on L1 to consume messages from L2
    await tokenBridgeL1Proxied
      .connect(l1user)
      .receiveRewards(l2user.starknetContract.address, l1user.address, 30);

    // check that the l1 user received reward tokens
    expect(await rewAaveTokenL1.balanceOf(l1user.address)).to.be.equal(30);
  });
});
