#include "shared.h"
#include <pspthreadman.h>

void testGetAudioOutSize(const char *title, SceUID *psmf) {
	int result = scePsmfPlayerGetAudioOutSize(psmf);
	if (result >= 0) {
		checkpoint("%s: OK: %d", title, result);
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testGetAudioOutSize("  Initial", createPsmfPlayerInitial());
	testGetAudioOutSize("  Standby", createPsmfPlayerStandby());
	testGetAudioOutSize("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testGetAudioOutSize("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testGetAudioOutSize("  Playing", psmfPlaying);
	testGetAudioOutSize("  Twice", psmfPlaying);
	psmfPlaying = createPsmfPlayerPlaying();
	SceUID psmf2 = *psmfPlaying;
	testGetAudioOutSize("  Copy", &psmf2);
	testGetAudioOutSize("  Finished", createPsmfPlayerFinished());

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}