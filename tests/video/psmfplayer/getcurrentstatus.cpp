#include "shared.h"
#include <pspthreadman.h>

void testGetCurrentStatus(const char *title, SceUID *psmf) {
	int result = scePsmfPlayerGetCurrentStatus(psmf);
	if (result >= 0) {
		checkpoint("%s: OK (status=%x)", title, result);
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testGetCurrentStatus("  Initial", createPsmfPlayerInitial());
	testGetCurrentStatus("  Standby", createPsmfPlayerStandby());
	testGetCurrentStatus("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testGetCurrentStatus("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testGetCurrentStatus("  Playing", psmfPlaying);
	testGetCurrentStatus("  Twice", psmfPlaying);
	SceUID psmf2 = *psmfPlaying;
	testGetCurrentStatus("  Copy", &psmf2);
	testGetCurrentStatus("  Finished", createPsmfPlayerFinished());
	psmf2 = 0;
	testGetCurrentStatus("  Zero", &psmf2);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}