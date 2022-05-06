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

  let l2token: StarknetContract;
  let bridgeContract: StarknetContract;
  let ProxyFactoryL2: StarknetContractFactory;
  let proxyTokenBridgeL2: StarknetContract;
  let proxiedTokenBridgeL2: StarknetContract;
  let proxyL2Token: StarknetContract;
  let proxyRewAAVEToken: StarknetContract;
  let proxiedL2Token: StarknetContract;
  let proxiedRewAAVE: StarknetContract;
  let rewAaveTokenImplementation: StarknetContract;
  let owner: Account;
  let user1: Account;
  let user2: Account;

  before(async () => {
    owner = await starknet.deployAccount("OpenZeppelin");
    user1 = await starknet.deployAccount("OpenZeppelin");
    user2 = await starknet.deployAccount("OpenZeppelin");
  });

  it("should deploy", async () => {
    const L2TokenFactory = await starknet.getContractFactory("ETHstaticAToken");
    const rewAaveContractFactory = await starknet.getContractFactory("rewAAVE");
    const bridgeContractFactory = await starknet.getContractFactory(
      "token_bridge"
    );
    ProxyFactoryL2 = await starknet.getContractFactory("proxy");

    proxyTokenBridgeL2 = await ProxyFactoryL2.deploy({
      proxy_admin: BigInt(owner.starknetContract.address),
    });
    proxyL2Token = await ProxyFactoryL2.deploy({
      proxy_admin: BigInt(owner.starknetContract.address),
    });

    bridgeContract = await bridgeContractFactory.deploy();

    l2token = await L2TokenFactory.deploy();

    proxiedL2Token = L2TokenFactory.getContractAt(proxyL2Token.address);
    proxiedTokenBridgeL2 = bridgeContractFactory.getContractAt(
      proxyTokenBridgeL2.address
    );

    await owner.invoke(proxyTokenBridgeL2, "initialize_proxy", {
      implementation_address: BigInt(bridgeContract.address),
    });
    await owner.invoke(proxyL2Token, "initialize_proxy", {
      implementation_address: BigInt(l2token.address),
    });

    await owner.invoke(proxiedL2Token, "initialize_ETHstaticAToken", {
      name: 1234n,
      symbol: 123n,
      decimals: 18n,
      initial_supply: { high: 0n, low: 0n },
      recipient: BigInt(owner.starknetContract.address),
      owner: BigInt(owner.starknetContract.address),
      l2_token_bridge: BigInt(proxiedTokenBridgeL2.address),
    });

    await owner.invoke(proxiedTokenBridgeL2, "initialize_token_bridge", {
      governor_address: BigInt(owner.starknetContract.address),
    });

    rewAaveTokenImplementation = await rewAaveContractFactory.deploy();

    proxyRewAAVEToken = await ProxyFactoryL2.deploy({
      proxy_admin: BigInt(owner.starknetContract.address),
    });

    await owner.invoke(proxyRewAAVEToken, "initialize_proxy", {
      implementation_address: BigInt(rewAaveTokenImplementation.address),
    });
    proxiedRewAAVE = rewAaveContractFactory.getContractAt(
      proxyRewAAVEToken.address
    );

    await owner.invoke(proxiedRewAAVE, "initialize_rewAAVE", {
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: { high: 0, low: 0 },
      recipient: BigInt(user1.starknetContract.address),
      owner: BigInt(proxyTokenBridgeL2.address),
    });

    //set rewAave address on l2 token bridge
    await owner.invoke(proxiedTokenBridgeL2, "set_reward_token", {
      reward_token: BigInt(proxiedRewAAVE.address),
    });

    //approve l1_l2 token bridge
    await owner.invoke(proxiedTokenBridgeL2, "approve_bridge", {
      l1_token: BigInt(L1_TEST_ADDRESS),
      l2_token: BigInt(proxiedL2Token.address),
    });
  });

  it("allows owner to set l2 token bridge", async () => {
    await owner.invoke(proxiedL2Token, "set_l2_token_bridge", {
      l2_token_bridge: BigInt(proxiedTokenBridgeL2.address),
    });
  });
  it("disallows non-owner to set l2 token bridge", async () => {
    try {
      await user1.invoke(proxiedL2Token, "set_l2_token_bridge", {
        l2_token_bridge: BigInt(bridgeContract.address),
      });
    } catch (err: any) {
      expect(err.message).to.contain("Ownable: caller is not the owner");
    }
  });
  it("allows owner to mint", async () => {
    await owner.invoke(proxiedL2Token, "mint", {
      recipient: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(100)),
      },
    });

    const { totalSupply } = await proxiedL2Token.call("totalSupply");

    expect(totalSupply).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(100)),
    });
  });

  it("allows owner to burn", async () => {
    await owner.invoke(proxiedL2Token, "burn", {
      account: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(50)),
      },
    });

    const { balance } = await proxiedL2Token.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(balance).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(50)),
    });
  });

  it("disallows non-owner to mint", async () => {
    try {
      await user1.invoke(proxiedL2Token, "mint", {
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
    await owner.invoke(proxiedL2Token, "push_acc_rewards_per_token", {
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

    const { acc_rewards_per_token } = await proxiedL2Token.call(
      "get_acc_rewards_per_token"
    );

    expect(acc_rewards_per_token).to.deep.equal({
      high: 0n,
      low: BigInt(decimalToWad(2)),
    });
  });

  it("disallows non-owner to update accRewards", async () => {
    try {
      await user1.invoke(proxiedL2Token, "push_acc_rewards_per_token", {
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
      await owner.invoke(proxiedL2Token, "push_acc_rewards_per_token", {
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
      await owner.invoke(proxiedL2Token, "push_acc_rewards_per_token", {
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
    const userClaimableRewards = await proxiedL2Token.call(
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
    const user1ClaimableRewards = await proxiedL2Token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    await user1.invoke(proxiedL2Token, "claim_rewards", {
      recipient: BigInt(user1.starknetContract.address),
    });

    const user1RewardsBalance = await proxiedRewAAVE.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(user1RewardsBalance.balance).to.deep.equal(
      user1ClaimableRewards.user_claimable_rewards
    );
  });

  it("returns correct user pending rewards after claim", async () => {
    const userClaimableRewards = await proxiedL2Token.call(
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
    const userAccruedRewardsPerToken = await proxiedL2Token.call(
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
    const user2RewAaveBalanceBeforeClaim = await proxiedRewAAVE.call(
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
    await owner.invoke(proxiedL2Token, "push_acc_rewards_per_token", {
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

    const user1ClaimableRewards = await proxiedL2Token.call(
      "get_user_claimable_rewards",
      {
        user: BigInt(user1.starknetContract.address),
      }
    );

    //claim rewards to user2
    await user1.invoke(proxiedL2Token, "claim_rewards", {
      recipient: BigInt(user2.starknetContract.address),
    });

    const user2RewAaveBalanceAfterClaim = await proxiedRewAAVE.call(
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
    await owner.invoke(proxiedL2Token, "push_acc_rewards_per_token", {
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
    await owner.invoke(proxiedL2Token, "burn", {
      account: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: BigInt(decimalToWad(50)),
      },
    });

    const { balance } = await proxiedL2Token.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });

    expect(balance).to.deep.equal({
      high: 0n,
      low: 0n,
    });

    const { user_claimable_rewards } = await proxiedL2Token.call(
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
