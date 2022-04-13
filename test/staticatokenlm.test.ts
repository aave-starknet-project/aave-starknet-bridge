import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractFactory } from 'ethers';
import hre, { network, ethers } from 'hardhat';
import {
  HttpNetworkConfig,
} from 'hardhat/types';

import { TIMEOUT } from './constants';

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
  let L1ATokenFactory: ContractFactory;
  let l1aToken: Contract;
  let L1ERC20Factory: ContractFactory;
  let l1underlyingAsset: Contract;
  let l1rewAaveToken: Contract;
  let rewAaveTokenL1: Contract;
  let PoolFactory: ContractFactory;
  let pool: Contract;
  let ReserveLogicFactory: ContractFactory;
  let reserveLogic: Contract;
  let ValidationLogicFactory: ContractFactory;
  let validationLogic: Contract;
  let GenericLogicFactory: ContractFactory;
  let genericLogic: Contract;

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
    l1underlyingAsset = await L1ERC20Factory.deploy(1000);
    l1rewAaveToken = await L1ERC20Factory.deploy(1000);
    L1ATokenFactory = await ethers.getContractFactory('ATokenMock', signer);
    l1aToken = await L1ERC20Factory.deploy(1000);

    ReserveLogicFactory = await ethers.getContractFactory("ReserveLogic", signer);
    reserveLogic = await ReserveLogicFactory.deploy();
    GenericLogicFactory = await ethers.getContractFactory("GenericLogic", signer);
    genericLogic = await GenericLogicFactory.deploy();
    ValidationLogicFactory = await ethers.getContractFactory("ValidationLogic", {
      libraries: {
        GenericLogic: genericLogic.address
      }
    });
    validationLogic = await ValidationLogicFactory.deploy();
    PoolFactory = await ethers.getContractFactory("LendingPoolMock", {
      libraries: {
        ReserveLogic: reserveLogic.address,
        ValidationLogic: validationLogic.address,
      },
    });
    pool = await PoolFactory.deploy();

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
    const symbol = "ABC";
    await l1tokenA.initialize(pool.address, l1aToken.address, `Wrapped ${symbol}`, symbol);
  })

});
