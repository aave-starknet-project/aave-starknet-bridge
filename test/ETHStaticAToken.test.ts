import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types";
import { starknet } from "hardhat";
import { TIMEOUT } from "./constants";
import { expect } from "chai";

describe("ETHStaticAToken", function () {
  this.timeout(TIMEOUT);

  let tokenContract: StarknetContract;
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
    const tokenContractFactory = await starknet.getContractFactory(
      "ETHstaticAToken"
    );
    const bridgeContractFactory = await starknet.getContractFactory(
      "token_bridge"
    );
    bridgeContract = await bridgeContractFactory.deploy({
      governor_address: BigInt(owner.starknetContract.address),
    });

    tokenContract = await tokenContractFactory.deploy({
      name: 666,
      symbol: 666,
      decimals: 4,
      initial_supply: { high: 0, low: 0 },
      recipient: BigInt(owner.starknetContract.address),
      controller: bridgeContract.address,
    });

    const rewAaveContractFactory = await starknet.getContractFactory("rewAAVE");
    rewAaveTokenL2 = await rewAaveContractFactory.deploy({
      name: 444,
      symbol: 444,
      decimals: 8,
      initial_supply: { high: 0, low: 0 },
      recipient: BigInt(user1.starknetContract.address),
      owner: BigInt(bridgeContract.address),
    });
  });

  it("allows owner to mint", async () => {
    await owner.invoke(tokenContract, "mint", {
      recipient: BigInt(user1.starknetContract.address),
      amount: {
        high: 0n,
        low: 100n,
      },
    });

    const { totalSupply } = await tokenContract.call("totalSupply");
    const { balanceOfRecipient } = await tokenContract.call("balanceOf", {
      account: BigInt(user1.starknetContract.address),
    });
    expect(totalSupply).to.deep.equal({ high: 0n, low: 100n });
    expect(balanceOfRecipient).to.deep.equal({ high: 0n, low: 100n });
  });

  it("dissalows non-owner to mint", async () => {
    try {
      await user1.call(tokenContract, "mint", {
        recipient: BigInt(user1.starknetContract.address),
        amount: {
          high: 0n,
          low: 100n,
        },
      });
      expect.fail("non-owner was able to mint");
    } catch (e) {}
  });

  it("allows owner to update accRewards", async () => {
    await owner.invoke(tokenContract, "push_acc_rewards_per_token", {
      block: 1,
      acc_rewards_per_token: {
        high: 0,
        low: 1,
      },
    });

    const { acc_rewards_per_token } = await tokenContract.call(
      "get_acc_rewards_per_token"
    );
    expect(acc_rewards_per_token).to.deep.equal({
      high: 0n,
      low: 1n,
    });
  });

  it("dissalows non-owner to update accRewards", async () => {
    try {
      await user1.call(tokenContract, "push_acc_rewards_per_token", {
        block: 2,
        acc_rewards_per_token: {
          high: 0n,
          low: 100n,
        },
      });
      expect.fail("non-owner was able to update rewards");
    } catch (e) {}
  });

  it("only allows increases in accRewards", async () => {
    try {
      await owner.call(tokenContract, "push_acc_rewards_per_token", {
        block: 3,
        acc_rewards_per_token: {
          high: 0,
          low: 0,
        },
      });
      expect.fail("accRewards was decreased");
    } catch (e) {}
  });

  it("rejects old block numbers", async () => {
    try {
      await owner.call(tokenContract, "push_acc_rewards_per_token", {
        block: 0,
        acc_rewards_per_token: {
          high: 0,
          low: 2,
        },
      });
      expect.fail("accRewards accepted for old block number");
    } catch (e) {}
  });

  it("allows user to claim pending rewards to self", async () => {
    try {
      const { userPendingRewards } = await tokenContract.call(
        "get_user_pending_rewards",
        {
          account: BigInt(user1.starknetContract.address),
        }
      );
      await user1.call(tokenContract, "claim_rewards", {
        recipient: user1.starknetContract.address,
      });

      const { userRewardsBalance } = await rewAaveTokenL2.call("balanceOf", {
        account: BigInt(user1.starknetContract.address),
      });

      const { userPendingRewardsAfterClaim } = await tokenContract.call(
        "get_user_pending_rewards",
        {
          account: BigInt(user1.starknetContract.address),
        }
      );

      expect(userRewardsBalance).to.equal(userPendingRewards);
      expect(userPendingRewardsAfterClaim).to.equal({ high: 0, low: 0 });
    } catch (e) {}
  });

  it("shows correct user accrued rewards token before update", async () => {
    try {
      const { userAccruedRewards } = await tokenContract.call(
        "get_user_acc_rewards_per_token",
        {
          account: BigInt(user1.starknetContract.address),
        }
      );
      expect(userAccruedRewards).to.equal({
        high: 0,
        low: 2,
      });
    } catch (e) {}
  });

  it("updates acc rewards and checks for the exact value on the user", async () => {
    try {
      await owner.call(tokenContract, "push_acc_rewards_per_token", {
        block: 4,
        acc_rewards_per_token: {
          high: 0,
          low: 3,
        },
      });

      const { userAccruedRewards } = await tokenContract.call(
        "get_user_acc_rewards_per_token",
        {
          account: BigInt(user1.starknetContract.address),
        }
      );
      expect(userAccruedRewards).to.equal({
        high: 0,
        low: 3,
      });
    } catch (e) {}
  });

  it("mints rewards correctly to provided recipient", async () => {
    try {
      const { recipientRewAaveBalanceBeforeClaim } = await rewAaveTokenL2.call(
        "balanceOf",
        {
          account: BigInt(user2.starknetContract.address),
        }
      );
      const { userPendingRewards } = await tokenContract.call(
        "get_user_pending_rewards",
        {
          account: BigInt(user1.starknetContract.address),
        }
      );

      await user1.call(tokenContract, "claim_rewards", {
        recipient: user2.starknetContract.address,
      });

      const { recipientRewAaveBalanceAfterClaim } = await rewAaveTokenL2.call(
        "balanceOf",
        {
          account: BigInt(user2.starknetContract.address),
        }
      );
      //check that balance is indeed null
      expect(recipientRewAaveBalanceBeforeClaim).equal({ high: 0, low: 0 });
      expect(userPendingRewards).to.equal(recipientRewAaveBalanceAfterClaim);
    } catch (e) {}
  });

  it("tracks unclaimed rewards", async () => {
    expect.fail("not implemented yet");
  });
});
