#include "shared.h"
#include <pspthreadman.h>

enum StreamType {
	VIDEO,
	AUDIO,
};

void testSelectStream(const char *title, SceUID *psmf, StreamType type, int codec, int num) {
	int result = -1;
	if (type == VIDEO) {
		result = scePsmfPlayerSelectSpecificVideo(psmf, codec, num);
		scePsmfPlayerGetCurrentVideoStream(psmf, &codec, &num);
	} else if (type == AUDIO) {
		result = scePsmfPlayerSelectSpecificAudio(psmf, codec, num);
		scePsmfPlayerGetCurrentAudioStream(psmf, &codec, &num);
	}
	if (result == 0) {
		checkpoint("%s: OK (status=%x)  codec=%d, num=%d", title, scePsmfPlayerGetCurrentStatus(psmf), codec, num);
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

void runStreamTests(StreamType type) {
	// TODO: This test really needs a video file with real streams in it.
	// It was tested this way but with a file that can't be redistributed.

	checkpointNext("Players:");
	testSelectStream("  Initial", createPsmfPlayerInitial(), type, type, 0);
	testSelectStream("  Standby", createPsmfPlayerStandby(), type, type, 0);
	// Crashes.
	//testSelectStream("  NULL", NULL, type);
	testSelectStream("  Deleted", createPsmfPlayerDeleted(), type, type, 0);
	// scePsmfPlayerSelectSpecificAudio() seems to hang/crash if there's not at least 2 actual streams?
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testSelectStream("  Playing", psmfPlaying, type, type, 0);
	testSelectStream("  Twice", psmfPlaying, type, type, 0);
	SceUID psmf2 = *psmfPlaying;
	testSelectStream("  Copy", &psmf2, type, type, 0);
	testSelectStream("  Finished", createPsmfPlayerFinished(), type, type, 0);
	
	checkpointNext("Multiple streams:");
	psmfPlaying = createPsmfPlayerPlaying();
	testSelectStream("  Stream 0", psmfPlaying, type, type, 0);
	testSelectStream("  Stream 1", psmfPlaying, type, type, 1);
	// scePsmfPlayerSelectSpecificAudio() crashes if the stream doesn't exist.
	if (type != AUDIO) {
		testSelectStream("  Stream -1", psmfPlaying, type, type, -1);
		testSelectStream("  Stream 2", psmfPlaying, type, type, 2);

		static const int codecs[] = {0x00, 0x01, 0x0e, 0x0f, 0x1e, 0x1f, 0x8000000e, 0x8000000f};
		for (size_t i = 0; i < ARRAY_SIZE(codecs); ++i) {
			char temp[64];
			snprintf(temp, sizeof(temp), "  Video codec %08x", codecs[i]);
			testSelectStream(temp, psmfPlaying, type, codecs[i], 0);
		}
	}
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("scePsmfPlayerSelectVideo:");
	runStreamTests(VIDEO);
	// Crashes without actual streams...
	//checkpointNext("scePsmfPlayerSelectAudio:");
	//runStreamTests(AUDIO);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}