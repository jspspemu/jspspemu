#include <common.h>
#include <psputility.h>
#include "sascore.h"

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};

void testSetADSRmode(SasCore *sasCore, const char *title, int voice, int flag, int attackType, int decayType, int sustainType, int releaseType) {
	int result = __sceSasSetADSRmode(sasCore, voice, flag, attackType, decayType, sustainType, releaseType);
	if (result != 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%d, %d, %d, %d)", title,
			sasCore->voices[voice].attackType, sasCore->voices[voice].decayType, sasCore->voices[voice].sustainType, sasCore->voices[voice].releaseType);
	}
}

void testSetADSR(SasCore *sasCore, const char *title, int voice, int flag, int attackRate, int decayRate, int sustainRate, int releaseRate) {
	int result = __sceSasSetADSR(sasCore, voice, flag, attackRate, decayRate, sustainRate, releaseRate);
	if (result != 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%x, %x, %x, %x)", title,
			sasCore->voices[voice].attackRate, sasCore->voices[voice].decayRate, sasCore->voices[voice].sustainRate, sasCore->voices[voice].releaseRate);
	}
}

void testSetSimpleADSR(SasCore *sasCore, const char *title, int voice, u32 adsr1, u32 adsr2) {
	int result = __sceSasSetSimpleADSR(sasCore, voice, adsr1, adsr2);
	if (result != 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%d, %d, %d, %d - %x, %x, %x, %x - %x)", title,
			sasCore->voices[voice].attackType, sasCore->voices[voice].decayType, sasCore->voices[voice].sustainType, sasCore->voices[voice].releaseType,
			sasCore->voices[voice].attackRate, sasCore->voices[voice].decayRate, sasCore->voices[voice].sustainRate, sasCore->voices[voice].releaseRate,
			sasCore->voices[voice].sustainLevel);
	}
}

void testBasicModeUsage() {
	checkpointNext("Basic usage:");
	testSetADSRmode(&sasCore, "  Normal", 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	testSetADSRmode(&sasCore, "  Voice -1", -1, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	testSetADSRmode(&sasCore, "  Voice 32", 32, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	testSetADSRmode(&sasCore, "  No update", 0, 0, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	testSetADSRmode(&sasCore, "  Update -1", 0, -1, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);

	checkpointNext("Modes:");
	static const int modes[] = {
		-1, 0, 1, 2, 3, 4, 5, 6, 7, 0x1001, 0x10001, 0x40000001, 0x80000001,
	};
	for (size_t i = 0; i < ARRAY_SIZE(modes); ++i) {
		char temp[64];
		checkpoint("Mode %x", modes[i]);
		snprintf(temp, ARRAY_SIZE(temp), "  Attack mode %x", modes[i]);
		testSetADSRmode(&sasCore, temp, 0, 1, modes[i], modes[i], modes[i], modes[i]);
		snprintf(temp, ARRAY_SIZE(temp), "  Decay mode %x", modes[i]);
		testSetADSRmode(&sasCore, temp, 0, 2, modes[i], modes[i], modes[i], modes[i]);
		snprintf(temp, ARRAY_SIZE(temp), "  Sustain mode %x", modes[i]);
		testSetADSRmode(&sasCore, temp, 0, 4, modes[i], modes[i], modes[i], modes[i]);
		snprintf(temp, ARRAY_SIZE(temp), "  Release mode %x", modes[i]);
		testSetADSRmode(&sasCore, temp, 0, 8, modes[i], modes[i], modes[i], modes[i]);
		snprintf(temp, ARRAY_SIZE(temp), "  Update none mode %x", modes[i]);
		testSetADSRmode(&sasCore, temp, 0, 0, modes[i], modes[i], modes[i], modes[i]);
	}

	testSetADSRmode(&sasCore, "  All to direct at once", 0, 15, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
}

void testBasicValueUsage() {
	checkpointNext("Basic usage:");
	testSetADSR(&sasCore, "  Normal", 0, 15, 0x1000, 0x1000, 0x1000, 0x1000);
	testSetADSR(&sasCore, "  Voice -1", -1, 15, 0x1000, 0x1000, 0x1000, 0x1000);
	testSetADSR(&sasCore, "  Voice 32", 32, 15, 0x1000, 0x1000, 0x1000, 0x1000);
	testSetADSR(&sasCore, "  No update", 0, 0, 0x1000, 0x1000, 0x1000, 0x1000);
	testSetADSR(&sasCore, "  Update -1", 0, -1, 0x1000, 0x1000, 0x1000, 0x1000);
	
	checkpointNext("Values:");
	static const int values[] = {
		-1, 0, 1, 2, 3, 0x7FFFFFFF, 0x80000000,
	};
	for (size_t i = 0; i < ARRAY_SIZE(values); ++i) {
		char temp[64];
		snprintf(temp, ARRAY_SIZE(temp), "  Value %x", values[i]);
		testSetADSR(&sasCore, temp, 0, 15, values[i], values[i], values[i], values[i]);
	}
	testSetADSR(&sasCore, "  Update none to invalid value", 0, 0, -1, -1, -1, -1);
	testSetADSR(&sasCore, "  Update invalid to invalid value", 0, ~15, -1, -1, -1, -1);
}

void testBasicSimpleUsage() {
	// Value 1: |AT|    ATTACK RATE     |DECAY RATE |SUST. LEVEL|
	// Value 2: |SUS.T|XX|    SUSTAIN RATE    |RT| RELEASE RATE |

	checkpointNext("Basic usage:");
	testSetSimpleADSR(&sasCore, "  Normal", 0, 0, 0);
	testSetSimpleADSR(&sasCore, "  Voice -1", -1, 0, 0);
	testSetSimpleADSR(&sasCore, "  Voice 32", 32, 0, 0);
	testSetSimpleADSR(&sasCore, "  Unknown value", 0, 0, 1 << 13);

	checkpointNext("Attack:");
	static const int attackRates[] = {1, 2, 0x60, 0x69, 0x6A, 0x6B, 0x6C, 0x6F, 0x70, 0x7E, 0x7F};
	for (int t = 0; t <= 1; ++t) {
		checkpoint("* Attack Type %d", t);
		for (size_t i = 0; i < ARRAY_SIZE(attackRates); ++i) {
			char temp[64];
			snprintf(temp, ARRAY_SIZE(temp), "  Attack rate %x", attackRates[i]);
			testSetSimpleADSR(&sasCore, temp, 0, (attackRates[i] << 8) | (t << 15), 0);
		}
	}

	checkpointNext("Decay:");
	testSetSimpleADSR(&sasCore, "  Decay rate 0x1", 0, 0x1 << 4, 0);
	testSetSimpleADSR(&sasCore, "  Decay rate 0x2", 0, 0x2 << 4, 0);
	testSetSimpleADSR(&sasCore, "  Decay rate 0xd", 0, 0xd << 4, 0);
	testSetSimpleADSR(&sasCore, "  Decay rate 0xe", 0, 0xe << 4, 0);
	testSetSimpleADSR(&sasCore, "  Decay rate 0xf", 0, 0xf << 4, 0);
	
	checkpointNext("Sustain:");
	static const int sustainRates[] = {1, 2, 0x60, 0x69, 0x6A, 0x6B, 0x6C, 0x6F, 0x70, 0x7E, 0x7F};
	for (int t = 0; t <= 3; ++t) {
		checkpoint("* Sustain Type %d", t);
		for (size_t i = 0; i < ARRAY_SIZE(sustainRates); ++i) {
			char temp[64];
			snprintf(temp, ARRAY_SIZE(temp), "  Sustain rate %x", sustainRates[i]);
			testSetSimpleADSR(&sasCore, temp, 0, 0, (sustainRates[i] << 6) | (t << 14));
		}
	}
	
	checkpointNext("Sustain levels:");
	testSetSimpleADSR(&sasCore, "  Sustain level 0x1", 0, 0x1 << 0, 0);
	testSetSimpleADSR(&sasCore, "  Sustain level 0x2", 0, 0x2 << 0, 0);
	testSetSimpleADSR(&sasCore, "  Sustain level 0xd", 0, 0xd << 0, 0);
	testSetSimpleADSR(&sasCore, "  Sustain level 0xe", 0, 0xe << 0, 0);
	testSetSimpleADSR(&sasCore, "  Sustain level 0xf", 0, 0xf << 0, 0);

	checkpointNext("Release:");
	static const int releaseRates[] = {1, 2, 0x09, 0x0A, 0x0B, 0x0C, 0x0F, 0x10, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F};
	for (int t = 0; t <= 1; ++t) {
		checkpoint("* Release Type %d", t);
		for (size_t i = 0; i < ARRAY_SIZE(releaseRates); ++i) {
			char temp[64];
			snprintf(temp, ARRAY_SIZE(temp), "  Release rate %x", releaseRates[i]);
			testSetSimpleADSR(&sasCore, temp, 0, 0, (releaseRates[i] << 0) | (t << 5));
		}
	}

	testSetSimpleADSR(&sasCore, "  ARG", 0, 0x0000800f, 0x00009fe0);
}

extern "C" int main(int argc, char *argv[]) {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	__sceSasInit(&sasCore, 128, 32, 1, 44100);

	for (size_t i = 0; i < ARRAY_SIZE(pcm); ++i) {
		pcm[i] = 0x7FFF;
	}

	checkpointNext("__sceSasSetADSRmode:");
	testBasicModeUsage();

	checkpointNext("__sceSasSetADSR:");
	testBasicValueUsage();

	checkpointNext("__sceSasSetSimpleADSR:");
	testBasicSimpleUsage();

	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetVoicePCM(&sasCore, 1, pcm, 256, 0);

	int height;
	
	checkpointNext("Before key on:");
	__sceSasSetADSRmode(&sasCore, 0, 7, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetADSR(&sasCore, 0, 7, 0x1000, 0x1000, 0x1000, 0x1000);
	__sceSasSetKeyOn(&sasCore, 0);
	height = __sceSasGetEnvelopeHeight(&sasCore, 0);
	checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	checkpoint("Height change: %08x -> %08x", height, __sceSasGetEnvelopeHeight(&sasCore, 0));
	__sceSasSetKeyOff(&sasCore, 0);
	
	checkpointNext("After key on:");
	__sceSasSetKeyOn(&sasCore, 1);
	__sceSasSetADSRmode(&sasCore, 1, 7, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetADSR(&sasCore, 1, 7, 0x1000, 0x1000, 0x1000, 0x1000);
	height = __sceSasGetEnvelopeHeight(&sasCore, 1);
	checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	checkpoint("Height change: %08x -> %08x", height, __sceSasGetEnvelopeHeight(&sasCore, 1));
	
	checkpointNext("While playing:");
	__sceSasSetKeyOn(&sasCore, 1);
	__sceSasSetADSRmode(&sasCore, 1, 7, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetADSR(&sasCore, 1, 7, 0x1000, 0x1000, 0x1000, 0x1000);
	height = __sceSasGetEnvelopeHeight(&sasCore, 1);
	checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	checkpoint("Height change: %08x -> %08x", height, __sceSasGetEnvelopeHeight(&sasCore, 1));
	checkpoint("Set mode: %08x", __sceSasSetADSRmode(&sasCore, 1, 7, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE));
	checkpoint("Set rate: %08x", __sceSasSetADSR(&sasCore, 1, 7, 0x2000, 0x2000, 0x2000, 0x2000));
	height = __sceSasGetEnvelopeHeight(&sasCore, 1);
	checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	checkpoint("Height change: %08x -> %08x", height, __sceSasGetEnvelopeHeight(&sasCore, 1));
	
	checkpointNext("Before key on:");
	__sceSasSetADSRmode(&sasCore, 0, 7, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetADSR(&sasCore, 0, 7, 0x1000, 0x1000, 0x1000, 0x1000);
	checkpoint("keyon: %08x", __sceSasSetKeyOn(&sasCore, 0));
	height = __sceSasGetEnvelopeHeight(&sasCore, 0);
	checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	checkpoint("Height change: %08x -> %08x", height, __sceSasGetEnvelopeHeight(&sasCore, 0));
	height = __sceSasGetEnvelopeHeight(&sasCore, 0);
	checkpoint("Core: %08x", __sceSasCore(&sasCore, samples));
	checkpoint("Height change: %08x -> %08x", height, __sceSasGetEnvelopeHeight(&sasCore, 0));
	__sceSasSetKeyOff(&sasCore, 0);

	return 0;
}
