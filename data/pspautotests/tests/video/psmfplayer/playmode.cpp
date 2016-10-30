#include "shared.h"
#include <pspthreadman.h>
#include <pspdisplay.h>

void testGetPlayMode(const char *title, SceUID *psmf, bool useMode = true, bool useSpeed = true) {
	int mode = -1;
	int speed = -1;

	int result = scePsmfPlayerGetCurrentPlayMode(psmf, useMode ? &mode : NULL, useSpeed ? &speed : NULL);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)  mode=%d, speed=%d", title, scePsmfPlayerGetCurrentStatus(psmf), mode, speed);
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

void testChangePlayMode(const char *title, SceUID *psmf, int mode, int speed) {
	int result = scePsmfPlayerChangePlayMode(psmf, mode, speed);
	scePsmfPlayerGetCurrentPlayMode(psmf, &mode, &speed);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)  mode=%d, speed=%d", title, scePsmfPlayerGetCurrentStatus(psmf), mode, speed);
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

void testPlayMode(const char *title, int mode) {
	SceUID *psmf = createPsmfPlayerStandby();
	PsmfPlayerData data = {0x0e, 0, 0x0f, 0, 0, 1};
	scePsmfPlayerStart(psmf, &data, 0);

	checkpointNext(title);

	void *dbuf = getPsmfPlayerDisplayBuf();
	PsmfVideoData videoData = {512, dbuf};
	
	for (int i = 0; i < 50; ++i) {
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		if (scePsmfPlayerGetCurrentStatus(psmf) != 4) {
			break;
		}
		scePsmfPlayerGetVideoData(psmf, &videoData);
		sceKernelDelayThread(1000);
	}
	testChangePlayMode("  Set mode", psmf, mode, 1);

	int lastpts = -1;
	scePsmfPlayerGetCurrentPts(psmf, (u64 *)&lastpts);
	int startpts = lastpts;
	int updates = 0;
	int ptsChanges = 0;
	int pts = -1;

	u8 audioData[0x2000];
	const int iterations = 100;
	for (int i = 0; i < iterations; ++i) {
		scePsmfPlayerGetCurrentPts(psmf, (u64 *)&pts);
		if (pts != lastpts) {
			lastpts = pts;
			++ptsChanges;
		}
		scePsmfPlayerUpdate(psmf);
		*(u32 *)dbuf = 0xCCCCCCCC;
		PsmfVideoData videoData = {512, dbuf};
		scePsmfPlayerGetVideoData(psmf, &videoData);
		if (*(u32 *)dbuf != 0xCCCCCCCC) {
			++updates;
		}
		if (scePsmfPlayerGetCurrentStatus(psmf) != 4) {
			break;
		}
		sceKernelDelayThread(200);
	}
	int ptsDelta = (pts - startpts) / iterations;
	checkpoint("Pts changes %d, updates %d, pts delta %d", ptsChanges, updates, ptsDelta);
	checkpoint("Pts: %d -> %d", startpts, pts);
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players (get):");
	testGetPlayMode("  Initial", createPsmfPlayerInitial());
	testGetPlayMode("  Standby", createPsmfPlayerStandby());
	// Crashes.
	//testGetPlayMode("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testGetPlayMode("  Playing", psmfPlaying);
	testGetPlayMode("  Twice", psmfPlaying);
	SceUID psmf2 = *psmfPlaying;
	testGetPlayMode("  Copy", &psmf2);
	testGetPlayMode("  Finished", createPsmfPlayerFinished());
	psmf2 = 0;
	testGetPlayMode("  Zero", &psmf2);

	// Crashes.
	//checkpointNext("Info ptrs (get):");
	//testGetPlayMode("  Without mode", createPsmfPlayerInitial(), false, true);
	//testGetPlayMode("  Without speed", createPsmfPlayerInitial(), true, false);

	PsmfPlayerData data = {0x0e, 0, 0x0f, 0, 0, 1};

	checkpointNext("Modes (get):");
	static const int modes[] = {-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 16, 0x80000000};
	for (size_t i = 0; i < ARRAY_SIZE(modes); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Mode %d", modes[i]);
		SceUID *psmf = createPsmfPlayerStandby();
		data.playMode = modes[i];
		scePsmfPlayerStart(psmf, &data, 0);
		testGetPlayMode(temp, psmf);
	}
	data.playMode = 0;

	checkpointNext("Speeds (get):");
	static const int speeds[] = {-2, -1, 0, 1, 2, 3, 4, 5, 10, 16, 0x80000000};
	for (size_t i = 0; i < ARRAY_SIZE(speeds); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Speed %d", speeds[i]);
		SceUID *psmf = createPsmfPlayerStandby();
		data.playSpeed = speeds[i];
		scePsmfPlayerStart(psmf, &data, 0);
		testGetPlayMode(temp, psmf);
	}
	data.playSpeed = 1;

	checkpointNext("Players (change):");
	testChangePlayMode("  Initial", createPsmfPlayerInitial(), 0, 1);
	testChangePlayMode("  Standby", createPsmfPlayerStandby(), 0, 1);
	// Crashes.
	//testChangePlayMode("  NULL", NULL, 0, 1);
	psmfPlaying = createPsmfPlayerPlaying();
	testChangePlayMode("  Playing", psmfPlaying, 0, 1);
	testChangePlayMode("  Twice", psmfPlaying, 0, 1);
	psmf2 = *psmfPlaying;
	testChangePlayMode("  Copy", &psmf2, 0, 1);
	testChangePlayMode("  Finished", createPsmfPlayerFinished(), 0, 1);

	checkpointNext("Modes (change):");
	for (size_t i = 0; i < ARRAY_SIZE(modes); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Mode %d", modes[i]);
		testChangePlayMode(temp, createPsmfPlayerPlaying(), modes[i], 1);
	}

	checkpointNext("Speeds (change):");
	for (size_t i = 0; i < ARRAY_SIZE(speeds); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Speed %d", speeds[i]);
		testChangePlayMode(temp, createPsmfPlayerPlaying(), 0, speeds[i]);
	}
	
	testPlayMode("Play mode 0:", 0);
	testPlayMode("Play mode 1:", 1);
	testPlayMode("Play mode 2:", 2);
	testPlayMode("Play mode 3:", 3);
	// These latter two require full mode (with EP map.)
	testPlayMode("Play mode 4:", 4);
	testPlayMode("Play mode 5:", 5);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}