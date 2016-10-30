#include <common.h>
#include <psputility.h>
#include <pspiofilemgr.h>
#include "sascore.h"

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};
u8 *vag;

void testSetPitch(SasCore *sasCore, int v, int pitch, const char *title) {
	int result = __sceSasSetPitch(sasCore, v, pitch);
	if (result < 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%08x)", title, result);
	}
}

void printSample(int i) {
	schedf("  [%03x] %04x %04x\n", i, (u16)samples[i * 2 + 0], (u16)samples[i * 2 + 1]);
}

void testPitchOutput(int pitch) {
	memset(samples, 0xdd, sizeof(samples));

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
	__sceSasSetADSR(&sasCore, 0, 15, 0x40000000, 0x40000000, 0x40000000, 0x40000000);

	char temp[64];
	snprintf(temp, sizeof(temp), "Output with pitch %04x:", pitch);
	checkpointNext(temp);
	__sceSasSetGrain(&sasCore, 512);
	__sceSasSetPitch(&sasCore, 0, pitch);
	__sceSasSetOutputmode(&sasCore, 0);
	// TODO: Separate this out?
	//__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetVoice(&sasCore, 0, vag, 256, 1);
	__sceSasSetKeyOn(&sasCore, 0);
	memset(samples, 0xdd, sizeof(samples));
	__sceSasCore(&sasCore, samples);
	u16 last;
	for (int i = 0; i < 512; ++i) {
		printSample(i);
	}
	checkpoint("  Ended: %08x", __sceSasGetEndFlag(&sasCore));
}

extern "C" int main(int argc, char *argv[]) {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_SASCORE);

	int fd = sceIoOpen("music.vag", PSP_O_RDONLY, 0);
	int sz = sceIoLseek32(fd, 0, PSP_SEEK_END);
	sceIoLseek32(fd, 0, SEEK_SET);
	vag = new u8[sz];
	sceIoRead(fd, vag, sz);
	sceIoClose(fd);

	__sceSasInit(&sasCore, 128, 32, 1, 44100);

	for (int i = 0; i < ARRAY_SIZE(pcm); ++i) {
		pcm[i] = (short)(65535 - i);
	}

	checkpointNext("Voices:");
	testSetPitch(&sasCore, 0, 0x1000, "  Normal");
	testSetPitch(&sasCore, -1, 0x1000, "  Voice -1");
	testSetPitch(&sasCore, 32, 0x1000, "  Voice 32");
	
	checkpointNext("Pitches:");
	static const int pitches[] = {-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0x100, 0x800, 0x3FFF, 0x4000, 0x4001, 0x8000, 0x80000001};
	for (size_t i = 0; i < ARRAY_SIZE(pitches); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Pitch %x", pitches[i]);
		testSetPitch(&sasCore, 0, pitches[i], temp);
	}

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetSL(&sasCore, 0, 0x12345678);
	__sceSasSetADSR(&sasCore, 0, 15, 0x1000, 0x1000, 0x1000, 0x1000);

	checkpointNext("After voice setup:");
	testSetPitch(&sasCore, 0, 0x4000, "  Normal");
	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetPause(&sasCore, -1, 1);
	testSetPitch(&sasCore, 0, 0x4000, "  While paused");
	checkpoint("  Still paused: %08x", __sceSasGetPauseFlag(&sasCore));
	__sceSasSetPause(&sasCore, -1, 0);
	
	checkpointNext("With core:");
	checkpoint("  Key on: %08x", __sceSasSetKeyOn(&sasCore, 0));
	// Do it a few times to bump the height up.
	for (int i = 0; i < 4; ++i) {
		checkpoint("  Core: %08x", __sceSasCore(&sasCore, samples));
	}
	testSetPitch(&sasCore, 0, 0x4000, "  After processing");
	checkpoint("  Still playing: %08x", __sceSasGetEndFlag(&sasCore));

	// TODO: Do we want to emulate the resampling exactly?
	//testPitchOutput(0);
	//testPitchOutput(1);
	//testPitchOutput(0x800);
	//testPitchOutput(0x1000);
	//testPitchOutput(0x2000);
	//testPitchOutput(0x4000);

	delete [] vag;

	return 0;
}