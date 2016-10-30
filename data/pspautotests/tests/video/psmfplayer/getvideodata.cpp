#include "shared.h"
#include <pspthreadman.h>

static void *const AUTO_DBUF_PTR = (void *)-1337;

void testGetVideoData(const char *title, SceUID *psmf, bool useVideoData = true, int bufw = 512, void *dbuf = AUTO_DBUF_PTR) {
	if (dbuf == AUTO_DBUF_PTR)
		dbuf = getPsmfPlayerDisplayBuf();
	PsmfVideoData videoData = {bufw, dbuf, 0x1337C0DE};
	int result = scePsmfPlayerGetVideoData(psmf, useVideoData ? &videoData : NULL);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)  pts=%d", title, scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	} else {
		checkpoint("%s: Failed: %08x / %08x", title, result, videoData.displaypts);
	}
}

static bool videoStatus = false;
static bool audioStatus = false;

void warmUpVideo(SceUID *psmf) {
	// Warm up the video until it's ready to return frames.
	for (int j = 0; j < 100; ++j) {
		u16 audioData[0x1000];

		scePsmfPlayerUpdate(psmf);
		PsmfVideoData videoData = {0, getPsmfPlayerDisplayBuf()};
		videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
		audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
		sceKernelDelayThread(4000);

		u64 v;
		if (scePsmfPlayerGetCurrentPts(psmf, &v) == 0) {
			break;
		}
	}
}

void tryUpdate(const char *title, SceUID *psmf) {
	int prev = scePsmfPlayerGetCurrentStatus(psmf);
	int result = scePsmfPlayerUpdate(psmf);
	int after = scePsmfPlayerGetCurrentStatus(psmf);

	if (prev != after || result != 0) {
		checkpoint("%s: Status=%x, result=%08x", title, scePsmfPlayerGetCurrentStatus(psmf), result);
	}
}

void testVideoDataVideoSync(int prio) {
	u32 *buffer = (u32 *)getPsmfPlayerDisplayBuf() + 120;
	SceUID *psmf = createPsmfPlayerPlaying(NULL, prio);

	PsmfInfo info = {0};
	scePsmfPlayerGetPsmfInfo(psmf, &info);
	checkpoint("  Last frame is %d", info.lengthTS);

	memset(buffer, 0, 16);
	warmUpVideo(psmf);

	int myVideoPts = 0;
	int myAudioPts = audioStatus ? 0 : -4180;

	PsmfVideoData videoData = {0, getPsmfPlayerDisplayBuf()};
	u16 audioData[0x1000] = {0};
	for (int i = 0; i < 800; ++i) {
		u64 pts = 0;
		scePsmfPlayerGetCurrentPts(psmf, &pts);
		
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		if (myAudioPts < myVideoPts + 3003 * 5) {
			audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
		} else {
			audioStatus = false;
		}
		videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
		sceKernelDelayThread(1600);

		if (audioStatus)
			myAudioPts += 4180;
		if (videoStatus)
			myVideoPts += 3003;

		if (pts >= info.lengthTS - 3003 - 3003) {
			break;
		}
	}
	
	checkpoint("  * At last frame? (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	tryUpdate("  After last frame 1", psmf);
	tryUpdate("  After last frame 2", psmf);

	audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
	testGetVideoData("  Read video 1", psmf);
	checkpoint("  * Read frame 1 (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	tryUpdate("  After last frame 2", psmf);

	audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
	testGetVideoData("  Read video 2", psmf);
	checkpoint("  * Read frame 2 (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	tryUpdate("  After last frame 3", psmf);

	audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
	audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
	testGetVideoData("  Read video 3", psmf);
	checkpoint("  * Read frame 3 (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	tryUpdate("  After last frame 4", psmf);
}

void prepScanVideoData(u32 *dbuf) {
	memset(dbuf, 0xCD, 512 * 10 * sizeof(u32));
	sceKernelDcacheWritebackInvalidateRange(dbuf, 512 * 10 * sizeof(u32));
}

void doScanVideoData(u32 *dbuf) {
	sceKernelDcacheWritebackInvalidateRange(dbuf, 512 * 10 * sizeof(u32));

	int blankStart = -1;
	int blankEnd = -1;
	for (int j = 0; j < 512 * 10; ++j) {
		if (dbuf[j] == 0xCDCDCDCD && blankStart == -1) {
			blankStart = j;
		} else if (dbuf[j] != 0xCDCDCDCD && blankStart != -1) {
			blankEnd = j;
			break;
		}
	}
	checkpoint("   -> Video data blank start=%d, end=%d", blankStart, blankEnd);
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testGetVideoData("  Initial", createPsmfPlayerInitial());
	testGetVideoData("  Standby", createPsmfPlayerStandby());
	testGetVideoData("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testGetVideoData("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testGetVideoData("  Playing", psmfPlaying);

	// Force the video ahead a bit.
	warmUpVideo(psmfPlaying);

	testGetVideoData("  Twice", psmfPlaying);
	SceUID psmf2 = *psmfPlaying;
	testGetVideoData("  Copy", &psmf2);
	testGetVideoData("  Finished", createPsmfPlayerFinished());

	psmfPlaying = createPsmfPlayerPlaying();

	checkpointNext("Params:");
	// Crashes.
	//testGetVideoData("  Missing videoData", psmfPlaying, false);
	testGetVideoData("  Missing displaybuf", psmfPlaying, true, 512, NULL);
	warmUpVideo(psmfPlaying);
	testGetVideoData("  Missing displaybuf (warmed up)", psmfPlaying, true, 512, NULL);

	checkpointNext("Buffer widths:");
	static const int widths[] = {-1, 0, 1, 128, 143, 144, 160, 192, 256, 510, 511, 512, 513};
	for (size_t i = 0; i < ARRAY_SIZE(widths); ++i) {
		u32 *dbuf = (u32 *)getPsmfPlayerDisplayBuf();
		char temp[64];
		snprintf(temp, sizeof(temp), "  Width %d", widths[i]);
		prepScanVideoData(dbuf);
		testGetVideoData(temp, psmfPlaying, true, widths[i], dbuf);
		doScanVideoData(dbuf);
	}

	checkpointNext("Frame write");
	scePsmfPlayerChangePlayMode(psmfPlaying, 3, 0);
	u32 *dbuf = (u32 *)getPsmfPlayerDisplayBuf();
	prepScanVideoData(dbuf);
	testGetVideoData("  Paused", psmfPlaying, true, 512, dbuf);
	doScanVideoData(dbuf);

	SceUID *psmfFinished = createPsmfPlayerFinished();
	prepScanVideoData(dbuf);
	testGetVideoData("  Finished", psmfFinished, true, 512, dbuf);
	doScanVideoData(dbuf);

	checkpointNext("Video sync better priority:");
	testVideoDataVideoSync(0x17);
	checkpointNext("Video sync worse priority:");
	testVideoDataVideoSync(0x28);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}