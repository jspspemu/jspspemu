#include "../shared.h"

static void testSetBuffer(const char *title, int atracID, u8 *secondBuffer, u32 secondSize) {
	int result = sceAtracSetSecondBuffer(atracID, secondBuffer, secondSize);
	if (atracID >= 0) {
		if (result >= 0) {
			checkpoint("%s: OK (%08x)", title, result);
		} else {
			checkpoint("%s: Failed (%08x)", title, result);
		}
	} else {
		checkpoint("%s: Invalid (%08x, %08x)", title, atracID, result);
	}
}

static void testSetBuffer(const char *title, Atrac3File &src, u8 *secondBuffer, u32 secondSize) {
	u8 *buffer = new u8[src.Size() / 2];
	memcpy(buffer, src.Data(), src.Size() / 2);

	int atracID = sceAtracSetDataAndGetID(buffer, src.Size() / 2);

	if (secondBuffer && secondSize < 0x80000000) {
		u32 secondOff = 0, desiredSize = 0;
		if (sceAtracGetSecondBufferInfo(atracID, &secondOff, &desiredSize) == 0) {
			u32 copySize = secondSize > src.Size() ? src.Size() : secondSize;
			memcpy(secondBuffer, src.Data() + secondOff, copySize);
		}
	}

	testSetBuffer(title, atracID, secondBuffer, secondSize);
	sceAtracReleaseAtracID(atracID);

	delete [] buffer;
}

static void testSetBufferWithLooped(const char *title, Atrac3File &src, int loopStart, int loopEnd, u8 *secondBuffer, u32 secondSize) {
	Atrac3File looped((size_t)0);
	CreateLoopedAtracFrom(src, looped, loopStart, loopEnd);

	testSetBuffer(title, looped, secondBuffer, secondSize);
}

static void testSetBufferTwice(Atrac3File &src) {
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

	testSetBuffer("  Set again", atracID, secondBuffer, secondSize);
	testSetBuffer("  Set to NULL", atracID, NULL, secondSize);
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

	u8 *secondBuffer = new u8[at3.Size() + 0x1000];

	checkpointNext("Atrac IDs:");
	testSetBuffer("  Normal", atracID, secondBuffer, 0);
	testSetBuffer("  Invalid ID", -1, secondBuffer, 0);
	testSetBuffer("  Unused ID", 1, secondBuffer, 0);

	checkpointNext("Other states:");
	int withoutDataID = sceAtracGetAtracID(0x1000);
	testSetBuffer("  No data", withoutDataID, secondBuffer, 0);
	sceAtracReleaseAtracID(withoutDataID);
	forceAtracState(atracID, 8);
	testSetBuffer("  State 8", atracID, secondBuffer, 0);
	forceAtracState(atracID, 16);
	testSetBuffer("  State 16", atracID, secondBuffer, 0);
	forceAtracState(atracID, 1);
	sceAtracReleaseAtracID(atracID);

	checkpointNext("Stream types:");
	int halfwayID = sceAtracSetHalfwayBufferAndGetID(at3.Data(), at3.Size() / 2, at3.Size());
	testSetBuffer("  Halfway", atracID, secondBuffer, 0x1000);
	sceAtracReleaseAtracID(halfwayID);
	testSetBuffer("  No loop", at3, secondBuffer, 0x1000);
	testSetBufferWithLooped("  End loop", at3, 2048, 249548, secondBuffer, 0x1000);
	testSetBufferWithLooped("  Middle loop", at3, 2048, 200000, secondBuffer, 0x1000);
	testSetBufferWithLooped("  Late loop", at3, 200000, 249548, secondBuffer, 0x1000);

	checkpointNext("Stream pointers:");
	testSetBufferWithLooped("  Valid address", at3, 2048, 200000, secondBuffer, 0x1000);
	testSetBufferWithLooped("  Invalid address", at3, 2048, 200000, NULL, 0x1000);

	checkpointNext("Sizes:");
	testSetBufferWithLooped("  Size 0x467", at3, 2048, 200000, secondBuffer, 376 * 3 - 1);
	testSetBufferWithLooped("  Size 0x468", at3, 2048, 200000, secondBuffer, 376 * 3);
	testSetBufferWithLooped("  Larger than file", at3, 2048, 200000, secondBuffer, at3.Size() + 0x2000);
	testSetBufferWithLooped("  0x177 with one frame", at3, 2048, 247500, secondBuffer, 375);
	testSetBufferWithLooped("  0x178 with one frame", at3, 2048, 247500, secondBuffer, 376);
	testSetBufferWithLooped("  Zero near end", at3, 2048, 249540, secondBuffer, 0);

	testSetBufferTwice(at3);

	delete [] secondBuffer;

	UnloadAtrac();
	return 0;
}