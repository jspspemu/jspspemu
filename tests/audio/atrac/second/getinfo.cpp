#include "../shared.h"

static void testGetInfo(const char *title, int atracID) {
	u32 pos = -1337;
	u32 size = -1337;
	int result = sceAtracGetSecondBufferInfo(atracID, &pos, &size);
	if (atracID >= 0) {
		if (result >= 0) {
			checkpoint("%s: OK (%08x) pos=%08x, size=%08x", title, result, pos, size);
		} else {
			checkpoint("%s: Failed (%08x) pos=%08x, size=%08x", title, result, pos, size);
		}
	} else {
		checkpoint("%s: Invalid (%08x, %08x) pos=%08x, size=%08x", title, atracID, result, pos, size);
	}
}

static void testGetInfo(const char *title, Atrac3File &src) {
	u8 *buffer = new u8[src.Size() / 2];
	memcpy(buffer, src.Data(), src.Size() / 2);

	int atracID = sceAtracSetDataAndGetID(buffer, src.Size() / 2);
	testGetInfo(title, atracID);
	sceAtracReleaseAtracID(atracID);

	delete [] buffer;
}

static void testGetInfoWithLooped(const char *title, Atrac3File &src, int loopStart, int loopEnd) {
	Atrac3File looped((size_t)0);
	CreateLoopedAtracFrom(src, looped, loopStart, loopEnd);

	testGetInfo(title, looped);
}

static void testGetInfoTwice(Atrac3File &src) {
	checkpointNext("With second buffer:");

	Atrac3File looped((size_t)0);
	CreateLoopedAtracFrom(src, looped, 2048, 200000);

	u8 *buffer = new u8[looped.Size() / 2];
	memcpy(buffer, looped.Data(), looped.Size() / 2);

	int atracID = sceAtracSetDataAndGetID(buffer, looped.Size() / 2);

	u32 secondOff = 0, secondSize = 0;
	sceAtracGetSecondBufferInfo(atracID, &secondOff, &secondSize);
	u8 *secondBuffer = new u8[secondSize];
	memcpy(secondBuffer, looped.Data() + secondOff, secondSize);

	int result = sceAtracSetSecondBuffer(atracID, secondBuffer, secondSize);
	checkpoint("  Set buffer: %08x", result);

	testGetInfo("  With second buffer", atracID);
	sceAtracReleaseAtracID(atracID);

	delete [] buffer;
	delete [] secondBuffer;
}

extern "C" int main(int argc, char *argv[]) {
	LoadAtrac();

	sceAtracReinit(0, 3);

	Atrac3File at3("../sample.at3");
	at3.Require();

	int atracID = sceAtracSetDataAndGetID(at3.Data(), at3.Size());

	checkpointNext("Atrac IDs:");
	testGetInfo("  Normal", atracID);
	testGetInfo("  Invalid ID", -1);
	testGetInfo("  Unused ID", 1);

	checkpointNext("Other states:");
	int withoutDataID = sceAtracGetAtracID(0x1000);
	testGetInfo("  No data", withoutDataID);
	sceAtracReleaseAtracID(withoutDataID);
	forceAtracState(atracID, 8);
	testGetInfo("  State 8", atracID);
	forceAtracState(atracID, 16);
	testGetInfo("  State 16", atracID);
	forceAtracState(atracID, 1);
	sceAtracReleaseAtracID(atracID);

	checkpointNext("Stream types:");
	int halfwayID = sceAtracSetHalfwayBufferAndGetID(at3.Data(), at3.Size() / 2, at3.Size());
	testGetInfo("  Halfway", atracID);
	sceAtracReleaseAtracID(halfwayID);
	testGetInfo("  No loop", at3);
	testGetInfoWithLooped("  End loop", at3, 2048, 249548);
	testGetInfoWithLooped("  Middle loop", at3, 2048, 200000);
	testGetInfoWithLooped("  Late loop", at3, 200000, 249548);

	checkpointNext("Loop end cutoff:");
	testGetInfoWithLooped("  200335", at3, 2048, 200335);
	testGetInfoWithLooped("  200336", at3, 2048, 200336);

	testGetInfoTwice(at3);

	UnloadAtrac();
	return 0;
}