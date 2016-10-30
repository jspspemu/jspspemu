#include "shared.h"

Vertex_C8888 vertices_nofmt[2] = {
	{0xFF0000FF},
	{0xFF0000FF},
};

Vertex_C8888_P8 vertices_s8[2] = {
	{0xFF00FF00, 10, 10, 0},
	{0xFF00FF00, 12, 10, 0},
};
Vertex_C8888_P8 vertices_s8x[2] = {
	{0xFF00FF00, norm8x(10), norm8y(20), 0},
	{0xFF00FF00, norm8x(12), norm8y(20), 0},
};

Vertex_C8888_P16 vertices_s16[2] = {
	{0xFFFF0000, 14, 10, 0},
	{0xFFFF0000, 16, 10, 0},
};
Vertex_C8888_P16 vertices_s16x[2] = {
	{0xFFFF0000, norm16x(14), norm16y(20), 0},
	{0xFFFF0000, norm16x(16), norm16y(20), 0},
};

Vertex_C8888_P32 vertices_f32[2] = {
	{0xFF00FFFF, 18.0f, 10.0f, 0.0f},
	{0xFF00FFFF, 20.0f, 10.0f, 0.0f},
};
Vertex_C8888_P32 vertices_f32x[2] = {
	{0xFF00FFFF, norm32x(18), norm32y(20), 0},
	{0xFF00FFFF, norm32x(20), norm32y(20), 0},
};

void draw() {
	startFrame();
	sceGuDisable(GU_TEXTURE);

	// Different formats - throughmode.
	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_TRANSFORM_2D, 2, NULL, vertices_nofmt);
	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_VERTEX_8BIT | GU_TRANSFORM_2D, 2, NULL, vertices_s8);
	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 2, NULL, vertices_s16);
	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 2, NULL, vertices_f32);

	// Different formats - transform.
	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_TRANSFORM_3D, 2, NULL, vertices_nofmt);
	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_VERTEX_8BIT | GU_TRANSFORM_3D, 2, NULL, vertices_s8x);
	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 2, NULL, vertices_s16x);
	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_3D, 2, NULL, vertices_f32x);

	endFrame();
}

extern "C" int main(int argc, char *argv[]) {
	initDisplay();

	draw();

	emulatorEmitScreenshot();
	sceGuTerm();

	return 0;
}
