#include "../shared.h"

extern "C" int sceMpegRingbufferQueryPackNum(u32 size);

extern "C" int main(int argc, char *argv[]) {
	if (loadVideoModules() < 0) {
		return 1;
	}

	sceMpegInit();
	
	checkpointNext("Packet counts:");
	static const u32 packetCounts[] = {
		-1, 0, 1, 2048, 2048 + 103, 2048 + 104, 2048 + 105,
		(2048 + 104) * 10 - 1,
		(2048 + 104) * 10,
		(2048 + 104) * 10 + 1,
		0x7FFFFFFF, 0x80000000,
	};
	for (size_t i = 0; i < ARRAY_SIZE(packetCounts); ++i) {
		int result = sceMpegRingbufferQueryPackNum(packetCounts[i]);
		checkpoint("  %08x -> %08x", packetCounts[i], result);
	}

	unloadVideoModules();
	return 0;
}