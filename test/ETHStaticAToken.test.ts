import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import { starknet } from "hardhat";
import { TIMEOUT, L1_TEST_ADDRESS } from "./constants";
import { expect } from "chai";
import { wadToRay, decimalToWad } from "../helpers/rayMath";
const WAD = 10 ** 18;

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

  it("allows owner to set l2 token bridge", async () => {
    await owner.invoke(l2token, "set_l2_token_bridge", {
      l2_token_bridge_: BigInt(bridgeContract.address),
    });
  });
  it("disallows non-owner to set l2 token bridge", async () => {
    try {
      await user1.invoke(l2token, "set_l2_token_bridge", {
        l2_token_bridge_: BigInt(bridgeContract.address),
      });
    } catch (err: any) {
      expect(err.message).to.contain("Ownable: caller is not the owner");
    }
  });
  it("allows owner to mint", async () => {
    await owner.invoke(l2token, "mint", {
      recipient: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(100)),
      },
    });

    const { totalSupply } = await l2token.call("totalSupply");
    console.log(totalSupply, "total");
    expect(totalSupply).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(100)),
    });
  });

  it("allows owner to burn", async () => {
    await owner.invoke(l2token, "burn", {
      account: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(50)),
      },
    });

    const { balance } = await l2token.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(balance).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(50)),
    });
  });

  it("disallows non-owner to mint", async () => {
    try {
      await user1.invoke(l2token, "mint", {
        recipient: BigInt(user1.starknetContract.address),
        amount: {
          high: 0n,
          low: BigInt(decimalToWad(100)),
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
        low: BigInt(decimalToWad(2)),
      },
    });

    const { acc_rewards_per_token } = await l2token.call(
      "get_acc_rewards_per_token"
    );

    expect(acc_rewards_per_token).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(2)),
    });
  });

  it("disallows non-owner to update accRewards", async () => {
    try {
      await user1.invoke(l2token, "push_acc_rewards_per_token", {
        block: 2,
        acc_rewards_per_token: {
          high: 0n,
          low: BigInt(decimalToWad(2)),
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
          low: BigInt(decimalToWad(2)),
        },
      });
    } catch (e) {
      expect.fail("accRewards accepted for old block number");
    }
  });

  it("returns correct user pending rewards before claim", async () => {
    const userClaimableRewards = await l2token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    //expect claimable rewards amount in RAY
    expect(userClaimableRewards.user_claimable_rewards).to.deep.equal({
      high: 0n,
      low: BigInt(wadToRay(100)),
    });
  });

  it("claims rewards and mints correct amount of rewards tokens to self", async () => {
    const user1ClaimableRewards = await l2token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    await user1.invoke(l2token, "claim_rewards", {
      recipient: BigInt(user1.starknetContract.address),
    });

    const user1RewardsBalance = await rewAaveTokenL2.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(user1RewardsBalance.balance).to.deep.equal(
      user1ClaimableRewards.user_claimable_rewards
    );
  });

  it("returns correct user pending rewards after claim", async () => {
    const userClaimableRewards = await l2token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    expect(userClaimableRewards.user_claimable_rewards).to.deep.equal({
      high: 0n,
      low: 0n,
    });
  });

  it("updates user accumulated rewards per token after claim", async () => {
    const userAccruedRewardsPerToken = await l2token.call(
      "get_user_acc_rewards_per_token",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    expect(userAccruedRewardsPerToken.user_acc_rewards_per_token).to.deep.equal(
      {
        high: 0n,
        low: BigInt(decimalToWad(2)),
      }
    );
  });

  it("mints rewards correctly to different user", async () => {
    const user2RewAaveBalanceBeforeClaim = await rewAaveTokenL2.call(
      "balanceOf",
      {
        account: BigInt(user2.starknetContract.address),
      }
    );

    //check that balance is indeed zero
    expect(user2RewAaveBalanceBeforeClaim.balance).to.deep.equal({
      high: 0n,
      low: 0n,
    });

    //Update the acc rewards per token first
    await owner.invoke(l2token, "push_acc_rewards_per_token", {
      block: 2,
      acc_rewards_per_token: {
        high: 0,
        low: BigInt(decimalToWad(3)),
      },
    });

    const user1ClaimableRewards = await l2token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    //claim rewards to user2
    await user1.invoke(l2token, "claim_rewards", {
      recipient: BigInt(user2.starknetContract.address),
    });

    const user2RewAaveBalanceAfterClaim = await rewAaveTokenL2.call(
      "balanceOf",
      {
        account: BigInt(user2.starknetContract.address),
      }
    );

    expect(user2RewAaveBalanceAfterClaim.balance).to.deep.equal(
      user1ClaimableRewards.user_claimable_rewards
    );
  });
});
