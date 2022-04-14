import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractFactory } from 'ethers';
import hre, { network, ethers, artifacts } from 'hardhat';
import {
  HttpNetworkConfig,
} from 'hardhat/types';

import { TIMEOUT } from './constants';

const LENDING_POOL = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9';
const INCENTIVES_CONTROLLER = '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5';
const A_DAI = '0x028171bCA77440897B824Ca71D1c56caC55b68A3';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

describe('StaticATokenLMNew', async function() {
  this.timeout(TIMEOUT);
 
  let l1user: SignerWithAddress;
  let signer: SignerWithAddress;
  const networkUrl: string = (network.config as HttpNetworkConfig).url;
  console.log(networkUrl)
  // L1
  let MockStarknetMessaging: ContractFactory;
  let mockStarknetMessaging: Contract;
  let L1StaticATokenFactory: ContractFactory;
  let l1tokenA: Contract;
  let l1tokenB: Contract;
  let TokenBridgeL1: ContractFactory;
  let tokenBridgeL1: Contract;
  let L1ERC20Factory: ContractFactory;
  let l1rewAaveToken: Contract;
  let pool: Contract;
  let incentives: Contract;
  let aDai: Contract;
  let dai: Contract;

  before(async function () {

    // L1 deployments

    [signer, l1user] = await ethers.getSigners();

    MockStarknetMessaging = await ethers.getContractFactory(
      'MockStarknetMessaging',
      signer,
    );
    mockStarknetMessaging = await MockStarknetMessaging.deploy();
    await mockStarknetMessaging.deployed();

    L1ERC20Factory = await ethers.getContractFactory('RewAAVE', signer);
    l1rewAaveToken = await L1ERC20Factory.deploy(1000);

    pool = await ethers.getContractAt("LendingPool", LENDING_POOL)
    incentives = await ethers.getContractAt("IncentivesControllerMock", INCENTIVES_CONTROLLER)
    aDai = await ethers.getContractAt("AToken", A_DAI);
    dai = await ethers.getContractAt("ERC20Mock", DAI);

    TokenBridgeL1 = await ethers.getContractFactory('TokenBridge', signer);
    tokenBridgeL1 = await TokenBridgeL1.deploy();
    await tokenBridgeL1.deployed();

    L1StaticATokenFactory = await ethers.getContractFactory('StaticATokenLMNew', signer);
    l1tokenA = await L1StaticATokenFactory.deploy(tokenBridgeL1.address);
    l1tokenB = await L1StaticATokenFactory.deploy(tokenBridgeL1.address);

    // // load L1 <--> L2 messaging contract

    // await starknet.devnet.loadL1MessagingContract(networkUrl, mockStarknetMessaging.address);

  });

  it('set reward token', async () => {
    console.log("OOOOOOOOOOOOOOOOOOOOO");
    console.log(pool.address)
    console.log(l1tokenA.address);
    console.log(aDai.address)
    console.log(dai.address);
    const symbol = "ABC";
    await l1tokenA.initialize(pool.address, aDai.address, `Wrapped ${symbol}`, symbol);
  })

});
