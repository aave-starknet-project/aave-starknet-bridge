import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import { starknet } from "hardhat";
import { TIMEOUT, L1_TEST_ADDRESS } from "./constants";
import { expect } from "chai";

describe("ETHStaticAToken", function () {
  this.timeout(TIMEOUT);

  let l2token: StarknetContract;
  let bridgeContract: StarknetContract;
  let rewAaveTokenL2: StarknetContract;
  let owner: Account;
  let user1: Account;
  let user2: Account;

  before(async () => {
    owner = await starknet.deployAccount("OpenZeppelin");
    user1 = await starknet.deployAccount("OpenZeppelin");
    user2 = await starknet.deployAccount("OpenZeppelin");
  });

  it("should deploy", async () => {
    const l2tokenFactory = await starknet.getContractFactory("ETHstaticAToken");
    const rewAaveContractFactory = await starknet.getContractFactory("rewAAVE");
    const bridgeContractFactory = await starknet.getContractFactory(
      "token_bridge"
    );

    bridgeContract = await bridgeContractFactory.deploy({
      governor_address: BigInt(owner.starknetContract.address),
    });

    l2token = await l2tokenFactory.deploy({
      name: 666,
      symbol: 666,
      decimals: 4,
      initial_supply: { high: 0, low: 0 },
      recipient: BigInt(user1.starknetContract.address),
      controller: BigInt(owner.starknetContract.address),
    });

    rewAaveTokenL2 = await rewAaveContractFactory.deploy({
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: { high: 0, low: 0 },
      recipient: BigInt(user1.starknetContract.address),
      owner: BigInt(bridgeContract.address),
    });
    //set rewAave address on l2 token bridge
    await owner.invoke(bridgeContract, "set_reward_token", {
      reward_token: BigInt(rewAaveTokenL2.address),
    });
    //approve l1_l2 token bridge
    await owner.invoke(bridgeContract, "approve_bridge", {
      l1_token: BigInt(L1_TEST_ADDRESS),
      l2_token: BigInt(l2token.address),
    });
  });

  it("sets l2 token bridge", async () => {
    await owner.invoke(l2token, "set_l2_token_bridge", {
      l2_token_bridge_: BigInt(bridgeContract.address),
    });
  });

  it("allows owner to mint", async () => {
    await owner.invoke(l2token, "mint", {
      recipient: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: 100n,
      },
    });

    const { totalSupply } = await l2token.call("totalSupply");
    expect(totalSupply).to.deep.equal({
      high: 0n,
      low: 100n,
    });
    expect(
      await l2token.call("balanceOf", {
        account: BigInt(user1.starknetContract.address),
      })
    ).to.deep.equal({ balance: { high: 0n, low: 100n } });
  });

  it("disallows non-owner to mint", async () => {
    try {
      await user1.invoke(l2token, "mint", {
        recipient: BigInt(user1.starknetContract.address),
        amount: {
          high: 0n,
          low: 100n,
        },
      });
    } catch (err: any) {
      expect(err.message).to.contain("Ownable: caller is not the owner");
    }
  });

  it("allows owner to update accRewards", async () => {
    await owner.invoke(l2token, "push_acc_rewards_per_token", {
      block: 1,
      acc_rewards_per_token: {
        high: 0,
        low: 2,
      },
    });

    const { acc_rewards_per_token } = await l2token.call(
      "get_acc_rewards_per_token"
    );
    expect(acc_rewards_per_token).to.deep.equal({
      high: 0n,
      low: 2n,
    });
  });

  it("disallows non-owner to update accRewards", async () => {
    try {
      await user1.invoke(l2token, "push_acc_rewards_per_token", {
        block: 2,
        acc_rewards_per_token: {
          high: 0n,
          low: 2n,
        },
      });
    } catch (err: any) {
      expect(err.message).to.contain("Ownable: caller is not the owner");
    }
  });

  it("only allows increases in accRewards", async () => {
    try {
      await owner.invoke(l2token, "push_acc_rewards_per_token", {
        block: 3,
        acc_rewards_per_token: {
          high: 0,
          low: 0,
        },
      });
    } catch (e) {
      expect.fail("allows decreasing accRewards");
    }
  });

  it("rejects old block numbers", async () => {
    try {
      await owner.invoke(l2token, "push_acc_rewards_per_token", {
        block: 0,
        acc_rewards_per_token: {
          high: 0,
          low: 2,
        },
      });
    } catch (e) {
      expect.fail("accRewards accepted for old block number");
    }
  });

  it("claims pending rewards and mints correct amount of rewards tokens when recipient is caller", async () => {
    const { userPendingRewards } = await l2token.call(
      "get_user_pending_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    await user1.invoke(l2token, "claim_rewards", {
      recipient: BigInt(user1.starknetContract.address),
    });

    const { userRewardsBalance } = await rewAaveTokenL2.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(userRewardsBalance).to.equal(userPendingRewards);
  });

  it("returns correct user pending rewards after claim", async () => {
    const { userPendingRewards } = await l2token.call(
      "get_user_pending_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );
    expect(userPendingRewards.user_pending_rewards).to.deep.equal({
      high: 0n,
      low: 0n,
    });
  });

  it("returns correct user accumulated rewards per token after claim", async () => {
    const { userAccruedRewards } = await l2token.call(
      "get_user_acc_rewards_per_token",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );
    expect(userAccruedRewards.user_acc_rewards_per_token).to.deep.equal({
      high: 0n,
      low: 2n,
    });
  });

  it("mints rewards correctly to recipient different than caller", async () => {
    const { user2RewAaveBalanceBeforeClaim } = await rewAaveTokenL2.call(
      "balanceOf",
      {
        account: BigInt(user2.starknetContract.address),
      }
    );

    //check that balance is indeed null
    expect(user2RewAaveBalanceBeforeClaim).to.deep.equal({
      balance: {
        high: 0n,
        low: 0n,
      },
    });

    await owner.invoke(l2token, "push_acc_rewards_per_token", {
      block: 2,
      acc_rewards_per_token: {
        high: 0,
        low: 3,
      },
    });

    const { user1PendingRewards } = await l2token.call(
      "get_user_pending_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    await user1.invoke(l2token, "claim_rewards", {
      recipient: BigInt(user2.starknetContract.address),
    });

    const { user2RewAaveBalanceAfterClaim } = await rewAaveTokenL2.call(
      "balanceOf",
      {
        account: BigInt(user2.starknetContract.address),
      }
    );

    expect(user1PendingRewards.user_pending_rewards).to.deep.equal(
      user2RewAaveBalanceAfterClaim.balance
    );
  });
});
