import { A_DAI, A_USDC, A_USDT } from "./addresses";

//stores the metadata related to staticATokens to be deployed on l2
export const allowlistedStaticATokensData = [
  {
    symbol: "staticV2EthADAI",
    name: "static Aave v2 Ethereum aDAI",
    decimals: 18n,
  },
  {
    symbol: "staticV2EthAUSDC",
    name: "static Aave v2 Ethereum aUSDC",
    decimals: 6n,
  },
  {
    symbol: "staticV2EthAUSDT",
    name: "static Aave v2 Ethereum aUSDT",
    decimals: 6n,
  },
];
// export const allowlistedStaticATokensData = [] as any;

//Stores addresses of allowlisted aTokens to be approved on the l1 bridge at initialization
export const allowlistedATokensAddresses = [A_DAI, A_USDC, A_USDT];

//Stores the max balance of each aToken on the l1 bridge (needs to be updated)
export const ceilings = [];
