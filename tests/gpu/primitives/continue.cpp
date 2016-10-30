#include "shared.h"

#define GU_CONTINUE 7

Vertex_C8888_P16 vertices1[4] = {
	{0xFF0000FF, 10, 10, 0},
	{0xFF0000FF, 50, 10, 0},
	{0xFF0000FF, 50, 50, 0},
	{0xFF0000FF, 10, 50, 0},
};
Vertex_C8888_P16 vertices1x[4] = {
	{0xFF0000FF, norm16x(10), norm16y(60), 0},
	{0xFF0000FF, norm16x(50), norm16y(60), 0},
	{0xFF0000FF, norm16x(50), norm16y(100), 0},
	{0xFF0000FF, norm16x(10), norm16y(100), 0},
};

Vertex_C8888_P16 vertices2[4] = {
	{0xFF00FF00, 60, 10, 0},
	{0xFF00FF00, 100, 10, 0},
	{0xFF00FF00, 100, 50, 0},
	{0xFF00FF00, 60, 50, 0},
};
Vertex_C8888_P16 vertices2x[4] = {
	{0xFF00FF00, norm16x(60), norm16y(60), 0},
	{0xFF00FF00, norm16x(100), norm16y(60), 0},
	{0xFF00FF00, norm16x(100), norm16y(100), 0},
	{0xFF00FF00, norm16x(60), norm16y(100), 0},
};

Vertex_C8888_P16 vertices3[4] = {
	{0xFFFF0000, 110, 10, 0},
	{0xFFFF0000, 150, 10, 0},
	{0xFFFF0000, 150, 50, 0},
	{0xFFFF0000, 110, 50, 0},
};
Vertex_C8888_P16 vertices3x[4] = {
	{0xFFFF0000, norm16x(110), norm16y(60), 0},
	{0xFFFF0000, norm16x(150), norm16y(60), 0},
	{0xFFFF0000, norm16x(150), norm16y(100), 0},
	{0xFFFF0000, norm16x(110), norm16y(100), 0},
};

Vertex_C8888_P16 vertices4[4] = {
	{0xFF00FFFF, 160, 10, 0},
	{0xFF00FFFF, 200, 10, 0},
	{0xFF00FFFF, 200, 50, 0},
	{0xFF00FFFF, 160, 50, 0},
};
Vertex_C8888_P16 vertices4x[4] = {
	{0xFF00FFFF, norm16x(160), norm16y(60), 0},
	{0xFF00FFFF, norm16x(200), norm16y(60), 0},
	{0xFF00FFFF, norm16x(200), norm16y(100), 0},
	{0xFF00FFFF, norm16x(160), norm16y(100), 0},
};

Vertex_C8888_P16 vertices5[4] = {
	{0xFFFF00FF, 210, 10, 0},
	{0xFFFF00FF, 250, 10, 0},
	{0xFFFF00FF, 250, 50, 0},
	{0xFFFF00FF, 210, 50, 0},
};
Vertex_C8888_P16 vertices5x[4] = {
	{0xFFFF00FF, norm16x(210), norm16y(60), 0},
	{0xFFFF00FF, norm16x(250), norm16y(60), 0},
	{0xFFFF00FF, norm16x(250), norm16y(100), 0},
	{0xFFFF00FF, norm16x(210), norm16y(100), 0},
};

Vertex_C8888_P16 vertices6[4] = {
	{0xFFFFFF00, 260, 10, 0},
	{0xFFFFFF00, 300, 10, 0},
	{0xFFFFFF00, 300, 50, 0},
	{0xFFFFFF00, 260, 50, 0},
};
Vertex_C8888_P16 vertices6x[4] = {
	{0xFFFFFF00, norm16x(260), norm16y(60), 0},
	{0xFFFFFF00, norm16x(300), norm16y(60), 0},
	{0xFFFFFF00, norm16x(300), norm16y(100), 0},
	{0xFFFFFF00, norm16x(260), norm16y(100), 0},
};

Vertex_C8888_P16 vertices7[2] = {
	{0xFFFFFFFF, 310, 10, 0},
	{0xFFFFFFFF, 350, 50, 0},
};
Vertex_C8888_P16 vertices7x[2] = {
	{0xFFFFFFFF, norm16x(310), norm16y(60), 0},
	{0xFFFFFFFF, norm16x(350), norm16y(100), 0},
};

Vertex_C8888_P16 vertices8[4] = {
	{0xFF777777, 360, 10, 0},
	{0xFF777777, 400, 10, 0},
	{0xFF777777, 400, 50, 0},
	{0xFF777777, 360, 50, 0},
};
Vertex_C8888_P16 vertices8x[4] = {
	{0xFF777777, norm16x(360), norm16y(60), 0},
	{0xFF777777, norm16x(400), norm16y(60), 0},
	{0xFF777777, norm16x(400), norm16y(100), 0},
	{0xFF777777, norm16x(360), norm16y(100), 0},
};

void draw() {
	startFrame();
	sceGuDisable(GU_TEXTURE);

	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 1, NULL, vertices1);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 3, NULL, vertices1 + 1);
	sceGuDrawArray(GU_POINTS, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 1, NULL, vertices1x);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 3, NULL, vertices1x + 1);

	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 1, NULL, vertices2);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 3, NULL, vertices2 + 1);
	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 1, NULL, vertices2x);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 3, NULL, vertices2x + 1);

	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 1, NULL, vertices3);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 3, NULL, vertices3 + 1);
	sceGuDrawArray(GU_LINE_STRIP, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 1, NULL, vertices3x);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 3, NULL, vertices3x + 1);

	sceGuDrawArray(GU_TRIANGLES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 1, NULL, vertices4);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 3, NULL, vertices4 + 1);
	sceGuDrawArray(GU_TRIANGLES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 1, NULL, vertices4x);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 3, NULL, vertices4x + 1);

	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 1, NULL, vertices5);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 3, NULL, vertices5 + 1);
	sceGuDrawArray(GU_TRIANGLE_STRIP, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 1, NULL, vertices5x);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 3, NULL, vertices5x + 1);

	sceGuDrawArray(GU_TRIANGLE_FAN, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 1, NULL, vertices6);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 3, NULL, vertices6 + 1);
	sceGuDrawArray(GU_TRIANGLE_FAN, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 1, NULL, vertices6x);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 3, NULL, vertices6x + 1);

	sceGuDrawArray(GU_SPRITES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 1, NULL, vertices7);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 1, NULL, vertices7 + 1);
	sceGuDrawArray(GU_SPRITES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 1, NULL, vertices7x);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 1, NULL, vertices7x + 1);

	// Verify that it also works when auto-increasing the vertex pointer.
	sceGuDrawArray(GU_TRIANGLE_FAN, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 1, NULL, vertices8);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 3, NULL, NULL);
	sceGuDrawArray(GU_TRIANGLE_FAN, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 1, NULL, vertices8x);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_3D, 3, NULL, NULL);

	endFrame();
}

extern "C" int main(int argc, char *argv[]) {
	initDisplay();

	draw();

	emulatorEmitScreenshot();
	sceGuTerm();

	return 0;
}
