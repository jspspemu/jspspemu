#include "shared.h"
#include <pspthreadman.h>

void testUpdate(const char *title, SceUID *psmf) {
	int result = scePsmfPlayerUpdate(psmf);
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
		sceKernelDelayThread(400);

		u64 v;
		if (scePsmfPlayerGetCurrentPts(psmf, &v) == 0) {
			break;
		}
	}
}

void testUpdateVideoSync(int prio) {
	u32 *buffer = (u32 *)getPsmfPlayerDisplayBuf() + 120;
	// Best with a video that has audio.
	SceUID *psmf = createPsmfPlayerPlaying(NULL, prio);
	memset(buffer, 0, 16);
	warmUpVideo(psmf);

	PsmfInfo info;
	scePsmfPlayerGetPsmfInfo(psmf, &info);
	checkpoint("  Last frame is %d", info.lengthTS);

	int myVideoPts = 0;
	int myAudioPts = audioStatus ? 0 : -4180;

	scePsmfPlayerConfigPlayer(psmf, 0, 1);

	PsmfVideoData videoData = {0, getPsmfPlayerDisplayBuf()};
	u16 audioData[0x1000] = {0};
	for (int i = 0; i < 300; ++i) {
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
		sceKernelDelayThread(16000);

		if (audioStatus)
			myAudioPts += 4180;
		if (videoStatus)
			myVideoPts += 3003;

		flushschedf();

		if (pts >= info.lengthTS - 3003 - 3003) {
			break;
		}
	}
	
	checkpoint("  * At last frame? (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	testUpdate("  After last frame 1", psmf);
	testUpdate("  After last frame 2", psmf);

	audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
	videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
	checkpoint("  * Read frame 1 (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	testUpdate("  After last frame 3", psmf);
	testUpdate("  After last frame 4", psmf);

	audioStatus = scePsmfPlayerGetAudioData(psmf, audioData) == 0;
	videoStatus = scePsmfPlayerGetVideoData(psmf, &videoData) == 0;
	checkpoint("  * Read frame 2 (status=%x)  pts=%d", scePsmfPlayerGetCurrentStatus(psmf), videoData.displaypts);
	testUpdate("  After last frame 5", psmf);
	testUpdate("  After last frame 6", psmf);
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testUpdate("  Initial", createPsmfPlayerInitial());
	testUpdate("  Standby", createPsmfPlayerStandby());
	testUpdate("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testUpdate("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testUpdate("  Playing", psmfPlaying);

	// Force the video ahead a bit.
	warmUpVideo(psmfPlaying);

	testUpdate("  Twice", psmfPlaying);
	SceUID psmf2 = *psmfPlaying;
	testUpdate("  Copy", &psmf2);
	testUpdate("  Finished", createPsmfPlayerFinished());

	checkpointNext("Video sync better priority:");
	testUpdateVideoSync(0x17);
	checkpointNext("Video sync worse priority:");
	testUpdateVideoSync(0x28);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}