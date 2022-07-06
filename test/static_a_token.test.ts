import { StarknetContract, Account } from "hardhat/types";
import { starknet } from "hardhat";
import { BigNumber } from "ethers";
import { TIMEOUT, L1_TEST_ADDRESS } from "./constants";
import { expect } from "chai";
import "./wadraymath";
import { WAD } from "./wadraymath";

describe("static_a_token", function () {
  this.timeout(TIMEOUT);

  let token: StarknetContract;
  let rewAAVE: StarknetContract;
  let tokenBridge: StarknetContract;
  let owner: Account;
  let user1: Account;
  let user2: Account;
  let bridge: Account;

  it("Deploy accounts", async () => {
    owner = await starknet.deployAccount("OpenZeppelin");
    user1 = await starknet.deployAccount("OpenZeppelin");
    user2 = await starknet.deployAccount("OpenZeppelin");
    bridge = await starknet.deployAccount("OpenZeppelin");
  });

  it("Deploy token and reward token", async () => {
    const tokenFactory = await starknet.getContractFactory("static_a_token");
    const rewAAVEFactory = await starknet.getContractFactory("rewAAVE");
    const l2TokenBridgeFactory = await starknet.getContractFactory("bridge");

    token = await tokenFactory.deploy();
    rewAAVE = await rewAAVEFactory.deploy();
    tokenBridge = await l2TokenBridgeFactory.deploy();

    await owner.invoke(token, "initialize_static_a_token", {
      name: 1234n,
      symbol: 123n,
      decimals: 18n,
      initial_supply: { high: 0n, low: 0n },
      recipient: BigInt(owner.starknetContract.address),
      owner: BigInt(owner.starknetContract.address),
      l2_bridge: BigInt(bridge.starknetContract.address),
    });
    await owner.invoke(rewAAVE, "initialize_rewAAVE", {
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: { high: 0, low: 0 },
      recipient: BigInt(user1.starknetContract.address),
      owner: BigInt(tokenBridge.address),
    });
    await owner.invoke(tokenBridge, "initialize_bridge", {
      governor_address: BigInt(owner.starknetContract.address),
    });

    //set rewAave address on l2 token bridge
    await owner.invoke(tokenBridge, "set_reward_token", {
      reward_token: BigInt(rewAAVE.address),
    });

    //approve l1_l2 token bridge
    await owner.invoke(tokenBridge, "approve_bridge", {
      l1_token: BigInt(L1_TEST_ADDRESS),
      l2_token: BigInt(token.address),
    });
  });

  it("allows owner to set l2 token bridge", async () => {
    await owner.invoke(token, "set_l2_bridge", {
      l2_bridge: BigInt(bridge.starknetContract.address),
    });
  });

  it("disallows non-owner to set l2 token bridge", async () => {
    try {
      await user1.invoke(token, "set_l2_bridge", {
        l2_bridge: BigInt(bridge.starknetContract.address),
      });
    } catch (err: any) {
      expect(err.message).to.contain("Ownable: caller is not the owner");
    }
  });

  it("allows bridge to mint", async () => {
    const mint_amount = BigNumber.from("100").mul(WAD).toString();
    await bridge.invoke(token, "mint", {
      recipient: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(mint_amount),
      },
    });

    const { totalSupply } = await token.call("totalSupply");

    expect(totalSupply).to.deep.equal({
      high: 0n,
      low: BigInt(mint_amount),
    });
  });

  it("allows bridge to burn", async () => {
    const burn_amount = BigNumber.from("50").mul(WAD).toString();
    await bridge.invoke(token, "burn", {
      account: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(burn_amount),
      },
    });

    const { balance } = await token.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(balance).to.deep.equal({
      high: 0n,
      low: BigInt(burn_amount),
    });
  });

  it("disallows non-bridge to mint", async () => {
    const mint_amount = BigNumber.from("100").mul(WAD).toString();
    try {
      await user1.invoke(token, "mint", {
        recipient: BigInt(user1.starknetContract.address),
        amount: {
          high: 0n,
          low: BigInt(mint_amount),
        },
      });
    } catch (err: any) {
      expect(err.message).to.contain("Caller address should be bridge");
    }
  });

  it("disallows non-bridge to burn", async () => {
    const burn_amount = BigNumber.from("100").mul(WAD).toString();
    try {
      await user1.invoke(token, "burn", {
        account: BigInt(user1.starknetContract.address),
        amount: {
          high: 0n,
          low: BigInt(burn_amount),
        },
      });
    } catch (err: any) {
      expect(err.message).to.contain("Caller address should be bridge");
    }
  });

  it("allows bridge to update rewards index", async () => {
    const updated_rewards_index_value = BigNumber.from("2").mul(WAD).toString();
    await bridge.invoke(token, "push_rewards_index", {
      block_number: {
        high: 0,
        low: 1,
      },
      rewards_index: {
        wad: {
          high: 0,
          low: BigInt(updated_rewards_index_value),
        },
      },
    });

    const { rewards_index } = await token.call("get_rewards_index");

    expect(rewards_index).to.deep.equal({
      wad: {
        high: 0n,
        low: BigInt(updated_rewards_index_value),
      },
    });
  });

  it("disallows random account from updating rewards index", async () => {
    const rewards_index_value = BigNumber.from("2").mul(WAD).toString();
    try {
      await user1.invoke(token, "push_rewards_index", {
        block_number: {
          high: 0,
          low: 2,
        },
        rewards_index: {
          wad: {
            high: 0n,
            low: BigInt(rewards_index_value),
          },
        },
      });
    } catch (err: any) {
      expect(err.message).to.contain("Caller address should be bridge");
    }
  });

  it("only allows increases in rewards index", async () => {
    try {
      await bridge.invoke(token, "push_rewards_index", {
        block_number: {
          high: 0,
          low: 3,
        },
        rewards_index: {
          wad: {
            high: 0,
            low: 0,
          },
        },
      });
    } catch (e) {
      expect.fail("allows decreasing rewards index");
    }
  });

  it("rejects old block numbers", async () => {
    try {
      const rewards_index_value = BigNumber.from("2").mul(WAD).toString();
      await bridge.invoke(token, "push_rewards_index", {
        block_number: {
          high: 0,
          low: 0,
        },
        rewards_index: {
          wad: {
            high: 0,
            low: BigInt(rewards_index_value),
          },
        },
      });
    } catch (e) {
      expect.fail("rewards index accepted for old block number");
    }
  });

  it("returns correct user pending rewards before claim", async () => {
    const claimable_rewards_amount = BigNumber.from("100").mul(WAD).toString();
    const userClaimableRewards = await token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    //expect claimable rewards amount in WAD
    expect(userClaimableRewards.user_claimable_rewards).to.deep.equal({
      high: 0n,
      low: BigInt(claimable_rewards_amount),
    });
  });

  it("mints no rewards tokens if caller has no claimable rewards", async () => {
    //user 2 has no l2 tokens so far
    const user2ClaimableRewards = await token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user2.starknetContract.address),
      }
    );
    expect(user2ClaimableRewards.user_claimable_rewards).to.deep.equal({
      high: 0n,
      low: 0n,
    });

    await owner.invoke(token, "set_l2_bridge", {
      l2_bridge: BigInt(tokenBridge.address),
    });
    //user 2 tries to claim rewards
    await user2.invoke(token, "claim_rewards", {
      recipient: BigInt(user2.starknetContract.address),
    });

    const user2RewardsBalance = await rewAAVE.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(user2RewardsBalance.balance).to.deep.equal({ high: 0n, low: 0n });
  });

  it("claims rewards and mints correct amount of rewards tokens to caller", async () => {
    await owner.invoke(token, "set_l2_bridge", {
      l2_bridge: BigInt(tokenBridge.address),
    });

    const user1ClaimableRewards = await token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    await user1.invoke(token, "claim_rewards", {
      recipient: BigInt(user1.starknetContract.address),
    });

    const user1RewardsBalance = await rewAAVE.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(user1RewardsBalance.balance).to.deep.equal(
      user1ClaimableRewards.user_claimable_rewards
    );
  });

  it("returns correct pending rewards after claim", async () => {
    const userClaimableRewards = await token.call(
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

  it("keeps track of each user rewards index correctly", async () => {
    //after claim user1 should have the latest rewards index
    const current_rewards_index_value = BigNumber.from("2").mul(WAD).toString();
    const user1RewardsIndex = await token.call("get_user_rewards_index", {
      user: BigInt(user1.starknetContract.address),
    });

    expect(user1RewardsIndex.user_rewards_index).to.deep.equal({
      high: 0n,
      low: BigInt(current_rewards_index_value),
    });

    // user2 rewards index shouldn't be updated
    const user2RewardsIndex = await token.call("get_user_rewards_index", {
      user: BigInt(user2.starknetContract.address),
    });

    expect(user1RewardsIndex.user_rewards_index).to.not.equal(
      user2RewardsIndex.user_rewards_index
    );
    expect(user2RewardsIndex.user_rewards_index).to.deep.equal({
      high: 0n,
      low: 0n,
    });
  });

  it("mints rewards correctly to different user", async () => {
    const user2RewAaveBalanceBeforeClaim = await rewAAVE.call("balanceOf", {
      account: BigInt(user2.starknetContract.address),
    });

    //check that balance is indeed zero
    expect(user2RewAaveBalanceBeforeClaim.balance).to.deep.equal({
      high: 0n,
      low: 0n,
    });

    // Switch to the bridge user in order to push fake updates
    await owner.invoke(token, "set_l2_bridge", {
      l2_bridge: BigInt(bridge.starknetContract.address),
    });
    const updated_rewards_index_value = BigNumber.from("3").mul(WAD).toString();
    //Update the acc rewards per token first
    await bridge.invoke(token, "push_rewards_index", {
      block_number: {
        high: 0,
        low: 2,
      },
      rewards_index: {
        wad: {
          high: 0,
          low: BigInt(updated_rewards_index_value),
        },
      },
    });

    // Switch back to the bridge in order to enable reward claims
    await owner.invoke(token, "set_l2_bridge", {
      l2_bridge: BigInt(tokenBridge.address),
    });

    const user1ClaimableRewards = await token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    //claim rewards to user2
    await user1.invoke(token, "claim_rewards", {
      recipient: BigInt(user2.starknetContract.address),
    });

    const user2RewAaveBalanceAfterClaim = await rewAAVE.call("balanceOf", {
      account: BigInt(user2.starknetContract.address),
    });

    expect(user2RewAaveBalanceAfterClaim.balance).to.deep.equal(
      user1ClaimableRewards.user_claimable_rewards
    );
  });

  it("Rewards of user are not lost if L2 tokens are burnt before claiming", async () => {
    // Switch to the bridge user in order to push fake updates
    await owner.invoke(token, "set_l2_bridge", {
      l2_bridge: BigInt(bridge.starknetContract.address),
    });

    const updated_rewards_index_value = BigNumber.from("4").mul(WAD).toString();

    //To have a non null rewards amount, we update the rewards index
    await bridge.invoke(token, "push_rewards_index", {
      block_number: {
        low: 0,
        high: 3,
      },
      rewards_index: {
        wad: {
          high: 0,
          low: BigInt(updated_rewards_index_value),
        },
      },
    });
    const burn_amount = BigNumber.from("50").mul(WAD).toString();
    //burn all static_a_token of user on L2==>this is the same as calling init_withdraw on bridge
    await bridge.invoke(token, "burn", {
      account: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(burn_amount),
      },
    });
    /// check that the rewards index of the user gets updated when calling incentivized_erc20_before_token_transfer at the moment of the burn
    const userRewardsIndex = await token.call("get_user_rewards_index", {
      user: BigInt(user1.starknetContract.address),
    });

    const current_rewards_index_value = BigNumber.from("4").mul(WAD).toString();
    expect(userRewardsIndex.user_rewards_index).to.deep.equal({
      high: 0n,
      low: BigInt(current_rewards_index_value),
    });

    const { balance } = await token.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(balance).to.deep.equal({
      high: 0n,
      low: 0n,
    });

    const { user_claimable_rewards } = await token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );
    const claimable_amount = BigNumber.from("50").mul(WAD).toString();
    expect(user_claimable_rewards).to.deep.equal({
      high: 0n,
      low: BigInt(claimable_amount),
    });
  });
});
