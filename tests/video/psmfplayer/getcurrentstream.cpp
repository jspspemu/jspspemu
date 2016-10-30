#include "shared.h"
#include <pspthreadman.h>

enum StreamType {
	VIDEO,
	AUDIO,
};

void testGetCurrentStream(const char *title, SceUID *psmf, StreamType type, bool useCodec = true, bool useNum = true) {
	int codec = -1;
	int num = -1;

	int result = -1;
	if (type == VIDEO) {
		result = scePsmfPlayerGetCurrentVideoStream(psmf, useCodec ? &codec : NULL, useNum ? &num : NULL);
	} else if (type == AUDIO) {
		result = scePsmfPlayerGetCurrentAudioStream(psmf, useCodec ? &codec : NULL, useNum ? &num : NULL);
	}
	if (result == 0) {
		checkpoint("%s: OK (status=%x)  codec=%d, num=%d", title, scePsmfPlayerGetCurrentStatus(psmf), codec, num);
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

void runStreamTests(StreamType type) {
	checkpointNext("Players:");
	testGetCurrentStream("  Initial", createPsmfPlayerInitial(), type);
	SceUID *psmfStandby = createPsmfPlayerStandby();
	testGetCurrentStream("  Standby", psmfStandby, type);
	testGetCurrentStream("  Twice", psmfStandby, type);
	SceUID psmf2 = *psmfStandby;
	testGetCurrentStream("  Copy", &psmf2, type);
	// Crashes.
	//testGetCurrentStream("  NULL", NULL, type);
	testGetCurrentStream("  Deleted", createPsmfPlayerDeleted(), type);
	testGetCurrentStream("  Playing", createPsmfPlayerPlaying(), type);
	testGetCurrentStream("  Finished", createPsmfPlayerFinished(), type);

	// Crashes.
	//checkpointNext("Info ptrs:");
	//testGetCurrentStream("  Without codec", createPsmfPlayerStandby(), type, false, true);
	//testGetCurrentStream("  Without num", createPsmfPlayerStandby(), type, true, false);
	
	checkpointNext("Multiple streams:");
	testGetCurrentStream("  Default streams", createPsmfPlayerPlaying("host0:/tests/video/psmfplayer/test_streams.pmf"), type);
	psmfStandby = createPsmfPlayerStandby("host0:/tests/video/psmfplayer/test_streams.pmf");
	PsmfPlayerData data = {0x0e, 1, 0x0f, 1, 0, 1};
	scePsmfPlayerStart(psmfStandby, &data, 0);
	testGetCurrentStream("  Stream 1", psmfStandby, type);

	static const int videoCodecs[] = {0x00, 0x01, 0x0e, 0x0f, 0x1e, 0x8000000e};
	for (size_t i = 0; i < ARRAY_SIZE(videoCodecs); ++i) {
		psmfStandby = createPsmfPlayerStandby("host0:/tests/video/psmfplayer/test_streams.pmf");
		char temp[64];
		snprintf(temp, sizeof(temp), "  Video codec %08x", videoCodecs[i]);
		data.videoCodec = videoCodecs[i];
		scePsmfPlayerStart(psmfStandby, &data, 0);
		testGetCurrentStream(temp, psmfStandby, type);
	}
	data.videoCodec = 0x0e;

	static const int audioCodecs[] = {0x00, 0x01, 0x0e, 0x0f, 0x1f, 0x8000000f};
	for (size_t i = 0; i < ARRAY_SIZE(audioCodecs); ++i) {
		psmfStandby = createPsmfPlayerStandby("host0:/tests/video/psmfplayer/test_streams.pmf");
		char temp[64];
		snprintf(temp, sizeof(temp), "  Audio codec %08x", audioCodecs[i]);
		data.audioCodec = audioCodecs[i];
		scePsmfPlayerStart(psmfStandby, &data, 0);
		testGetCurrentStream(temp, psmfStandby, type);
	}
	data.audioCodec = 0x0f;
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("scePsmfPlayerGetCurrentVideoStream:");
	runStreamTests(VIDEO);
	checkpointNext("scePsmfPlayerGetCurrentAudioStream:");
	runStreamTests(AUDIO);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}