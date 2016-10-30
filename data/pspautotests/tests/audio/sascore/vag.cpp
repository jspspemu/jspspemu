#include <common.h>
#include <psputility.h>
#include <pspiofilemgr.h>
#include "sascore.h"

__attribute__((aligned(64))) SasCore sasCore;
__attribute__((aligned(64))) short pcm[256 * 2 * 16] = {0};
__attribute__((aligned(64))) short samples[4096 * 2 * 16] = {0};
u8 *vag;

void testSetVoice(SasCore *sasCore, int v, void *addr, int size, int loop, const char *title) {
	int result = __sceSasSetVoice(sasCore, v, addr, size, loop);
	if (result < 0) {
		checkpoint("%s: Failed (%08x)", title, result);
	} else {
		checkpoint("%s: OK (%08x)", title, result);
	}
}

void printSample(int i) {
	schedf("  [%03x] %04x %04x\n", i, (u16)samples[i * 2 + 0], (u16)samples[i * 2 + 1]);
}

void testVAGOutput(int loop) {
	memset(samples, 0xdd, sizeof(samples));

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
	__sceSasSetADSR(&sasCore, 0, 15, 0x40000000, 0x40000000, 0x40000000, 0x40000000);

	char temp[64];
	snprintf(temp, sizeof(temp), "Output with loop %04x:", loop);
	checkpointNext(temp);
	__sceSasSetGrain(&sasCore, 512);
	__sceSasSetOutputmode(&sasCore, 0);
	__sceSasSetVoice(&sasCore, 0, vag, 1024, loop);
	__sceSasSetKeyOn(&sasCore, 0);
	memset(samples, 0xdd, sizeof(samples));
	__sceSasCore(&sasCore, samples);
	printSample(0x0020);
	printSample(0x011E);
	printSample(0x0120);
	checkpoint("  Ended: %08x", __sceSasGetEndFlag(&sasCore));
}

void testVAGData(int predict_nr, int flagsAfter0) {
	u8 data[0x100];

	// Each block is 16 bytes, predict_nr, flags, data.
	for (int i = 0; i < 0x100; i += 0x10) {
		data[i + 0] = (predict_nr << 4) | (i >> 4);
		data[i + 1] = i == 0 ? 0 : flagsAfter0;
		for (int j = 0x02; j < 0x10; ++j) {
			data[i + j] = (j << 4) | 3;
		}
	}

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT, PSP_SAS_ADSR_CURVE_MODE_DIRECT);
	__sceSasSetADSR(&sasCore, 0, 15, 0x40000000, 0x40000000, 0x40000000, 0x40000000);

	char temp[64];
	snprintf(temp, sizeof(temp), "VAG data (predict_nr=%x, flagsAfter0=%02x):", predict_nr, flagsAfter0);
	checkpointNext(temp);
	__sceSasSetGrain(&sasCore, 512);
	__sceSasSetOutputmode(&sasCore, 0);
	__sceSasSetVoice(&sasCore, 0, data, 0x100, 1);
	__sceSasSetKeyOn(&sasCore, 0);
	memset(samples, 0xdd, sizeof(samples));
	__sceSasCore(&sasCore, samples);
	for (int i = 32; i < 40; ++i) {
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
	testSetVoice(&sasCore, 0, vag, 0x100, 0, "  Normal");
	testSetVoice(&sasCore, -1, vag, 0x100, 0, "  Voice -1");
	testSetVoice(&sasCore, 32, vag, 0x100, 0, "  Voice 32");

	checkpointNext("Addresses:");
	testSetVoice(&sasCore, 0, 0, 0x100, 0, "Zero");
	testSetVoice(&sasCore, 0, vag, 0x100, 0, "Valid");
	
	checkpointNext("Sizes:");
	static const int sizes[] = {-500000, -64, -48, -47, -1, 0, 1, 2, 3, 4, 5, 8, 12, 15, 16, 32, 48, 64, 128, 255, 256, 257, 1024, 1025, 0x10000, 0x10001, 0x20000, 0x10000000, 0x80000000};
	for (int i = 0; i < ARRAY_SIZE(sizes); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Size %x", sizes[i]);
		testSetVoice(&sasCore, 0, vag, sizes[i], 0, temp);
	}

	checkpointNext("Loop start pos:");
	static const int loops[] = {-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 255, 256, 257, 0x10000, 0x10001, 0x10000000, 0x40000001, 0x80000001};
	for (int i = 0; i < ARRAY_SIZE(loops); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Loop pos %d / 256", loops[i]);
		testSetVoice(&sasCore, 0, vag, 0x100, loops[i], temp);
	}
	testSetVoice(&sasCore, 0, vag, 1, 1, "  Loop pos 1 / 1");
	testSetVoice(&sasCore, 0, vag, 1, 2, "  Loop pos 2 / 1");
	testSetVoice(&sasCore, 0, vag, 0x10000, 0xFFFF, "  Loop pos 0xFFFF / 0x10000");
	testSetVoice(&sasCore, 0, vag, 0x10000, 0x10000, "  Loop pos 0x10000 / 0x10000");

	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetVoicePCM(&sasCore, 0, pcm, 256, 0);
	__sceSasSetADSRmode(&sasCore, 0, 15, PSP_SAS_ADSR_CURVE_MODE_LINEAR_INCREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE, PSP_SAS_ADSR_CURVE_MODE_LINEAR_DECREASE);
	__sceSasSetSL(&sasCore, 0, 0x12345678);
	__sceSasSetADSR(&sasCore, 0, 15, 0x1000, 0x1000, 0x1000, 0x1000);

	checkpointNext("After voice setup:");
	testSetVoice(&sasCore, 0, vag, 0x10000, 0, "  Normal");
	__sceSasSetKeyOff(&sasCore, 0);
	__sceSasSetPause(&sasCore, -1, 1);
	testSetVoice(&sasCore, 0, vag, 0x10000, 0, "  While paused");
	checkpoint("  Still paused: %08x", __sceSasGetPauseFlag(&sasCore));
	__sceSasSetPause(&sasCore, -1, 0);
	
	checkpointNext("With core:");
	checkpoint("  Key on: %08x", __sceSasSetKeyOn(&sasCore, 0));
	// Do it a few times to bump the height up.
	for (int i = 0; i < 4; ++i) {
		checkpoint("  Core: %08x", __sceSasCore(&sasCore, samples));
	}
	testSetVoice(&sasCore, 0, vag, 0x10000, 0, "  After processing");
	checkpoint("  Still playing: %08x", __sceSasGetEndFlag(&sasCore));

	// TODO: Do we want to emulate the resampling exactly?
	testVAGOutput(0);
	testVAGOutput(1);

	delete [] vag;

	for (int i = 0; i < 0x10; ++i) {
		testVAGData(i, 0);
	}
	testVAGData(0x0, 0x03);
	testVAGData(0x0, 0x07);
	testVAGData(0x0, 0x41);
	testVAGData(0x0, 0x01);
	testVAGData(0x0, 0x87);

	return 0;
}
