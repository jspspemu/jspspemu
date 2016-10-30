#include "shared.h"

void testGetSoundSample(const char *title, int atracID) {
	int end = -1337, loopStart = -1337, loopEnd = -1337;
	int result = sceAtracGetSoundSample(atracID, &end, &loopStart, &loopEnd);
	if (result >= 0) {
		checkpoint("%s: OK (%08x), end=%08x, loopStart=%08x, loopEnd=%08x", title, result, end, loopStart, loopEnd);
	} else if (atracID < 0) {
		checkpoint("%s: Error (%08x, %08x), end=%08x, loopStart=%08x, loopEnd=%08x", title, atracID, result, end, loopStart, loopEnd);
	} else {
		checkpoint("%s: Failed (%08x), end=%08x, loopStart=%08x, loopEnd=%08x", title, result, end, loopStart, loopEnd);
	}
}

extern "C" int main(int argc, char *argv[]) {
	LoadAtrac();

	Atrac3File at3("sample.at3");
	at3.Require();

	int atracID = sceAtracSetDataAndGetID(at3.Data(), at3.Size());
	int atracID2 = sceAtracGetAtracID(PSP_ATRAC_AT3PLUS);

	checkpointNext("Atrac IDs:");
	testGetSoundSample("  Normal", atracID);
	testGetSoundSample("  Invalid ID", -1);
	testGetSoundSample("  Unused ID", 1);

	checkpointNext("Other states:");
	testGetSoundSample("  No data", atracID2);
	forceAtracState(atracID, 8);
	testGetSoundSample("  State 8", atracID);
	forceAtracState(atracID, 16);
	testGetSoundSample("  State 16", atracID);
	sceAtracReleaseAtracID(atracID);
	sceAtracReleaseAtracID(atracID2);

	checkpointNext("Loop");
	Atrac3File looped((size_t)0);
	CreateLoopedAtracFrom(at3, looped, 2048, 249548);
	atracID = sceAtracSetDataAndGetID(looped.Data(), looped.Size());
	testGetSoundSample("  Loop full", atracID);
	sceAtracReleaseAtracID(atracID);
	CreateLoopedAtracFrom(at3, looped, 2048, 8192);
	atracID = sceAtracSetDataAndGetID(looped.Data(), looped.Size());
	testGetSoundSample("  Loop start", atracID);
	sceAtracReleaseAtracID(atracID);
	CreateLoopedAtracFrom(at3, looped, 0, 2048);
	atracID = sceAtracSetDataAndGetID(looped.Data(), looped.Size());
	testGetSoundSample("  Loop zero", atracID);
	sceAtracReleaseAtracID(atracID);

	// Crashes.
	//checkpointNext("Parameters:");
	//atracID = sceAtracSetDataAndGetID(at3.Data(), at3.Size());
	//u32 result = sceAtracGetSoundSample(atracID, NULL, NULL, NULL);
	//checkpoint("  NULL info: %08x", result);
	//sceAtracReleaseAtracID(atracID);

	UnloadAtrac();
	return 0;
}