#include "shared.h"

u32 __attribute__((aligned(16))) list[262144];

GePtr fbp0 = 0;
GePtr dbp0 = fbp0 + 512 * 272 * sizeof(u32);

u32 __attribute__((aligned(16))) clutRedBlue[] = { 0xFFFF0000, 0xFF0000FF, 0xFFFF00FF };
u8 __attribute__((aligned(16))) imageData[2][16] = {
	{0, 1},
	{1, 2},
};

void initDisplay() { 
	sceGuInit();
	sceGuStart(GU_DIRECT, list);
	sceGuDrawBuffer(GU_PSM_8888, fbp0, 512);
	sceGuDispBuffer(480, 272, fbp0, 512);
	sceGuDepthBuffer(dbp0, 512);
	sceGuOffset(2048 - (480 / 2), 2048 - (272 / 2));
	sceGuViewport(2048, 2048, 480, 272);
	sceGuDepthRange(65535, 0);
	sceGuDepthMask(0);
	sceGuScissor(0, 0, 480, 272);
	sceGuEnable(GU_SCISSOR_TEST);
	sceGuFrontFace(GU_CW);
	sceGuShadeModel(GU_SMOOTH);
	sceGuDisable(GU_TEXTURE_2D);

	ScePspFMatrix4 ones = {
		{1, 0, 0, 0},
		{0, 1, 0, 0},
		{0, 0, 1, 0},
		{0, 0, 0, 1},
	};

	sceGuSetMatrix(GU_MODEL, &ones);
	sceGuSetMatrix(GU_VIEW, &ones);
	sceGuSetMatrix(GU_PROJECTION, &ones);

	sceGuFinish();
	sceGuSync(0, 0);
 
	sceDisplayWaitVblankStart();
	sceGuDisplay(1);

	sceDisplaySetFrameBuf(sceGeEdramGetAddr(), 512, GU_PSM_8888, PSP_DISPLAY_SETBUF_IMMEDIATE);
	sceDisplaySetMode(0, 480, 272);
}

void startFrame() {
	sceGuStart(GU_DIRECT, list);
	sceGuClearColor(0);
	sceGuClear(GU_COLOR_BUFFER_BIT);
}

void endFrame() {
	sceGuFinish();
	sceGuSync(0, 0);

	sceDisplayWaitVblank();
}

void setSimpleTexture() {
	sceGuEnable(GU_TEXTURE_2D);
	sceGuTexMode(GU_PSM_T8, 0, 0, GU_FALSE);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	sceGuTexFunc(GU_TFX_DECAL, GU_TCC_RGB);
	sceGuClutMode(GU_PSM_8888, 0, 0xFF, 0);
	sceGuTexImage(0, 2, 2, 16, imageData);

	sceGuClutLoad(1, clutRedBlue);
}
