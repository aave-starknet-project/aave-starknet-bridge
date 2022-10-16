import { A_DAI, A_USDC } from "./addresses";

//stores the metadata related to staticATokens to be deployed on l2
// export const allowlistedStaticATokensData = [
//   { symbol: "saDAI", name: "staticADai", decimals: 18n },
//   { symbol: "saUSDC", name: "staticAUsdc", decimals: 6n },
// ];
export const allowlistedStaticATokensData = [] as any;

//Stores addresses of allowlisted aTokens to be approved on the l1 bridge at initialization
// export const allowlistedATokensAddresses = [A_DAI, A_USDC];
export const allowlistedATokensAddresses = [];

//Stores the max balance of each aToken on the l1 bridge (needs to be updated)
export const ceilings = [];
