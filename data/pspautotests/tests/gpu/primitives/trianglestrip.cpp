#include "shared.h"

Vertex_C8888 vertices_nofmt[4] = {
	{0xFF0000FF},
	{0xFF0000FF},
	{0xFF0000FF},
	{0xFF0000FF},
};

Vertex_C8888_P8 vertices_s8[4] = {
	{0xFF00FF00, 10, 50, 0},
	{0xFF00FF00, 10, 10, 0},
	{0xFF00FF00, 50, 50, 0},
	{0xFF00FF00, 50, 10, 0},
};
Vertex_C8888_P8 vertices_s8x[4] = {
	{0xFF00FF00, norm8x(10), norm8y(100), 0},
	{0xFF00FF00, norm8x(10), norm8y(60), 0},
	{0xFF00FF00, norm8x(50), norm8y(100), 0},
	{0xFF00FF00, norm8x(50), norm8y(60), 0},
};

Vertex_C8888_P16 vertices_s16[4] = {
	{0xFFFF0000, 60, 50, 0},
	{0xFFFF0000, 60, 10, 0},
	{0xFFFF0000, 100, 50, 0},
	{0xFFFF0000, 100, 10, 0},
};
Vertex_C8888_P16 vertices_s16x[4] = {
	{0xFFFF0000, norm16x(60), norm16y(100), 0},
	{0xFFFF0000, norm16x(60), norm16y(60), 0},
	{0xFFFF0000, norm16x(100), norm16y(100), 0},
	{0xFFFF0000, norm16x(100), norm16y(60), 0},
};

Vertex_C8888_P32 vertices_f32[4] = {
	{0xFF00FFFF, 110.0f, 50.0f, 0.0f},
	{0xFF00FFFF, 110.0f, 10.0f, 0.0f},
	{0xFF00FFFF, 150.0f, 50.0f, 0.0f},
	{0xFF00FFFF, 150.0f, 10.0f, 0.0f},
};
Vertex_C8888_P32 vertices_f32x[4] = {
	{0xFF00FFFF, norm32x(110), norm32y(100), 0},
	{0xFF00FFFF, norm32x(110), norm32y(60), 0},
	{0xFF00FFFF, norm32x(150), norm32y(100), 0},
	{0xFF00FFFF, norm32x(150), norm32y(60), 0},
};

Vertex_C8888_P32 vertices_rev[4] = {
	{0xFFFF00FF, 160.0f, 10.0f, 0.0f},
	{0xFFFF00FF, 160.0f, 50.0f, 0.0f},
	{0xFFFF00FF, 200.0f, 10.0f, 0.0f},
	{0xFFFF00FF, 200.0f, 50.0f, 0.0f},
};
Vertex_C8888_P32 vertices_revx[4] = {
	{0xFFFF00FF, norm32x(160), norm32y(60), 0},
	{0xFFFF00FF, norm32x(160), norm32y(100), 0},
	{0xFFFF00FF, norm32x(200), norm32y(60), 0},
	{0xFFFF00FF, norm32x(200), norm32y(100), 0},
};

Vertex_C8888_P32 vertices_incomp[1] = {
	{0xFFFFFFFF, 210.0f, 10.0f, 0.0f},
};
Vertex_C8888_P32 vertices_incompx[1] = {
	{0xFFFFFFFF, norm32x(210), norm32y(60), 0},
};

void draw() {
	startFrame();
	sceGuDisable(GU_TEXTURE);

	// Different formats - throughmode.
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_TRANSFORM_2D, 4, NULL, vertices_nofmt);
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_8BIT | GU_TRANSFORM_2D, 4, NULL, vertices_s8);
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, NULL, vertices_s16);
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 4, NULL, vertices_f32);

	// Different formats - transform.
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_TRANSFORM_3D, 4, NULL, vertices_nofmt);
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_8BIT | GU_TRANSFORM_3D, 4, NULL, vertices_s8x);
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 4, NULL, vertices_s16x);
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 4, NULL, vertices_f32x);

	// Wrong order (CCW.)
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 4, NULL, vertices_rev);
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 4, NULL, vertices_revx);

	// Incomplete (only one prim.)
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 1, NULL, vertices_incomp);
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 1, NULL, vertices_incompx);

	endFrame();
}

extern "C" int main(int argc, char *argv[]) {
	initDisplay();

	draw();

	emulatorEmitScreenshot();
	sceGuTerm();

	return 0;
}
