//stores the metadata related to staticATokens to be deployed on l2
export const allowlistedStaticATokensData = [
  { symbol: "saDAI", name: "staticADai", decimals: 18n },
  { symbol: "saUSDC", name: "staticAUsdc", decimals: 6n },
];
//Stores addresesses of allowlisted aTokens to be approved on the l1 bridge at initialization
export const allowlistedATokensAddresses = [
  "0x028171bCA77440897B824Ca71D1c56caC55b68A3", //aDai token on mainnet
  "0xBcca60bB61934080951369a648Fb03DF4F96263C", //aUsdc token on mainnet
];
