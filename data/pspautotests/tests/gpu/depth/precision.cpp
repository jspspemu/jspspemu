#include <common.h>
#include <pspdisplay.h>
#include <pspgu.h>
#include <pspkernel.h>
#include "../commands/commands.h"

const static bool DISPLAY_DEPTH_VALUES = false;

extern "C" void sendCommandi(int cmd, int argument);
extern "C" void sendCommandf(int cmd, float argument);
extern "C" int sceDmacMemcpy(void *dest, const void *source, unsigned int size);

u8 *fbp0 = 0;
u8 *dbp0 = fbp0 + 512 * 272 * sizeof(u32);

static u32 fcopybuf[512 * 272];
u32 *fdrawbuf;

static u16 dcopybuf[512 * 272];
u16 *ddrawbuf;

unsigned int __attribute__((aligned(16))) list[262144];

u32 __attribute__((aligned(16))) imageData[] = {
	0x000000FF, 0x000000FF, 0, 0,
	0x000000FF, 0x000000FF, 0, 0,
};

typedef struct {
	u16 u, v;
	s16 x, y, z;
} Vertex;

const s16 throughDepthValue = 0x1234;
Vertex verticesThrough[2] = { {0, 0, 0, 0, throughDepthValue}, {2, 2, 32, 32, throughDepthValue} };

const s16 transT = 32767;
const s16 transL = -32768;
const s16 transB = -32768;
const s16 transR = 32767;

const s16 transformDepthValue = 0x6dCC;
Vertex verticesTransform[2] = { {0, 0, transL, transT, transformDepthValue}, {32768, 32768, transR, transB, transformDepthValue} };

extern int HAS_DISPLAY;

void resetDepth(u16 val) {
	memset(fcopybuf, 0, sizeof(fcopybuf));
	memset(dcopybuf, 0, sizeof(dcopybuf));
	for (int y = 0; y < 2; ++y) {
		for (int x = 0; x < 2; ++x) {
			dcopybuf[y * 512 + x] = val;
		}
	}
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(ddrawbuf, dcopybuf, sizeof(dcopybuf));
	sceDmacMemcpy(fdrawbuf, fcopybuf, sizeof(fcopybuf));
	sceKernelDcacheWritebackInvalidateAll();

	sceGuStart(GU_DIRECT, list);

	sceGuClearDepth(val);
	sceGuClearColor(0);
	sceGuClear(GU_DEPTH_BUFFER_BIT | GU_COLOR_BUFFER_BIT);

	sceGuFinish();
	sceGuSync(0, 0);
}

void displayBuffer(const char *reason) {
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(dcopybuf, ddrawbuf, sizeof(dcopybuf));
	sceDmacMemcpy(fcopybuf, fdrawbuf, sizeof(fcopybuf));
	sceKernelDcacheWritebackInvalidateAll();

	checkpoint(NULL);
	schedf("%s: ", reason);
	int indent = strlen(reason) + 2 + 4;
	// This prevents drawing to the screen, which makes the test faster.
	HAS_DISPLAY = 0;
	for (int y = 0; y < 1; ++y) {
		if (y != 0) {
			schedf("%*s", indent, "");
		}
		for (int x = 0; x < 1; ++x) {
			if (x != 0) {
				schedf(" ");
			}
			if (DISPLAY_DEPTH_VALUES) {
				schedf("%04x/%02x", dcopybuf[y * 512 + x], fcopybuf[y * 512 + x] & 0xFF);
			} else {
				schedf("%02x", fcopybuf[y * 512 + x] & 0xFF);
			}
		}
		schedf("\n");
	}
	HAS_DISPLAY = 1;
}

void drawTexFlush(const void *tex, const void *verts, bool through, int zfunc) {
	sceGuStart(GU_DIRECT, list);

	sceGuEnable(GU_TEXTURE_2D);
	sceGuTexMode(GU_PSM_8888, 0, 0, GU_FALSE);
	sceGuTexFunc(GU_TFX_DECAL, GU_TCC_RGB);
	sceGuTexImage(0, 2, 2, 4, tex);
	sceGuDepthFunc(zfunc);

	int transform = through ? GU_TRANSFORM_2D : GU_TRANSFORM_3D;
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | transform, 2, NULL, verts);

	sceGuFinish();
	sceGuSync(0, 0);
}

void init() {
	fdrawbuf = (u32 *)((u8 *)sceGeEdramGetAddr() + (u32)fbp0);
	ddrawbuf = (u16 *)((u8 *)sceGeEdramGetAddr() + (u32)dbp0);

	sceGuInit();
	sceGuStart(GU_DIRECT, list);
	sceGuDrawBuffer(GU_PSM_8888, fbp0, 512);
	sceGuDepthBuffer(dbp0, 512);
	sceGuDispBuffer(480, 272, fbp0, 512);
	sceGuScissor(0, 0, 480, 272);
	sceGuEnable(GU_SCISSOR_TEST);
	sceGuOffset(2048 - (480 / 2), 2048 - (272 / 2));
	sceGuViewport(2048, 2048, 480, 272);
	sceGuDepthMask(0);
	sendCommandf(GE_CMD_VIEWPORTZ1, -32767.5f);
	sendCommandf(GE_CMD_VIEWPORTZ2, 32767.5f);
	sendCommandi(GE_CMD_MINZ, 0);
	sendCommandi(GE_CMD_MAXZ, 65535);
	sceGuEnable(GU_DEPTH_TEST);
	sceGuDepthFunc(GU_ALWAYS);
	sceGuEnable(GU_SCISSOR_TEST);
	sceGuFrontFace(GU_CW);
	sceGuShadeModel(GU_SMOOTH);

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
}

void testDepthBox(const char *title, bool through, u16 initZ, int zfunc) {
	const void *verts = through ? verticesThrough : verticesTransform;

	resetDepth(initZ);

	drawTexFlush(imageData, verts, through, zfunc);
	sceDisplayWaitVblankStart();
	displayBuffer(title);
}

void testDepthPrecision(const char *title, bool through) {
	char full[1024] = {0};
	snprintf(full, sizeof(full) - 1, "%s:", title);

	checkpointNext(full);
	testDepthBox("  1234 -> 0000", through, 0, GU_ALWAYS);

	testDepthBox("  1234 <  1233", through, 0x1233, GU_LESS);
	testDepthBox("  1234 <= 1233", through, 0x1233, GU_LEQUAL);
	testDepthBox("  1234 >  1233", through, 0x1233, GU_GREATER);
	testDepthBox("  1234 >= 1233", through, 0x1233, GU_GEQUAL);

	testDepthBox("  1234 <  1234", through, 0x1234, GU_LESS);
	testDepthBox("  1234 <= 1234", through, 0x1234, GU_LEQUAL);
	testDepthBox("  1234 >  1234", through, 0x1234, GU_GREATER);
	testDepthBox("  1234 >= 1234", through, 0x1234, GU_GEQUAL);

	testDepthBox("  1234 <  1235", through, 0x1235, GU_LESS);
	testDepthBox("  1234 <= 1235", through, 0x1235, GU_LEQUAL);
	testDepthBox("  1234 >  1235", through, 0x1235, GU_GREATER);
	testDepthBox("  1234 >= 1235", through, 0x1235, GU_GEQUAL);
}

void setTranslateMatrix(int mtx, float amt) {
	ScePspFMatrix4 ones = {
		{1, 0, 0, 0},
		{0, 1, 0, 0},
		{0, 0, 1, 0},
		{0, 0, 0, 1},
	};
	ScePspFMatrix4 trans = {
		{1, 0, 0, 0},
		{0, 1, 0, 0},
		{0, 0, 1, amt},
		{0, 0, 0, 1},
	};

	sceGuStart(GU_DIRECT, list);
	sceGuSetMatrix(GU_MODEL, mtx == GU_MODEL ? &trans : &ones);
	sceGuSetMatrix(GU_VIEW, mtx == GU_VIEW ? &trans : &ones);
	sceGuSetMatrix(GU_PROJECTION, mtx == GU_PROJECTION ? &trans : &ones);

	sceGuFinish();
	sceGuSync(0, 0);
}

void setDepthRange(float range) {
	sceGuStart(GU_DIRECT, list);
	sendCommandf(GE_CMD_VIEWPORTZ1, -32767.5f);
	sendCommandf(GE_CMD_VIEWPORTZ2, range);
	sendCommandi(GE_CMD_MINZ, 0);
	sendCommandi(GE_CMD_MAXZ, 65535);

	sceGuFinish();
	sceGuSync(0, 0);
}

extern "C" int main(int argc, char *argv[]) {
	init();

	sceDisplaySetFrameBuf(sceGeEdramGetAddr(), 512, GU_PSM_8888, PSP_DISPLAY_SETBUF_IMMEDIATE);
	sceDisplaySetMode(0, 480, 272);

	testDepthPrecision("Through mode", true);
	testDepthPrecision("Full transform", false);

	setTranslateMatrix(GU_PROJECTION, 0.00005f);
	testDepthPrecision("Full transform (+0.00005f)", false);
	setTranslateMatrix(GU_PROJECTION, 0.00002f);
	testDepthPrecision("Full transform (+0.00002f)", false);
	setTranslateMatrix(GU_PROJECTION, -0.00005f);
	testDepthPrecision("Full transform (-0.00005f)", false);
	setTranslateMatrix(GU_PROJECTION, -0.00002f);
	testDepthPrecision("Full transform (-0.00002f)", false);
	setTranslateMatrix(-1, 0.0f);

	setDepthRange(32767.0f);
	testDepthPrecision("Full transform (depth range = 32767.0f)", false);
	setDepthRange(32768.0f);
	testDepthPrecision("Full transform (depth range = 32768.0f)", false);
	setDepthRange(32767.5f);
	testDepthPrecision("Full transform (depth range = 32767.5f)", false);

	sceGuTerm();

	return 0;
}
