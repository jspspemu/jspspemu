#include "../shared.h"

SceInt32 testMpegCallback(void *data, SceInt32 numPackets, void *arg) {
	return 0;
}

void testConstruct(const char *title, bool ringbufPtr, int packets, int allocSize, bool dataPtr, bool ringbufCallback, void *commonArg = (void *) 0xDEADBEEF, bool printRingbuffer = false) {
	if (allocSize > 0) {
		g_ringbufferData = malloc(allocSize);
	} else {
		g_ringbufferData = malloc(0x100);
	}

	SceMpegRingbuffer *ringbuf = ringbufPtr ? (SceMpegRingbuffer *) &g_ringbuffer : NULL;
	void *ringbufData = dataPtr ? g_ringbufferData : NULL;
	sceMpegRingbufferCB cb = ringbufCallback ? &testMpegCallback : NULL;
	int result = sceMpegRingbufferConstruct(ringbuf, packets, ringbufData, allocSize, cb, commonArg);
	if (result == 0) {
		checkpoint(NULL);
		schedf("%s: ", title);
		schedfRingbuffer(&g_ringbuffer, g_ringbufferData);
	} else {
		checkpoint("%s: Failed (%08x)", title, result);
	}

	free(g_ringbufferData);
	g_ringbufferData = NULL;
}

extern "C" int main(int argc, char *argv[]) {
	if (loadVideoModules() < 0) {
		return 1;
	}

	sceMpegInit();

	checkpointNext("Packet counts");
	static const u32 packetCounts[] = {
		-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 32, 512, 1024, 2048, 4095, 4096, 4097,
		// Seems like there's an overflow bug validating the packet size.
		//0x00008000, 0x00010000, 0x00020000, 0x00040000, 0x00080000,
		//0x00100000, 0x00200000, 0x00400000, 0x00800000, 0x01000000, 0x02000000, 0x10000000,
		0x7FFFFFFF, 0x80000000,
	};
	for (size_t i = 0; i < ARRAY_SIZE(packetCounts); ++i) {
		char temp[32];
		if ((int)packetCounts[i] >= -4098 && (int)packetCounts[i] <= 4098) {
			snprintf(temp, sizeof(temp), "  %d packets", packetCounts[i]);
		} else {
			snprintf(temp, sizeof(temp), "  0x%08x packets", packetCounts[i]);
		}
		testConstruct(temp, true, packetCounts[i], sceMpegRingbufferQueryMemSize(4096), true, true);
	}
	
	checkpointNext("Memory sizes");
	static const u32 memorySizes[] = {
		-1, 0, 1, 4, 16, 32, 64, 2047, 2048, 2049,
		0x7FFFFFFF, 0x80000000,
	};
	for (size_t i = 0; i < ARRAY_SIZE(memorySizes); ++i) {
		char temp[32];
		snprintf(temp, sizeof(temp), "  0x%08x size", memorySizes[i]);
		testConstruct(temp, true, 0, memorySizes[i], true, true);
	}
	
	checkpointNext("Other parameters");
	testConstruct("  Normal", true, 512, sceMpegRingbufferQueryMemSize(512), true, true);
	// Crashes.
	//testConstruct("  NULL ringbuffer", false, 512, sceMpegRingbufferQueryMemSize(512), true, true);
	// But might crash later?
	testConstruct("  Without data ptr", true, 512, sceMpegRingbufferQueryMemSize(512), false, true);
	testConstruct("  Without callback", true, 512, sceMpegRingbufferQueryMemSize(512), true, false);
	testConstruct("  NULL common arg", true, 512, sceMpegRingbufferQueryMemSize(512), true, true, NULL);
	
	checkpointNext("Data");
	testConstruct("  Normal", true, 512, sceMpegRingbufferQueryMemSize(512), true, true, (void *)0xDEADC0DE, true);

	unloadVideoModules();
	return 0;
}