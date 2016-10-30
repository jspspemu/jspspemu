#include "shared.h"
#include <pspthreadman.h>

void testStop(const char *title, SceUID *psmf) {
	int result = scePsmfPlayerStop(psmf);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)", title, scePsmfPlayerGetCurrentStatus(psmf));
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testStop("  Initial", createPsmfPlayerInitial());
	testStop("  Standby", createPsmfPlayerStandby());
	testStop("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testStop("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testStop("  Playing", psmfPlaying);
	testStop("  Twice", psmfPlaying);
	psmfPlaying = createPsmfPlayerPlaying();
	SceUID psmf2 = *psmfPlaying;
	testStop("  Copy", &psmf2);
	testStop("  Finished", createPsmfPlayerFinished());

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}