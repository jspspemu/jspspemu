#include "shared.h"

void testGetRemainFrame(const char *title, int atracID, bool withRemainFrame) {
	int remainFrame = -1337;
	int result = sceAtracGetRemainFrame(atracID, withRemainFrame ? &remainFrame : NULL);
	if (result >= 0) {
		checkpoint("%s: OK (%08x), remainFrame=%d", title, result, remainFrame);
	} else if (atracID < 0) {
		checkpoint("%s: Invalid (%08x, %08x), remainFrame=%d", title, atracID, result, remainFrame);
	} else {
		checkpoint("%s: Failed (%08x), remainFrame=%d", title, result, remainFrame);
	}
}

void drainStreamedAtrac(int atracID, Atrac3File &at3) {
	int samples, end, remain;
	u32 next;
	do {
		int res = sceAtracDecodeData(atracID, NULL, &samples, &end, &remain);
		if (res != 0) {
			checkpoint("** ERROR: %08x", res);
			break;
		}

		if (remain == 0) {
			u8 *writePtr;
			u32 avail, off;
			if (sceAtracGetStreamDataInfo(atracID, &writePtr, &avail, &off) == 0) {
				memcpy(writePtr, at3.Data() + off, avail);
				sceAtracAddStreamData(atracID, avail);
			}
		}
	} while (end == 0);
}

void testAtracIDs(Atrac3File &at3) {
	int atracID = sceAtracSetDataAndGetID(at3.Data(), at3.Size());

	checkpointNext("Atrac IDs:");
	testGetRemainFrame("  Normal", atracID, true);
	testGetRemainFrame("  Invalid ID", -1, true);
	testGetRemainFrame("  Unused ID", 2, true);
	sceAtracReleaseAtracID(atracID);
}

void testAtracMisc(Atrac3File &at3) {
	int atracID = sceAtracSetDataAndGetID(at3.Data(), at3.Size());
	int atracID2 = sceAtracGetAtracID(PSP_ATRAC_AT3PLUS);

	checkpointNext("Other states:");
	testGetRemainFrame("  No data", atracID2, true);
	forceAtracState(atracID, 8);
	testGetRemainFrame("  State 8", atracID, true);
	forceAtracState(atracID, 16);
	testGetRemainFrame("  State 16", atracID, true);
	forceAtracState(atracID, 2);
	// Crashes.
	//testGetRemainFrame("  No out param", atracID, false);
	sceAtracReleaseAtracID(atracID);
	sceAtracReleaseAtracID(atracID2);
}

void testAtracBuffers(Atrac3File &at3) {
	u8 *input = new u8[at3.Size()];
	int atracID;

	memcpy(input, at3.Data(), at3.Size());
	checkpointNext("Buffers:");
	atracID = sceAtracSetDataAndGetID(input, at3.Size());
	testGetRemainFrame("  Full buffer", atracID, true);
	sceAtracReleaseAtracID(atracID);

	static const int halfSizes[] = {472, 473, 847, 848, 1975, 1976};
	for (size_t i = 0; i < ARRAY_SIZE(halfSizes); ++i) {
		char temp[128];
		snprintf(temp, 128, "  Half buffer size = %d", halfSizes[i]);
		atracID = sceAtracSetHalfwayBufferAndGetID(input, halfSizes[i], at3.Size());
		testGetRemainFrame(temp, atracID, true);
		sceAtracReleaseAtracID(atracID);
	}

	atracID = sceAtracSetHalfwayBufferAndGetID(input, at3.Size() / 2, at3.Size() / 2);
	testGetRemainFrame("  Streaming buffer", atracID, true);
	sceAtracReleaseAtracID(atracID);

	memcpy(input, at3.Data(), at3.Size());
	atracID = sceAtracSetHalfwayBufferAndGetID(input, at3.Size() / 2, at3.Size() / 2);
	AtracResetBufferInfo info = {};
	sceAtracGetBufferInfoForResetting(atracID, 4096, &info);
	memcpy(input, at3.Data() + info.first.filePos, info.first.minWriteBytes);
	sceAtracResetPlayPosition(atracID, 4096, info.first.minWriteBytes, 0);
	testGetRemainFrame("  Streaming buffer after seek + min", atracID, true);
	sceAtracReleaseAtracID(atracID);

	delete [] input;
}

void testAtracDrained(Atrac3File &at3) {
	Atrac3File looped((size_t)0);
	CreateLoopedAtracFrom(at3, looped, 2048, 249548);
	u8 *input = new u8[looped.Size()];
	int atracID;

	checkpointNext("Drained remain values:");

	memcpy(input, at3.Data(), at3.Size());
	atracID = sceAtracSetDataAndGetID(input, at3.Size());
	drainStreamedAtrac(atracID, at3);
	testGetRemainFrame("  Full buffer", atracID, true);
	sceAtracReleaseAtracID(atracID);

	memcpy(input, at3.Data(), at3.Size());
	atracID = sceAtracSetHalfwayBufferAndGetID(input, at3.Size() / 2, at3.Size());
	drainStreamedAtrac(atracID, at3);
	testGetRemainFrame("  Half buffer", atracID, true);
	sceAtracReleaseAtracID(atracID);

	memcpy(input, at3.Data(), at3.Size());
	atracID = sceAtracSetHalfwayBufferAndGetID(input, at3.Size() / 2, at3.Size() / 2);
	drainStreamedAtrac(atracID, at3);
	testGetRemainFrame("  Streamed without loop", atracID, true);
	sceAtracReleaseAtracID(atracID);

	memcpy(input, looped.Data(), looped.Size());
	atracID = sceAtracSetHalfwayBufferAndGetID(input, at3.Size() / 2, at3.Size() / 2);
	sceAtracSetLoopNum(atracID, 1);
	drainStreamedAtrac(atracID, looped);
	testGetRemainFrame("  Streamed with loop", atracID, true);
	sceAtracReleaseAtracID(atracID);

	delete[] input;
}

extern "C" int main(int argc, char *argv[]) {
	Atrac3File at3("sample.at3");
	at3.Require();
	LoadAtrac();

	testAtracIDs(at3);
	testAtracMisc(at3);
	testAtracBuffers(at3);
	testAtracDrained(at3);

	UnloadAtrac();
	return 0;
}