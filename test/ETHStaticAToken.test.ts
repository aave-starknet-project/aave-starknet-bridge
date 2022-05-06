import {
  StarknetContract,
  Account,
} from "hardhat/types";
import { starknet } from "hardhat";
import { TIMEOUT, L1_TEST_ADDRESS } from "./constants";
import { expect } from "chai";
import { wadToRay, decimalToWad } from "../helpers/rayMath";

describe("ETHStaticAToken", function () {
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
    const tokenFactory = await starknet.getContractFactory("ETHstaticAToken");
    const rewAAVEFactory = await starknet.getContractFactory("rewAAVE");
    const l2TokenBridgeFactory = await starknet.getContractFactory("token_bridge");

    token = await tokenFactory.deploy();
    rewAAVE = await rewAAVEFactory.deploy();
    tokenBridge = await l2TokenBridgeFactory.deploy()

    await owner.invoke(token, "initialize_ETHstaticAToken", {
      name: 1234n,
      symbol: 123n,
      decimals: 18n,
      initial_supply: { high: 0n, low: 0n },
      recipient: BigInt(owner.starknetContract.address),
      owner: BigInt(owner.starknetContract.address),
      l2_token_bridge: BigInt(bridge.starknetContract.address),
    });
    await owner.invoke(rewAAVE, "initialize_rewAAVE", {
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: { high: 0, low: 0 },
      recipient: BigInt(user1.starknetContract.address),
      owner: BigInt(tokenBridge.address),
    });
    await owner.invoke(tokenBridge, "initialize_token_bridge", {
      governor_address: BigInt(owner.starknetContract.address)
    });

    //set rewAave address on l2 token bridge
    await owner.invoke(token, "set_reward_token", {
      reward_token: BigInt(rewAAVE.address),
    });

    //approve l1_l2 token bridge
    await owner.invoke(tokenBridge, "approve_bridge", {
      l1_token: BigInt(L1_TEST_ADDRESS),
      l2_token: BigInt(token.address),
    });
  });

  it("allows owner to set l2 token bridge", async () => {
    await owner.invoke(token, "set_l2_token_bridge", {
      l2_token_bridge: BigInt(bridge.starknetContract.address),
    });
  });

  it("disallows non-owner to set l2 token bridge", async () => {
    try {
      await user1.invoke(token, "set_l2_token_bridge", {
        l2_token_bridge: BigInt(bridge.starknetContract.address),
      });
    } catch (err: any) {
      expect(err.message).to.contain("Ownable: caller is not the owner");
    }
  });

  it("allows bridge to mint", async () => {
    await bridge.invoke(token, "mint", {
      recipient: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(100)),
      },
    });

    const { totalSupply } = await token.call("totalSupply");

    expect(totalSupply).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(100)),
    });
  });

  it("allows bridge to burn", async () => {
    await bridge.invoke(token, "burn", {
      account: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(50)),
      },
    });

    const { balance } = await token.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(balance).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(50)),
    });
  });

  it("disallows non-bridge to mint", async () => {
    try {
      await user1.invoke(token, "mint", {
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

  it("allows bridge to update accRewards", async () => {
    await bridge.invoke(token, "push_acc_rewards_per_token", {
      block_number: {
        high: 0,
        low: 1,
      },
      acc_rewards_per_token: {
        ray: {
          high: 0,
          low: BigInt(decimalToWad(2)),
        },
      },
    });

    const { acc_rewards_per_token } = await token.call(
      "get_acc_rewards_per_token"
    );

    expect(acc_rewards_per_token).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(2)),
    });
  });

  it("disallows rando from updating accRewards", async () => {
    try {
      await user1.invoke(token, "push_acc_rewards_per_token", {
        block_number: {
          high: 0,
          low: 2,
        },
        acc_rewards_per_token: {
          ray: {
            high: 0n,
            low: BigInt(decimalToWad(2)),
          },
        },
      });
    } catch (err: any) {
      expect(err.message).to.contain("Ownable: caller is not the owner");
    }
  });

  it("only allows increases in accRewards", async () => {
    try {
      await bridge.invoke(token, "push_acc_rewards_per_token", {
        block_number: {
          high: 0,
          low: 3,
        },
        acc_rewards_per_token: {
          ray: {
            high: 0,
            low: 0,
          },
        },
      });
    } catch (e) {
      expect.fail("allows decreasing accRewards");
    }
  });

  it("rejects old block numbers", async () => {
    try {
      await bridge.invoke(token, "push_acc_rewards_per_token", {
        block_number: {
          high: 0,
          low: 0,
        },
        acc_rewards_per_token: {
          ray: {
            high: 0,
            low: BigInt(decimalToWad(2)),
          },
        },
      });
    } catch (e) {
      expect.fail("accRewards accepted for old block number");
    }
  });

  it("returns correct user pending rewards before claim", async () => {
    const userClaimableRewards = await token.call(
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
    // We need to use a real bridge implementation now to see the
    // reward minting in action
    await owner.invoke(token, "set_l2_token_bridge", {
      l2_token_bridge: BigInt(tokenBridge.address),
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

  it("returns correct user pending rewards after claim", async () => {
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

  it("updates user accumulated rewards per token after claim", async () => {
    const userAccruedRewardsPerToken = await token.call(
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
    const user2RewAaveBalanceBeforeClaim = await rewAAVE.call(
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
    await bridge.invoke(token, "push_acc_rewards_per_token", {
      block_number: {
        high: 0,
        low: 2,
      },
      acc_rewards_per_token: {
        ray: {
          high: 0,
          low: BigInt(decimalToWad(3)),
        },
      },
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

    const user2RewAaveBalanceAfterClaim = await rewAAVE.call(
      "balanceOf",
      {
        account: BigInt(user2.starknetContract.address),
      }
    );

    expect(user2RewAaveBalanceAfterClaim.balance).to.deep.equal(
      user1ClaimableRewards.user_claimable_rewards
    );
  });

  it("Rewards of user are not lost if L2 tokens are burnt before claiming", async () => {
    //To have a non null rewards amount, we update the rewards index
    await bridge.invoke(token, "push_acc_rewards_per_token", {
      block_number: {
        low: 0,
        high: 3,
      },
      acc_rewards_per_token: {
        ray: {
          high: 0,
          low: BigInt(decimalToWad(4)),
        }
      },
    });

    //burn all ETHStaticAToken of user on L2==>this is the same as calling init_withdraw on bridge
    await bridge.invoke(token, "burn", {
      account: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(50)),
      },
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

    expect(user_claimable_rewards).to.deep.equal({
      high: 0n,
      low: BigInt(wadToRay(50)),
    });
  });
});
