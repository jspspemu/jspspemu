#include <pspdisplay.h>
#include <pspgu.h>
#include <pspgum.h>
#include <common.h>
#include <pspkernel.h>

extern "C" int sceDmacMemcpy(void *dest, const void *source, unsigned int size);

#define BUF_WIDTH 512
#define SCR_WIDTH 480
#define SCR_HEIGHT 272

unsigned int __attribute__((aligned(16))) list[262144];
unsigned int __attribute__((aligned(16))) clutPattern[] = { 0x11111111, 0x22222222, 0x33333333, 0x44444444, 0x55555555, 0x66666666, 0x77777777, 0x88888888, };
unsigned char __attribute__((aligned(16))) imageData[16] = {0};

typedef struct {
	unsigned short u, v;
	unsigned short x, y, z;
} Vertex;

Vertex vertices1[2] = { {0, 0, 10, 10, 0}, {1, 1, 470, 262, 0} };
Vertex vertices2[2] = { {0, 0, 0, 0, 0}, {480, 272, 480, 272, 0} };

static u32 copybuf[512 * 272];
u16 *copybuf16 = (u16 *)copybuf;
u32 *drawbuf;

extern int HAS_DISPLAY;

void displayBuffer(const char *reason) {
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(copybuf, drawbuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	const u32 *buf = copybuf;

	checkpoint(NULL);
	schedf("%s: ", reason);
	// This prevents drawing to the screen, which makes the test faster.
	HAS_DISPLAY = 0;
	for (int y = 0; y < 1; ++y) {
		for (int x = 0; x < 1; ++x) {
			// For the purposes of this test, ignore alpha.
			schedf("%06x", buf[y * 512 + x] & 0x00FFFFFF);
		}
		schedf("\n");
		flushschedf();
	}
	HAS_DISPLAY = 1;

	// Reset.
	memset(copybuf, 0, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(drawbuf, copybuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
}

void drawTexFlush(int width, int height, int stride, int texfmt, const void *tex, const void *clut, int blocks, const void *verts) {
	sceGuStart(GU_DIRECT, list);

	sceGuEnable(GU_TEXTURE_2D);
	sceGuTexMode(texfmt, 0, 0, GU_FALSE);
	sceGuTexFunc(GU_TFX_DECAL, GU_TCC_RGB);
	sceGuTexImage(0, width, height, stride, tex);

	sceGuClutLoad(blocks, clut);
	sceGuClutMode(GU_PSM_8888, 0, 0xFF, 0);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 2, NULL, verts);

	sceGuFinish();
	sceGuSync(0, 0);
}

void drawWithOffsets() {
	sceDisplaySetMode(0, SCR_WIDTH, SCR_HEIGHT);

	sceGuStart(GU_DIRECT, list);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	sceGuFinish();
	sceGuSync(0, 0);

	static const int offsets[] = {0, 1, 2, 3, 4, 8, 9, 12, 15, 16};
	for (size_t i = 0; i < ARRAY_SIZE(offsets); ++i) {
		char temp[128];
		snprintf(temp, sizeof(temp), "Offset %d", offsets[i]);

		drawTexFlush(1, 1, 16, GU_PSM_T32, imageData, ((u8 *)clutPattern) + offsets[i], 1, vertices2);
		sceDisplayWaitVblank();
		displayBuffer(temp);
	}
}

void drawNearEdge() {
	// First, let's copy the clut somewhere near the edge of valid RAM.
	// VRAM is the easiest since it's the same on all PSPs and firmwares.
	// But note that there are 4 mirrors, so it's 4x as big.
	u8 *vramEnd = (u8 *)sceGeEdramGetAddr() + sceGeEdramGetSize() * 4;
	u8 *clutStart = vramEnd - 16;
	memcpy(clutStart, clutPattern, 16);

	sceDisplaySetMode(0, SCR_WIDTH, SCR_HEIGHT);

	sceGuStart(GU_DIRECT, list);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	sceGuFinish();
	sceGuSync(0, 0);

	// Okay, now try drawing from outside valid memory.
	static const int blocks[] = {0, 1, 2, 3, 4, 8, 9, 12, 15, 16, 63};
	for (size_t i = 0; i < ARRAY_SIZE(blocks); ++i) {
		char temp[128];
		snprintf(temp, sizeof(temp), "Blocks near edge %d", blocks[i]);

		drawTexFlush(1, 1, 16, GU_PSM_T32, imageData, clutStart, blocks[i], vertices2);
		sceDisplayWaitVblank();
		displayBuffer(temp);
	}

	drawTexFlush(1, 1, 16, GU_PSM_T32, imageData, vramEnd + 16, 1, vertices2);
	sceDisplayWaitVblank();
	displayBuffer("Outside VRAM");

	drawTexFlush(1, 1, 16, GU_PSM_T32, imageData, clutStart, 1, vertices2);
	sceDisplayWaitVblank();
	displayBuffer("Reset");

	// Crashes on PSP-2000.
	//drawTexFlush(1, 1, 16, GU_PSM_T32, imageData, (void *)0x0BFFFFFF, 1, vertices2);
	//sceDisplayWaitVblank();
	//displayBuffer("Outside RAM");

	// Crashes.
	//drawTexFlush(1, 1, 16, GU_PSM_T32, imageData, (void *)0x0C000000, 1, vertices2);
	//sceDisplayWaitVblank();
	//displayBuffer("End of RAM");

	// Crashes.
	//drawTexFlush(1, 1, 16, GU_PSM_T32, imageData, 0, 1, vertices2);
	//sceDisplayWaitVblank();
	//displayBuffer("Load from 0");
}

void init() {
	void *fbp0 = 0;

	drawbuf = (u32 *)sceGeEdramGetAddr();

	sceGuInit();
	sceGuStart(GU_DIRECT, list);
	sceGuDrawBuffer(GU_PSM_8888, fbp0, BUF_WIDTH);
	sceGuDispBuffer(SCR_WIDTH, SCR_HEIGHT, fbp0, BUF_WIDTH);
	sceGuScissor(0, 0, SCR_WIDTH, SCR_HEIGHT);
	sceGuEnable(GU_SCISSOR_TEST);
	sceGuFinish();
	sceGuSync(0, 0);

	sceDisplayWaitVblankStart();
	sceGuDisplay(1);

	memset(copybuf, 0, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(drawbuf, copybuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
}

extern "C" int main(int argc, char *argv[]) {
	init();
	drawWithOffsets();
	drawNearEdge();
	sceGuTerm();

	return 0;
}
