#include "../shared.h"

static void testIsNeeded(const char *title, int atracID) {
	int result = sceAtracIsSecondBufferNeeded(atracID);
	if (atracID >= 0) {
		if (result >= 0) {
			checkpoint("%s: %d", title, result);
		} else {
			checkpoint("%s: Failed (%08x)", title, result);
		}
	} else {
		checkpoint("%s: Invalid (%08x, %08x)", title, atracID, result);
	}
}

static void testIsNeeded(const char *title, Atrac3File &src) {
	u8 *buffer = new u8[src.Size() / 2];
	memcpy(buffer, src.Data(), src.Size() / 2);

	int atracID = sceAtracSetDataAndGetID(buffer, src.Size() / 2);
	testIsNeeded(title, atracID);
	sceAtracReleaseAtracID(atracID);

	delete [] buffer;
}

static void testIsNeededWithLooped(const char *title, Atrac3File &src, int loopStart, int loopEnd) {
	Atrac3File looped((size_t)0);
	CreateLoopedAtracFrom(src, looped, loopStart, loopEnd);

	testIsNeeded(title, looped);
}

static void testIsNeededTwice(Atrac3File &src) {
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

	testIsNeeded("  Is needed with buffer", atracID);
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
	testIsNeeded("  Normal", atracID);
	testIsNeeded("  Invalid ID", -1);
	testIsNeeded("  Unused ID", 1);

	checkpointNext("Other states:");
	int withoutDataID = sceAtracGetAtracID(0x1000);
	testIsNeeded("  No data", withoutDataID);
	sceAtracReleaseAtracID(withoutDataID);
	forceAtracState(atracID, 8);
	testIsNeeded("  State 8", atracID);
	forceAtracState(atracID, 16);
	testIsNeeded("  State 16", atracID);
	forceAtracState(atracID, 1);
	sceAtracReleaseAtracID(atracID);

	checkpointNext("Stream types:");
	int halfwayID = sceAtracSetHalfwayBufferAndGetID(at3.Data(), at3.Size() / 2, at3.Size());
	testIsNeeded("  Halfway", atracID);
	sceAtracReleaseAtracID(halfwayID);
	testIsNeeded("  No loop", at3);
	testIsNeededWithLooped("  End loop", at3, 2048, 249548);
	testIsNeededWithLooped("  Middle loop", at3, 2048, 200000);
	testIsNeededWithLooped("  Late loop", at3, 200000, 249548);

	testIsNeededTwice(at3);

	UnloadAtrac();
	return 0;
}