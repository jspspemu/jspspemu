#include "shared.h"

Vertex_C8888 vertices_nofmt[3] = {
	{0xFF0000FF},
	{0xFF0000FF},
	{0xFF0000FF},
};

Vertex_C8888_P8 vertices_s8[3] = {
	{0xFF00FF00, 10, 10, 0},
	{0xFF00FF00, 12, 10, 0},
	{0xFF00FF00, 12, 12, 0},
};
Vertex_C8888_P8 vertices_s8x[3] = {
	{0xFF00FF00, norm8x(10), norm8y(20), 0},
	{0xFF00FF00, norm8x(12), norm8y(20), 0},
	{0xFF00FF00, norm8x(12), norm8y(22), 0},
};

Vertex_C8888_P16 vertices_s16[3] = {
	{0xFFFF0000, 14, 10, 0},
	{0xFFFF0000, 16, 10, 0},
	{0xFFFF0000, 16, 12, 0},
};
Vertex_C8888_P16 vertices_s16x[3] = {
	{0xFFFF0000, norm16x(14), norm16y(20), 0},
	{0xFFFF0000, norm16x(16), norm16y(20), 0},
	{0xFFFF0000, norm16x(16), norm16y(22), 0},
};

Vertex_C8888_P32 vertices_f32[3] = {
	{0xFF00FFFF, 18.0f, 10.0f, 0.0f},
	{0xFF00FFFF, 20.0f, 10.0f, 0.0f},
	{0xFF00FFFF, 20.0f, 12.0f, 0.0f},
};
Vertex_C8888_P32 vertices_f32x[3] = {
	{0xFF00FFFF, norm32x(18), norm32y(20), 0},
	{0xFF00FFFF, norm32x(20), norm32y(20), 0},
	{0xFF00FFFF, norm32x(20), norm32y(22), 0},
};

Vertex_C8888_P32 vertices_rev[3] = {
	{0xFFFF00FF, 24.0f, 12.0f, 0.0f},
	{0xFFFF00FF, 24.0f, 10.0f, 0.0f},
	{0xFFFF00FF, 22.0f, 10.0f, 0.0f},
};
Vertex_C8888_P32 vertices_revx[3] = {
	{0xFFFF00FF, norm32x(24), norm32y(22), 0},
	{0xFFFF00FF, norm32x(24), norm32y(20), 0},
	{0xFFFF00FF, norm32x(22), norm32y(20), 0},
};

Vertex_C8888_P32 vertices_incomp[1] = {
	{0xFFFFFFFF, 26.0f, 10.0f, 0.0f},
};
Vertex_C8888_P32 vertices_incompx[1] = {
	{0xFFFFFFFF, norm32x(26), norm32y(20), 0},
};

void draw() {
	startFrame();
	sceGuDisable(GU_TEXTURE);

	// Different formats - throughmode.
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_TRANSFORM_2D, 3, NULL, vertices_nofmt);
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_8BIT | GU_TRANSFORM_2D, 3, NULL, vertices_s8);
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 3, NULL, vertices_s16);
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 3, NULL, vertices_f32);

	// Different formats - transform.
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_TRANSFORM_3D, 3, NULL, vertices_nofmt);
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_8BIT | GU_TRANSFORM_3D, 3, NULL, vertices_s8x);
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 3, NULL, vertices_s16x);
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 3, NULL, vertices_f32x);

	// Reversed - right to left.
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 3, NULL, vertices_rev);
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 3, NULL, vertices_revx);

	// Incomplete (only one prim.)
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 1, NULL, vertices_incomp);
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 1, NULL, vertices_incompx);

	endFrame();
}

extern "C" int main(int argc, char *argv[]) {
	initDisplay();

	draw();

	emulatorEmitScreenshot();
	sceGuTerm();

	return 0;
}
