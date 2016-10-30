#include "shared.h"
#include <pspthreadman.h>

void testReleasePsmf(const char *title, SceUID *psmf) {
	int result = scePsmfPlayerReleasePsmf(psmf);
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
	testReleasePsmf("  Initial", createPsmfPlayerInitial());
	testReleasePsmf("  Standby", createPsmfPlayerStandby());
	testReleasePsmf("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testReleasePsmf("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testReleasePsmf("  Playing", psmfPlaying);
	testReleasePsmf("  Twice", psmfPlaying);
	psmfPlaying = createPsmfPlayerPlaying();
	SceUID psmf2 = *psmfPlaying;
	testReleasePsmf("  Copy", &psmf2);
	testReleasePsmf("  Finished", createPsmfPlayerFinished());

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}