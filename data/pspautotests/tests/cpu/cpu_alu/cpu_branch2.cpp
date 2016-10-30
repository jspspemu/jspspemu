#include <common.h>

enum BranchResultFlags {
	BRANCH_SKIPPED = 0,
	BRANCH_FOLLOWED = 1,
	BRANCH_SET_RA = 2,
	BRANCH_DELAY_SLOT = 4,
	BRANCH_DELAY_RA_WON = 8,
};

static u32 __attribute__((aligned(16))) C_ZERO[1] = {0};
static u32 __attribute__((aligned(16))) C_S16_MAX[1] = {0x7FFF};
static u32 __attribute__((aligned(16))) C_S16_MIN[1] = {0xFFFF8000};
static u32 __attribute__((aligned(16))) C_S32_MAX[1] = {0x7FFFFFFF};
static u32 __attribute__((aligned(16))) C_S32_MIN[1] = {0x80000000};
static u32 __attribute__((aligned(16))) C_NEGONE[4] = {0xFFFFFFFF};
static u32 __attribute__((aligned(16))) C_ONE[4] = {1};
static u32 __attribute__((aligned(16))) C_GARBAGE1[4] = {0x1337};
static u32 __attribute__((aligned(16))) C_GARBAGE2[4] = {0xDEADBEEF};

#define BRRO(OP, result, rs, rt) \
	asm volatile ( \
		".set noreorder\n" \
		"" \
		"lui %0, 0\n" \
		"or $t9, $0, $ra\n" \
		"" \
		#OP " %1, %2, " #OP "_branch%=\n" \
		"ori %0, %0, 4\n" \
		"" \
		"b " #OP "_skip%=\n" \
		"nop\n" \
		"" \
		#OP "_branch%=:\n" \
		"ori %0, %0, 1\n" \
		"" \
		#OP "_skip%=:\n" \
		"beq $t9, $ra, " #OP "_done%=\n" \
		"nop\n" \
		"" \
		"ori %0, %0, 2\n" \
		"" \
		#OP "_done%=:\n" \
		"" \
		#OP " %1, %2, " #OP "_order%=\n" \
		"ori $ra, $0, 0\n" \
		"" \
		#OP "_order%=:\n" \
		"bne $ra, $0, " #OP "_ordernonzero%=\n" \
		"nop\n" \
		"ori %0, %0, 8\n" \
		"" \
		#OP "_ordernonzero%=:\n" \
		"or $ra, $0, $t9\n" \
		"" \
		".set reorder\n" \
		: "=&r"(result) : "r"(rs), "r"(rt) : "t9" \
	);

#define BRO(OP, result, rs) \
	asm volatile ( \
		".set noreorder\n" \
		"" \
		"lui %0, 0\n" \
		"or $t9, $0, $ra\n" \
		"" \
		#OP " %1, " #OP "_branch%=\n" \
		"ori %0, %0, 4\n" \
		"" \
		"b " #OP "_skip%=\n" \
		"nop\n" \
		"" \
		#OP "_branch%=:\n" \
		"ori %0, %0, 1\n" \
		"" \
		#OP "_skip%=:\n" \
		"beq $t9, $ra, " #OP "_done%=\n" \
		"nop\n" \
		"" \
		"ori %0, %0, 2\n" \
		"" \
		#OP "_done%=:\n" \
		"" \
		#OP " %1, " #OP "_order%=\n" \
		"ori $ra, $0, 0\n" \
		"" \
		#OP "_order%=:\n" \
		"bne $ra, $0, " #OP "_ordernonzero%=\n" \
		"nop\n" \
		"ori %0, %0, 8\n" \
		"" \
		#OP "_ordernonzero%=:\n" \
		"or $ra, $0, $t9\n" \
		"" \
		".set reorder\n" \
		: "=&r"(result) : "r"(rs) : "t9" \
	);

#define BO(OP, result) \
	asm volatile ( \
		".set noreorder\n" \
		"" \
		"lui %0, 0\n" \
		"or $t9, $0, $ra\n" \
		"" \
		#OP " " #OP "_branch\n" \
		"ori %0, %0, 4\n" \
		"" \
		"b " #OP "_skip\n" \
		"nop\n" \
		"" \
		#OP "_branch:\n" \
		"ori %0, %0, 1\n" \
		"" \
		#OP "_skip:\n" \
		"beq $t9, $ra, " #OP "_done\n" \
		"nop\n" \
		"" \
		"ori %0, %0, 2\n" \
		"" \
		#OP "_done:\n" \
		"" \
		#OP " " #OP "_order%=\n" \
		"ori $ra, $0, 0\n" \
		"" \
		#OP "_order%=:\n" \
		"bne $ra, $0, " #OP "_ordernonzero%=\n" \
		"nop\n" \
		"ori %0, %0, 8\n" \
		"" \
		#OP "_ordernonzero%=:\n" \
		"or $ra, $0, $t9\n" \
		"" \
		".set reorder\n" \
		: "=&r"(result) : : "t9" \
	);

#define BRR(OP, result) \
	asm volatile ( \
		".set noreorder\n" \
		"" \
		"lui %0, 0\n" \
		"la $t8, " #OP "_branch\n" \
		"or $t9, $0, $0\n" \
		"" \
		#OP " $t9, $t8\n" \
		"ori %0, %0, 4\n" \
		"" \
		"b " #OP "_skip\n" \
		"nop\n" \
		"" \
		#OP "_branch:\n" \
		"ori %0, %0, 1\n" \
		"" \
		#OP "_skip:\n" \
		"beq $t9, $0, " #OP "_done\n" \
		"nop\n" \
		"" \
		"ori %0, %0, 2\n" \
		"" \
		#OP "_done:\n" \
		"" \
		"la $t8, " #OP "_order\n" \
		#OP " $t9, $t8\n" \
		"ori $t9, $0, 0\n" \
		"" \
		#OP "_order:\n" \
		"bne $t9, $0, " #OP "_ordernonzero\n" \
		"nop\n" \
		"ori %0, %0, 8\n" \
		"" \
		#OP "_ordernonzero:\n" \
		"" \
		".set reorder\n" \
		: "=&r"(result) : : "t8", "t9" \
	);

#define BR(OP, result) \
	asm volatile ( \
		".set noreorder\n" \
		"" \
		"lui %0, 0\n" \
		"la $t8, " #OP "_branch\n" \
		"or $t9, $0, $ra\n" \
		"" \
		#OP " $t8\n" \
		"ori %0, %0, 4\n" \
		"" \
		"b " #OP "_skip\n" \
		"nop\n" \
		"" \
		#OP "_branch:\n" \
		"ori %0, %0, 1\n" \
		"" \
		#OP "_skip:\n" \
		"beq $t9, $ra, " #OP "_done\n" \
		"nop\n" \
		"" \
		"ori %0, %0, 2\n" \
		"" \
		#OP "_done:\n" \
		"" \
		"la $t8, " #OP "_order\n" \
		#OP " $t8\n" \
		"ori $ra, $0, 0\n" \
		"" \
		#OP "_order:\n" \
		"bne $ra, $0, " #OP "_ordernonzero\n" \
		"nop\n" \
		"ori %0, %0, 8\n" \
		"" \
		#OP "_ordernonzero:\n" \
		"or $ra, $0, $t9\n" \
		"" \
		".set reorder\n" \
		: "=&r"(result) : : "t8", "t9" \
	);

#define SET_U32(rd, i) \
	asm volatile ( \
		"lui %0, %1\n" \
		"ori %0, %0, %2\n" \
		: "+r"(rd) : "K"((i >> 16) & 0xFFFF), "K"(i & 0xFFFF) \
	);

#define SET_M(rd, p) \
	rd = *(u32 *)(p);

static inline void PRINT_BRANCH(const u32 result, int newline) {
	printf("%s, ", (result & BRANCH_FOLLOWED) != 0 ? "followed" : "skipped");
	printf("%s, ", (result & BRANCH_SET_RA) != 0 ? "set ra" : "ignored ra");
	printf("%s, ", (result & BRANCH_DELAY_SLOT) != 0 ? "ran delay slot" : "skipped delay slot");
	printf("%s", (result & BRANCH_DELAY_RA_WON) != 0 ? "used delay ra" : "used link ra");
	if (newline) {
		printf("\n");
	}
}

#define BRRO_OP_DO_II(OP, s, t) \
	SET_U32(rs, s); SET_U32(rt, t); \
	BRRO(OP, res, rs, rt); \
	printf("  %s %d, %d: ", #OP, (u32)rs, (u32)rt); PRINT_BRANCH(res, 1);

#define BRRO_OP_DO_MM(OP, s, t) \
	SET_M(rs, s); SET_M(rt, t); \
	BRRO(OP, res, rs, rt); \
	printf("  %s %s, %s: ", #OP, #s, #t); PRINT_BRANCH(res, 1);

#define TEST_BRRO_FUNC(OP) \
static void test_##OP() { \
	u32 res; \
	register u32 rs, rt; \
	 \
	printf("%s:\n", #OP); \
	 \
	BRRO_OP_DO_II(OP, 0, 0); \
	BRRO_OP_DO_II(OP, 0, 1); \
	BRRO_OP_DO_II(OP, 1, 1); \
	BRRO_OP_DO_II(OP, 1, 0); \
	BRRO_OP_DO_II(OP, 2, 2); \
	BRRO_OP_DO_II(OP, 0xFFFFFFFF, 1); \
	BRRO_OP_DO_II(OP, 0xFFFFFFFF, 0xFFFFFFFF); \
	 \
	BRRO_OP_DO_MM(OP, C_ZERO, C_ZERO); \
	BRRO_OP_DO_MM(OP, C_ZERO, C_ONE); \
	BRRO_OP_DO_MM(OP, C_ONE, C_ZERO); \
	BRRO_OP_DO_MM(OP, C_ONE, C_ONE); \
	BRRO_OP_DO_MM(OP, C_ONE, C_NEGONE); \
	BRRO_OP_DO_MM(OP, C_S16_MAX, C_S16_MAX); \
	BRRO_OP_DO_MM(OP, C_S16_MIN, C_S16_MIN); \
	BRRO_OP_DO_MM(OP, C_S32_MAX, C_S32_MAX); \
	BRRO_OP_DO_MM(OP, C_S32_MIN, C_S32_MIN); \
	BRRO_OP_DO_MM(OP, C_GARBAGE1, C_GARBAGE2); \
	 \
	printf("\n"); \
}

#define BRO_OP_DO_I(OP, s) \
	SET_U32(rs, s); \
	BRO(OP, res, rs); \
	printf("  %s %d: ", #OP, (u32)rs); PRINT_BRANCH(res, 1);

#define BRO_OP_DO_M(OP, s) \
	SET_M(rs, s); \
	BRO(OP, res, rs); \
	printf("  %s %s: ", #OP, #s); PRINT_BRANCH(res, 1);

#define TEST_BRO_FUNC(OP) \
static void test_##OP() { \
	u32 res; \
	register u32 rs; \
	 \
	printf("%s:\n", #OP); \
	 \
	BRO_OP_DO_I(OP, 0); \
	BRO_OP_DO_I(OP, 1); \
	BRO_OP_DO_I(OP, 2); \
	BRO_OP_DO_I(OP, 0xFFFFFFFF); \
	BRO_OP_DO_I(OP, 0x7FFFFFFF); \
	BRO_OP_DO_I(OP, 0x80000000); \
	 \
	BRO_OP_DO_M(OP, C_ZERO); \
	BRO_OP_DO_M(OP, C_ONE); \
	BRO_OP_DO_M(OP, C_NEGONE); \
	BRO_OP_DO_M(OP, C_S16_MAX); \
	BRO_OP_DO_M(OP, C_S16_MIN); \
	BRO_OP_DO_M(OP, C_S32_MAX); \
	BRO_OP_DO_M(OP, C_S32_MIN); \
	BRO_OP_DO_M(OP, C_GARBAGE1); \
	BRO_OP_DO_M(OP, C_GARBAGE2); \
	\
	printf("\n"); \
}

#define TEST_BO_FUNC(OP) \
static void test_##OP() { \
	u32 res; \
	 \
	printf("%s:\n", #OP); \
	 \
	BO(OP, res); \
	printf("  %s: ", #OP); PRINT_BRANCH(res, 1); \
	\
	printf("\n"); \
}

#define TEST_BRR_FUNC(OP) \
static void test_##OP() { \
	u32 res; \
	 \
	printf("%s:\n", #OP); \
	 \
	BRR(OP, res); \
	printf("  %s: ", #OP); PRINT_BRANCH(res, 1); \
	\
	printf("\n"); \
}

#define TEST_BR_FUNC(OP) \
static void test_##OP() { \
	u32 res; \
	 \
	printf("%s:\n", #OP); \
	 \
	BR(OP, res); \
	printf("  %s: ", #OP); PRINT_BRANCH(res, 1); \
	\
	printf("\n"); \
}

TEST_BRRO_FUNC(beq);
TEST_BRRO_FUNC(beql);
TEST_BRO_FUNC(bgez);
TEST_BRO_FUNC(bgezal);
TEST_BRO_FUNC(bgezall);
TEST_BRO_FUNC(bgtz);
TEST_BRO_FUNC(bgtzl);
TEST_BRO_FUNC(blez);
TEST_BRO_FUNC(blezl);
TEST_BRO_FUNC(bltz);
TEST_BRO_FUNC(bltzl);
TEST_BRO_FUNC(bltzal);
TEST_BRO_FUNC(bltzall);
TEST_BRRO_FUNC(bne);
TEST_BRRO_FUNC(bnel);
TEST_BO_FUNC(j);
TEST_BO_FUNC(jal);
TEST_BRR_FUNC(jalr);
TEST_BR_FUNC(jr);

extern "C" int main(int argc, char **argv) {
	test_beq();
	test_beql();
	test_bgez();
	test_bgezal();
	test_bgezall();
	test_bgtz();
	test_bgtzl();
	test_blez();
	test_blezl();
	test_bltz();
	test_bltzl();
	test_bltzal();
	test_bltzall();
	test_bne();
	test_bnel();
	test_j();
	test_jal();
	test_jalr();
	test_jr();

	return 0;
}
