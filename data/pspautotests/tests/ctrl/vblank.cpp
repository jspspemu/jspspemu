#include <common.h>
#include <pspctrl.h>
#include <pspdisplay.h>
#include <pspintrman.h>
#include <pspthreadman.h>

extern "C" {
	int sceDisplayIsVsync();
}

static const bool LOG_ACCURATE_TIMING = false;
static const u32 TIME_ROUND_INTERVAL = (1000000 / 60) / 8;
static const u32 HCOUNT_ROUND_INTERVAL = 286 / 2;
static const u32 FRAME_HCOUNT_ROUND_INTERVAL = 5;

static SceCtrlData pad_data[64];
static u32 firstSample = 0;
static int vcountBase;
static int hcountBase;

u32 getLatestSample() {
	u32 latestSample = 0;
	for (int i = 0; i < ARRAY_SIZE(pad_data); ++i) {
		if (latestSample < pad_data[i].TimeStamp) {
			latestSample = pad_data[i].TimeStamp;
		}
	}

	return latestSample;
}

u32 roundUp(u32 v, u32 interval) {
	u32 intervals = (v + interval - 1) / interval;
	return intervals * interval;
}

void logSampleInfo() {
	u32 sample = getLatestSample() - firstSample;
	u32 timeDelta = sceKernelGetSystemTimeLow() - getLatestSample();
	int hcount = sceDisplayGetAccumulatedHcount() - hcountBase;
	int frameHcount = sceDisplayGetCurrentHcount();

	if (!LOG_ACCURATE_TIMING) {
		sample = roundUp(sample, TIME_ROUND_INTERVAL);
		timeDelta = roundUp(timeDelta, TIME_ROUND_INTERVAL);
		hcount = roundUp(hcount, HCOUNT_ROUND_INTERVAL);
		frameHcount = roundUp(frameHcount, FRAME_HCOUNT_ROUND_INTERVAL);
	}

	schedf("[-]   Latest sample at: +%ums, behind: %ums\n", sample, timeDelta);
	schedf("[-]   Vblank: %d (inside: %d), inside vsync: %d\n", sceDisplayGetVcount() - vcountBase, sceDisplayIsVblank(), sceDisplayIsVsync());
	schedf("[-]   Hcount: %d (+%d)\n", hcount, frameHcount);
}

extern "C" void vblankCallback(int no, void *value) {
	schedf("[-] Peek inside interrupt: %08x\n", sceCtrlPeekBufferPositive(pad_data, 64));
	logSampleInfo();
}

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("Init:");
	checkpoint("sceCtrlSetSamplingCycle: %08x", sceCtrlSetSamplingCycle(0));

	sceKernelRegisterSubIntrHandler(PSP_DISPLAY_SUBINT, 1, (void *)vblankCallback, NULL);

	// Clear it out in case we've been running a while.
	sceCtrlReadBufferPositive(pad_data, 64);

	checkpointNext("Vblanks:");

	sceCtrlPeekBufferPositive(pad_data, 64);
	for (int i = 0; i < 64; i++) {
		if (firstSample < pad_data[i].TimeStamp) {
			firstSample = pad_data[i].TimeStamp;
		}
	}

	sceDisplayWaitVblankStart();
	vcountBase = sceDisplayGetVcount();
	hcountBase = sceDisplayGetAccumulatedHcount();

	sceKernelEnableSubIntr(PSP_DISPLAY_SUBINT, 1);
	for (int i = 0; i < 20; ++i) {
		checkpoint("Read outside interrupt: %08x", sceCtrlReadBufferPositive(pad_data, 64));
		logSampleInfo();
	}
	sceKernelDisableSubIntr(PSP_VBLANK_INT, 1);

	sceDisplayWaitVblankStart();
	int avg = (sceDisplayGetAccumulatedHcount() - hcountBase) / 201;
	checkpoint("Possible: %d", avg);

	sceKernelReleaseSubIntrHandler(PSP_DISPLAY_SUBINT, 1);

	return 0;
}
