import {expect} from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

export async function initStaticATokenProxy(implementationAddress : string, l1tokenProxy : Contract, initArgs : string[]): Promise<Contract> {
    const ABI = ["function initialize(address pool, address aToken, string calldata staticATokenName, string calldata staticATokenSymbol, address l1TokenBridge)"];
    const iface = new ethers.utils.Interface(ABI);
    const l1tokenInitData = iface.encodeFunctionData("initialize", initArgs);
    await l1tokenProxy.initialize(implementationAddress, l1tokenInitData);
    const l1token = await ethers.getContractAt("StaticATokenLM", l1tokenProxy.address);
    await l1token.deployed();

    return l1token;
}

/**
 * Receives a hex address, converts it to bigint, converts it back to hex.
 * This is done to strip leading zeros.
 * @param address a hex string representation of an address
 * @returns an adapted hex string representation of the address
 */
export function adaptAddress(address: string) {
  return "0x" + BigInt(address).toString(16);
}

/**
 * Expects address equality after adapting them.
 * @param actual
 * @param expected
 */
export function expectAddressEquality(actual: string, expected: string) {
  expect(adaptAddress(actual)).to.equal(adaptAddress(expected));
}

export function uintFromParts(low: string, high: string) : BigInt{
  return BigInt(high) *(2n ** 128n) + BigInt(low);
}
