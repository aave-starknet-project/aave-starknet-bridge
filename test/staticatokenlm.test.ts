import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractFactory } from 'ethers';
import hre, { network, ethers } from 'hardhat';
import {
  HttpNetworkConfig,
} from 'hardhat/types';

import { TIMEOUT } from './constants';

describe('TokenBridge', async function() {
  this.timeout(TIMEOUT);
 
  let l1user: SignerWithAddress;
  let signer: SignerWithAddress;
  const networkUrl: string = (network.config as HttpNetworkConfig).url;
  console.log(networkUrl)
  let L1TokenFactory: ContractFactory;
  let l1tokenA: Contract;
  let l1tokenB: Contract;

  before(async function () {

    // L1 deployments

    [signer, l1user] = await ethers.getSigners();

    L1TokenFactory = await ethers.getContractFactory('StaticATokenMock', signer);
    l1tokenA = await L1TokenFactory.deploy();
    l1tokenB = await L1TokenFactory.deploy();

  });

  it('returns the address', async () => {
    console.log("OOOOOOOOOOOOOOOOOOOOO");
    console.log(l1tokenA.address);
  })

});
