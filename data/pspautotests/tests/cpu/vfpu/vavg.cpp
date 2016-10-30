#include <common.h>

#include "vfpu_common.h"

const ALIGN16 ScePspFVector4 vZero = {0, 0, 0, 0};
const ALIGN16 ScePspFVector4 vMinusOne = {-1, -1, -1, -1};

ALIGN16 ScePspFVector4 input, output;

#define GEN_SV(FuncName, Op, PFX) \
	void NOINLINE FuncName(ScePspFVector4 *v0, const ScePspFVector4 *v1) { \
	asm volatile ( \
	"lv.q   C100, %1\n" \
	Op " S000, "PFX"100\n" \
	"sv.q   C000, %0\n" \
	: "+m" (*v0) : "m" (*v1) \
	); \
}

#define GEN_PTQ(genFun, name) \
	genFun(name ## _p, #name ".p", "C"); \
	genFun(name ## _t, #name ".t", "C"); \
	genFun(name ## _q, #name ".q", "C");

GEN_PTQ(GEN_SV, vavg);
GEN_PTQ(GEN_SV, vfad);

void testSV(const char *desc, void (*vvvxxx)(ScePspFVector4 *v0, const ScePspFVector4 *v1)) {
	(*vvvxxx)(&output, &input);
	printVector(desc, &output);
}

void test_vavg_vfad(const char *subdesc) {
	char temp[256];

	sprintf(temp, "vavg.p: %s", subdesc);
	testSV(temp, &vavg_p);
	sprintf(temp, "vavg.t: %s", subdesc);
	testSV(temp, &vavg_t);
	sprintf(temp, "vavg.q: %s", subdesc);
	testSV(temp, &vavg_q);

	sprintf(temp, "vfad.p: %s", subdesc);
	testSV(temp, &vfad_p);
	sprintf(temp, "vfad.t: %s", subdesc);
	testSV(temp, &vfad_t);
	sprintf(temp, "vfad.q: %s", subdesc);
	testSV(temp, &vfad_q);
}

extern "C" int main(int argc, char *argv[]) {
	input.x = -0.0f;
	input.y = -0.0f;
	input.z = -0.0f;
	input.w = -0.0f;
	test_vavg_vfad("Negative zero");

	input.x = 1.0f;
	input.y = NAN;
	input.z = 1.0f;
	input.w = 1.0f;
	test_vavg_vfad("Single NAN");

	input.x = 1.0f;
	input.y = -INFINITY;
	input.z = 1.0f;
	input.w = 1.0f;
	test_vavg_vfad("Single -INFINITY");

	input.x = -1.0f;
	input.y = 1.0f;
	input.z = -1.0f;
	input.w = 1.0f;
	test_vavg_vfad("Sign near zero");

	return 0;
}