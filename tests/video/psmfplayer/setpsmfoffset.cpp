#include "shared.h"

bool useCB = false;
const int MAIN_BUF_SIZE = 0x00300000;
char *buf1;

// We need it in the initial state, so it's convenient to recreate every time.
SceUID *const PSMF_AUTO_CREATE = (SceUID *)0x13371337;

void testSetPsmf(const char *title, SceUID *psmf, const char *filename, int offset) {
	int result;
	SceUID temp = -1;
	if (psmf == PSMF_AUTO_CREATE) {
		psmf = &temp;
		PsmfPlayerCreateData createData = {buf1, MAIN_BUF_SIZE, 0x17};
		scePsmfPlayerCreate(psmf, &createData);
	}
	if (useCB) {
		result = scePsmfPlayerSetPsmfOffsetCB(psmf, filename, offset);
	} else {
		result = scePsmfPlayerSetPsmfOffset(psmf, filename, offset);
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
	const char *filename_offset = "host0:/tests/video/psmfplayer/test_offset.pmf";

	PsmfPlayerCreateData createData = {buf1, MAIN_BUF_SIZE, 0x17};
	SceUID psmf = -1;

	checkpointNext("Players:");
	testSetPsmf("  Normal", PSMF_AUTO_CREATE, filename, 0);
	// Crashes.
	//testSetPsmf("  NULL", NULL, filename);
	scePsmfPlayerCreate(&psmf, &createData);
	scePsmfPlayerDelete(&psmf);
	testSetPsmf("  Deleted", &psmf, filename, 0);
	scePsmfPlayerCreate(&psmf, &createData);
	scePsmfPlayerSetPsmfCB(&psmf, filename);
	testSetPsmf("  Already set", &psmf, filename, 0);
	scePsmfPlayerDelete(&psmf);

	checkpointNext("Filenames:");
	testSetPsmf("  NULL", PSMF_AUTO_CREATE, NULL, 0);
	testSetPsmf("  Non existent", PSMF_AUTO_CREATE, "host0:/tests/video/psmfplayer/DOES_NOT_EXIST.pmf", 0);
	testSetPsmf("  Directory", PSMF_AUTO_CREATE, "host0:/tests/video/psmfplayer/", 0);
	testSetPsmf("  Invalid data", PSMF_AUTO_CREATE, "host0:/tests/video/psmfplayer/setpsmf.prx", 0);

	checkpointNext("Offsets:");
	testSetPsmf("  -1", PSMF_AUTO_CREATE, filename, -1);
	testSetPsmf("  2048", PSMF_AUTO_CREATE, filename, 2048);
	testSetPsmf("  2048 (with data)", PSMF_AUTO_CREATE, filename_offset, 2048);
	testSetPsmf("  0x80000000", PSMF_AUTO_CREATE, filename, 0x80000000);

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