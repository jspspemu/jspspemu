#include "../shared.h"

void testBufferInfo(const char *title, int atracID, int sample, u8 *basePtr) {
	AtracResetBufferInfo info;
	memset(&info, 0xCC, sizeof(info));

	checkpoint("%s: %08x", title, sceAtracGetBufferInfoForResetting(atracID, sample, &info));
	schedfResetBuffer(info, basePtr);
}

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

static void testResetInfoFuncs(int atracID, Atrac3File &at3, u8 *basePtr) {
	testBufferInfo("  Reset to start", atracID, 0, basePtr);
	testBufferInfo("  Reset before loop", atracID, 200000 - 2048 * 5, basePtr);
	testBufferInfo("  Reset to loop", atracID, 200000, basePtr);
	testBufferInfo("  Reset end of loop frame", atracID, 200335 + 368, basePtr);
	testBufferInfo("  Reset after loop", atracID, 200335 + 369, basePtr);
	testBufferInfo("  Reset to end", atracID, 247500, basePtr);
}

static void testResetPosFuncs(int atracID, Atrac3File &at3, u8 *basePtr) {
	testSimpleResetPlayPos("  Play at start", atracID, 0, basePtr, at3);
	testSimpleResetPlayPos("  Play before loop", atracID, 200000 - 2048 * 5, basePtr, at3);
	testSimpleResetPlayPos("  Play at loop", atracID, 200000, basePtr, at3);
	testSimpleResetPlayPos("  Play at end of loop frame", atracID, 200335 + 368, basePtr, at3);
	testSimpleResetPlayPos("  Play after loop", atracID, 200335 + 369, basePtr, at3);
	testSimpleResetPlayPos("  Play at end", atracID, 247500, basePtr, at3);
}

extern "C" int main(int argc, char *argv[]) {
	LoadAtrac();

	Atrac3File at3("../sample.at3");
	at3.Require();

	Atrac3File looped((size_t)0);
	CreateLoopedAtracFrom(at3, looped, 2048, 200000);

	u8 *buffer = new u8[looped.Size() / 2];
	memcpy(buffer, looped.Data(), looped.Size() / 2);

	int atracID = sceAtracSetDataAndGetID(buffer, looped.Size() / 2);

	if (sceAtracIsSecondBufferNeeded(atracID) != 1) {
		printf("FATAL: Does not need second buffer.\n");
		sceAtracReleaseAtracID(atracID);
		delete [] buffer;
		return 1;
	}

	checkpointNext("Reset info without second buffer:");
	testResetInfoFuncs(atracID, looped, buffer);
	checkpointNext("Reset pos without second buffer:");
	testResetPosFuncs(atracID, looped, buffer);

	u32 off = 0, size = 0;
	sceAtracGetSecondBufferInfo(atracID, &off, &size);
	u8 *secondBuffer = new u8[size];
	memcpy(secondBuffer, looped.Data() + off, size);

	sceAtracSetSecondBuffer(atracID, secondBuffer, 368 * 5);

	checkpointNext("Reset info with partial second buffer:");
	testResetInfoFuncs(atracID, looped, buffer);
	checkpointNext("Reset pos with partial second buffer:");
	testResetPosFuncs(atracID, looped, buffer);

	sceAtracSetSecondBuffer(atracID, secondBuffer, size);

	checkpointNext("Reset info with full second buffer:");
	testResetInfoFuncs(atracID, looped, buffer);
	checkpointNext("Reset pos with full second buffer:");
	testResetPosFuncs(atracID, looped, buffer);

	sceAtracReleaseAtracID(atracID);

	delete [] buffer;
	delete [] secondBuffer;

	UnloadAtrac();
	return 0;
}