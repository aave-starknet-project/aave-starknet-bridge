<<<<<<< HEAD
<<<<<<< HEAD
import { StarknetContract, StarknetContractFactory, Account } from 'hardhat/types';
=======
import { StarknetContract, StarknetContractFactory, Account } from "hardhat/types/runtime";

>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
import { StarknetContract, StarknetContractFactory, Account } from 'hardhat/types';
>>>>>>> c20e50d... Implement some tests, add getter for rewards per token, fix update preconditions
import {starknet} from 'hardhat';
import {TIMEOUT} from './constants';
import {expect} from 'chai';

<<<<<<< HEAD
describe('ETHStaticAToken', function () {
  this.timeout(TIMEOUT);

  let tokenContract: StarknetContract;
  let owner: Account;
  let user1: Account;

  before(async () => {
    owner = await starknet.deployAccount('OpenZeppelin');
    user1 = await starknet.deployAccount('OpenZeppelin');
  });

  it('should deploy', async () => {
    const tokenContractFactory = await starknet.getContractFactory('ETHstaticAToken');
    tokenContract = await tokenContractFactory.deploy({
      name: 666,
      symbol: 666,
      decimals: 4,
      initial_supply: {high: 0, low: 0},
      recipient: BigInt(owner.starknetContract.address),
      controller: BigInt(owner.starknetContract.address),
    });
  });

  it('allows owner to mint', async () => {
    await owner.invoke(tokenContract, 'mint', {
      recipient: BigInt(user1.starknetContract.address),
=======
describe.only('ETHStaticAToken', function () {
  this.timeout(TIMEOUT);

  let tokenContract: StarknetContract;
  let owner: Account;
  let user1: Account;

  before(async () => {
    owner = await starknet.deployAccount('OpenZeppelin');
    user1 = await starknet.deployAccount('OpenZeppelin');
  });

  it('should deploy', async () => {
    const tokenContractFactory = await starknet.getContractFactory('ETHstaticAToken');
    tokenContract = await tokenContractFactory.deploy({
      name: 666,
      symbol: 666,
      decimals: 4,
      initial_supply: {high: 0, low: 0},
      recipient: BigInt(owner.starknetContract.address),
      controller: BigInt(owner.starknetContract.address),
    });
  });

<<<<<<< HEAD
  it("should be able to mint", async () => {
    const ohoh = await l2TokenContract.invoke("mint", {
      recipient: 1n,
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
  it('allows owner to mint', async () => {
    await owner.invoke(tokenContract, 'mint', {
      recipient: BigInt(user1.starknetContract.address),
>>>>>>> c20e50d... Implement some tests, add getter for rewards per token, fix update preconditions
      amount: {
        high: 0n,
        low: 100n,
      },
    });
<<<<<<< HEAD
<<<<<<< HEAD

    const {totalSupply} = await tokenContract.call('totalSupply');
    expect(totalSupply).to.deep.equal({high: 0n, low: 100n});
  });

  it('dissalows non-owner to mint', async () => {
    try {
      await user1.call(tokenContract, 'mint', {
        recipient: BigInt(user1.starknetContract.address),
        amount: {
          high: 0n,
          low: 100n,
        },
      });
      expect.fail("non-owner was able to mint");
    } catch (e) {
    }
  });

  it('allows owner to update accRewards', async () => {
    await owner.invoke(tokenContract, 'push_acc_rewards_per_token', {
      block: 1,
      acc_rewards_per_token: {
        high: 0,
        low: 1,
      },
    });

    const {acc_rewards_per_token} = await tokenContract.call('get_acc_rewards_per_token')
    expect(acc_rewards_per_token).to.deep.equal({
      high: 0n,
      low: 1n,
    })
  });

  it('dissalows non-owner to update accRewards', async () => {
    try {
      await user1.call(tokenContract, 'push_acc_rewards_per_token', {
        block: 2,
        acc_rewards_per_token: {
          high: 0n,
          low: 100n,
        },
      });
      expect.fail("non-owner was able to update rewards");
    } catch (e) {
    }
  });

  it('only allows increases in accRewards', async () => {
    try {
      await owner.call(tokenContract, 'push_acc_rewards_per_token', {
        block: 3,
        acc_rewards_per_token: {
          high: 0,
          low: 0,
        }
      });
      expect.fail("accRewards was decreased");
    } catch (e) {
    }
  });

  it('rejects old block numbers', async () => {
    try {
      await owner.call(tokenContract, 'push_acc_rewards_per_token', {
        block: 0,
        acc_rewards_per_token: {
          high: 0,
          low: 2,
        }
      });
      expect.fail("accRewards accepted for old block number");
    } catch (e) {
    }
  });

  it('updatesUserAccRewardsPerToken', async () => {
    expect.fail("not implemented yet")
  });

  it('distributes rewards correctly', async () => {
    expect.fail("not implemented yet")
  });

  it('tracks unclaimed rewards', async () => {
    expect.fail("not implemented yet")
=======
    console.log(ohoh)

    const {totalSupply} = await l2TokenContract.call("totalSupply");
    expect(totalSupply).to.deep.equal({high: 0n, low:  1000000100n});
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======

    const {totalSupply} = await tokenContract.call('totalSupply');
    expect(totalSupply).to.deep.equal({high: 0n, low: 100n});
  });

  it('dissalows non-owner to mint', async () => {
    try {
      await user1.call(tokenContract, 'mint', {
        recipient: BigInt(user1.starknetContract.address),
        amount: {
          high: 0n,
          low: 100n,
        },
      });
      expect.fail("non-owner was able to mint");
    } catch (e) {
    }
  });

  it('allows owner to update accRewards', async () => {
    await owner.invoke(tokenContract, 'push_acc_rewards_per_token', {
      block: 1,
      acc_rewards_per_token: {
        high: 0,
        low: 1,
      },
    });

    const {acc_rewards_per_token} = await tokenContract.call('get_acc_rewards_per_token')
    expect(acc_rewards_per_token).to.deep.equal({
      high: 0n,
      low: 1n,
    })
  });

  it('dissalows non-owner to update accRewards', async () => {
    try {
      await user1.call(tokenContract, 'push_acc_rewards_per_token', {
        block: 2,
        acc_rewards_per_token: {
          high: 0n,
          low: 100n,
        },
      });
      expect.fail("non-owner was able to update rewards");
    } catch (e) {
    }
  });

  it('only allows increases in accRewards', async () => {
    try {
      await owner.call(tokenContract, 'push_acc_rewards_per_token', {
        block: 3,
        acc_rewards_per_token: {
          high: 0,
          low: 0,
        }
      });
      expect.fail("accRewards was decreased");
    } catch (e) {
    }
  });

  it('rejects old block numbers', async () => {
    try {
      await owner.call(tokenContract, 'push_acc_rewards_per_token', {
        block: 0,
        acc_rewards_per_token: {
          high: 0,
          low: 2,
        }
      });
      expect.fail("accRewards accepted for old block number");
    } catch (e) {
    }
  });

  it('updatesUserAccRewardsPerToken', async () => {
    expect.fail("not implemented yet")
  });

  it('distributes rewards correctly', async () => {
    expect.fail("not implemented yet")
  });

  it('tracks unclaimed rewards', async () => {
    expect.fail("not implemented yet")
>>>>>>> c20e50d... Implement some tests, add getter for rewards per token, fix update preconditions
  });
})
