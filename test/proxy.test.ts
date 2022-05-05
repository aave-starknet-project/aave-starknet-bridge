import { StarknetContract, Account } from "hardhat/types";
import { starknet } from "hardhat";
import { TIMEOUT } from "./constants";
import { expect } from "chai";

describe("Proxy", function () {
  this.timeout(TIMEOUT);

  let proxyTokenContract: StarknetContract;
  let tokenImplementationA: StarknetContract;
  let tokenImplementationB: StarknetContract;
  let tokenContract: StarknetContract;
  let owner: Account;
  let randomUser: Account;

  before(async () => {
    const TokenContractFactory = await starknet.getContractFactory(
      "ETHstaticAToken"
    );
    const ProxyFactory = await starknet.getContractFactory("proxy");

    owner = await starknet.deployAccount("OpenZeppelin");
    randomUser = await starknet.deployAccount("OpenZeppelin");

    tokenImplementationA = await TokenContractFactory.deploy();
    tokenImplementationB = await TokenContractFactory.deploy();

    proxyTokenContract = await ProxyFactory.deploy({
      proxy_admin: owner.starknetContract.address,
    });

    await owner.invoke(proxyTokenContract, "initialize_proxy", {
      implementation_address: BigInt(tokenImplementationA.address),
    });
    tokenContract = TokenContractFactory.getContractAt(
      proxyTokenContract.address
    );
  });

  it("Verify that owner is the proxy admin", async () => {
    const { admin } = await proxyTokenContract.call("get_admin", {});
    expect(admin).to.equal(BigInt(owner.starknetContract.address));
  });

  it("initialize token A through proxy", async () => {
    await owner.invoke(tokenContract, "initialize_ETHstaticAToken", {
      name: 666n,
      symbol: 666n,
      decimals: 4n,
      initial_supply: { high: 0n, low: 0n },
      recipient: BigInt(owner.starknetContract.address),
      controller: BigInt(owner.starknetContract.address),
    });

    const { name } = await tokenContract.call("name");
    expect(name).to.equal(666n);

    const { symbol } = await tokenContract.call("symbol");
    expect(symbol).to.equal(666n);

    const { decimals } = await tokenContract.call("decimals");
    expect(decimals).to.equal(4n);
  });

  it("disallows random user to upgrade", async () => {
    try {
      await randomUser.invoke(proxyTokenContract, "upgrade_implementation", {
        new_implementation: BigInt(tokenImplementationB.address),
      });
    } catch (e: any) {
      expect(e.message).to.contain("Proxy: caller is not admin");
    }
  });

  it("allows owner (proxy_admin) to change proxy_admin to random user", async () => {
    await owner.invoke(proxyTokenContract, "change_proxy_admin", {
      new_admin: BigInt(randomUser.starknetContract.address),
    });

    const { admin } = await proxyTokenContract.call("get_admin", {});
    expect(admin).to.equal(BigInt(randomUser.starknetContract.address));
  });

  it("allows owner to upgrade", async () => {
    await randomUser.invoke(proxyTokenContract, "upgrade_implementation", {
      new_implementation: BigInt(tokenImplementationB.address),
    });
    const { implementation } = await proxyTokenContract.call(
      "get_implementation",
      {}
    );
    expect(implementation).to.equal(BigInt(tokenImplementationB.address));
  });
});
