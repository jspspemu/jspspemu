#include "shared.h"
#include <pspthreadman.h>

void testDelete(const char *title, SceUID *psmf) {
	int result = scePsmfPlayerDelete(psmf);
	if (result == 0) {
		checkpoint("%s: OK - %08x", title, psmf == NULL ? NULL : *psmf);
	} else {
		checkpoint("%s: Failed: %08x / %08x", title, result, psmf == NULL ? NULL : *psmf);
	}
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testDelete("  Initial", createPsmfPlayerInitial());
	testDelete("  Standby", createPsmfPlayerStandby());
	testDelete("  Standby", createPsmfPlayerStandby());
	checkpoint("AFTER");
	testDelete("  Deleted", createPsmfPlayerDeleted());
	// Crashes.
	//testDelete("  NULL", NULL);
	SceUID *psmfPlaying = createPsmfPlayerPlaying();
	testDelete("  Playing", psmfPlaying);
	testDelete("  Twice", psmfPlaying);
	psmfPlaying = createPsmfPlayerPlaying();
	SceUID psmf2 = *psmfPlaying;
	testDelete("  Copy", &psmf2);
	testDelete("  Finished", createPsmfPlayerFinished());

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}