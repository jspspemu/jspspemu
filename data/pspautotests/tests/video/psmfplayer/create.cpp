#include "shared.h"

void testCreatePlayer(const char *title, void *buf, u32 bufSize, int prio) {
	PsmfPlayerCreateData createData = {buf, bufSize, prio};
	SceUID psmf = -1;
	int result = scePsmfPlayerCreate(&psmf, &createData);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)", title, scePsmfPlayerGetCurrentStatus(&psmf));
		scePsmfPlayerDelete(&psmf);
	} else {
		checkpoint("%s: Failed: %08x (id=%08x)", title, result, psmf);
	}
}

void testCreatePlayerTwice(void *buf, u32 bufSize, int prio) {
	PsmfPlayerCreateData createData = {buf, bufSize, prio};
	SceUID psmf = -1;
	SceUID psmfBackup = -1;
	int result1 = scePsmfPlayerCreate(&psmf, &createData);
	psmfBackup = psmf;
	int result2 = scePsmfPlayerCreate(&psmf, &createData);
	if (result1 == 0 && result2 == 0) {
		checkpoint("  Same duplicate: OK (status=%x)", scePsmfPlayerGetCurrentStatus(&psmf));
	} else {
		psmf = psmfBackup;
		checkpoint("  Same duplicate: Failed: %08x, %08x (status=%x)", result1, result2, scePsmfPlayerGetCurrentStatus(&psmf));
	}
	scePsmfPlayerDelete(&psmf);
	scePsmfPlayerDelete(&psmfBackup);

	char *buf2 = (char *)memalign(bufSize, 64);
	PsmfPlayerCreateData createData2 = {buf2, bufSize, prio};
	SceUID psmf2 = -1;
	result1 = scePsmfPlayerCreate(&psmf, &createData);
	result2 = scePsmfPlayerCreate(&psmf2, &createData2);
	if (result1 == 0 && result2 == 0) {
		checkpoint("  Different second: OK (status=%x)", scePsmfPlayerGetCurrentStatus(&psmf));
	} else {
		checkpoint("  Different second: Failed: %08x, %08x (status=%x)", result1, result2, scePsmfPlayerGetCurrentStatus(&psmf));
	}
	scePsmfPlayerDelete(&psmf2);
	scePsmfPlayerDelete(&psmf);
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	const int MAIN_BUF_SIZE = 0x00300000;
	char *buf1 = (char *)memalign(MAIN_BUF_SIZE, 64);

	checkpointNext("Basic usage:");
	testCreatePlayer("  Normal", buf1, MAIN_BUF_SIZE, 0x17);
	testCreatePlayerTwice(buf1, MAIN_BUF_SIZE, 0x17);

	// Crashes.
	//checkpointNext("Buffer pointers:");
	//testCreatePlayer("  NULL", NULL, MAIN_BUF_SIZE, 0x17);
	//testCreatePlayer("  Invalid", (void *)0xDEADBEEF, MAIN_BUF_SIZE, 0x17);

	checkpointNext("Buffer sizes:");
	testCreatePlayer("  0", buf1, 0, 0x17);
	testCreatePlayer("  0x002857FF", buf1, 0x002857FF, 0x17);
	testCreatePlayer("  0x00285800", buf1, 0x00285800, 0x17);
	testCreatePlayer("  0x002FFFFF", buf1, 0x002FFFFF, 0x17);
	testCreatePlayer("  0x00300000", buf1, 0x00300000, 0x17);
	testCreatePlayer("  0x80000000", buf1, 0x80000000, 0x17);
	testCreatePlayer("  -1", buf1, -1, 0x17);

	checkpointNext("Thread priorities:");
	testCreatePlayer("  0", buf1, MAIN_BUF_SIZE, 0);
	testCreatePlayer("  1", buf1, MAIN_BUF_SIZE, 1);
	testCreatePlayer("  15", buf1, MAIN_BUF_SIZE, 15);
	testCreatePlayer("  16", buf1, MAIN_BUF_SIZE, 16);
	testCreatePlayer("  109", buf1, MAIN_BUF_SIZE, 109);
	testCreatePlayer("  110", buf1, MAIN_BUF_SIZE, 110);
	testCreatePlayer("  0x80000010", buf1, MAIN_BUF_SIZE, 0x80000010);

	free(buf1);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}