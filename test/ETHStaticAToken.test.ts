import { StarknetContract, StarknetContractFactory, Account } from "hardhat/types/runtime";

import {starknet} from 'hardhat';
import {TIMEOUT} from './constants';
import {expect} from 'chai';

describe.only('ETHStaticAToken', function () {
  this.timeout(TIMEOUT);

  let l2TokenContract: StarknetContract;
  before(async () => {
    const tokenContractFactory = await starknet.getContractFactory("ETHstaticAToken");
    console.log("Started deployment");
    l2TokenContract = await tokenContractFactory.deploy({
      name: 666,
      symbol: 666,
      decimals: 4,
      initial_supply: {high: 0, low: 1000000000},
      recipient: 1,
      owner: 0,
      controller: 0,
    });
    console.log("Deployed at", l2TokenContract.address);

  });

  it("should be able to mint", async () => {
    const ohoh = await l2TokenContract.invoke("mint", {
      recipient: 1n,
      amount: {
        high: 0n,
        low: 100n,
      },
    });
    console.log(ohoh)

    const {totalSupply} = await l2TokenContract.call("totalSupply");
    expect(totalSupply).to.deep.equal({high: 0n, low:  1000000100n});
  });
})
