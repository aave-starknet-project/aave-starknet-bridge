//stores the metadata related to staticATokens to be deployed on l2
export const allowlistedStaticATokensData = [
  { symbol: "saDAI", name: "staticADai", decimals: 18n },
  { symbol: "saUSDC", name: "staticAUsdc", decimals: 6n },
];
//Stores addresesses of allowlisted aTokens to be approved on the l1 bridge at initialization
export const allowlistedATokensAddresses = [
  "0xafa88d6c6cd4f16e9fe2827178c59f37bd387b59", //aDai token on Goerli
  "0x935c0f6019b05c787573b5e6176681282a3f3e05", //aUsdc token on Goerli
];
//Stores the max balance of each aToken on the l1 bridge (needs to be updated)
export const ceilings = [BigInt(10 ** 18)];
