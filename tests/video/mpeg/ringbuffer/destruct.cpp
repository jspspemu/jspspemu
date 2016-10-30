#include "../shared.h"

SceInt32 testMpegCallback(void *data, SceInt32 numPackets, void *arg) {
	return 0;
}

extern "C" int main(int argc, char *argv[]) {
	if (loadVideoModules() < 0) {
		return 1;
	}

	sceMpegInit();

	int result = sceMpegRingbufferConstruct((SceMpegRingbuffer *) &g_ringbuffer, 512, g_ringbufferData, sceMpegRingbufferQueryMemSize(512), &testMpegCallback, (void *) 0x1234);
	checkpoint("Normal: %08x", sceMpegRingbufferDestruct((SceMpegRingbuffer *) &g_ringbuffer));
	checkpoint("Twice: %08x", sceMpegRingbufferDestruct((SceMpegRingbuffer *) &g_ringbuffer));
	checkpoint("Invalid: %08x", sceMpegRingbufferDestruct((SceMpegRingbuffer *) 0xDEADBEEF));
	checkpoint("NULL: %08x", sceMpegRingbufferDestruct(NULL));

	g_ringbuffer.packetsTotal = 100;
	g_ringbuffer.packetsAvail = 90;
	g_ringbuffer.packetsRead = 2;
	g_ringbuffer.packetsWritten = 53;
	sceMpegRingbufferDestruct((SceMpegRingbuffer *) &g_ringbuffer);

	checkpoint(NULL);
	schedf("After destruct: ");
	schedfRingbuffer(&g_ringbuffer, g_ringbufferData);

	unloadVideoModules();
	return 0;
}