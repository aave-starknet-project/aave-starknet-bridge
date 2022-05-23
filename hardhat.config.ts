import { HardhatUserConfig } from "hardhat/types";
import "@shardlabs/starknet-hardhat-plugin";
import "@nomiclabs/hardhat-ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });

chai.use(solidity);

const { PRIVATE_KEY, ALCHEMY_KEY } = process.env;

/* if (!PRIVATE_KEY) {
  throw new Error("Please set your PRIVATE_KEY in your .env file");
} */

/* if (!ALCHEMY_KEY) {
  throw new Error("Please set your ALCHEMY_KEY in your .env file");
} */
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      // for @aave/protocol-v2 contracts
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ],
  },
  starknet: {
    venv: ".venv",
    network: "l2_testnet",
    wallets: {
      OpenZeppelin: {
        accountName: "OpenZeppelin",
        modulePath:
          "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
        accountPath: "~/.starknet_accounts",
      },
    },
  },
  networks: {
    l2_testnet: {
      url: "http://localhost:5000",
    },
    l1_testnet: {
      url: "http://localhost:8545",
    },
    /* mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
      accounts: [PRIVATE_KEY],
    }, */
  },
};

export default config;
