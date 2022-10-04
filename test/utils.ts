import { expect } from "chai";

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

export function uintFromParts(low: string, high: string): BigInt {
  return BigInt(high) * 2n ** 128n + BigInt(low);
}
export function removeHexPrefix(hex: string): string {
  return hex.replace(/^0x/, "");
}

export function addHexPrefix(hex: string): string {
  return `0x${removeHexPrefix(hex)}`;
}

export function encodeShortString(str: string) {
  if (!isASCII(str)) throw new Error(`${str} is not an ASCII string`);
  if (!isShortString(str)) throw new Error(`${str} is too long`);
  return addHexPrefix(
    str.replace(/./g, (char) => char.charCodeAt(0).toString(16))
  );
}

export function isASCII(str: string) {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(str);
}

// function to check if string has less or equal 31 characters
export function isShortString(str: string) {
  return str.length <= 31;
}
//gets event topic by index, provided a tx receipt
export function getEventTopic(receipt: any, eventName: string, index: number) {
  return receipt.events.find((event: any) => event.event === eventName).args[
    index
  ];
}
