#include "shared.h"
#include <pspthreadman.h>

/*
Rough sketch of the PSMF header format.

struct PsmfHeader {
	// These are really char[4]...
	u32_le magic;
	u32_le version;

	u32_be headerSize;
	u32_be dataSize;

	// Zeros.
	u8 padding[64];

	u32_be metadataSize;
	struct {
		// u48_be
		u8 ptsPerSecond[6];
		u8 totalPts[6];
		u32_be muxRate;
		u32_be ptsPerSecond2;
		u8 numStreams;
		u8 unk1;

		u32_be metadata2Size; // Rest of metadata after this.
		u8 ptsPerSecond[6];
		u8 totalPts[6];
		u8 unk2;
		u8 unk3;

		u32_be streamDataSize; // Rest of metadata after this.
		u8 unk4;
		u8 numStreamsAgain;

		u8 streams[16][numStreams];
	} metadata;

	// EPmap follows (usually.)
};
*/

void testGetPsmfInfo(const char *title, SceUID *psmf, bool useInfo) {
	PsmfInfo info;
	memset(&info, 0xCC, sizeof(info));

	int result = scePsmfPlayerGetPsmfInfo(psmf, useInfo ? &info : NULL);
	if (result == 0) {
		checkpoint("%s: OK (status=%x)  len=%d,v=%d,a=%d,p=%d,ver=%d", title, scePsmfPlayerGetCurrentStatus(psmf), info.lengthTS, info.numVideoStreams, info.numAudioStreams, info.numPCMStreams, info.playerVersion);
	} else {
		checkpoint("%s: Failed: %08x", title, result);
	}
}

extern "C" int main(int argc, char *argv[]) {
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	checkpointNext("Players:");
	testGetPsmfInfo("  Initial", createPsmfPlayerInitial(), true);
	SceUID *psmfStandby = createPsmfPlayerStandby();
	testGetPsmfInfo("  Standby", psmfStandby, true);
	testGetPsmfInfo("  Twice", psmfStandby, true);
	SceUID psmf2 = *psmfStandby;
	testGetPsmfInfo("  Copy", &psmf2, true);
	// Crashes.
	//testGetPsmfInfo("  NULL", NULL, true);
	testGetPsmfInfo("  Deleted", createPsmfPlayerDeleted(), true);
	testGetPsmfInfo("  Playing", createPsmfPlayerPlaying(), true);
	testGetPsmfInfo("  Finished", createPsmfPlayerFinished(), true);

	// Crashes.
	//checkpointNext("Info ptr:");
	//testGetPsmfInfo("  NULL", &psmf, false);
	
	checkpointNext("Data:");
	// TODO: Do data tests here?  Check num streams etc.
	testGetPsmfInfo("  With multiple streams", createPsmfPlayerStandby("host0:/tests/video/psmfplayer/test_streams.pmf"), true);

	sceMpegFinish();
	unloadPsmfPlayer();
	return 0;
}