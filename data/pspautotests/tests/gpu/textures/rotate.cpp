#include <common.h>
#include <pspdisplay.h>
#include <pspgu.h>
#include <pspkernel.h>

extern "C" int sceDmacMemcpy(void *dest, const void *source, unsigned int size);

u8 *fbp0 = 0;
u8 *dbp0 = fbp0 + 512 * 272 * sizeof(u32);

static u32 copybuf[512 * 272];
u32 *drawbuf;

unsigned int __attribute__((aligned(16))) list[262144];

u32 __attribute__((aligned(16))) imageData[] = {
	0x000100FF, 0x0002FF00, 0, 0,
	0x0003FF00, 0x000400FF, 0, 0,
};

typedef struct {
	u16 u, v;
	s16 x, y, z;
} Vertex;

enum {
	VERTS_TL_BR,
	VERTS_TR_BL,
	VERTS_BL_TR,
	VERTS_BR_TL,
};

Vertex verticesThrough[4][2] = {
	{ {0, 0, 0, 0, 0}, {2, 2, 2, 2, 0} },
	{ {0, 0, 2, 0, 0}, {2, 2, 0, 2, 0} },
	{ {0, 0, 0, 2, 0}, {2, 2, 2, 0, 0} },
	{ {0, 0, 2, 2, 0}, {2, 2, 0, 0, 0} },
};

const s16 transT = 32767;
const s16 transL = -32768;
const s16 transB = 32767 - 482;
const s16 transR = -32768 + 273;
const s16 flipT = -32768;
const s16 flipB = -32768 + 482;

Vertex verticesTransform[4][2] = {
	{ {0, 0, transL, transT, 0}, {32768, 32768, transR, transB, 0} },
	{ {0, 0, transR, transT, 0}, {32768, 32768, transL, transB, 0} },
	{ {0, 0, transL, transB, 0}, {32768, 32768, transR, transT, 0} },
	{ {0, 0, transR, transB, 0}, {32768, 32768, transL, transT, 0} },
};
Vertex verticesTransformFlipped[4][2] = {
	{ {0, 0, transL, flipT, 0}, {32768, 32768, transR, flipB, 0} },
	{ {0, 0, transR, flipT, 0}, {32768, 32768, transL, flipB, 0} },
	{ {0, 0, transL, flipB, 0}, {32768, 32768, transR, flipT, 0} },
	{ {0, 0, transR, flipB, 0}, {32768, 32768, transL, flipT, 0} },
};

extern int HAS_DISPLAY;

void displayBuffer(const char *reason) {
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(copybuf, drawbuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	const u32 *buf = copybuf;

	checkpoint(NULL);
	schedf("%s: ", reason);
	int indent = strlen(reason) + 2 + 4;
	// This prevents drawing to the screen, which makes the test faster.
	HAS_DISPLAY = 0;
	for (int y = 0; y < 2; ++y) {
		if (y != 0) {
			schedf("%*s", indent, "");
		}
		for (int x = 0; x < 2; ++x) {
			// For the purposes of this test, ignore alpha.
			if (x != 0) {
				schedf(" ");
			}
			schedf("%06x", buf[y * 512 + x] & 0x00FFFFFF);
		}
		schedf("\n");
	}
	HAS_DISPLAY = 1;

	// Reset.
	memset(copybuf, 0, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(drawbuf, copybuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
}

void drawTexFlush(const void *tex, const void *verts, bool through) {
	sceGuStart(GU_DIRECT, list);

	sceGuEnable(GU_TEXTURE_2D);
	sceGuTexMode(GU_PSM_8888, 0, 0, GU_FALSE);
	sceGuTexFunc(GU_TFX_DECAL, GU_TCC_RGB);
	sceGuTexImage(0, 2, 2, 4, tex);

	int transform = through ? GU_TRANSFORM_2D : GU_TRANSFORM_3D;
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | transform, 2, NULL, verts);

	sceGuFinish();
	sceGuSync(0, 0);
}

void init() {
	void *fbp0 = 0;

	drawbuf = (u32 *)sceGeEdramGetAddr();

	sceGuInit();
	sceGuStart(GU_DIRECT, list);
	sceGuDrawBuffer(GU_PSM_8888, fbp0, 512);
	sceGuDispBuffer(480, 272, fbp0, 512);
	sceGuScissor(0, 0, 480, 272);
	sceGuEnable(GU_SCISSOR_TEST);
	sceGuOffset(2048 - (480 / 2), 2048 - (272 / 2));
	sceGuViewport(2048, 2048, 480, 272);
	sceGuDepthMask(1);
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

	memset(copybuf, 0, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(drawbuf, copybuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
}

void testUvRotationBox(const char *title, bool through, int vindex, bool flipped) {
	const void *verts = through ? verticesThrough[vindex] : verticesTransform[vindex];
	if (flipped) {
		verts = verticesTransformFlipped[vindex];
	}

	drawTexFlush(imageData, verts, through);
	sceDisplayWaitVblankStart();
	displayBuffer(title);
}

void testUVRotation(const char *title, bool through, bool flipped) {
	char full[1024] = {0};
	snprintf(full, sizeof(full) - 1, "%s:", title);

	checkpointNext(full);
	testUvRotationBox("  TL BR", through, VERTS_TL_BR, flipped);
	testUvRotationBox("  TR BL", through, VERTS_TR_BL, flipped);
	testUvRotationBox("  BL TR", through, VERTS_BL_TR, flipped);
	testUvRotationBox("  BR TL", through, VERTS_BR_TL, flipped);
}

void setFlippedMatrix(int mtx) {
	ScePspFMatrix4 ones = {
		{1, 0, 0, 0},
		{0, 1, 0, 0},
		{0, 0, 1, 0},
		{0, 0, 0, 1},
	};
	ScePspFMatrix4 flipped = {
		{1, 0, 0, 0},
		{0, -1, 0, 0},
		{0, 0, 1, 0},
		{0, 0, 0, 1},
	};

	sceGuStart(GU_DIRECT, list);
	sceGuSetMatrix(GU_MODEL, mtx == GU_MODEL ? &flipped : &ones);
	sceGuSetMatrix(GU_VIEW, mtx == GU_VIEW ? &flipped : &ones);
	sceGuSetMatrix(GU_PROJECTION, mtx == GU_PROJECTION ? &flipped : &ones);

	sceGuFinish();
	sceGuSync(0, 0);
}

void setFlippedViewport(bool flip) {
	sceGuStart(GU_DIRECT, list);
	sceGuViewport(2048, 2048, 480, flip ? -272 : 272);

	sceGuFinish();
	sceGuSync(0, 0);
}

extern "C" int main(int argc, char *argv[]) {
	init();

	sceDisplaySetFrameBuf(sceGeEdramGetAddr(), 512, GU_PSM_8888, PSP_DISPLAY_SETBUF_IMMEDIATE);
	sceDisplaySetMode(0, 480, 272);

	sceGuStart(GU_DIRECT, list);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	sceGuFinish();
	sceGuSync(0, 0);

	testUVRotation("Through mode", true, false);
	testUVRotation("Full transform", false, false);

	setFlippedMatrix(GU_MODEL);
	testUVRotation("Full transform (flipped model)", false, true);
	setFlippedMatrix(GU_VIEW);
	testUVRotation("Full transform (flipped view)", false, true);
	setFlippedMatrix(GU_PROJECTION);
	testUVRotation("Full transform (flipped proj)", false, true);
	setFlippedMatrix(-1);
	setFlippedViewport(true);
	testUVRotation("Full transform (flipped viewport)", false, true);
	setFlippedViewport(false);

	sceGuTerm();

	return 0;
}
