#include <common.h>

void __attribute__((noinline)) test_beq() {
	int result = -1;

	// This is technically not valid MIPS anyway.
	// But it seems to always take target 2?
	asm volatile (
		".set    noreorder\n"

		"li      $t0, 0\n"
		"beq     $t0, $t0, target1_%=\n"
		"beq     $t0, $t0, target2_%=\n"
		"beq     $t0, $t0, target3_%=\n"
		"beq     $t0, $t0, target4_%=\n"
		"nop\n"

		"target1_%=:\n"
		"li      %0, 1\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"li      %0, 2\n"
		"j       skip_%=\n"
		"nop\n"

		"target3_%=:\n"
		"li      %0, 3\n"
		"j       skip_%=\n"
		"nop\n"

		"target4_%=:\n"
		"li      %0, 4\n"
		"j       skip_%=\n"
		"nop\n"

		"skip_%=:\n"

		: "+r"(result)
	);

	printf("beq: delay branch: %08x\n", result);
}

void __attribute__((noinline)) test_jal() {
	int result = -1;

	asm volatile (
		".set    noreorder\n"

		"move    $t2, $ra\n"
		"li      $t0, 0\n"
		"jal     target2_%=\n"
		"li      $ra, 2\n"

		"target1_%=:\n"
		"li      %0, 1\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"move    %0, $ra\n"

		"skip_%=:\n"
		"move    $ra, $t2\n"

		: "+r"(result)
	);

	printf("jal: ra order: %08x\n", result);
}

void __attribute__((noinline)) test_jalr() {
	int result = -1;

	asm volatile (
		".set noreorder\n"

		"move    $t2, $ra\n"
		"la      $t0, target2_%=\n"
		"jalr    $t0\n"
		"li      $ra, 2\n"

		"target1_%=:\n"
		"li      %0, 1\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"move    %0, $ra\n"

		"skip_%=:\n"
		"move    $ra, $t2\n"

		: "+r"(result)
	);

	printf("jalr: ra order: %08x\n", result);

	result = -1;

	asm volatile (
		".set noreorder\n"

		"move    $t2, $ra\n"
		"la      $t1, target2_%=\n"
		"jalr    %0, $t1\n"
		"nop\n"

		"target1_%=:\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"nop\n"

		"skip_%=:\n"
		"move    $ra, $t2\n"

		: "+r"(result)
	);

	printf("jalr: non-ra: %08x\n", result);

	result = -1;

	asm volatile (
		".set noreorder\n"

		"move    $t2, $ra\n"
		"la      $t1, target2_%=\n"
		"jalr    %0, $t1\n"
		"li      %0, 1\n"

		"target1_%=:\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"nop\n"

		"skip_%=:\n"
		"move    $ra, $t2\n"

		: "+r"(result)
	);

	printf("jalr: non-ra order: %08x\n", result);

	result = -1;

	asm volatile (
		".set noreorder\n"

		"move    $t2, $ra\n"
		"la      $t0, target2_%=\n"
		"jalr    $t0, $t0\n"
		"nop\n"

		"target1_%=:\n"
		"li      %0, 1\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"li      %0, 2\n"

		"skip_%=:\n"
		"move    $ra, $t2\n"

		: "+r"(result)
	);

	printf("jalr: rs/rd match: %08x\n", result);
}

void __attribute__((noinline)) test_bltzal() {
	int result = -1;

	asm volatile (
		".set    noreorder\n"

		"move    $t2, $ra\n"
		"subu    $t0, $0, 1\n"
		"bltzal  $t0, target2_%=\n"
		"li      $ra, 2\n"

		"target1_%=:\n"
		"li      %0, 1\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"move    %0, $ra\n"

		"skip_%=:\n"
		"move    $ra, $t2\n"

		: "+r"(result)
	);

	printf("bltzal: ra order: %08x\n", result);

	result = -1;

	asm volatile (
		".set    noreorder\n"

		"move    $t2, $ra\n"
		"subu    $t0, $0, 1\n"
		"bltzall $t0, target2_%=\n"
		"li      $ra, 2\n"

		"target1_%=:\n"
		"li      %0, 1\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"move    %0, $ra\n"

		"skip_%=:\n"
		"move    $ra, $t2\n"

		: "+r"(result)
	);

	printf("bltzall: ra order: %08x\n", result);
}

void __attribute__((noinline)) test_bgezal() {
	int result = -1;

	asm volatile (
		".set    noreorder\n"

		"move    $t2, $ra\n"
		"li      $t0, 0\n"
		"bgezal  $t0, target2_%=\n"
		"li      $ra, 2\n"

		"target1_%=:\n"
		"li      %0, 1\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"move    %0, $ra\n"

		"skip_%=:\n"
		"move    $ra, $t2\n"

		: "+r"(result)
	);

	printf("bgezal: ra order: %08x\n", result);

	result = -1;

	asm volatile (
		".set    noreorder\n"

		"move    $t2, $ra\n"
		"li      $t0, 0\n"
		"bgezall $t0, target2_%=\n"
		"li      $ra, 2\n"

		"target1_%=:\n"
		"li      %0, 1\n"
		"j       skip_%=\n"
		"nop\n"

		"target2_%=:\n"
		"move    %0, $ra\n"

		"skip_%=:\n"
		"move    $ra, $t2\n"

		: "+r"(result)
	);

	printf("bgezall: ra order: %08x\n", result);
}

int main(int argc, char *argv[]) {
	// Let's not bother trying to pass this one.
	//test_beq();

	test_jal();
	test_jalr();
	test_bltzal();
	test_bgezal();
	return 0;
}