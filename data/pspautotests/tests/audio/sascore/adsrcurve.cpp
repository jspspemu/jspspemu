#include <common.h>
#include <psputility.h>
#include "sascore.h"

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};

void testAttackCurve(const char *title, int type, int rate) {
	checkpointNext(title);

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasCore(&sasCore, samples);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	int result = __sceSasSetADSRmode(&sasCore, 0, 7, type, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
	if (result < 0) {
		checkpoint("  Failed (%08x)", result);
		return;
	}
	__sceSasSetADSR(&sasCore, 0, 7, rate, 1, 1, 0);
	__sceSasSetKeyOn(&sasCore, 0);

	int lastHeight = 0;
	int lastChange = 0;
	int lastChangeAt = 0;
	for (int i = 0; i < 256; ++i) {
		__sceSasCore(&sasCore, samples);

		int h = __sceSasGetEnvelopeHeight(&sasCore, 0);
		int change = h - lastHeight;
		if (lastChange != change) {
			if (change < 0) {
				checkpoint("  Height: -%08x after %d (%08x)", -change, i - lastChangeAt, h);
			} else {
				checkpoint("  Height: +%08x after %d (%08x)", change, i - lastChangeAt, h);
			}
			lastChange = change;
			lastChangeAt = i;
		}
		lastHeight = h;
	}

	if (lastChange < 0) {
		checkpoint("  Height: -%08x after %d", -lastChange, 256 - lastChangeAt);
	} else {
		checkpoint("  Height: +%08x after %d", lastChange, 256 - lastChangeAt);
	}
}

void testDecayCurve(const char *title, int type, int rate) {
	checkpointNext(title);

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasCore(&sasCore, samples);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	int result = __sceSasSetADSRmode(&sasCore, 0, 7, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, type, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
	if (result < 0) {
		checkpoint("  Failed (%08x)", result);
		return;
	}
	__sceSasSetADSR(&sasCore, 0, 7, PSP_SAS_ENVELOPE_HEIGHT_MAX / 32, rate, 1, 0);
	__sceSasSetKeyOn(&sasCore, 0);
	__sceSasCore(&sasCore, samples);
	
	int lastHeight = __sceSasGetEnvelopeHeight(&sasCore, 0);
	int lastChange = 0;
	int lastChangeAt = 0;
	for (int i = 0; i < 128; ++i) {
		__sceSasCore(&sasCore, samples);
		int h = __sceSasGetEnvelopeHeight(&sasCore, 0);
		int change = h - lastHeight;
		if (lastChange != change) {
			if (change < 0) {
				checkpoint("  Height: -%08x after %d (%08x)", -change, i - lastChangeAt, h);
			} else {
				checkpoint("  Height: +%08x after %d (%08x)", change, i - lastChangeAt, h);
			}
			lastChange = change;
			lastChangeAt = i;
		}
		lastHeight = h;
	}

	if (lastChange < 0) {
		checkpoint("  Height: -%08x after %d", -lastChange, 128 - lastChangeAt);
	} else {
		checkpoint("  Height: +%08x after %d", lastChange, 128 - lastChangeAt);
	}
}

extern "C" int main(int argc, char *argv[]) {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	__sceSasInit(&sasCore, 64, 32, 1, 44100);

	for (size_t i = 0; i < ARRAY_SIZE(pcm); ++i) {
		pcm[i] = 0x7FFF;
	}

	testAttackCurve("Attack linear increase 0x1:", PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, 1);
	testAttackCurve("Attack linear increase 0x1000000:", PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, 0x1000000);
	testAttackCurve("Attack linear increase 0x100000:", PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, 0x100000);
	testAttackCurve("Attack linear decrease 0x1:", PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, 1);
	testAttackCurve("Attack linear decrease 0x100000:", PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, 0x100000);
	testAttackCurve("Attack linear bent 0x1:", PSP_SAS_ADSR_CURVE_MODE_LINEAR_BENT, 1);
	testAttackCurve("Attack linear bent 0x100000:", PSP_SAS_ADSR_CURVE_MODE_LINEAR_BENT, 0x100000);
	testAttackCurve("Attack exponent rev 0x1:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 1);
	testAttackCurve("Attack exponent rev 0x100000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 0x100000);
	testAttackCurve("Attack exponent 0x1:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 1);
	testAttackCurve("Attack exponent 0x5:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 5);
	testAttackCurve("Attack exponent 0x0:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0);
	testAttackCurve("Attack exponent 0x10:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x10);
	testAttackCurve("Attack exponent 0x100:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x100);
	testAttackCurve("Attack exponent 0x1000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x1000);
	testAttackCurve("Attack exponent 0x10000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x10000);
	testAttackCurve("Attack exponent 0x100000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x100000);
	testAttackCurve("Attack exponent 0x1000000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x1000000);
	testAttackCurve("Attack exponent 0x10000000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x10000000);
	testAttackCurve("Attack direct 0x1:", PSP_SAS_ADSR_CURVE_MODE_DIRECT, 1);
	testAttackCurve("Attack direct 0x100000:", PSP_SAS_ADSR_CURVE_MODE_DIRECT, 0x100000);

	testAttackCurve("Attack exponent 1:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 1);
	testAttackCurve("Attack exponent 5:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 5);
	testAttackCurve("Attack exponent 9:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 9);
	testAttackCurve("Attack exponent 13:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 13);
	testAttackCurve("Attack exponent 17:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 17);
	testAttackCurve("Attack exponent 33:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 33);
	testAttackCurve("Attack exponent 48:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 48);
	testAttackCurve("Attack exponent 49:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 49);
	testAttackCurve("Attack exponent 65:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 65);
	testAttackCurve("Attack exponent 100:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 100);
	testAttackCurve("Attack exponent 400:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 400);
	testAttackCurve("Attack exponent 800:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 800);
	testAttackCurve("Attack exponent 0x100000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x100000);

	testDecayCurve("Decay exponent 0:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 0);
	testDecayCurve("Decay exponent 1:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 1);
	testDecayCurve("Decay exponent 2:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 2);
	testDecayCurve("Decay exponent 3:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 3);
	testDecayCurve("Decay exponent 4:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 4);
	testDecayCurve("Decay exponent 5:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 5);
	testDecayCurve("Decay exponent 6:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 6);
	testDecayCurve("Decay exponent 7:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 7);
	testDecayCurve("Decay exponent 8:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 8);
	testDecayCurve("Decay exponent 9:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 9);
	testDecayCurve("Decay exponent 17:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 17);
	testDecayCurve("Decay exponent 0x100000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 0x100000);
	
	testAttackCurve("Attack exponent 0x10000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x10000);
	testDecayCurve("Decay exponent 0x10000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 0x10000);
	testAttackCurve("Attack exponent 0x1000000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x1000000);
	testDecayCurve("Decay exponent 0x1000000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 0x1000000);
	testAttackCurve("Attack exponent 0x40000000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x40000000);
	testDecayCurve("Decay exponent 0x40000000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 0x40000000);
	testAttackCurve("Attack exponent 0x60000000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x60000000);
	testDecayCurve("Decay exponent 0x60000000:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 0x60000000);
	testAttackCurve("Attack exponent 0x7FFFFFFF:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 0x7FFFFFFF);
	testAttackCurve("Attack exponent 1:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT, 1);
	testDecayCurve("Decay exponent 0x7FFFFFFF:", PSP_SAS_ADSR_CURVE_MODE_EXPONENT_REV, 0x7FFFFFFF);

	return 0;
}
