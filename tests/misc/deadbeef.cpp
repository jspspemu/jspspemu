#include <common.h>
#include <pspthreadman.h>

// 32 gprs + 32 fprs + hi/lo + fcr31
static u32 __attribute__((aligned(16))) regs[32 + 32 + 2 + 1];

inline void fillRegs() {
	asm volatile (
		"lui $a0, 0x1337\n"
		"lui $a1, 0x1337\n"
		"lui $a2, 0x1337\n"
		"lui $a3, 0x1337\n"
		"lui $t0, 0x1337\n"
		"lui $t1, 0x1337\n"
		"lui $t2, 0x1337\n"
		"lui $t3, 0x1337\n"
		"lui $t4, 0x1337\n"
		"lui $t5, 0x1337\n"
		"lui $t6, 0x1337\n"
		"lui $t7, 0x1337\n"
		"lui $s0, 0x1337\n"
		"lui $s1, 0x1337\n"
		"lui $s2, 0x1337\n"
		"lui $s3, 0x1337\n"
		"lui $s4, 0x1337\n"
		"lui $s5, 0x1337\n"
		"lui $s6, 0x1337\n"
		"lui $s7, 0x1337\n"
		"lui $t8, 0x1337\n"
		"lui $t9, 0x1337\n"

		"mtc1 $t0, $f0\n"
		"mtc1 $t0, $f1\n"
		"mtc1 $t0, $f2\n"
		"mtc1 $t0, $f3\n"
		"mtc1 $t0, $f4\n"
		"mtc1 $t0, $f5\n"
		"mtc1 $t0, $f6\n"
		"mtc1 $t0, $f7\n"
		"mtc1 $t0, $f8\n"
		"mtc1 $t0, $f9\n"
		"mtc1 $t0, $f10\n"
		"mtc1 $t0, $f11\n"
		"mtc1 $t0, $f12\n"
		"mtc1 $t0, $f13\n"
		"mtc1 $t0, $f14\n"
		"mtc1 $t0, $f15\n"
		"mtc1 $t0, $f16\n"
		"mtc1 $t0, $f17\n"
		"mtc1 $t0, $f18\n"
		"mtc1 $t0, $f19\n"
		"mtc1 $t0, $f20\n"
		"mtc1 $t0, $f21\n"
		"mtc1 $t0, $f22\n"
		"mtc1 $t0, $f23\n"
		"mtc1 $t0, $f24\n"
		"mtc1 $t0, $f25\n"
		"mtc1 $t0, $f26\n"
		"mtc1 $t0, $f27\n"
		"mtc1 $t0, $f28\n"
		"mtc1 $t0, $f29\n"
		"mtc1 $t0, $f30\n"
		"mtc1 $t0, $f31\n"

		"mtlo $t0\n"
		"mthi $t0\n"

		"li $v0, 3\n"
		"ctc1 $v0, $31\n"
	);

	asm volatile (
		".set noat\n"
		"lui $at, 0x1337\n"
	);
}

inline void getRegs() {
	asm volatile (
		// First let's preserve at.
		".set noat\n"
		"addiu $v1, $at, 0\n"
		".set at\n"
		"la $v0, %0\n"
		// regs[1] -> regs[0]...
		"addiu $v0, $v0, -4\n"
		// This is actually $at.
		"sw $v1, 0x04($v0)\n"
		"sw $a0, 0x10($v0)\n"
		"sw $a1, 0x14($v0)\n"
		"sw $a2, 0x18($v0)\n"
		"sw $a3, 0x1C($v0)\n"
		"sw $t0, 0x20($v0)\n"
		"sw $t1, 0x24($v0)\n"
		"sw $t2, 0x28($v0)\n"
		"sw $t3, 0x2C($v0)\n"
		"sw $t4, 0x30($v0)\n"
		"sw $t5, 0x34($v0)\n"
		"sw $t6, 0x38($v0)\n"
		"sw $t7, 0x3C($v0)\n"
		"sw $s0, 0x40($v0)\n"
		"sw $s1, 0x44($v0)\n"
		"sw $s2, 0x48($v0)\n"
		"sw $s3, 0x4C($v0)\n"
		"sw $s4, 0x50($v0)\n"
		"sw $s5, 0x54($v0)\n"
		"sw $s6, 0x58($v0)\n"
		"sw $s7, 0x5C($v0)\n"
		"sw $t8, 0x60($v0)\n"
		"sw $t9, 0x64($v0)\n"

		"swc1 $f0, 0x80($v0)\n"
		"swc1 $f1, 0x84($v0)\n"
		"swc1 $f2, 0x88($v0)\n"
		"swc1 $f3, 0x8C($v0)\n"
		"swc1 $f4, 0x90($v0)\n"
		"swc1 $f5, 0x94($v0)\n"
		"swc1 $f6, 0x98($v0)\n"
		"swc1 $f7, 0x9C($v0)\n"
		"swc1 $f8, 0xA0($v0)\n"
		"swc1 $f9, 0xA4($v0)\n"
		"swc1 $f10, 0xA8($v0)\n"
		"swc1 $f11, 0xAC($v0)\n"
		"swc1 $f12, 0xB0($v0)\n"
		"swc1 $f13, 0xB4($v0)\n"
		"swc1 $f14, 0xB8($v0)\n"
		"swc1 $f15, 0xBC($v0)\n"
		"swc1 $f16, 0xC0($v0)\n"
		"swc1 $f17, 0xC4($v0)\n"
		"swc1 $f18, 0xC8($v0)\n"
		"swc1 $f19, 0xCC($v0)\n"
		"swc1 $f20, 0xD0($v0)\n"
		"swc1 $f21, 0xD4($v0)\n"
		"swc1 $f22, 0xD8($v0)\n"
		"swc1 $f23, 0xDC($v0)\n"
		"swc1 $f24, 0xE0($v0)\n"
		"swc1 $f25, 0xE4($v0)\n"
		"swc1 $f26, 0xE8($v0)\n"
		"swc1 $f27, 0xEC($v0)\n"
		"swc1 $f28, 0xF0($v0)\n"
		"swc1 $f29, 0xF4($v0)\n"
		"swc1 $f30, 0xF8($v0)\n"
		"swc1 $f31, 0xFC($v0)\n"

		"mflo $v1\n"
		"sw $v1, 0x100($v0)\n"
		"mfhi $v1\n"
		"sw $v1, 0x104($v0)\n"

		"cfc1 $v1, $31\n"
		"sw $v1, 0x108($v0)\n"
		// For some reason, regs[0] fails, regs[1] is OK.
		: "=m"(regs[1])
	);
}

inline void dumpRegs() {
	getRegs();

	checkpoint(NULL);
	schedf("at=%08x, ", regs[1]);
	schedf("a0=%08x, a1=%08x, a2=%08x, a3=%08x, ", regs[4], regs[5], regs[6], regs[7]);
	schedf("t0=%08x, t1=%08x, t2=%08x, t3=%08x, ", regs[8], regs[9], regs[10], regs[11]);
	schedf("t4=%08x, t5=%08x, t6=%08x, t7=%08x, ", regs[12], regs[13], regs[14], regs[15]);
	schedf("s0=%08x, s1=%08x, s2=%08x, s3=%08x, ", regs[16], regs[17], regs[18], regs[19]);
	schedf("s4=%08x, s5=%08x, s6=%08x, s7=%08x, ", regs[20], regs[21], regs[22], regs[23]);
	schedf("t8=%08x, t9=%08x", regs[24], regs[25]);
	schedf("\n");
	
	checkpoint(NULL);
	for (int i = 32; i < 64; ++i) {
		schedf("f%d=%08x%s", i, regs[i], i >= 63 ? "" : ", ");
	}
	schedf("\n");
	
	checkpoint(NULL);
	schedf("lo=%08x, hi=%08x, fcr31=%08x", regs[64], regs[65], regs[66]);
	schedf("\n");
}

inline void getRegs_v0v1() {
	register u32 v0;
	register u32 v1;
	asm volatile (
		"addiu %0, $v0, 0\n"
		"addiu %1, $v1, 0\n"
		: "=r"(v0), "=r"(v1)
	);
	
	regs[2] = v0;
	regs[3] = v1;
}

inline void dumpRegs_v0v1() {
	getRegs_v0v1();

	checkpoint(NULL);
	schedf("v0=%08x, v1=%08x", regs[2], regs[3]);
	schedf("\n");
}

int threadFunc(SceSize argc, void *argp) {
	dumpRegs();
	return 0;
}

int threadFunc2(SceSize argc, void *argp) {
	dumpRegs_v0v1();
	return 0;
}

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("Reset regs:");
	fillRegs();
	dumpRegs();

	checkpointNext("Syscall:");
	fillRegs();
	sceKernelGetSystemTimeWide();
	dumpRegs();

	checkpointNext("Really long loop (interrupt):");
	fillRegs();
	for (int i = 0; i < 0x04000000; ++i) {
		continue;
	}
	dumpRegs();

	checkpointNext("New thread (initial regs):");
	SceUID threadID = sceKernelCreateThread("test", &threadFunc, 0x20, 0x1000, 0, NULL);
	sceKernelStartThread(threadID, 0, (void *)0x13370000);
	sceKernelWaitThreadEnd(threadID, NULL);
	sceKernelDeleteThread(threadID);

	checkpointNext("New thread (v0/v1):");
	threadID = sceKernelCreateThread("test", &threadFunc2, 0x20, 0x1000, PSP_THREAD_ATTR_VFPU, NULL);
	sceKernelStartThread(threadID, 0, (void *)0x13370000);
	sceKernelWaitThreadEnd(threadID, NULL);
	sceKernelDeleteThread(threadID);

	return 0;
}