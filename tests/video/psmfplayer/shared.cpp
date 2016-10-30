#include "shared.h"

#include <psputility.h>
#include <psputility_modules.h>
#include <pspmodulemgr.h>

static unsigned int __attribute__((aligned(16))) list[65536];
static SceUID psmfModule;
static SceUID psmfPlayerModule;

static const int MAIN_BUF_SIZE = 0x00300000;
static const char *const PSMF_FILENAME = "host0:/tests/video/psmfplayer/test.pmf";

static void *mainBuf = NULL;
static void *displayBuf = NULL;
static SceUID activePsmfPlayer = 0;

int initVideo() {
	sceKernelDcacheWritebackAll();

	sceGuInit();
	sceGuStart(GU_DIRECT, list);

	sceGuDrawBuffer (GU_PSM_8888, (void*)FRAME_SIZE, BUF_WIDTH);
	sceGuDepthBuffer((void *)(FRAME_SIZE * 2), BUF_WIDTH);
	sceGuOffset     (2048 - (SCR_WIDTH / 2),2048 - (SCR_HEIGHT / 2));
	sceGuViewport   (2048, 2048, SCR_WIDTH, SCR_HEIGHT);
	sceGuDepthRange (0xc350, 0x2710);
	sceGuScissor    (0, 0, SCR_WIDTH, SCR_HEIGHT);
	sceGuFinish     ();
	sceGuSync       (GU_SYNC_FINISH, GU_SYNC_WHAT_DONE);

	return 0;
}

int loadPsmfPlayer() {
	sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	sceUtilityLoadModule(PSP_MODULE_AV_MPEGBASE);

	if (!RUNNING_ON_EMULATOR) {
		psmfModule = sceKernelLoadModule("psmf.prx", 0, NULL);
		if (psmfModule < 0) {
			printf("TEST FAILURE: Please place a psmf.prx in this directory.");
			return -1;
		}
		sceKernelStartModule(psmfModule, 0, NULL, NULL, NULL);

		psmfPlayerModule = sceKernelLoadModule("libpsmfplayer.prx", 0, NULL);
		if (psmfPlayerModule < 0) {
			printf("TEST FAILURE: Please place a libpsmfplayer.prx in this directory.");
			return -1;
		}

		sceKernelStartModule(psmfPlayerModule, 0, NULL, NULL, NULL);
	}
}

SceUID *createPsmfPlayerInitial(int prio) {
	if (activePsmfPlayer != 0) {
		scePsmfPlayerBreak(&activePsmfPlayer);
		scePsmfPlayerStop(&activePsmfPlayer);
		scePsmfPlayerBreak(&activePsmfPlayer);
		scePsmfPlayerDelete(&activePsmfPlayer);
	}

	if (!mainBuf) {
		mainBuf = memalign(MAIN_BUF_SIZE, 64);
	}

	PsmfPlayerCreateData createData = {mainBuf, MAIN_BUF_SIZE, prio};
	scePsmfPlayerCreate(&activePsmfPlayer, &createData);
	return &activePsmfPlayer;
}

SceUID *createPsmfPlayerDeleted() {
	if (activePsmfPlayer == 0) {
		createPsmfPlayerInitial();
	}
	scePsmfPlayerBreak(&activePsmfPlayer);
	scePsmfPlayerStop(&activePsmfPlayer);
	scePsmfPlayerBreak(&activePsmfPlayer);
	scePsmfPlayerDelete(&activePsmfPlayer);
	return &activePsmfPlayer;
}

SceUID *createPsmfPlayerStandby(const char *filename, int prio) {
	createPsmfPlayerInitial(prio);

	if (filename == NULL) {
		filename = PSMF_FILENAME;
	}

	scePsmfPlayerSetPsmf(&activePsmfPlayer, filename);
	return &activePsmfPlayer;
}

SceUID *createPsmfPlayerPlaying(const char *filename, int prio) {
	createPsmfPlayerStandby(filename, prio);

	PsmfPlayerData data = {
		0x0000000e, 0x00000000, 0x0000000f, 0x00000000, 0x00000000, 0x00000001,
	};
	scePsmfPlayerStart(&activePsmfPlayer, &data, 0);
	return &activePsmfPlayer;
}

void *getPsmfPlayerDisplayBuf() {
	if (!displayBuf) {
		displayBuf = memalign(512 *  272 * 4, 64);
	}
	return displayBuf;
}

void playPsmfPlayerUntilEnd(SceUID *player, int maxFrames) {
	getPsmfPlayerDisplayBuf();

	for (int i = 0; i < maxFrames; i++) {
		scePsmfPlayerUpdate(player);
		if (scePsmfPlayerGetCurrentStatus(player) != 4)
			break;
		PsmfVideoData videoData = {512, displayBuf};
		scePsmfPlayerGetVideoData(player, &videoData);
	}
}

SceUID *createPsmfPlayerFinished(const char *filename, int prio) {
	createPsmfPlayerPlaying(filename, prio);
	playPsmfPlayerUntilEnd(&activePsmfPlayer, 500);
	return &activePsmfPlayer;
}

void unloadPsmfPlayer() {
	createPsmfPlayerDeleted();

	sceKernelStopModule(psmfPlayerModule, 0, NULL, NULL, NULL);
	sceKernelUnloadModule(psmfPlayerModule);
	sceKernelStopModule(psmfModule, 0, NULL, NULL, NULL);
	sceKernelUnloadModule(psmfModule);

	sceUtilityUnloadModule(PSP_MODULE_AV_MPEGBASE);
	sceUtilityUnloadModule(PSP_MODULE_AV_AVCODEC);
}
