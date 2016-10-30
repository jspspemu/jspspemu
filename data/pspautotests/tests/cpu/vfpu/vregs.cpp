#include <common.h>

#include <pspkernel.h>
#include <stdio.h>
#include <string.h>
#include <math.h>

#include "vfpu_common.h"
#include "vfpu_assemble.h"

__attribute__ ((aligned (16))) ScePspFMatrix4 matrices[8];

u32 code[1024] = {0};
// We leave some padding at the start for safety.
u32 codepos = 4;

extern "C" typedef void (*CodeFunc)();

void ExecCode() {
	// Pad a bit just in case.
	code[codepos++] = 0;
	code[codepos++] = 0;
	code[codepos++] = 0;
	code[codepos++] = 0;
	code[codepos++] = MIPS_OP_JR_RA;
	code[codepos++] = 0;
	sceKernelDcacheWritebackInvalidateRange(code, codepos * 4);
	sceKernelIcacheInvalidateRange(code, codepos * 4);

	CodeFunc func = (CodeFunc)&code[0];
	func();

	codepos = 0;
	code[codepos++] = 0;
	code[codepos++] = 0;
	code[codepos++] = 0;
	code[codepos++] = 0;
}

int PrintVregVal(float f, int space) {
	if (!isnan(f)) {
		return printf("%*.3f ", space > 5 ? space - 1 : 5, f);
	} else {
		return printf("     %snan ", signbit(f) ? "-" : " ");
	}
}

void PrintAllMatrices(const char *title) {
	memset(matrices, -1, sizeof(matrices));

	float *f = &matrices[0].x.x;
	asm volatile (
		"sv.q    R000, 0x000+%0\n"
		"sv.q    R001, 0x010+%0\n"
		"sv.q    R002, 0x020+%0\n"
		"sv.q    R003, 0x030+%0\n"
		"sv.q    R100, 0x040+%0\n"
		"sv.q    R101, 0x050+%0\n"
		"sv.q    R102, 0x060+%0\n"
		"sv.q    R103, 0x070+%0\n"
		"sv.q    R200, 0x080+%0\n"
		"sv.q    R201, 0x090+%0\n"
		"sv.q    R202, 0x0A0+%0\n"
		"sv.q    R203, 0x0B0+%0\n"
		"sv.q    R300, 0x0C0+%0\n"
		"sv.q    R301, 0x0D0+%0\n"
		"sv.q    R302, 0x0E0+%0\n"
		"sv.q    R303, 0x0F0+%0\n"
		"sv.q    R400, 0x100+%0\n"
		"sv.q    R401, 0x110+%0\n"
		"sv.q    R402, 0x120+%0\n"
		"sv.q    R403, 0x130+%0\n"
		"sv.q    R500, 0x140+%0\n"
		"sv.q    R501, 0x150+%0\n"
		"sv.q    R502, 0x160+%0\n"
		"sv.q    R503, 0x170+%0\n"
		"sv.q    R600, 0x180+%0\n"
		"sv.q    R601, 0x190+%0\n"
		"sv.q    R602, 0x1A0+%0\n"
		"sv.q    R603, 0x1B0+%0\n"
		"sv.q    R700, 0x1C0+%0\n"
		"sv.q    R701, 0x1D0+%0\n"
		"sv.q    R702, 0x1E0+%0\n"
		"sv.q    R703, 0x1F0+%0\n"

		: "+m" (*f)
	);

	printf("%12s: ", title);
	for (int m = 0; m < 8; ++m) {
		// Centering: (40 - 10) / 2 = 15
		printf("%15s MATRIX %d %15s", "", m, "");
		if (m != 7) {
			printf(" | ");
		}
	}
	printf("\n");
	for (int row = 0; row < 4; ++row) {
		printf("%12s: ", title);
		for (int m = 0; m < 8; ++m) {
			int len = 40;
			for (int col = 0; col < 4; ++col) {
				len -= PrintVregVal(f[m * 16 + row * 4 + col], len / (4 - col));
			}
			if (m != 7) {
				if (len >= 0) {
					printf(" | ");
				} else {
					printf("| ");
				}
			}
		}
		printf("\n");
	}
	printf("\n");
}

void FillFunNumbers() {
	static const float funNumbers[16] = {
		-0.0f, NAN, 1.0f / 3.0f, 1000.1f,
		-NAN, 55.55f, +0.0f, INFINITY,
		1.0f / 2.0f, -INFINITY, 10000000.0f, -1.0f / 8.0f,
		8.0f, 9.0f, 1.0f / 1000.1f, 1.0f,
	};

	for (int m = 0; m < 8; ++m) {
		for (int n = 0; n < 16; ++n) {
			float f = funNumbers[m == 0 ? n : (n * 41 + m * 3) % 16];
			code[codepos++] = MIPS_OP_VFIM_S | VT(VREGS_S(m, n / 4, n & 3)) | ShrinkToHalf(f);
		}
	}
}

void FillNormNumbers() {
	static const float funNumbers[16] = {
		-0.0f, 18.0f, 1.0f / 3.0f, 1000.1f,
		-2.5f, 55.55f, +0.0f, 99.0f,
		1.0f / 2.0f, -1.1f, 100.0f, -1.0f / 8.0f,
		8.0f, 9.0f, 1.0f / 1000.1f, 1.0f,
	};

	for (int m = 0; m < 8; ++m) {
		for (int n = 0; n < 16; ++n) {
			float f = funNumbers[m == 0 ? n : (n * 41 + m * 3) % 16];
			code[codepos++] = MIPS_OP_VFIM_S | VT(VREGS_S(m, n / 4, n & 3)) | ShrinkToHalf(f);
		}
	}
}

void FillAllVectorRegs() {
	for (u32 i = 0; i < 128; ++i) {
		code[codepos++] = MIPS_OP_VIIM_S | VT(i) | (i & 0xFFFF);
	}
	ExecCode();
	PrintAllMatrices("Filled");
}

void TestDouble() {
	for (int m = 0; m < 8; ++m) {
		for (int r = 0; r < 4; ++r) {
			code[codepos++] = MIPS_OP_VADD | VSIZE_Q | VDST(VREGQ_C(m, r, 0));
		}
	}
	ExecCode();
	PrintAllMatrices("Doubled");
}

void TestDoubleSwizzle() {
	for (int m = 0; m < 8; ++m) {
		for (int r = 0; r < 4; ++r) {
			code[codepos++] = MIPS_OP_VPFXS | VPFXST_SWZ(0, 1, 2, 3);
			code[codepos++] = MIPS_OP_VADD | VSIZE_Q | VDST(VREGQ_C(m, r, 0));
		}
		for (int c = 0; c < 4; ++c) {
			code[codepos++] = MIPS_OP_VPFXS | VPFXST_SWZ(0, 1, 2, 3);
			code[codepos++] = MIPS_OP_VADD | VSIZE_Q | VDST(VREGQ_R(m, 0, c));
		}
	}
	ExecCode();
	PrintAllMatrices("Swizzled");
}

void TestUpgrade() {
	FillNormNumbers();

	// So, here we will test using different sizes of the same row/col.
	// The goal is to make sure simd slots upgrade cleanly.
	for (int m = 0; m < 8; ++m) {
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VD(VREGS_S(m, 0, 0)) | VS(VREGS_S(m, 1, 0)) | VT(VREGS_S(m, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_T | VD(VREGT_R(m, 0, 0)) | VS(VREGT_R(m, 0, 0)) | VT(VREGT_R(m, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_P | VD(VREGP_R(m, 2, 0)) | VS(VREGP_R(m, 0, 0)) | VT(VREGP_R(m, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_Q | VD(VREGQ_R(m, 3, 0)) | VS(VREGQ_R(m, 3, 0)) | VT(VREGQ_R(m, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_P | VD(VREGP_R(m, 0, 2)) | VS(VREGP_R(m, 3, 2)) | VT(VREGP_R(m, 3, 0));
	}

	ExecCode();
	PrintAllMatrices("Upgrade");
}

void TestCombine() {
	FillNormNumbers();

	for (int m = 0; m < 8; ++m) {
		// Let's "grab" a few regs by doubling them.  This is for jit regcache testing.
		// We're making sure the regs combine back properly.
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 0, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 3, 1));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 1, 2));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 2, 3));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 1, 1));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 0, 2));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 0, 3));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 2, 0));

		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VD(VREGS_S(m, 0, 0)) | VS(VREGS_S(m, 1, 0)) | VT(VREGS_S(m, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_T | VD(VREGT_R(m, 0, 0)) | VS(VREGT_R(m, 0, 0)) | VT(VREGT_R(m, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_P | VD(VREGP_R(m, 2, 0)) | VS(VREGP_R(m, 0, 0)) | VT(VREGP_R(m, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_Q | VD(VREGQ_R(m, 3, 0)) | VS(VREGQ_R(m, 3, 0)) | VT(VREGQ_R(m, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_P | VD(VREGP_R(m, 0, 2)) | VS(VREGP_R(m, 3, 2)) | VT(VREGP_R(m, 3, 0));
	}

	ExecCode();
	PrintAllMatrices("Combine");
}

void TestVscl() {
	FillNormNumbers();

	for (int m = 0; m < 8; ++m) {
		// Here we're making sure the mixed args (s etc.) work cleanly.
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 0, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 3, 1));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 1, 2));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 2, 3));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 1, 1));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 0, 2));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 0, 3));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VDST(VREGS_S(m, 2, 0));

		code[codepos++] = MIPS_OP_VSCL | VSIZE_S | VD(VREGS_S(m, 0, 0)) | VS(VREGS_S(m, 1, 0)) | VT(VREGS_S(m, 2, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_T | VD(VREGT_R(m, 0, 0)) | VS(VREGT_R(m, 0, 0)) | VT(VREGS_S(m, 1, 1));
		code[codepos++] = MIPS_OP_VADD | VSIZE_P | VD(VREGP_R(m, 2, 0)) | VS(VREGP_R(m, 0, 0)) | VT(VREGS_S(m, 3, 1));
		code[codepos++] = MIPS_OP_VADD | VSIZE_Q | VD(VREGQ_R(m, 3, 0)) | VS(VREGQ_R(m, 3, 0)) | VT(VREGS_S(m, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_P | VD(VREGP_R(m, 0, 2)) | VS(VREGP_R(m, 3, 2)) | VT(VREGS_S(m, 0, 3));
	}

	ExecCode();
	PrintAllMatrices("vscl");
}

void TestReuse() {
	FillNormNumbers();

	// This tests reusing the same regs different ways as different args.
	// Hopefully catching dirting and spill locking issues.
	for (int m = 0; m < 8; ++m) {
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VD(VREGS_S(m, 0, 0)) | VS(VREGS_S(m, 1, 0)) | VT(VREGS_S(0, 2, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VD(VREGS_S(m, 3, 0)) | VS(VREGS_S(m, 1, 0)) | VT(VREGS_S(0, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VD(VREGS_S(m, 2, 0)) | VS(VREGS_S(m, 3, 0)) | VT(VREGS_S(0, 1, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VD(VREGS_S(m, 3, 0)) | VS(VREGS_S(m, 3, 0)) | VT(VREGS_S(0, 3, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VD(VREGS_S(m, 0, 0)) | VS(VREGS_S(m, 0, 0)) | VT(VREGS_S(0, 2, 0));
		code[codepos++] = MIPS_OP_VADD | VSIZE_S | VD(VREGS_S(m, 3, 0)) | VS(VREGS_S(m, 1, 0)) | VT(VREGS_S(0, 1, 0));
	}

	ExecCode();
	PrintAllMatrices("Reuse");
}

void TestSwizzle2() {
	FillNormNumbers();
	ExecCode();

	asm volatile (
		"vdot.t	S001, C000, C000\n"
		"vsub.q	C000, C000[0,y,0,0], C000[y,0,0,0]\n"
	);
	PrintAllMatrices("TestSwizzle2");
}

extern "C" int main(int argc, char *argv[]) {
	// Let's start by filling all the regs with something other than NAN.
	FillAllVectorRegs();

	TestDouble();
	TestDoubleSwizzle();
	TestUpgrade();
	TestCombine();
	TestVscl();
	TestReuse();
	TestSwizzle2();

	return 0;
}
