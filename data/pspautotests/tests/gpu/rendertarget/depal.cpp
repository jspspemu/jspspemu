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
unsigned int __attribute__((aligned(16))) clutAddOne[] = { 0x00000001, 0x00000002, 0x00000003, 0x00000004, 0x00000005, 0x00000006, 0x00000007, 0x00000008, };
unsigned int __attribute__((aligned(16))) clutRedToGreen8888[] = { 0x00000000, 0x00000100, 0x00000200, 0x00000300, 0x00000400, 0x00000500, 0x00000600, 0x00000700, };
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

void *getBufAddr(int i) {
	int off = (i * 512 * 272 * 4);
	return ((u8 *)sceGeEdramGetAddr() + off);
}

void switchBuf(int i, int fmt) {
	int off = (i * 512 * 272 * 4);
	void *p = (void *)off;
	drawbuf = (u32 *)getBufAddr(i);

	sceGuStart(GU_DIRECT, list);
	sceGuDrawBuffer(fmt, p, BUF_WIDTH);
	sceGuDispBuffer(SCR_WIDTH, SCR_HEIGHT, p, BUF_WIDTH);
	sceGuFinish();
	sceGuSync(0, 0);
}

void displayBuffer(const char *reason) {
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(copybuf, drawbuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	const u32 *buf = copybuf;

	checkpoint(reason);
	// This prevents drawing to the screen, which makes the test faster.
	HAS_DISPLAY = 0;
	for (int y = 0; y < 272; ++y) {
		for (int x = 0; x < 480; ++x) {
			if (buf[y * 512 + x] != 0) {
				schedf("%x", buf[y * 512 + x]);
			} else {
				schedf(" ");
			}
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

void drawTexFlush(int width, int height, int stride, int texfmt, const void *tex, const void *clut, const void *verts) {
	sceGuStart(GU_DIRECT, list);

	sceGuEnable(GU_TEXTURE_2D);
	sceGuTexMode(texfmt, 0, 0, GU_FALSE);
	sceGuTexFunc(GU_TFX_DECAL, GU_TCC_RGB);
	sceGuTexImage(0, width, height, stride, tex);

	sceGuClutLoad(1, clut);
	sceGuClutMode(GU_PSM_8888, 0, 0xFF, 0);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 2, NULL, verts);

	sceGuFinish();
	sceGuSync(0, 0);
}

void drawRedToGreen8888() {
	sceDisplaySetMode(0, SCR_WIDTH, SCR_HEIGHT);

	sceGuStart(GU_DIRECT, list);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	sceGuFinish();
	sceGuSync(0, 0);

	// First draw a texture to image 1.  We'll use a clut here from memory.
	switchBuf(0, GU_PSM_8888);
	drawTexFlush(1, 1, 16, GU_PSM_T8, imageData, clutAddOne, vertices1);

	// Now, take what we just drew and add one again using a clut.
	switchBuf(1, GU_PSM_8888);
	drawTexFlush(512, 512, 512, GU_PSM_T32, getBufAddr(0), clutAddOne, vertices2);

	// For good measure, we'll now use a clut that moves the red component to the green component.
	switchBuf(1, GU_PSM_8888);
	drawTexFlush(512, 512, 512, GU_PSM_T32, getBufAddr(1), clutRedToGreen8888, vertices2);

	sceDisplayWaitVblank();

	displayBuffer("Green");
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
	drawRedToGreen8888();
	sceGuTerm();

	return 0;
}