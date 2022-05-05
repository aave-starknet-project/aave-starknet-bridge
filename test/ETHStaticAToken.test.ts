import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import { starknet } from "hardhat";
import { TIMEOUT, L1_TEST_ADDRESS } from "./constants";
import { expect } from "chai";
import { wadToRay, decimalToWad } from "../helpers/rayMath";

describe("ETHStaticAToken", function () {
  this.timeout(TIMEOUT);

  let l2ProxyFactory: StarknetContractFactory;
  let ETHStaticATokenProxy: StarknetContract;
  let ETHStaticATokenImplementation: StarknetContract;
  let ETHStaticAToken: StarknetContract;
  let l2TokenBridgeProxy: StarknetContract;
  let l2TokenBridgeImplementation: StarknetContract;
  let l2TokenBridge: StarknetContract;
  let l2RewAaveProxy: StarknetContract;
  let l2RewAaveImplementation: StarknetContract;
  let l2RewAave: StarknetContract;
  let owner: Account;
  let user1: Account;
  let user2: Account;

  before(async () => {
    owner = await starknet.deployAccount("OpenZeppelin");
    user1 = await starknet.deployAccount("OpenZeppelin");
    user2 = await starknet.deployAccount("OpenZeppelin");
  });

  it("should deploy", async () => {
    const ETHStaticATokenFactory = await starknet.getContractFactory(
      "ETHstaticAToken"
    );
    const rewAaveContractFactory = await starknet.getContractFactory("rewAAVE");
    const l2TokenBridgeImplementationFactory =
      await starknet.getContractFactory("token_bridge");
    l2ProxyFactory = await starknet.getContractFactory("proxy");

    l2TokenBridgeProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(owner.starknetContract.address),
    });
    ETHStaticATokenProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(owner.starknetContract.address),
    });

    l2TokenBridgeImplementation =
      await l2TokenBridgeImplementationFactory.deploy();

    ETHStaticATokenImplementation = await ETHStaticATokenFactory.deploy();

    ETHStaticAToken = ETHStaticATokenFactory.getContractAt(
      ETHStaticATokenProxy.address
    );
    l2TokenBridge = l2TokenBridgeImplementationFactory.getContractAt(
      l2TokenBridgeProxy.address
    );

    await owner.invoke(l2TokenBridgeProxy, "initialize_proxy", {
      implementation_address: BigInt(l2TokenBridgeImplementation.address),
    });
    await owner.invoke(ETHStaticATokenProxy, "initialize_proxy", {
      implementation_address: BigInt(ETHStaticATokenImplementation.address),
    });

    await owner.invoke(ETHStaticAToken, "initialize_ETHstaticAToken", {
      name: 1234n,
      symbol: 123n,
      decimals: 18n,
      initial_supply: { high: 0n, low: 0n },
      recipient: BigInt(user1.starknetContract.address),
      controller: BigInt(owner.starknetContract.address),
    });

    await owner.invoke(l2TokenBridge, "initialize_token_bridge", {
      governor_address: BigInt(owner.starknetContract.address),
    });

    l2RewAaveImplementation = await rewAaveContractFactory.deploy();

    l2RewAaveProxy = await l2ProxyFactory.deploy({
      proxy_admin: BigInt(owner.starknetContract.address),
    });

    await owner.invoke(l2RewAaveProxy, "initialize_proxy", {
      implementation_address: BigInt(l2RewAaveImplementation.address),
    });
    l2RewAave = rewAaveContractFactory.getContractAt(l2RewAaveProxy.address);

    await owner.invoke(l2RewAave, "initialize_rewAAVE", {
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: { high: 0, low: 0 },
      recipient: BigInt(user1.starknetContract.address),
      owner: BigInt(l2TokenBridgeProxy.address),
    });

    //set rewAave address on l2 token bridge
    await owner.invoke(l2TokenBridge, "set_reward_token", {
      reward_token: BigInt(l2RewAave.address),
    });

    //approve l1_l2 token bridge
    await owner.invoke(l2TokenBridge, "approve_bridge", {
      l1_token: BigInt(L1_TEST_ADDRESS),
      l2_token: BigInt(ETHStaticAToken.address),
    });
  });

  it("allows owner to set l2 token bridge", async () => {
    await owner.invoke(ETHStaticAToken, "set_l2_token_bridge", {
      l2_token_bridge_: BigInt(l2TokenBridge.address),
    });
  });
  it("disallows non-owner to set l2 token bridge", async () => {
    try {
      await user1.invoke(ETHStaticAToken, "set_l2_token_bridge", {
        l2_token_bridge_: BigInt(l2TokenBridgeImplementation.address),
      });
    } catch (err: any) {
      expect(err.message).to.contain("Ownable: caller is not the owner");
    }
  });
  it("allows owner to mint", async () => {
    await owner.invoke(ETHStaticAToken, "mint", {
      recipient: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(100)),
      },
    });

    const { totalSupply } = await ETHStaticAToken.call("totalSupply");

    expect(totalSupply).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(100)),
    });
  });

  it("allows owner to burn", async () => {
    await owner.invoke(ETHStaticAToken, "burn", {
      account: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(50)),
      },
    });

    const { balance } = await ETHStaticAToken.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(balance).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(50)),
    });
  });

  it("disallows non-owner to mint", async () => {
    try {
      await user1.invoke(ETHStaticAToken, "mint", {
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
    await owner.invoke(ETHStaticAToken, "push_acc_rewards_per_token", {
      block_number: {
        high: 0,
        low: 1,
      },
      acc_rewards_per_token: {
        high: 0,
        low: BigInt(decimalToWad(2)),
      },
    });

    const { acc_rewards_per_token } = await ETHStaticAToken.call(
      "get_acc_rewards_per_token"
    );

    expect(acc_rewards_per_token).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(2)),
    });
  });

  it("disallows non-owner to update accRewards", async () => {
    try {
      await user1.invoke(ETHStaticAToken, "push_acc_rewards_per_token", {
        block_number: {
          high: 0,
          low: 2,
        },
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
      await owner.invoke(ETHStaticAToken, "push_acc_rewards_per_token", {
        block_number: {
          high: 0,
          low: 3,
        },
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
      await owner.invoke(ETHStaticAToken, "push_acc_rewards_per_token", {
        block_number: {
          high: 0,
          low: 0,
        },
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
    const userClaimableRewards = await ETHStaticAToken.call(
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
    const user1ClaimableRewards = await ETHStaticAToken.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    await user1.invoke(ETHStaticAToken, "claim_rewards", {
      recipient: BigInt(user1.starknetContract.address),
    });

    const user1RewardsBalance = await l2RewAave.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(user1RewardsBalance.balance).to.deep.equal(
      user1ClaimableRewards.user_claimable_rewards
    );
  });

  it("returns correct user pending rewards after claim", async () => {
    const userClaimableRewards = await ETHStaticAToken.call(
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
    const userAccruedRewardsPerToken = await ETHStaticAToken.call(
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
    const user2RewAaveBalanceBeforeClaim = await l2RewAave.call("balanceOf", {
      account: BigInt(user2.starknetContract.address),
    });

    //check that balance is indeed zero
    expect(user2RewAaveBalanceBeforeClaim.balance).to.deep.equal({
      high: 0n,
      low: 0n,
    });

    //Update the acc rewards per token first
    await owner.invoke(ETHStaticAToken, "push_acc_rewards_per_token", {
      block_number: {
        high: 0,
        low: 2,
      },
      acc_rewards_per_token: {
        high: 0,
        low: BigInt(decimalToWad(3)),
      },
    });

    const user1ClaimableRewards = await ETHStaticAToken.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    //claim rewards to user2
    await user1.invoke(ETHStaticAToken, "claim_rewards", {
      recipient: BigInt(user2.starknetContract.address),
    });

    const user2RewAaveBalanceAfterClaim = await l2RewAave.call("balanceOf", {
      account: BigInt(user2.starknetContract.address),
    });

    expect(user2RewAaveBalanceAfterClaim.balance).to.deep.equal(
      user1ClaimableRewards.user_claimable_rewards
    );
  });

  it("Rewards of user are not lost if l2 tokens are burnt before claiming", async () => {
    //To have a non null rewards amount, we update the rewards index
    await owner.invoke(ETHStaticAToken, "push_acc_rewards_per_token", {
      block_number: {
        low: 0,
        high: 3,
      },
      acc_rewards_per_token: {
        high: 0,
        low: BigInt(decimalToWad(4)),
      },
    });

    //burn all ETHStaticAToken of user on l2==>this is the same as calling init_withdraw on bridge
    await owner.invoke(ETHStaticAToken, "burn", {
      account: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(50)),
      },
    });

    const { balance } = await ETHStaticAToken.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(balance).to.deep.equal({
      high: 0n,
      low: 0n,
    });

    const { user_claimable_rewards } = await ETHStaticAToken.call(
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
