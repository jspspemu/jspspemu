#include <common.h>
#include <math.h>
#include <float.h>
#include <limits.h>

void __attribute__((noinline)) printfcrs(const char *title) {
	unsigned int result[6] = {-1, -1, -1, -1, -1, -1};

	asm volatile (
		".set    noreorder\n"

		"cfc1    %0, $0\n"
		"cfc1    %1, $25\n"
		"cfc1    %2, $26\n"
		"cfc1    %3, $27\n"
		"cfc1    %4, $28\n"
		"cfc1    %5, $31\n"

		: "+r"(result[0]), "+r"(result[1]), "+r"(result[2]), "+r"(result[3]), "+r"(result[4]), "+r"(result[5])
	);

	printf("%s:\n  fcr0: %08x, fcr25: %08x, fcr26: %08x, fcr27: %08x, fcr28: %08x, fcr31: %08x\n", title, result[0], result[1], result[2], result[3], result[4], result[5]);
}

void __attribute__((noinline)) setfcr0(u32 v) {
	asm volatile (
		".set    noreorder\n"

		"ctc1    %0, $0\n"

		:
		: "r"(v)
	);
}

void __attribute__((noinline)) updatefcr31(u32 v) {
	asm volatile (
		".set    noreorder\n"

		"or      $v0, $0, %0\n"
		"ctc1    $v0, $31\n"
		"nop\n"

		:
		: "r"(v)
		: "v0"
	);
}

void __attribute__((noinline)) sqrtneg() {
	asm volatile (
		".set    noreorder\n"

		"lui     $v0, 0xBF80\n" // 0xBF800000 = -1
		"mtc1    $v0, $f0\n"
		"sqrt.s  $f0, $f0\n"

		:
		:
		: "v0", "$f0"
	);
}

int main(int argc, char *argv[]) {
	printfcrs("Initial");

	setfcr0(0xDEADBEEF);
	printfcrs("Update fcr0");
	updatefcr31(0x00000003);
	printfcrs("Update rounding mode (RM)");
	updatefcr31(0x0000007C);
	printfcrs("Update flags");
	updatefcr31(0x00000F80);
	printfcrs("Update enables");
	updatefcr31(0x0001F000);
	printfcrs("Update cause");
	updatefcr31(0x0001F000);
	// Crashes.
	//updatefcr31(0x00020000);
	//printfcrs("Update unimplemented (E)");
	updatefcr31(0x01000000);
	printfcrs("Update flushing (FS)");
	updatefcr31(0x00400000);
	printfcrs("Update flushing (FO)");
	updatefcr31(0x00200000);
	printfcrs("Update flushing (FN)");
	updatefcr31(0x00800000);
	printfcrs("Update FCC");
	updatefcr31(0xFE000000);
	printfcrs("Update FCC1-7");
	updatefcr31(0x001C0000);
	printfcrs("Update unknown");

	printf("\nFlag situations:\n");

	float f1;
	float f2;
	float f3;

	updatefcr31(0x00000000);
	sqrtneg();
	printfcrs("sqrt(-1)");

	updatefcr31(0x00000000);
	f1 = 0.0;
	f2 = 0.0;
	f3 = f1 / f2;
	printfcrs("Divide by zero");

	updatefcr31(0x00000000);
	f1 = NAN;
	f2 = NAN;
	f3 = f1 * f2;
	printfcrs("NAN math");

	updatefcr31(0x00000000);
	f1 = FLT_MAX;
	f2 = FLT_MAX;
	f3 = f1 * f2;
	printfcrs("Overflow");

	updatefcr31(0x00000000);
	f1 = 1.0;
	f2 = FLT_MAX;
	f3 = f1 / f2;
	printfcrs("Underflow");

	updatefcr31(0x00000000);
	f1 = 1.0;
	f2 = 3.0;
	f3 = f1 / f2;
	printfcrs("Inexact");

	return 0;
}