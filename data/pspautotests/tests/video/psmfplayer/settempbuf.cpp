#include "shared.h"

void testSetTempBuf(const char *title, SceUID *psmf, void *buf, u32 bufSize) {
	int result = scePsmfPlayerSetTempBuf(psmf, buf, bufSize);
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

	const int MAIN_BUF_SIZE = 0x00300000;
	const int TEMP_BUF_SIZE = 0x00010000;
	char *buf1 = (char *)memalign(MAIN_BUF_SIZE, 64);
	char *buf2 = (char *)memalign(TEMP_BUF_SIZE, 64);
	const char *filename = "host0:/tests/video/psmfplayer/test.pmf";

	PsmfPlayerCreateData createData = {buf1, MAIN_BUF_SIZE, 0x17};
	SceUID psmf = -1;
	scePsmfPlayerCreate(&psmf, &createData);

	checkpointNext("Players:");
	testSetTempBuf("  Normal", &psmf, buf2, TEMP_BUF_SIZE);
	SceUID psmf2 = psmf;
	testSetTempBuf("  Copy", &psmf2, buf2, TEMP_BUF_SIZE);
	// Crashes.
	//testSetTempBuf("  NULL", NULL, buf2, TEMP_BUF_SIZE);
	scePsmfPlayerDelete(&psmf);
	testSetTempBuf("  Deleted", &psmf, buf2, TEMP_BUF_SIZE);
	scePsmfPlayerCreate(&psmf, &createData);
	scePsmfPlayerSetPsmfCB(&psmf, filename);
	testSetTempBuf("  Already set", &psmf, buf2, TEMP_BUF_SIZE);
	scePsmfPlayerDelete(&psmf);
	scePsmfPlayerCreate(&psmf, &createData);

	checkpointNext("Buffer pointers:");
	testSetTempBuf("  NULL", &psmf, NULL, TEMP_BUF_SIZE);
	testSetTempBuf("  Invalid", &psmf, (void *)0xDEADBEEF, TEMP_BUF_SIZE);

	checkpointNext("Buffer sizes:");
	testSetTempBuf("  0", &psmf, buf2, 0);
	testSetTempBuf("  1", &psmf, buf2, 1);
	testSetTempBuf("  0x0000FFFF", &psmf, buf2, 0x0000FFFF);
	testSetTempBuf("  0x00010000", &psmf, buf2, 0x00010000);
	testSetTempBuf("  0x80000000", &psmf, buf2, 0x80000000);

	free(buf1);
	free(buf2);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}