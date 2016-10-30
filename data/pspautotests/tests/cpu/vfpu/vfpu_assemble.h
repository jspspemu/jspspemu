#pragma once

#define BITFIELD(START,LENGTH,VALUE)    (((VALUE) & ((1 << (LENGTH)) - 1)) << (START))
#define MIPS_FUNC(VALUE)                BITFIELD(0,6,(VALUE))
#define MIPS_SA(VALUE)                  BITFIELD(6,5,(VALUE))
#define MIPS_SECFUNC(VALUE)             MIPS_SA((VALUE))
#define MIPS_OP(VALUE)                  BITFIELD(26,6,(VALUE))

#define MIPS_RS(VALUE)                  BITFIELD(21,5,(VALUE))
#define MIPS_RT(VALUE)                  BITFIELD(16,5,(VALUE))
#define MIPS_RD(VALUE)                  BITFIELD(11,5,(VALUE))
#define MIPS_FS(VALUE)                  MIPS_RD((VALUE))
#define MIPS_FT(VALUE)                  MIPS_RT((VALUE))
#define MIPS_FD(VALUE)                  MIPS_SA((VALUE))

#define MIPS_SPECIAL(VALUE)             (MIPS_OP(0) | MIPS_FUNC(VALUE))
#define MIPS_REGIMM(VALUE)              (MIPS_OP(1) | MIPS_RT(VALUE))
#define MIPS_COP0(VALUE)                (MIPS_OP(16) | MIPS_RS(VALUE))
#define MIPS_COP1(VALUE)                (MIPS_OP(17) | MIPS_RS(VALUE))
#define MIPS_COP1BC(VALUE)              (MIPS_COP1(8) | MIPS_RT(VALUE))
#define MIPS_COP1S(VALUE)               (MIPS_COP1(16) | MIPS_FUNC(VALUE))
#define MIPS_COP1W(VALUE)               (MIPS_COP1(20) | MIPS_FUNC(VALUE))

#define MIPS_VFPUSIZE(VALUE)            ( (((VALUE) & 1) << 7) | (((VALUE) & 2) << 14) )
#define MIPS_VFPUFUNC(VALUE)            BITFIELD(23, 3, (VALUE))
#define MIPS_COP2(VALUE)                (MIPS_OP(18) | MIPS_RS(VALUE))
#define MIPS_COP2BC(VALUE)              (MIPS_COP2(8) | MIPS_RT(VALUE))
#define MIPS_VFPU0(VALUE)               (MIPS_OP(24) | MIPS_VFPUFUNC(VALUE))
#define MIPS_VFPU1(VALUE)               (MIPS_OP(25) | MIPS_VFPUFUNC(VALUE))
#define MIPS_VFPU3(VALUE)               (MIPS_OP(27) | MIPS_VFPUFUNC(VALUE))
#define MIPS_SPECIAL3(VALUE)            (MIPS_OP(31) | MIPS_FUNC(VALUE))
#define MIPS_ALLEGREX0(VALUE)           (MIPS_SPECIAL3(32) | MIPS_SECFUNC(VALUE))
#define MIPS_VFPU4(VALUE)               (MIPS_OP(52) | MIPS_RS(VALUE))
#define MIPS_VFPU4_11(VALUE)            (MIPS_VFPU4(0) | MIPS_RT(VALUE))
#define MIPS_VFPU4_12(VALUE)            (MIPS_VFPU4(1) | MIPS_RT(VALUE))
#define MIPS_VFPU4_13(VALUE)            (MIPS_VFPU4(2) | MIPS_RT(VALUE))
#define MIPS_VFPU5(VALUE)               (MIPS_OP(55) | MIPS_VFPUFUNC(VALUE))
#define MIPS_VFPU6(VALUE)               (MIPS_OP(60) | MIPS_VFPUFUNC(VALUE))
#define MIPS_VFPU6_1(VALUE)             (MIPS_VFPU6(7) | BITFIELD(20, 3, VALUE))
// This is a bit ugly, VFPU opcodes are encoded strangely.
#define MIPS_VFPU6_1VROT()              (MIPS_VFPU6(7) | BITFIELD(21, 2, 1))
#define MIPS_VFPU6_2(VALUE)             (MIPS_VFPU6_1(0) | MIPS_RT(VALUE))

#define VREG(M, R, C)                   (((R & 3) << 5) | ((M & 7) << 2) | ((C & 3) << 0))
#define VREGS_S(M, R, C)                VREG(M, R, C)
#define VREGP_R(M, R, C)                VREG(M, (R + 1), C)
#define VREGP_C(M, R, C)                VREG(M, C, R)
#define VREGT_R(M, R, C)                VREG(M, (R + R + 1), C)
#define VREGT_C(M, R, C)                VREG(M, (C + C), R)
#define VREGQ_R(M, R, C)                VREG(M, (R + 1), C)
#define VREGQ_C(M, R, C)                VREG(M, C, R)

#define VD(V) (V << 0)
#define VS(V) (V << 8)
#define VT(V) (V << 16)
#define VDST(V) (VD(V) | VS(V) | VT(V))
#define VDS(V) (VD(V) | VS(V))
#define VDT(V) (VD(V) | VT(V))
#define VST(V) (VS(V) | VT(V))

#define VSIZE_S 0
#define VSIZE_P (1 << 7)
#define VSIZE_T (1 << 15)
#define VSIZE_Q ((1 << 15) | (1 << 7))

#define MIPS_OP_JR                      (MIPS_SPECIAL(0x08))
#define MIPS_OP_JR_RA                   (MIPS_SPECIAL(0x08) | MIPS_RS(31))
#define MIPS_OP_VMOV                    (MIPS_VFPU4_11(0x00))
#define MIPS_OP_VADD                    (MIPS_VFPU0(0x00))
#define MIPS_OP_VSCL                    (MIPS_VFPU1(2))
#define MIPS_OP_VIIM_S                  (MIPS_VFPU5(6) | VSIZE_S)
#define MIPS_OP_VFIM_S                  (MIPS_VFPU5(7) | VSIZE_S)
#define MIPS_OP_VPFXS                   MIPS_VFPU5(0)
#define MIPS_OP_VPFXT                   MIPS_VFPU5(2)
#define MIPS_OP_VPFXD                   MIPS_VFPU5(4)

#define VPFXST_SWZ(R3, R2, R1, R0)      (((R3 << 6) | (R2 << 4) | (R1 << 2) | (R0 << 0)) << 0)
#define VPFXST_ABS(R3, R2, R1, R0)      (((R3 << 3) | (R2 << 2) | (R1 << 1) | (R0 << 0)) << 8)
#define VPFXST_NEG(R3, R2, R1, R0)      (((R3 << 3) | (R2 << 2) | (R1 << 1) | (R0 << 0)) << 16)

union FP32 {
	uint32_t u;
	float f;
};

struct FP16 {
	uint16_t u;
};

// More magic code: https://gist.github.com/rygorous/2156668
inline FP16 float_to_half_fast3(FP32 f) {
	static const FP32 f32infty = { 255 << 23 };
	static const FP32 f16infty = { 31 << 23 };
	static const FP32 magic = { 15 << 23 };
	static const uint32_t sign_mask = 0x80000000u;
	static const uint32_t round_mask = ~0xfffu;
	FP16 o = { 0 };

	uint32_t sign = f.u & sign_mask;
	f.u ^= sign;

	if (f.u >= f32infty.u) { // Inf or NaN (all exponent bits set)
		o.u = (f.u > f32infty.u) ? 0x7e00 : 0x7c00; // NaN->qNaN and Inf->Inf
	} else { // (De)normalized number or zero
		f.u &= round_mask;
		f.f *= magic.f;
		f.u -= round_mask;
		if (f.u > f16infty.u) f.u = f16infty.u; // Clamp to signed infinity if overflowed

		o.u = f.u >> 13; // Take the bits!
	}

	o.u |= sign >> 16;
	return o;
}

inline uint16_t ShrinkToHalf(float full) {
	FP32 fp32;
	fp32.f = full;
	FP16 fp = float_to_half_fast3(fp32);
	return fp.u;
}