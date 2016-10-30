#include "shared.h"
#include <pspthreadman.h>

void testBreak(const char *title, SceUID *psmf) {
	int result = scePsmfPlayerBreak(psmf);
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

SceUID *runVideoABit(SceUID *psmf) {
	PsmfVideoData videoData = {0, getPsmfPlayerDisplayBuf()};
	for (int i = 0; i < 5; ++i) {
		u16 audioData[0x1000] = {0};
		u64 pts = 0;
		scePsmfPlayerGetCurrentPts(psmf, &pts);
		
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		scePsmfPlayerUpdate(psmf);
		audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
		videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
		sceKernelDelayThread(16000);
	}
	return psmf;
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testBreak("  Initial", createPsmfPlayerInitial());
	testBreak("  Standby", createPsmfPlayerStandby());
	testBreak("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testBreak("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testBreak("  Playing", psmfPlaying);
	testBreak("  Twice", psmfPlaying);
	psmfPlaying = createPsmfPlayerPlaying();
	SceUID psmf2 = *psmfPlaying;
	testBreak("  Copy", &psmf2);
	testBreak("  Finished", createPsmfPlayerFinished());

	u64 pts = 0;
	checkpointNext("Pts:");
	psmfPlaying = createPsmfPlayerPlaying();
	warmUpVideo(psmfPlaying);
	testBreak("  Warm", psmfPlaying);
	scePsmfPlayerGetCurrentPts(psmfPlaying, &pts);
	checkpoint("   -> pts=%lld", pts);
	playPsmfPlayerUntilEnd(psmfPlaying, 10);
	testBreak("  Into video a bit", psmfPlaying);
	scePsmfPlayerGetCurrentPts(psmfPlaying, &pts);
	checkpoint("   -> pts=%lld", pts);
	runVideoABit(psmfPlaying);
	testBreak("  Into video a bit", psmfPlaying);
	scePsmfPlayerGetCurrentPts(psmfPlaying, &pts);
	checkpoint("   -> pts=%lld", pts);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}