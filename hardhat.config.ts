import { HardhatUserConfig } from "hardhat/types";
import "@shardlabs/starknet-hardhat-plugin";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });

chai.use(solidity);

const {
  PRIVATE_KEY,
  ALCHEMY_KEY,
  HOSTNAME_L1,
  HOSTNAME_L2,
  ETHERSCAN_API_KEY,
  L2_NETWORK,
} = process.env;

if (!PRIVATE_KEY || !ALCHEMY_KEY || !ETHERSCAN_API_KEY) {
  throw new Error("Please set your private keys in your .env file");
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "london",
        },
      },
      // to compile LendingPool contract
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  starknet: {
    venv: ".venv",
    network: L2_NETWORK,
    wallets: {
      OpenZeppelin: {
        accountName: "OpenZeppelin",
        modulePath:
          "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
        accountPath: "~/.starknet_accounts",
      },
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
    },
  },
  networks: {
    l2_testnet: {
      url: `http://${HOSTNAME_L2 || "localhost"}:5050`,
    },
    l1_testnet: {
      url: `http://${HOSTNAME_L1 || "localhost"}:8545`,
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
      accounts: [PRIVATE_KEY],
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_KEY}`,
      accounts: [PRIVATE_KEY],
    },
  },
};

export default config;
