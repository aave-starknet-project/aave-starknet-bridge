from starkware.cairo.common.uint256 import (
<<<<<<< HEAD
    Uint256, uint256_add, uint256_sub, uint256_mul, uint256_unsigned_div_rem, uint256_le)

# WAD = 1 * 10 ^ 18
const WAD = 10 ** 18
const HALF_WAD = WAD / 2

# RAY = 1 * 10 ^ 27
const RAY = 10 ** 27
=======
  Uint256,
  uint256_add,
  uint256_sub,
  uint256_mul,
  uint256_unsigned_div_rem,
  uint256_le
)

# WAD = 1 * 10 ^ 18
const WAD      = 10 ** 18
const HALF_WAD = WAD / 2

# RAY = 1 * 10 ^ 27
const RAY      = 10 ** 27
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
const HALF_RAY = RAY / 2

const UINT128_MAX = 2 ** 129 - 1

# WAD_RAY_RATIO = 1 * 10 ^ 9
const WAD_RAY_RATIO = 10 ** 9
const HALF_WAD_RAY_RATION = WAD_RAY_RATIO / 2

<<<<<<< HEAD
func ray() -> (ray : Uint256):
    return (Uint256(RAY, 0))
end

func wad() -> (wad : Uint256):
    return (Uint256(WAD, 0))
end

func half_ray() -> (half_ray : Uint256):
    return (Uint256(HALF_RAY, 0))
end

func half_wad() -> (half_wad : Uint256):
    return (Uint256(HALF_WAD, 0))
end

func wad_ray_ratio() -> (ratio : Uint256):
    return (Uint256(WAD_RAY_RATIO, 0))
end

func half_wad_ray_ratio() -> (ratio : Uint256):
    return (Uint256(HALF_WAD_RAY_RATION, 0))
end

func uint256_max() -> (max : Uint256):
    return (Uint256(UINT128_MAX, UINT128_MAX))
end

func wad_mul{range_check_ptr}(a : Uint256, b : Uint256) -> (res : Uint256):
    alloc_locals
    if a.high + a.low == 0:
        return (Uint256(0, 0))
    end
    if b.high + b.low == 0:
        return (Uint256(0, 0))
    end

    let (UINT256_MAX) = uint256_max()
    let (HALF_WAD_UINT) = half_wad()
    let (WAD_UINT) = wad()

    with_attr error_message("WAD multiplication overflow"):
        let (bound) = uint256_sub(UINT256_MAX, HALF_WAD_UINT)
        let (quotient, rem) = uint256_unsigned_div_rem(bound, b)
        let (le) = uint256_le(a, quotient)
        assert le = 1
    end

    let (ab, _) = uint256_mul(a, b)
    let (abHW, _) = uint256_add(ab, HALF_WAD_UINT)
    let (res, _) = uint256_unsigned_div_rem(abHW, WAD_UINT)
    return (res)
end

func wad_div{range_check_ptr}(a : Uint256, b : Uint256) -> (res : Uint256):
    alloc_locals
    with_attr error_message("WAD divide by zero"):
        if b.high + b.low == 0:
            assert 1 = 0
        end
    end

    let (halfB, _) = uint256_unsigned_div_rem(b, Uint256(2, 0))

    let (UINT256_MAX) = uint256_max()
    let (WAD_UINT) = wad()

    with_attr error_message("WAD multiplication overflow"):
        let (bound) = uint256_sub(UINT256_MAX, halfB)
        let (quo, _) = uint256_unsigned_div_rem(bound, WAD_UINT)
        let (le) = uint256_le(a, quo)
        assert le = 1
    end

    let (aWAD, _) = uint256_mul(a, WAD_UINT)
    let (aWADHalfB, _) = uint256_add(aWAD, halfB)
    let (res, _) = uint256_unsigned_div_rem(aWADHalfB, b)
    return (res)
end

func ray_mul{range_check_ptr}(a : Uint256, b : Uint256) -> (res : Uint256):
    alloc_locals
    if a.high + a.low == 0:
        return (Uint256(0, 0))
    end
    if b.high + b.low == 0:
        return (Uint256(0, 0))
    end

    let (UINT256_MAX) = uint256_max()
    let (HALF_RAY_UINT) = half_ray()
    let (RAY_UINT) = ray()

    with_attr error_message("RAY multiplication overflow"):
        let (bound) = uint256_sub(UINT256_MAX, HALF_RAY_UINT)
        let (quotient, rem) = uint256_unsigned_div_rem(bound, b)
        let (le) = uint256_le(a, quotient)
        assert le = 1
    end

    let (ab, _) = uint256_mul(a, b)
    let (abHR, _) = uint256_add(ab, HALF_RAY_UINT)
    let (res, _) = uint256_unsigned_div_rem(abHR, RAY_UINT)
    return (res)
end

func ray_div{range_check_ptr}(a : Uint256, b : Uint256) -> (res : Uint256):
    alloc_locals
    with_attr error_message("RAY divide by zero"):
        if b.high + b.low == 0:
            assert 1 = 0
        end
    end

    let (halfB, _) = uint256_unsigned_div_rem(b, Uint256(2, 0))

    let (UINT256_MAX) = uint256_max()
    let (HALF_RAY_UINT) = half_ray()
    let (RAY_UINT) = ray()

    with_attr error_message("RAY multiplication overflow"):
        let (bound) = uint256_sub(UINT256_MAX, halfB)
        let (quo, _) = uint256_unsigned_div_rem(bound, RAY_UINT)
        let (le) = uint256_le(a, quo)
        assert le = 1
    end

    let (aRAY, _) = uint256_mul(a, RAY_UINT)
    let (aRAYHalfB, _) = uint256_add(aRAY, halfB)
    let (res, _) = uint256_unsigned_div_rem(aRAYHalfB, b)
    return (res)
end

func ray_to_wad{range_check_ptr}(a : Uint256) -> (res : Uint256):
    alloc_locals
    let (HALF_WAD_RAY_RATION_UINT) = half_wad_ray_ratio()
    let (WAD_RAY_RATIO_UINT) = wad_ray_ratio()

    let (res, overflow) = uint256_add(a, HALF_WAD_RAY_RATION_UINT)
    with_attr error_message("ray_to_wad overflow"):
        assert overflow = 0
    end
    let (res, _) = uint256_unsigned_div_rem(res, WAD_RAY_RATIO_UINT)
    return (res)
end

func wad_to_ray{range_check_ptr}(a : Uint256) -> (res : Uint256):
    alloc_locals
    let (WAD_RAY_RATIO_UINT) = wad_ray_ratio()

    let (res, overflow) = uint256_mul(a, WAD_RAY_RATIO_UINT)
    with_attr error_message("ray_to_wad overflow"):
        assert overflow.high + overflow.low = 0
    end
    return (res)
end

func ray_mul_no_rounding{range_check_ptr}(a : Uint256, b : Uint256) -> (res : Uint256):
    alloc_locals
    if a.high + a.low == 0:
        return (Uint256(0, 0))
    end
    if b.high + b.low == 0:
        return (Uint256(0, 0))
    end

    let (RAY_UINT) = ray()

    let (ab, overflow) = uint256_mul(a, b)
    with_attr error_message("ray_mul_no_rounding overflow"):
        assert overflow.high = 0
        assert overflow.low = 0
    end
    let (res, _) = uint256_unsigned_div_rem(ab, RAY_UINT)
    return (res)
end

func ray_div_no_rounding{range_check_ptr}(a : Uint256, b : Uint256) -> (res : Uint256):
    alloc_locals
    with_attr error_message("RAY divide by zero"):
        if b.high + b.low == 0:
            assert 1 = 0
        end
    end

    let (RAY_UINT) = ray()

    let (aRAY, overflow) = uint256_mul(a, RAY_UINT)
    with_attr error_message("ray_div_no_rounding overflow"):
        assert overflow.high = 0
        assert overflow.low = 0
    end
    let (res, _) = uint256_unsigned_div_rem(aRAY, b)
    return (res)
end

func ray_to_wad_no_rounding{range_check_ptr}(a : Uint256) -> (res : Uint256):
    let (WAD_RAY_RATIO_UINT) = wad_ray_ratio()
    let (res, _) = uint256_unsigned_div_rem(a, WAD_RAY_RATIO_UINT)
    return (res)
=======
func ray() -> (ray: Uint256):
  return (Uint256(RAY, 0))
end

func wad() -> (wad: Uint256):
  return (Uint256(WAD, 0))
end

func halfRay() -> (halfRay: Uint256):
  return (Uint256(HALF_RAY, 0))
end

func halfWad() -> (halfWad: Uint256):
  return (Uint256(HALF_WAD, 0))
end

func wadRayRatio() -> (ratio: Uint256):
  return (Uint256(WAD_RAY_RATIO, 0))
end

func halfWadRayRatio() -> (ratio: Uint256):
  return (Uint256(HALF_WAD_RAY_RATION, 0))
end

func uint256_max() -> (max: Uint256):
  return (Uint256(UINT128_MAX, UINT128_MAX))
end

func wadMul{
  range_check_ptr
}(a: Uint256, b: Uint256) -> (res: Uint256):
  alloc_locals
  if a.high + a.low == 0:
    return (Uint256(0, 0))
  end
  if b.high + b.low == 0:
    return (Uint256(0, 0))
  end

  let (UINT256_MAX) = uint256_max()
  let (HALF_WAD_UINT) = halfWad()
  let (WAD_UINT) = wad()

  with_attr error_message("WAD multiplication overflow"):
    let (bound) = uint256_sub(UINT256_MAX, HALF_WAD_UINT)
    let (quotient, rem) = uint256_unsigned_div_rem(bound, b)
    let (le) = uint256_le(a, quotient)
    assert le = 1
  end

  let (ab, _) = uint256_mul(a, b)
  let (abHW, _) = uint256_add(ab, HALF_WAD_UINT)
  let (res, _) = uint256_unsigned_div_rem(abHW, WAD_UINT)
  return (res)
end

func wadDiv{
  range_check_ptr
}(a: Uint256, b: Uint256) -> (res: Uint256):
  alloc_locals
  with_attr error_message("WAD divide by zero"):
    if b.high + b.low == 0:
      assert 1 = 0
    end
  end

  let (halfB, _) = uint256_unsigned_div_rem(b, Uint256(2, 0))

  let (UINT256_MAX) = uint256_max()
  let (WAD_UINT) = wad()

  with_attr error_message("WAD multiplication overflow"):
    let (bound) = uint256_sub(UINT256_MAX, halfB)
    let (quo, _) = uint256_unsigned_div_rem(bound, WAD_UINT)
    let (le) = uint256_le(a, quo)
    assert le = 1
  end

  let (aWAD, _) = uint256_mul(a, WAD_UINT)
  let (aWADHalfB, _) = uint256_add(aWAD, halfB)
  let (res, _) = uint256_unsigned_div_rem(aWADHalfB, b)
  return (res)
end



func rayMul{
  range_check_ptr
}(a: Uint256, b: Uint256) -> (res: Uint256):
  alloc_locals
  if a.high + a.low == 0:
    return (Uint256(0, 0))
  end
  if b.high + b.low == 0:
    return (Uint256(0, 0))
  end

  let (UINT256_MAX) = uint256_max()
  let (HALF_RAY_UINT) = halfRay()
  let (RAY_UINT) = ray()

  with_attr error_message("RAY multiplication overflow"):
    let (bound) = uint256_sub(UINT256_MAX, HALF_RAY_UINT)
    let (quotient, rem) = uint256_unsigned_div_rem(bound, b)
    let (le) = uint256_le(a, quotient)
    assert le = 1
  end

  let (ab, _) = uint256_mul(a, b)
  let (abHR, _) = uint256_add(ab, HALF_RAY_UINT)
  let (res, _) = uint256_unsigned_div_rem(abHR, RAY_UINT)
  return (res)
end

func rayDiv{
  range_check_ptr
}(a: Uint256, b: Uint256) -> (res: Uint256):
  alloc_locals
  with_attr error_message("RAY divide by zero"):
    if b.high + b.low == 0:
      assert 1 = 0
    end
  end

  let (halfB, _) = uint256_unsigned_div_rem(b, Uint256(2, 0))

  let (UINT256_MAX) = uint256_max()
  let (HALF_RAY_UINT) = halfRay()
  let (RAY_UINT) = ray()

  with_attr error_message("RAY multiplication overflow"):
    let (bound) = uint256_sub(UINT256_MAX, halfB)
    let (quo, _) = uint256_unsigned_div_rem(bound, RAY_UINT)
    let (le) = uint256_le(a, quo)
    assert le = 1
  end

  let (aRAY, _) = uint256_mul(a, RAY_UINT)
  let (aRAYHalfB, _) = uint256_add(aRAY, halfB)
  let (res, _) = uint256_unsigned_div_rem(aRAYHalfB, b)
  return (res)
end


func rayToWad{
  range_check_ptr
}(a: Uint256) -> (res: Uint256):
  alloc_locals
  let (HALF_WAD_RAY_RATION_UINT) = halfWadRayRatio()
  let (WAD_RAY_RATIO_UINT) = wadRayRatio()

  let (res, overflow) = uint256_add(a, HALF_WAD_RAY_RATION_UINT)
  with_attr error_message("rayToWad overflow"):
    assert overflow = 0
  end
  let (res, _) = uint256_unsigned_div_rem(res, WAD_RAY_RATIO_UINT)
  return (res)
end

func wadToRay{
  range_check_ptr
}(a: Uint256) -> (res: Uint256):
  alloc_locals
  let (WAD_RAY_RATIO_UINT) = wadRayRatio()

  let (res, overflow) = uint256_mul(a, WAD_RAY_RATIO_UINT)
  with_attr error_message("rayToWad overflow"):
    assert overflow.high + overflow.low = 0
  end
  return (res)
end


func rayMulNoRounding{
  range_check_ptr
}(a: Uint256, b: Uint256) -> (res: Uint256):
  alloc_locals
  if a.high + a.low == 0:
    return (Uint256(0,0))
  end
  if b.high + b.low == 0:
    return (Uint256(0,0))
  end

  let (RAY_UINT) = ray()

  let (ab, overflow) = uint256_mul(a, b)
  with_attr error_message("rayMulNoRounding overflow"):
    assert overflow.high = 0
    assert overflow.low = 0
  end
  let (res, _) = uint256_unsigned_div_rem(ab, RAY_UINT)
  return (res)
end

func rayDivNoRounding{
  range_check_ptr
}(a: Uint256, b: Uint256) -> (res: Uint256):
  alloc_locals
  with_attr error_message("RAY divide by zero"):
    if b.high + b.low == 0:
      assert 1 = 0
    end
  end

  let (RAY_UINT) = ray()

  let (aRAY, overflow) = uint256_mul(a, RAY_UINT)
  with_attr error_message("rayDivNoRounding overflow"):
    assert overflow.high = 0
    assert overflow.low = 0
  end
  let (res, _) = uint256_unsigned_div_rem(aRAY, b)
  return (res)
end

func rayToWadNoRounding{
  range_check_ptr
}(a: Uint256) -> (res: Uint256):
  let (WAD_RAY_RATIO_UINT) = wadRayRatio()
  let (res, _) = uint256_unsigned_div_rem(a, WAD_RAY_RATIO_UINT)
  return (res)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
end
