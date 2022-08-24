//stores the metadata related to staticATokens to be deployed on l2
export const allowlistedStaticATokensData = [
  { symbol: "saDAI", name: "staticADai", decimals: 18n },
];
//Stores addresesses of allowlisted aTokens to be approved on the l1 bridge at initialization
export const allowlistedATokensAddresses = [
  "0x028171bCA77440897B824Ca71D1c56caC55b68A3",
];
//Stores the max balance of each aToken on the l1 bridge (needs to be updated)
export const ceilings = [BigInt(10 ** 18)];
