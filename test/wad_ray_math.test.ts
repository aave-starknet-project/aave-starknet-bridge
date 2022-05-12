import {expect} from 'chai';
import {starknet} from 'hardhat';
import {StarknetContract} from 'hardhat/types';
import {TIMEOUT} from './constants';

describe('wad_ray_math', function () {
  this.timeout(TIMEOUT);

  let wadRayTestContract: StarknetContract;

  before(async () => {
    wadRayTestContract = await (await starknet.getContractFactory('wad_ray_tests')).deploy();
  });

  it('multiplies wads', async () => {
    await wadRayTestContract.call("test_wad_mul");
  });

  it('reverts on wad multiplication overflows', async () => {
    try {
      await wadRayTestContract.call("test_wad_mul_overflow");
      expect.fail("Overflow should revert")
    } catch {
    }
  });

  it('divides wads', async () => {
    await wadRayTestContract.call("test_wad_div");
  });

  it('reverts on wad divide by zero', async () => {
    try {
      await wadRayTestContract.call("test_wad_div_overflow");
      expect.fail("Overflow should revert")
    } catch {
    }
  });

  it('reverts on wad divide overflows', async () => {
    try {
      await wadRayTestContract.call("test_wad_div_overflow");
      expect.fail("Overflow should revert")
    } catch {
    }
  });

  it('multiplies rays', async () => {
    await wadRayTestContract.call("test_ray_mul");
  });

  it('reverts on ray multiplication overflows', async () => {
    try {
      await wadRayTestContract.call("test_ray_mul_overflow");
      expect.fail("Overflow should revert")
    } catch {
    }
  });

  it('divides rays', async () => {
    await wadRayTestContract.call("test_ray_div");
  });

  it('reverts on ray divide by zero', async () => {
    try {
      await wadRayTestContract.call("test_ray_div_overflow");
      expect.fail("Overflow should revert")
    } catch {
    }
  });

  it('reverts on ray divide overflows', async () => {
    try {
      await wadRayTestContract.call("test_ray_div_overflow");
      expect.fail("Overflow should revert")
    } catch {
    }
  });

  it('multiplies_no_rounding rays', async () => {
    await wadRayTestContract.call("test_ray_mul_no_rounding");
  });

  it('reverts on ray multiplication_no_rounding overflows', async () => {
    try {
      await wadRayTestContract.call("test_ray_mul_no_rounding_overflow");
      expect.fail("Overflow should revert")
    } catch {
    }
  });

  it('converts rays to wads', async () => {
    await wadRayTestContract.call("test_ray_to_wad");
  });

  it('converts wads to rays', async () => {
    await wadRayTestContract.call("test_wad_to_ray");
  });

  it('no_rounding converts rays to wads', async () => {
    await wadRayTestContract.call("test_ray_to_wad_no_rounding");
  });
})
