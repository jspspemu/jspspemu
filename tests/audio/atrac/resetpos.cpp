#include "shared.h"

void testDirectResetPlayPos(const char *title, int atracID, int sample, int firstBytes, int secondBytes) {
	checkpoint("%s: %08x", title, sceAtracResetPlayPosition(atracID, sample, firstBytes, secondBytes));
}

void testSimpleResetPlayPos(const char *title, int atracID, int sample, u8 *input, Atrac3File &at3) {
	AtracResetBufferInfo info = {};
	if (sceAtracGetBufferInfoForResetting(atracID, sample, &info) == 0) {
		if (info.first.minWriteBytes != 0) {
			memcpy(info.first.writePos, at3.Data() + info.first.filePos, info.first.minWriteBytes);
		}
		testDirectResetPlayPos(title, atracID, sample, info.first.minWriteBytes, 0);
	} else {
		testDirectResetPlayPos(title, atracID, sample, 0, 0);
	}
}

extern "C" int main(int argc, char *argv[]) {
	Atrac3File at3("sample.at3");
	at3.Require();
	LoadAtrac();

	int atracID;
	u8 *input = new u8[at3.Size()];

	memcpy(input, at3.Data(), at3.Size() / 2);
	atracID = sceAtracSetHalfwayBufferAndGetID(input, at3.Size() / 2, at3.Size() / 2);
	checkpointNext("IDs:");
	testSimpleResetPlayPos("  Unallocated", 4, 0, input, at3);
	testSimpleResetPlayPos("  Invalid", -1, 0, input, at3);
	testSimpleResetPlayPos("  Valid", atracID, 0, input, at3);
	
	checkpointNext("Sample values:");
	const static int samples[] = {0, 1, 2046, 2047, 0x1000, 0x47ff, 0x10000, 247499, 247500, 247501, 0x100000, 0x1000000, 0x7FFFFFFF, -1, -2, -2048, -4096};
	for (size_t i = 0; i < ARRAY_SIZE(samples); ++i) {
		char temp[128];
		snprintf(temp, 128, "  %08x", samples[i]);
		testSimpleResetPlayPos(temp, atracID, samples[i], input, at3);
	}

	checkpointNext("Other states:");
	int withoutDataID = sceAtracGetAtracID(0x1000);
	testSimpleResetPlayPos("  No data", withoutDataID, 0, input, at3);
	sceAtracReleaseAtracID(withoutDataID);
	forceAtracState(atracID, 8);
	testSimpleResetPlayPos("  State 8", atracID, 0, input, at3);
	forceAtracState(atracID, 16);
	testSimpleResetPlayPos("  State 16", atracID, 0, input, at3);
	forceAtracState(atracID, 1);
	sceAtracReleaseAtracID(atracID);

	const static int bytes[] = { -1, 0, 0x100, 0x1000, 0x100000 };

	memcpy(input, at3.Data(), at3.Size());
	atracID = sceAtracSetDataAndGetID(input, at3.Size());
	checkpointNext("Entire buffer:");
	testSimpleResetPlayPos("  Sample = 0", atracID, 0, input, at3);
	testSimpleResetPlayPos("  Sample = 65536", atracID, 65536, input, at3);
	testSimpleResetPlayPos("  Sample = 196608", atracID, 196608, input, at3);
	for (size_t i = 0; i < ARRAY_SIZE(bytes); ++i) {
		char temp[128];
		snprintf(temp, 128, "  First size = %08x", bytes[i]);
		testDirectResetPlayPos(temp, atracID, 0, bytes[i], 0);
		snprintf(temp, 128, "  Second size = %08x", bytes[i]);
		testDirectResetPlayPos(temp, atracID, 0, 0, bytes[i]);
	}

	sceAtracReleaseAtracID(atracID);
	memcpy(input, at3.Data(), at3.Size() / 2);
	atracID = sceAtracSetHalfwayBufferAndGetID(input, at3.Size() / 2, at3.Size());
	checkpointNext("Half buffer:");
	testSimpleResetPlayPos("  Sample = 0", atracID, 0, input, at3);
	testSimpleResetPlayPos("  Sample = 65536", atracID, 65536, input, at3);
	testSimpleResetPlayPos("  Sample = 196608", atracID, 196608, input, at3);
	for (size_t i = 0; i < ARRAY_SIZE(bytes); ++i) {
		char temp[128];
		snprintf(temp, 128, "  First size = %08x", bytes[i]);
		testDirectResetPlayPos(temp, atracID, 0, bytes[i], 0);
		snprintf(temp, 128, "  Second size = %08x", bytes[i]);
		testDirectResetPlayPos(temp, atracID, 0, 0, bytes[i]);
	}

	sceAtracReleaseAtracID(atracID);
	memcpy(input, at3.Data(), at3.Size() / 2);
	atracID = sceAtracSetHalfwayBufferAndGetID(input, at3.Size() / 2, at3.Size() / 2);
	checkpointNext("Streamed buffer:");
	testSimpleResetPlayPos("  Sample = 0", atracID, 0, input, at3);
	testSimpleResetPlayPos("  Sample = 65536", atracID, 65536, input, at3);
	testSimpleResetPlayPos("  Sample = 196608", atracID, 196608, input, at3);
	for (size_t i = 0; i < ARRAY_SIZE(bytes); ++i) {
		char temp[128];
		snprintf(temp, 128, "  First size = %08x", bytes[i]);
		testDirectResetPlayPos(temp, atracID, 0, bytes[i], 0);
		snprintf(temp, 128, "  Second size = %08x", bytes[i]);
		testDirectResetPlayPos(temp, atracID, 0, 0, bytes[i]);
	}

	delete [] input;

	return 0;
}
