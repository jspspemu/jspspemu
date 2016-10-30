#include "shared.h"

Vertex_UV16 vertices_nofmt[2] = {
	{0, 0},
	{2, 2},
};

Vertex_UV16_P8 vertices_s8[2] = {
	{0, 0, 10, 10, 0},
	{2, 2, 50, 50, 0},
};
Vertex_UV16_P8 vertices_s8x[2] = {
	{0, 0, norm8x(10), norm8y(60), 0},
	{32768, 32768, norm8x(50), norm8y(100), 0},
};

Vertex_UV16_P16 vertices_s16[2] = {
	{0, 0, 60, 10, 0},
	{2, 2, 100, 50, 0},
};
Vertex_UV16_P16 vertices_s16x[2] = {
	{0, 0, norm16x(60), norm16y(60), 0},
	{32768, 32768, norm16x(100), norm16y(100), 0},
};

Vertex_UV16_P32 vertices_f32[2] = {
	{0, 0, 110.0f, 10.0f, 0.0f},
	{2, 2, 150.0f, 50.0f, 0.0f},
};
Vertex_UV16_P32 vertices_f32x[2] = {
	{0, 0, norm32x(110), norm32y(60), 0},
	{32768, 32768, norm32x(150), norm32y(100), 0},
};

Vertex_UV16_P32 vertices_trbl[2] = {
	{0, 0, 200.0f, 10.0f, 0.0f},
	{2, 2, 160.0f, 50.0f, 0.0f},
};
Vertex_UV16_P32 vertices_trblx[2] = {
	{0, 0, norm32x(200), norm32y(60), 0.0f},
	{32768, 32768, norm32x(160), norm32y(100), 0.0f},
};

Vertex_UV16_P32 vertices_brtl[2] = {
	{0, 0, 250.0f, 50.0f, 0.0f},
	{2, 2, 210.0f, 10.0f, 0.0f},
};
Vertex_UV16_P32 vertices_brtlx[2] = {
	{0, 0, norm32x(250), norm32y(100), 0.0f},
	{32768, 32768, norm32x(210), norm32y(60), 0.0f},
};

Vertex_UV16_P32 vertices_incomp[1] = {
	{0, 0, 260.0f, 50.0f, 0.0f},
};
Vertex_UV16_P32 vertices_incompx[2] = {
	{0, 0, norm32x(260), norm32y(100), 0.0f},
};

void draw() {
	startFrame();
	setSimpleTexture();

	// Different formats - throughmode.
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_TRANSFORM_2D, 2, NULL, vertices_nofmt);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_8BIT | GU_TRANSFORM_2D, 2, NULL, vertices_s8);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 2, NULL, vertices_s16);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 2, NULL, vertices_f32);

	// Different formats - transform.
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_TRANSFORM_3D, 2, NULL, vertices_nofmt);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_8BIT | GU_TRANSFORM_3D, 2, NULL, vertices_s8x);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 2, NULL, vertices_s16x);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 2, NULL, vertices_f32x);

	// Rotated (not TL - BR.)
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 2, NULL, vertices_trbl);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 2, NULL, vertices_brtl);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 2, NULL, vertices_trblx);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 2, NULL, vertices_brtlx);

	// Incomplete (only one prim.)
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 1, NULL, vertices_incomp);
	sceGuDrawArray(GU_SPRITES, GU_TEXTURE_16BIT | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 1, NULL, vertices_incompx);

	endFrame();
}

extern "C" int main(int argc, char *argv[]) {
	initDisplay();

	draw();

	emulatorEmitScreenshot();
	sceGuTerm();

	return 0;
}
