#include "shared.h"
#include <pspthreadman.h>

enum StreamType {
	VIDEO,
	AUDIO,
};

void testSelectStream(const char *title, SceUID *psmf, StreamType type) {
	int codec = -1;
	int num = -1;

	int result = -1;
	if (type == VIDEO) {
		result = scePsmfPlayerSelectVideo(psmf);
		scePsmfPlayerGetCurrentVideoStream(psmf, &codec, &num);
	} else if (type == AUDIO) {
		result = scePsmfPlayerSelectAudio(psmf);
		scePsmfPlayerGetCurrentAudioStream(psmf, &codec, &num);
	}
	if (result == 0) {
		checkpoint("%s: OK (status=%x)  codec=%d, num=%d", title, scePsmfPlayerGetCurrentStatus(psmf), codec, num);
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

void runStreamTests(StreamType type) {
	checkpointNext("Players:");
	testSelectStream("  Initial", createPsmfPlayerInitial(), type);
	testSelectStream("  Standby", createPsmfPlayerStandby(), type);
	// Crashes.
	//testSelectStream("  NULL", NULL, type);
	testSelectStream("  Deleted", createPsmfPlayerDeleted(), type);
	// TODO: This test file doesn't *actually* have streams, and scePsmfPlayerSelectVideo is too smart for us.
	// Need a better test file with actually multiple streams.
	SceUID *psmfPlaying = createPsmfPlayerPlaying("host0:/tests/video/psmfplayer/test_streams.pmf");
	testSelectStream("  Playing", psmfPlaying, type);
	testSelectStream("  Twice", psmfPlaying, type);
	SceUID psmf2 = *psmfPlaying;
	testSelectStream("  Copy", &psmf2, type);
	testSelectStream("  Finished", createPsmfPlayerFinished(), type);
	
	checkpointNext("Single stream:");
	testSelectStream("  Just video", createPsmfPlayerPlaying(), type);
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("scePsmfPlayerSelectVideo:");
	runStreamTests(VIDEO);
	checkpointNext("scePsmfPlayerSelectAudio:");
	runStreamTests(AUDIO);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}