import { StarknetContract, StarknetContractFactory, Account } from 'hardhat/types';
import {starknet} from 'hardhat';
import {TIMEOUT} from './constants';
import {expect} from 'chai';

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
    const tokenContractFactory : StarknetContractFactory= await starknet.getContractFactory('ETHstaticAToken');
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
      amount: {
        high: 0n,
        low: 100n,
      },
    });

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
})
