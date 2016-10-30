#include "../shared.h"

SceInt32 testMpegCallback(void *data, SceInt32 numPackets, void *arg) {
	return 0;
}

extern "C" int main(int argc, char *argv[]) {
	if (loadVideoModules() < 0) {
		return 1;
	}

	sceMpegInit();

	// Crashes.
	//checkpoint("NULL ringbuffer: %08x", sceMpegRingbufferAvailableSize(NULL));
	
	int result = sceMpegRingbufferConstruct((SceMpegRingbuffer *) &g_ringbuffer, 512, g_ringbufferData, sceMpegRingbufferQueryMemSize(512), &testMpegCallback, (void *) 0x1234);
	// Crashes.
	//checkpoint("Without mpeg: %08x", sceMpegRingbufferAvailableSize((SceMpegRingbuffer *) &g_ringbuffer));
	sceMpegRingbufferDestruct((SceMpegRingbuffer *) &g_ringbuffer);

	if (createTestMpeg(512) >= 0) {
		checkpointNext("States:");

		checkpoint("  Initial: %08x", sceMpegRingbufferAvailableSize((SceMpegRingbuffer *) &g_ringbuffer));
		deleteTestMpeg();
		checkpoint("  Deleted mpeg: %08x", sceMpegRingbufferAvailableSize((SceMpegRingbuffer *) &g_ringbuffer));

		createTestMpeg(512);
		
		checkpointNext("Packet values:");
		g_ringbuffer.packetsAvail = g_ringbuffer.packetsTotal;
		checkpoint("  Avail = Total: %08x", sceMpegRingbufferAvailableSize((SceMpegRingbuffer *) &g_ringbuffer));
		g_ringbuffer.packetsAvail = 1;
		checkpoint("  Avail = 1: %08x", sceMpegRingbufferAvailableSize((SceMpegRingbuffer *) &g_ringbuffer));
	}

	unloadVideoModules();
	return 0;
}