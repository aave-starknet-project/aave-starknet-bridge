import {HardhatUserConfig} from "hardhat/types";
import "@shardlabs/starknet-hardhat-plugin";
import "@nomiclabs/hardhat-ethers";
import chai from "chai";
import {solidity} from "ethereum-waffle";

chai.use(solidity);

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      // for @swp0x0/protocol-v2 contracts
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
      // for @joriksch/sg-contracts contracts
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
    ],
  },
  starknet: {
    venv: ".venv",
    network: "devnet",
    wallets: {
      OpenZeppelin: {
        accountName: "OpenZeppelin",
        modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
        accountPath: "~/.starknet_accounts"
      }
    }
  },
  networks: {
    devnet: {
      url: "http://localhost:5000"
    },
  },
};

export default config;
