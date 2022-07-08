import { BigNumber } from "@ethersproject/bignumber";
import { BigNumberish } from "ethers";
import { parseUnits } from "ethers/lib/utils";
export const PERCENTAGE_FACTOR = "10000";
export const HALF_PERCENTAGE = BigNumber.from(PERCENTAGE_FACTOR)
  .div(2)
  .toString();
export const WAD = BigNumber.from(10).pow(18).toString();
export const HALF_WAD = BigNumber.from(WAD).div(2).toString();
export const RAY = BigNumber.from(10).pow(27).toString();
export const HALF_RAY = BigNumber.from(RAY).div(2).toString();
export const WAD_RAY_RATIO = parseUnits("1", 9).toString();
export const oneEther = parseUnits("1", 18);
export const oneRay = parseUnits("1", 27);

declare module "@ethersproject/bignumber" {
  interface BigNumber {
    ray: () => BigNumber;
    wad: () => BigNumber;
    halfRay: () => BigNumber;
    halfWad: () => BigNumber;
    halfPercentage: () => BigNumber;
    percentageFactor: () => BigNumber;
    wadMul: (a: BigNumber) => BigNumber;
    wadDiv: (a: BigNumber) => BigNumber;
    rayMul: (a: BigNumber) => BigNumber;
    rayDiv: (a: BigNumber) => BigNumber;
    percentMul: (a: BigNumberish) => BigNumber;
    percentDiv: (a: BigNumberish) => BigNumber;
    rayToWad: () => BigNumber;
    wadToRay: () => BigNumber;
    negated: () => BigNumber;
  }
}

BigNumber.prototype.ray = (): BigNumber => BigNumber.from(RAY);
BigNumber.prototype.wad = (): BigNumber => BigNumber.from(WAD);
BigNumber.prototype.halfRay = (): BigNumber => BigNumber.from(HALF_RAY);
BigNumber.prototype.halfWad = (): BigNumber => BigNumber.from(HALF_WAD);
BigNumber.prototype.halfPercentage = (): BigNumber =>
  BigNumber.from(HALF_PERCENTAGE);
BigNumber.prototype.percentageFactor = (): BigNumber =>
  BigNumber.from(PERCENTAGE_FACTOR);

BigNumber.prototype.wadMul = function (other: BigNumber): BigNumber {
  return this.halfWad().add(this.mul(other)).div(this.wad());
};

BigNumber.prototype.wadDiv = function (other: BigNumber): BigNumber {
  const halfOther = other.div(2);
  return halfOther.add(this.mul(this.wad())).div(other);
};

BigNumber.prototype.rayMul = function (other: BigNumber): BigNumber {
  return this.halfRay().add(this.mul(other)).div(this.ray());
};

BigNumber.prototype.rayDiv = function (other: BigNumber): BigNumber {
  const halfOther = other.div(2);
  return halfOther.add(this.mul(this.ray())).div(other);
};

BigNumber.prototype.percentMul = function (bps: BigNumberish): BigNumber {
  return this.halfPercentage().add(this.mul(bps)).div(PERCENTAGE_FACTOR);
};

BigNumber.prototype.percentDiv = function (bps: BigNumberish): BigNumber {
  const halfBps = BigNumber.from(bps).div(2);
  return halfBps.add(this.mul(PERCENTAGE_FACTOR)).div(bps);
};

BigNumber.prototype.rayToWad = function (): BigNumber {
  const halfRatio = BigNumber.from(WAD_RAY_RATIO).div(2);
  return halfRatio.add(this).div(WAD_RAY_RATIO);
};

BigNumber.prototype.wadToRay = function (): BigNumber {
  return this.mul(WAD_RAY_RATIO);
};

BigNumber.prototype.negated = function (): BigNumber {
  return this.mul(-1);
};
