#include "shared.h"
#include <pspthreadman.h>
#include <pspdisplay.h>

void testStart(const char *title, SceUID *psmf, int vcodec = 0x0e, int vnum = 0, int acodec = 0x0f, int anum = 0, int mode = 0, int speed = 1, int startpts = 0) {
	PsmfPlayerData data = {vcodec, vnum, acodec, anum, mode, speed};
	int result = scePsmfPlayerStart(psmf, &data, startpts);
	scePsmfPlayerGetCurrentPlayMode(psmf, &mode, &speed);
	scePsmfPlayerGetCurrentAudioStream(psmf, &acodec, &anum);
	scePsmfPlayerGetCurrentVideoStream(psmf, &vcodec, &vnum);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)", title, scePsmfPlayerGetCurrentStatus(psmf));

		int pts = -1337;
		int tries = 500;
		u8 audioData[0x2000];
		while (scePsmfPlayerGetCurrentPts(psmf, (u64 *)&pts) != 0 && tries > 0) {
			--tries;
			scePsmfPlayerUpdate(psmf);
			PsmfVideoData videoData = {0, getPsmfPlayerDisplayBuf()};
			scePsmfPlayerGetVideoData(psmf, &videoData);
			scePsmfPlayerGetAudioData(psmf, audioData);
			sceKernelDelayThread(100);
		}
		checkpoint("%s: mode=%d, speed=%d, audio=%d/%d, video=%d/%d, pts=%d", title, scePsmfPlayerGetCurrentStatus(psmf), mode, speed, acodec, anum, vcodec, vnum, pts);
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players (get):");
	testStart("  Initial", createPsmfPlayerInitial());
	testStart("  Standby", createPsmfPlayerStandby());
	// Crashes.
	//testStart("  NULL", NULL);
	// TODO: Not the most ideal test video...
	SceUID *psmfPlaying = createPsmfPlayerPlaying("host0:/tests/video/psmfplayer/test.pmf");
	testStart("  Playing", psmfPlaying);

	// Force the video ahead a bit.
	for (int j = 0; j < 20; ++j) {
		u8 audioData[0x2000];
		scePsmfPlayerUpdate(psmfPlaying);
		PsmfVideoData videoData = {0, getPsmfPlayerDisplayBuf()};
		scePsmfPlayerGetVideoData(psmfPlaying, &videoData);
		scePsmfPlayerGetAudioData(psmfPlaying, audioData);
		sceKernelDelayThread(100);
	}

	testStart("  Twice", psmfPlaying);
	SceUID psmf2 = *psmfPlaying;
	testStart("  Copy", &psmf2);
	testStart("  Finished", createPsmfPlayerFinished());
	psmf2 = 0;
	testStart("  Zero", &psmf2);

	checkpointNext("Modes:");
	static const int modes[] = {-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 16, 0x80000000};
	for (size_t i = 0; i < ARRAY_SIZE(modes); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Mode %d", modes[i]);
		testStart(temp, createPsmfPlayerStandby(), 0x0e, 0, 0x0f, 0, modes[i], 1, 0);
	}

	checkpointNext("Speeds:");
	static const int speeds[] = {-2, -1, 0, 1, 2, 3, 4, 5, 10, 16, 0x80000000};
	for (size_t i = 0; i < ARRAY_SIZE(speeds); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Speed %d", speeds[i]);
		testStart(temp, createPsmfPlayerStandby(), 0x0e, 0, 0x0f, 0, 0, speeds[i], 0);
	}
	
	checkpointNext("Start pts:");
	static const int pts[] = {-1000, -1, 0, 1, 1000, 3003, 6006, 87087, 276276, 279278, 279279, 282282, 0x7FFFFFFF};
	for (size_t i = 0; i < ARRAY_SIZE(pts); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Pts %d", pts[i]);
		testStart(temp, createPsmfPlayerStandby(), 0x0e, 0, 0x0f, 0, 0, 1, pts[i]);
	}

	checkpointNext("Video codecs:");
	static const int videoCodecs[] = {0x00, 0x01, 0x0e, 0x0f, 0x1e, 0x8000000e};
	for (size_t i = 0; i < ARRAY_SIZE(videoCodecs); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Video codec %08x", videoCodecs[i]);
		testStart(temp, createPsmfPlayerStandby(), videoCodecs[i], 0, 0x0f, 0, 0, 1, 0);
	}

	checkpointNext("Audio codecs (no audio):");
	static const int audioCodecs[] = {0x00, 0x01, 0x0e, 0x0f, 0x1e, 0x8000000f};
	for (size_t i = 0; i < ARRAY_SIZE(audioCodecs); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Audio codec %08x", audioCodecs[i]);
		testStart(temp, createPsmfPlayerStandby(), 0x0e, 0, audioCodecs[i], 0, 0, 1, 0);
	}

	checkpointNext("Audio codecs (with audio):");
	for (size_t i = 0; i < ARRAY_SIZE(audioCodecs); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Audio codec %08x", audioCodecs[i]);
		testStart(temp, createPsmfPlayerStandby("host0:/tests/video/psmfplayer/test_streams.pmf"), 0x0e, 0, audioCodecs[i], 0, 0, 1, 0);
	}

	checkpointNext("Streams:");
	testStart("  Video stream -1", createPsmfPlayerStandby(), 0x0e, -1, 0x0f, 0, 0, 1, 0);
	testStart("  Video stream 1", createPsmfPlayerStandby(), 0x0e, 1, 0x0f, 0, 0, 1, 0);
	testStart("  Video stream 1 (exists)", createPsmfPlayerStandby("host0:/tests/video/psmfplayer/test_streams.pmf"), 0x0e, 1, 0x0f, 0, 0, 1, 0);
	testStart("  Video stream 2", createPsmfPlayerStandby("host0:/tests/video/psmfplayer/test_streams.pmf"), 0x0e, 2, 0x0f, 0, 0, 1, 0);
	testStart("  Audio stream -1", createPsmfPlayerStandby(), 0x0e, 0, 0x0f, -1, 0, 1, 0);
	testStart("  Audio stream 1", createPsmfPlayerStandby(), 0x0e, 0, 0x0f, 1, 0, 1, 0);
	testStart("  Audio stream 1 (exists)", createPsmfPlayerStandby("host0:/tests/video/psmfplayer/test_streams.pmf"), 0x0e, 0, 0x0f, 1, 0, 1, 0);
	testStart("  Audio stream 2", createPsmfPlayerStandby("host0:/tests/video/psmfplayer/test_streams.pmf"), 0x0e, 0, 0x0f, 2, 0, 1, 0);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}