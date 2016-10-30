#include "shared.h"

void testBufferInfo(const char *title, int atracID, int sample, bool withInfo, u8 *basePtr) {
	AtracResetBufferInfo info;
	memset(&info, 0xCC, sizeof(info));

	checkpoint("%s: %08x", title, sceAtracGetBufferInfoForResetting(atracID, sample, withInfo ? &info : NULL));
	schedfResetBuffer(info, basePtr);
}

extern "C" int main(int argc, char *argv[]) {
	Atrac3File at3("sample.at3");
	at3.Require();
	LoadAtrac();

	int ignore;
	int atracID;
	u16 data[16384];
	
	atracID = sceAtracSetHalfwayBufferAndGetID((u8 *)at3.Data(), at3.Size() / 2, at3.Size() / 2);
	checkpointNext("IDs:");
	testBufferInfo("  Unallocated", 4, 0, true, at3.Data());
	testBufferInfo("  Invalid", -1, 0, true, at3.Data());
	testBufferInfo("  Valid", atracID, 0, true, at3.Data());
	
	checkpointNext("Sample values:");
	const static int samples[] = {0, 1, 1679, 1680, 2046, 2047, 0x1000, 0x47ff, 0x10000, 247499, 247500, 247501, 0x100000, 0x1000000, 0x7FFFFFFF, -1, -2, -2048, -4096};
	for (size_t i = 0; i < ARRAY_SIZE(samples); ++i) {
		char temp[128];
		snprintf(temp, 128, "  %08x", samples[i]);
		testBufferInfo(temp, atracID, samples[i], true, at3.Data());
	}

	checkpointNext("Other states:");
	int withoutDataID = sceAtracGetAtracID(0x1000);
	testBufferInfo("  No data", withoutDataID, 0, true, at3.Data());
	sceAtracReleaseAtracID(withoutDataID);
	forceAtracState(atracID, 8);
	testBufferInfo("  State 8", atracID, 0, true, at3.Data());
	forceAtracState(atracID, 16);
	testBufferInfo("  State 16", atracID, 0, true, at3.Data());
	forceAtracState(atracID, 1);
	sceAtracReleaseAtracID(atracID);

	// Crashes.
	//checkpointNext("Buffer:");
	//testBufferInfo("  NULL", atracID, 0, false, at3.Data());

	at3.Reload("sample.at3");
	atracID = sceAtracSetDataAndGetID(at3.Data(), at3.Size());
	checkpointNext("Entire buffer:");
	testBufferInfo("  At start -> 0", atracID, 0, true, at3.Data());
	checkpoint("  Decode: %08x", sceAtracDecodeData(atracID, data, &ignore, &ignore, &ignore));
	testBufferInfo("  After decode 1 -> 0", atracID, 0, true, at3.Data());

	testBufferInfo("  After decode 1 -> 65536", atracID, 65536, true, at3.Data());
	checkpoint("  Decode: %08x", sceAtracDecodeData(atracID, data, &ignore, &ignore, &ignore));
	testBufferInfo("  After decode 2 -> 65536", atracID, 65536, true, at3.Data());

	testBufferInfo("  After decode 2 -> 196608", atracID, 196608, true, at3.Data());
	checkpoint("  Decode: %08x", sceAtracDecodeData(atracID, data, &ignore, &ignore, &ignore));
	testBufferInfo("  After decode 3 -> 196608", atracID, 196608, true, at3.Data());

	sceAtracReleaseAtracID(atracID);
	at3.Reload("sample.at3");
	atracID = sceAtracSetHalfwayBufferAndGetID((u8 *)at3.Data(), at3.Size() / 2, at3.Size());
	checkpointNext("Half buffer:");
	testBufferInfo("  At start -> 0", atracID, 0, true, at3.Data());
	checkpoint("  Decode: %08x", sceAtracDecodeData(atracID, data, &ignore, &ignore, &ignore));
	testBufferInfo("  After decode 1 -> 0", atracID, 0, true, at3.Data());

	testBufferInfo("  After decode 1 -> 65536", atracID, 65536, true, at3.Data());
	checkpoint("  Decode: %08x", sceAtracDecodeData(atracID, data, &ignore, &ignore, &ignore));
	testBufferInfo("  After decode 2 -> 65536", atracID, 65536, true, at3.Data());

	testBufferInfo("  After decode 2 -> 196608", atracID, 196608, true, at3.Data());
	checkpoint("  Decode: %08x", sceAtracDecodeData(atracID, data, &ignore, &ignore, &ignore));
	testBufferInfo("  After decode 3 -> 196608", atracID, 196608, true, at3.Data());

	sceAtracReleaseAtracID(atracID);
	at3.Reload("sample.at3");
	atracID = sceAtracSetHalfwayBufferAndGetID((u8 *)at3.Data(), at3.Size() / 2, at3.Size() / 2);
	checkpointNext("Streamed buffer:");
	testBufferInfo("  At start -> 0", atracID, 0, true, at3.Data());
	checkpoint("  Decode: %08x", sceAtracDecodeData(atracID, data, &ignore, &ignore, &ignore));
	testBufferInfo("  After decode 1 -> 0", atracID, 0, true, at3.Data());

	testBufferInfo("  After decode 1 -> 65536", atracID, 65536, true, at3.Data());
	checkpoint("  Decode: %08x", sceAtracDecodeData(atracID, data, &ignore, &ignore, &ignore));
	testBufferInfo("  After decode 2 -> 65536", atracID, 65536, true, at3.Data());

	testBufferInfo("  After decode 2 -> 196608", atracID, 196608, true, at3.Data());
	checkpoint("  Decode: %08x", sceAtracDecodeData(atracID, data, &ignore, &ignore, &ignore));
	testBufferInfo("  After decode 3 -> 196608", atracID, 196608, true, at3.Data());

	return 0;
}
