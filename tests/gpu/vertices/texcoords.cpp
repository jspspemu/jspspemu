#include "shared.h"

static const int BOX_W = 32;
static const int BOX_H = 32;
static const int BOX_SPACE = 10;

static u32 __attribute__((aligned(16))) imageData[4][4] = {
	{COLORS[0], COLORS[1], COLORS[2], COLORS[3]},
	{COLORS[1], COLORS[2], COLORS[3], COLORS[4]},
	{COLORS[2], COLORS[3], COLORS[4], COLORS[5]},
	{COLORS[3], COLORS[4], COLORS[5], COLORS[6]},
};

void nextBox(float u, float v, int t, int w = -1) {
	static int x = 10;
	static int y = 10;

	w = w == -1 ? BOX_W : w;

	Vertices vert(t);
	vert.TP(0, 0, x, y, 0);
	vert.TP(u, 0, x + w, y, 0);
	vert.TP(u, v, x + w, y + BOX_H, 0);
	vert.TP(0, v, x, y + BOX_H, 0);

	void *p = sceGuGetMemory(vert.Size());
	memcpy(p, vert.Ptr(), vert.Size());
	sceGuDrawArray(GU_TRIANGLE_FAN, vert.VType(), 4, NULL, p);

	x += w + BOX_SPACE;
	if (x + w >= 480) {
		x = 10;
		y += BOX_H + BOX_SPACE;
	}
}

void draw() {
	startFrame();

	sceGuEnable(GU_TEXTURE_2D);
	sceGuTexMode(GU_PSM_8888, 0, 0, GU_FALSE);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	sceGuTexFunc(GU_TFX_DECAL, GU_TCC_RGB);
	sceGuTexWrap(GU_REPEAT, GU_REPEAT);
	sceGuTexImage(0, 4, 4, 4, imageData);

	nextBox(0, 0, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D);
	nextBox(2, 2, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D);
	nextBox(4, 4, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D);

	// Interesting behavior with 8 bit.
	nextBox(4, 4, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D);
	nextBox(255, 255, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D);

	nextBox(4, 4, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D);
	nextBox(4, 4, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_2D);

	nextBox(0, 0, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(32768, 32768, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(128, 128, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(1, 1, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);

	// 128 is the one that is even, not 127.
	nextBox(127, 127, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 128);
	nextBox(128, 128, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 128);

	// Enable filtering to see partial.
	sceGuTexWrap(GU_CLAMP, GU_CLAMP);
	sceGuTexFilter(GU_LINEAR, GU_LINEAR);
	
	nextBox(128, 128, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(112, 112, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(96, 96, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(32, 32, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D);

	// Let's check out repeating with large texcoords.
	sceGuTexWrap(GU_REPEAT, GU_REPEAT);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	nextBox(16, 16, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D);
	nextBox(4, 4, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(-4, -4, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(255, 255, GU_TEXTURE_8BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(65535, 65535, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(0.5, 0.5, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);

	// Some crazy float values
	nextBox(NAN, NAN, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(INFINITY, INFINITY, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(-INFINITY, -INFINITY, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(1, NAN, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);
	nextBox(1, 0, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);

	// Let's try clear mode.
	sceGuSendCommandi(211, 1 | ((GU_COLOR_BUFFER_BIT | GU_STENCIL_BUFFER_BIT) << 8));
	sceGuDisable(GU_BLEND);
	
	nextBox(4, 4, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_2D);
	nextBox(1, 1, GU_TEXTURE_32BITF | GU_VERTEX_16BIT | GU_TRANSFORM_3D);

	sceGuSendCommandi(211, 0);

	endFrame();
}

extern "C" int main(int argc, char *argv[]) {
	initDisplay();

	draw();

	emulatorEmitScreenshot();
	sceGuTerm();

	return 0;
}
