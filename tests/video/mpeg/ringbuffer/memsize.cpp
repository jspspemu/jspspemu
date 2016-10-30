#include "../shared.h"

extern "C" int main(int argc, char *argv[]) {
	if (loadVideoModules() < 0) {
		return 1;
	}

	sceMpegInit();
	
	checkpointNext("Packet counts:");
	static const u32 packetCounts[] = {
		-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 32, 512, 1024, 2048, 4095, 4096, 4097,
		0x7FFFFFFF, 0x80000000,
	};
	for (size_t i = 0; i < ARRAY_SIZE(packetCounts); ++i) {
		int result = sceMpegRingbufferQueryMemSize(packetCounts[i]);
		checkpoint("  %08x -> %08x", packetCounts[i], result);
	}

	unloadVideoModules();
	return 0;
}