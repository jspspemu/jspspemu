#include "shared.h"

extern "C" int main(int argc, char *argv[]) {
	initVideo();
	loadPsmfPlayer();

	sceMpegInit();
	checkpointNext("Init");

	const int MAIN_BUF_SIZE = 0x00300000;
	const int TEMP_BUF_SIZE = 0x00010000;
	const int MAX_FRAMES = 180;
	// Not sure if these need to be aligned.
	char *buf1 = (char *)memalign(MAIN_BUF_SIZE, 64);
	char *buf2 = TEMP_BUF_SIZE > 0 ? (char *)memalign(TEMP_BUF_SIZE, 64) : NULL;
	// Needs a full path for some reason?
	const char *filename = "host0:/tests/video/psmfplayer/test.pmf";

	SceUID psmf = -1;
	// Crash if any are 0.
	PsmfPlayerCreateData createData = {
		buf1, MAIN_BUF_SIZE, 0x00000017,
	};

	PsmfInfo info;
	memset(&info, 0xFF, sizeof(PsmfInfo));

	PsmfPlayerData data = {
		0x0000000e, 0x00000000, 0x0000000f, 0x00000000, 0x00000000, 0x00000001,
	};

	checkpointNext("Setup psmfplayer:");
	int result = scePsmfPlayerCreate(&psmf, &createData);
	checkpoint("  scePsmfPlayerCreate: %08x (psmf=%08x *psmf=%08x, **psmf=%08x)", result, psmf, *(u32 *) psmf, **(u32 **) psmf);

	if (TEMP_BUF_SIZE > 0) {
		result = scePsmfPlayerSetTempBuf(&psmf, buf2, 0x00010000);
		checkpoint("  scePsmfPlayerSetTempBuf: %08x", result);
	}

	result = scePsmfPlayerGetAudioOutSize(&psmf);
	checkpoint("  scePsmfPlayerGetAudioOutSize: %08x", result);
	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
	result = scePsmfPlayerSetPsmfCB(&psmf, filename);
	checkpoint("  scePsmfPlayerSetPsmfCB: %08x", result);
	result = scePsmfPlayerGetPsmfInfo(&psmf, &info);
	checkpoint("  scePsmfPlayerGetPsmfInfo: %08x (info: %08x %08x %08x %08x %08x)", result, info.lengthTS, info.numVideoStreams, info.numAudioStreams, info.numPCMStreams, info.playerVersion);
	result = scePsmfPlayerStart(&psmf, &data, 0);
	checkpoint("  scePsmfPlayerStart: %08x", result);
	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);

	u8 audioData[0x2000] = {0};
	result = scePsmfPlayerGetAudioData(&psmf, audioData);
	checkpoint("  scePsmfPlayerGetAudioData: %08x", result);

	u64 pts = -1;
	result = scePsmfPlayerGetCurrentPts(&psmf, &pts);
	checkpoint("  scePsmfPlayerGetCurrentPts: %08x, %lld", result, pts);

	// Change to sceGeEdramGetAddr() to see it.
	char *dbuf = (char *)malloc(512 *  272 * 4);

	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
	result = scePsmfPlayerGetAudioData(&psmf, audioData);
	checkpoint("  scePsmfPlayerGetAudioData: %08x", result);

	int i;
	for (i = 0; i < MAX_FRAMES; i++) {
		checkpointNext("Next frame");
		result = scePsmfPlayerGetCurrentStatus(&psmf);
		checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
		result = scePsmfPlayerUpdate(&psmf);
		checkpoint("  scePsmfPlayerUpdate: %08x", result);
		result = scePsmfPlayerUpdate(&psmf);
		checkpoint("  scePsmfPlayerUpdate: %08x", result);
		result = scePsmfPlayerGetCurrentStatus(&psmf);
		checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
		if (result == 512)
			break;
		PsmfVideoData videoData = {512};
		videoData.displaybuf = dbuf;
		result = scePsmfPlayerGetVideoData(&psmf, &videoData);
		checkpoint("  scePsmfPlayerGetVideoData: %08x (%08x, %08x/%08x, %d)", result, videoData.frameWidth, videoData.displaybuf, dbuf, videoData.displaypts);
		result = scePsmfPlayerGetCurrentStatus(&psmf);
		checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);

		result = scePsmfPlayerGetAudioData(&psmf, audioData);
		checkpoint("  scePsmfPlayerGetAudioData: %08x", result);

		// Add a wait here like sceDisplayWaitVblankStart() if you want to see smooth playback.
	}

	checkpointNext("End state checks:");
	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
	result = scePsmfPlayerStop(&psmf);
	checkpoint("  scePsmfPlayerStop: %08x", result);
	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
	result = scePsmfPlayerBreak(&psmf);
	checkpoint("  scePsmfPlayerBreak: %08x", result);
	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
	result = scePsmfPlayerReleasePsmf(&psmf);
	checkpoint("  scePsmfPlayerReleasePsmf: %08x", result);
	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);
	result = scePsmfPlayerDelete(&psmf);
	checkpoint("  scePsmfPlayerDelete: %08x", result);
	result = scePsmfPlayerGetCurrentStatus(&psmf);
	checkpoint("  scePsmfPlayerGetCurrentStatus: %08x", result);

	unloadPsmfPlayer();

	return 0;
}