#include "shared.h"
#include <pspthreadman.h>

void testGetCurrentPts(const char *title, SceUID *psmf, bool usePts = true) {
	u64 pts = 0x1337133713371337ULL;

	int result = scePsmfPlayerGetCurrentPts(psmf, usePts ? &pts : NULL);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)  pts=%016llx", title, scePsmfPlayerGetCurrentStatus(psmf), pts);
	} else {
		checkpoint("%s: Failed: %08x / %016llx", title, result, pts);
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
		sceKernelDelayThread(400);

		u64 v;
		if (scePsmfPlayerGetCurrentPts(psmf, &v) == 0) {
			break;
		}
	}
}

void testPtsVideoSync() {
	u32 *buffer = (u32 *)getPsmfPlayerDisplayBuf() + 120;
	// Best with a video that has audio.
	SceUID *psmf = createPsmfPlayerPlaying();
	memset(buffer, 0, 16);
	warmUpVideo(psmf);

	int myVideoPts = 0;
	int myAudioPts = audioStatus ? 0 : -4180;

	u16 audioData[0x1000] = {0};
	for (int i = 0; i < 90; ++i) {
		// At this point, we should already have a frame at pts.
		u64 pts = 0;
		scePsmfPlayerGetCurrentPts(psmf, &pts);

		if (videoStatus || audioStatus) {
			checkpoint("  Pts: %8lld / %d, video: %d %08x %08x %08x %08x, audio: %d %04x %04x %04x %04x", pts, myAudioPts, videoStatus, buffer[0], buffer[1], buffer[2], buffer[3], audioStatus, audioData[0], audioData[1], audioData[2], audioData[3]);
		}
		
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		PsmfVideoData videoData = {0, getPsmfPlayerDisplayBuf()};
		audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
		videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
		sceKernelDelayThread(16000);

		if (audioStatus)
			myAudioPts += 4180;
		if (videoStatus)
			myVideoPts += 3003;

		flushschedf();
	}
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testGetCurrentPts("  Initial", createPsmfPlayerInitial());
	testGetCurrentPts("  Standby", createPsmfPlayerStandby());
	testGetCurrentPts("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testGetCurrentPts("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testGetCurrentPts("  Playing", psmfPlaying);

	// Force the video ahead a bit.
	warmUpVideo(psmfPlaying);

	testGetCurrentPts("  Twice", psmfPlaying);
	SceUID psmf2 = *psmfPlaying;
	testGetCurrentPts("  Copy", &psmf2);
	testGetCurrentPts("  Finished", createPsmfPlayerFinished());
	
	checkpointNext("Pts ptrs:");
	testGetCurrentPts("  NULL ptr (standby)", createPsmfPlayerStandby(), false);
	// Crashes.
	//testGetCurrentPts("  NULL ptr (finished)", createPsmfPlayerFinished(), false);

	// We don't match audio and video directly, and it's hard to, so commented out.
	// Useful for debugging, though.
	//checkpointNext("Video sync:");
	//testPtsVideoSync();

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}