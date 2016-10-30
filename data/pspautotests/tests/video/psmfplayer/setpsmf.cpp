#include "shared.h"
#include <pspkernel.h>

bool useCB = false;
const int MAIN_BUF_SIZE = 0x00300000;
char *buf1;

// We need it in the initial state, so it's convenient to recreate every time.
SceUID *const PSMF_AUTO_CREATE = (SceUID *)0x13371337;

void testSetPsmf(const char *title, SceUID *psmf, const char *filename) {
	int result;
	SceUID temp = -1;
	if (psmf == PSMF_AUTO_CREATE) {
		psmf = &temp;
		PsmfPlayerCreateData createData = {buf1, MAIN_BUF_SIZE, 0x17};
		scePsmfPlayerCreate(psmf, &createData);
	}

	// Clear the checkpoint here because create/delete will set resched.
	checkpoint(NULL);

	if (useCB) {
		result = scePsmfPlayerSetPsmfCB(psmf, filename);
	} else {
		result = scePsmfPlayerSetPsmf(psmf, filename);
	}
	if (result == 0) {
		checkpoint("%s: OK (status=%x)", title, scePsmfPlayerGetCurrentStatus(psmf));
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
	if (psmf == &temp) {
		scePsmfPlayerDelete(psmf);
	}
}

void setPsmfTests() {
	buf1 = (char *)memalign(MAIN_BUF_SIZE, 64);
	const char *filename = "host0:/tests/video/psmfplayer/test.pmf";

	PsmfPlayerCreateData createData = {buf1, MAIN_BUF_SIZE, 0x17};
	SceUID psmf = -1;

	checkpointNext("Players:");
	testSetPsmf("  Normal", PSMF_AUTO_CREATE, filename);
	// Crashes.
	//testSetPsmf("  NULL", NULL, filename);
	scePsmfPlayerCreate(&psmf, &createData);
	scePsmfPlayerDelete(&psmf);
	testSetPsmf("  Deleted", &psmf, filename);
	scePsmfPlayerCreate(&psmf, &createData);
	scePsmfPlayerSetPsmfCB(&psmf, filename);
	testSetPsmf("  Already set", &psmf, filename);
	scePsmfPlayerDelete(&psmf);

	checkpointNext("Filenames:");
	testSetPsmf("  NULL", PSMF_AUTO_CREATE, NULL);
	testSetPsmf("  Non existent", PSMF_AUTO_CREATE, "host0:/tests/video/psmfplayer/DOES_NOT_EXIST.pmf");
	testSetPsmf("  Directory", PSMF_AUTO_CREATE, "host0:/tests/video/psmfplayer/");
	testSetPsmf("  Invalid data", PSMF_AUTO_CREATE, "host0:/tests/video/psmfplayer/setpsmf.prx");

	free(buf1);
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	setPsmfTests();

	checkpointNext("scePsmfPlayerSetPsmfCB:");
	useCB = true;
	setPsmfTests();

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}