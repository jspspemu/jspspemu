#include "shared.h"

void testConfigPlayer(const char *title, SceUID *psmf, int key, int val) {
	int result = scePsmfPlayerConfigPlayer(psmf, key, val);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)", title, scePsmfPlayerGetCurrentStatus(psmf));
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

int identifyBuffer(const u32 *buf) {
	// Videos always have zero alpha/stencil.
	bool couldBe8888 = true;
	bool couldBe4444 = true;
	bool couldBe5551 = true;

	int last;
	for (last = 512 * 272 - 1; last >= 0; --last) {
		if (buf[last] != 0xCCCCCCCC) {
			break;
		}
	}

	if (last < 0) {
		return -1;
	}

	int lastx = last % 512;
	int lasty = last / 512;
	if (lasty < lastx / 4) {
		last *= 2;
		lastx = last % 512;
		lasty = last / 512;
		
		couldBe8888 = false;
		const u16 *buf16 = (const u16 *)buf;
		for (int y = 0; y <= lasty; ++y) {
			for (int x = 0; x <= lastx; ++x) {
				const u16 c = buf16[y * 512 + x];
				if ((c & 0xF000) != 0) {
					couldBe4444 = false;
				}
				if ((c & 0x8000) != 0) {
					couldBe5551 = false;
				}
			}
		}
	} else {
		for (int y = 0; y <= lasty; ++y) {
			for (int x = 0; x <= lastx; ++x) {
				const u32 c = buf[y * 512 + x];
				if ((c & 0xFF000000) != 0) {
					couldBe8888 = false;
				}
				if ((c & 0xF000F000) != 0) {
					couldBe4444 = false;
				}
				if ((c & 0x80008000) != 0) {
					couldBe5551 = false;
				}
			}
		}
	}

	if (couldBe8888) {
		return 3;
	} else if (couldBe4444) {
		return 2;
	} else if (couldBe5551) {
		return 1;
	} else {
		return 0;
	}
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players (loop):");
	testConfigPlayer("  Initial", createPsmfPlayerInitial(), 0, 1);
	SceUID *psmfStandby = createPsmfPlayerStandby();
	testConfigPlayer("  Standby", psmfStandby, 0, 1);
	testConfigPlayer("  Twice", psmfStandby, 0, 1);
	SceUID psmf2 = *psmfStandby;
	testConfigPlayer("  Copy", &psmf2, 0, 1);
	// Crashes.
	//testConfigPlayer("  NULL", NULL, 0, 1);
	testConfigPlayer("  Deleted", createPsmfPlayerDeleted(), 0, 1);
	testConfigPlayer("  Playing", createPsmfPlayerPlaying(), 0, 1);
	testConfigPlayer("  Finished", createPsmfPlayerFinished(), 0, 1);

	checkpointNext("Players (pixel type):");
	testConfigPlayer("  Initial", createPsmfPlayerInitial(), 1, 1);
	psmfStandby = createPsmfPlayerStandby();
	testConfigPlayer("  Standby", psmfStandby, 1, 1);
	testConfigPlayer("  Twice", psmfStandby, 1, 1);
	psmf2 = *psmfStandby;
	testConfigPlayer("  Copy", &psmf2, 1, 1);
	// Crashes.
	//testConfigPlayer("  NULL", NULL, 1, 1);
	testConfigPlayer("  Deleted", createPsmfPlayerDeleted(), 1, 1);
	testConfigPlayer("  Playing", createPsmfPlayerPlaying(), 1, 1);
	testConfigPlayer("  Finished", createPsmfPlayerFinished(), 1, 1);

	checkpointNext("Keys:");
	const int keys[] = {-1, 0, 1, 2, 3, 4, 5, 6, 8, 12, 16, 0x1001, 0x80000000};
	SceUID *player = createPsmfPlayerInitial();
	for (size_t i = 0; i < ARRAY_SIZE(keys); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Key %08x", keys[i]);
		testConfigPlayer(temp, player, keys[i], 0);
	}

	checkpointNext("Values (loop):");
	const int loopValues[] = {-1, 0, 1, 2, 3, 4, 5, 6, 8, 12, 16, 0x1001, 0x80000000};
	for (size_t i = 0; i < ARRAY_SIZE(loopValues); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Loop %08x", loopValues[i]);
		testConfigPlayer(temp, player, 0, loopValues[i]);
	}

	checkpointNext("Values (pixel mode):");
	const int modeValues[] = {-2, -1, 0, 1, 2, 3, 4, 5, 6, 8, 12, 16, 0x1001, 0x80000000};
	for (size_t i = 0; i < ARRAY_SIZE(modeValues); ++i) {
		char temp[64];
		snprintf(temp, sizeof(temp), "  Mode %08x", modeValues[i]);
		testConfigPlayer(temp, player, 1, modeValues[i]);
	}

	checkpointNext("Loop behavior:");
	for (int l = 0; l < 2; ++l) {
		player = createPsmfPlayerPlaying();
		scePsmfPlayerConfigPlayer(player, 0, l);
		playPsmfPlayerUntilEnd(player, 500);
		u64 pts;
		scePsmfPlayerGetCurrentPts(player, &pts);
		checkpoint("  Loop %d: OK (status=%x, pts=%lld)", l, scePsmfPlayerGetCurrentStatus(player), pts);
	}
	
	checkpointNext("Pixel mode behavior:");
	for (int m = -1; m < 4; ++m) {
		player = createPsmfPlayerPlaying(/*"host0:/tests/playground/mpeg/wipeout.pmf"*/);
		scePsmfPlayerConfigPlayer(player, 1, m);
		memset(getPsmfPlayerDisplayBuf(), 0xCC, 512 * 272 * 4);
		playPsmfPlayerUntilEnd(player, 500);

		const u32 *dbuf = (const u32 *)getPsmfPlayerDisplayBuf();
		checkpoint("  Pixel mode %d: OK (status=%x), got %d", m, scePsmfPlayerGetCurrentStatus(player), identifyBuffer(dbuf));
	}

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}