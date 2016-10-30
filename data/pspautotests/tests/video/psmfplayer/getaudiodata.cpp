#include "shared.h"
#include <pspthreadman.h>

// We seem to be running low on RAM... let's cheat and use VRAM.
u32 *const audioData = (u32 *)0x04154000;
// Unfortunately, this test is pretty useless without audio data.  Change to get useful results.
static const char *TEST_VIDEO_FILENAME = NULL;

void testGetAudioData(const char *title, SceUID *psmf, bool useAudioData = true) {
	int result = scePsmfPlayerGetAudioData(psmf, useAudioData ? audioData : NULL);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)", title, scePsmfPlayerGetCurrentStatus(psmf));
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

static bool videoStatus = false;
static bool audioStatus = false;

void warmUpVideo(SceUID *psmf) {
	// Warm up the video until it's ready to return frames.
	for (int j = 0; j < 100; ++j) {
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

SceUID *createPsmfPlayerAudioFinished(const char *filename, int prio = 0x17) {
	SceUID *psmf = createPsmfPlayerPlaying(filename, prio);
	PsmfInfo info = {0};
	scePsmfPlayerGetPsmfInfo(psmf, &info);

	warmUpVideo(psmf);
	PsmfVideoData videoData = {0, getPsmfPlayerDisplayBuf()};
	for (int i = 0; i < 800; ++i) {
		u64 pts = 0;
		scePsmfPlayerGetCurrentPts(psmf, &pts);
		
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
		videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
		sceKernelDelayThread(16000);

		if (pts >= info.lengthTS - 3003 - 3003) {
			break;
		}
	}
	return psmf;
}

void testAudioDataVideoSync(int prio) {
	u32 *buffer = (u32 *)getPsmfPlayerDisplayBuf() + 120;
	SceUID *psmf = createPsmfPlayerPlaying(TEST_VIDEO_FILENAME, prio);

	PsmfInfo info = {0};
	scePsmfPlayerGetPsmfInfo(psmf, &info);
	checkpoint("  Last frame is %d", info.lengthTS);

	memset(buffer, 0, 16);
	warmUpVideo(psmf);

	int myVideoPts = 0;
	int myAudioPts = audioStatus ? 0 : -4180;

	PsmfVideoData videoData = {0, getPsmfPlayerDisplayBuf()};
	for (int i = 0; i < 800; ++i) {
		u64 pts = 0;
		scePsmfPlayerGetCurrentPts(psmf, &pts);
		
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
		videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
		if (myVideoPts < myAudioPts)
			videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
		sceKernelDelayThread(16000);

		if (audioStatus)
			myAudioPts += 4180;
		if (videoStatus)
			myVideoPts = videoData.displaypts;

		if (pts >= info.lengthTS - 3003 - 3003) {
			break;
		}
		if (myAudioPts >= info.lengthTS - 3003) {
			break;
		}
	}
	
	checkpoint("  * At last frame? (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	tryUpdate("  After last frame 1", psmf);
	tryUpdate("  After last frame 2", psmf);

	videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
	testGetAudioData("  Read audio 1", psmf);
	checkpoint("  * Read frame 1 (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	tryUpdate("  After last frame 2", psmf);

	videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
	testGetAudioData("  Read audio  2", psmf);
	checkpoint("  * Read frame 2 (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	tryUpdate("  After last frame 3", psmf);

	videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
	videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
	testGetAudioData("  Read audio 3", psmf);
	checkpoint("  * Read frame 3 (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	tryUpdate("  After last frame 4", psmf);
}

void prepScanAudioData() {
	memset(audioData, 0xCD, 16384);
	sceKernelDcacheWritebackInvalidateRange(audioData, 16384);
}

void doScanAudioData() {
	sceKernelDcacheWritebackInvalidateRange(audioData, 16384);

	int blankStart = -1;
	int blankEnd = -1;
	for (size_t j = 0; j < 4096; ++j) {
		if (audioData[j] == 0xCDCDCDCD && blankStart == -1) {
			blankStart = (int)j;
		} else if (audioData[j] != 0xCDCDCDCD && blankStart != -1) {
			blankEnd = (int)j;
			break;
		}
	}
	checkpoint("   -> Audio data blank start=%d, end=%d", blankStart, blankEnd);
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testGetAudioData("  Initial", createPsmfPlayerInitial());
	testGetAudioData("  Standby", createPsmfPlayerStandby(TEST_VIDEO_FILENAME));
	testGetAudioData("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testGetAudioData("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying(TEST_VIDEO_FILENAME);
	testGetAudioData("  Playing", psmfPlaying);

	// Force the video ahead a bit.
	warmUpVideo(psmfPlaying);
	sceKernelDelayThread(16000);

	testGetAudioData("  Twice", psmfPlaying);
	SceUID psmf2 = *psmfPlaying;
	sceKernelDelayThread(16000);
	testGetAudioData("  Copy", &psmf2);
	testGetAudioData("  Finished", createPsmfPlayerAudioFinished(TEST_VIDEO_FILENAME));

	psmfPlaying = createPsmfPlayerPlaying(TEST_VIDEO_FILENAME);
	warmUpVideo(psmfPlaying);

	checkpointNext("Params:");
	// Crashes.
	//testGetAudioData("  NULL audioData", psmfPlaying, false);

	checkpointNext("Frame write");
	scePsmfPlayerChangePlayMode(psmfPlaying, 3, 0);
	prepScanAudioData();
	testGetAudioData("  Paused 1", psmfPlaying);
	doScanAudioData();
	sceKernelDelayThread(16000);
	prepScanAudioData();
	testGetAudioData("  Paused 2", psmfPlaying);
	doScanAudioData();

	SceUID *psmfFinished = createPsmfPlayerAudioFinished(TEST_VIDEO_FILENAME);
	prepScanAudioData();
	testGetAudioData("  Finished", psmfFinished);
	doScanAudioData();

	checkpointNext("Video sync better priority:");
	testAudioDataVideoSync(0x17);
	checkpointNext("Video sync worse priority:");
	testAudioDataVideoSync(0x28);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}