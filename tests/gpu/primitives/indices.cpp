#include "shared.h"

#define GU_CONTINUE 7

Vertex_C8888_P16 vertices1[4] = {
	{0xFF0000FF, 10, 10, 0},
	{0xFF0000FF, 50, 10, 0},
	{0xFF0000FF, 50, 50, 0},
	{0xFF0000FF, 10, 50, 0},
};

Vertex_C8888_P16 vertices2[4] = {
	{0xFF00FF00, 60, 10, 0},
	{0xFF00FF00, 100, 10, 0},
	{0xFF00FF00, 100, 50, 0},
	{0xFF00FF00, 60, 50, 0},
};

Vertex_C8888_P16 vertices3[4] = {
	{0xFFFF0000, 110, 10, 0},
	{0xFFFF0000, 150, 10, 0},
	{0xFFFF0000, 150, 50, 0},
	{0xFFFF0000, 110, 50, 0},
};

Vertex_C8888_P16 vertices4[4] = {
	{0xFF00FFFF, 160, 10, 0},
	{0xFF00FFFF, 200, 10, 0},
	{0xFF00FFFF, 200, 50, 0},
	{0xFF00FFFF, 160, 50, 0},
};

Vertex_C8888_P16 vertices5[4] = {
	{0xFFFF00FF, 210, 10, 0},
	{0xFFFF00FF, 250, 10, 0},
	{0xFFFF00FF, 250, 50, 0},
	{0xFFFF00FF, 210, 50, 0},
};

Vertex_C8888_P16 vertices6[4] = {
	{0xFFFFFF00, 260, 10, 0},
	{0xFFFFFF00, 300, 10, 0},
	{0xFFFFFF00, 300, 50, 0},
	{0xFFFFFF00, 260, 50, 0},
};

Vertex_C8888_P16 vertices7[4] = {
	{0xFFFFFFFF, 310, 10, 0},
	{0xFF0000FF, 320, 20, 0},
	{0xFF0000FF, 320, 20, 0},
	{0xFF0000FF, 320, 20, 0},
};

Vertex_C8888_P32 vertices8[4] = {
	{0xFF0000FF, 320.0f, 20.0f, 0.0f},
	{0xFFFFFFFF, 350.0f, 10.0f, 0.0f},
	{0xFF777777, 350.0f, 50.0f, 0.0f},
	{0xFF777777, 310.0f, 50.0f, 0.0f},
};

Vertex_C8888_P16 vertices_big[257] = {};

u8 indices8[8] = {0, 1, 2, 3, 1, 2, 0, 3};
u16 indices16[8] = {0, 1, 2, 3, 1, 2, 0, 3};
u32 indices32[8] = {0, 1, 2, 3, 1, 2, 0, 3};

u8 indices_big[8] = {0, 255};

void draw() {
	startFrame();
	sceGuDisable(GU_TEXTURE);

	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 8, indices8, vertices1);

	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_16BIT, 8, indices16, vertices2);

	// What happens if we use an invalid format?  Apparently it is valid?
	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_BITS, 8, indices32, vertices3);

	// Can one "continue" with indexes?  The answer is yes.
	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 1, indices8, vertices4);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 7, indices8 + 1, NULL);

	// Let's verify that it's unsigned.
	vertices_big[0] = vertices5[1];
	vertices_big[1] = vertices5[0];
	vertices_big[256] = vertices5[3];
	sceKernelDcacheWritebackInvalidateRange(vertices_big, sizeof(vertices_big));
	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 2, indices_big, vertices_big + 1);

	// Verify that the vertex pointer is not increased by indexing.
	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 2, indices8, vertices6);
	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 2, indices8 + 2, NULL);
	// And also that the index pointer is increased.
	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 2, NULL, NULL);
	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 2, NULL, NULL);

	// What happens when we mix index types using GU_CONTINUE?
	sceGuDrawArray(GU_LINES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 1, indices8, vertices7);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D | GU_INDEX_16BIT, 2, indices16 + 1, vertices8);
	sceGuDrawArray(GU_CONTINUE, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D | GU_INDEX_BITS, 1, indices32 + 3, vertices8);

	endFrame();
}

extern "C" int main(int argc, char *argv[]) {
	initDisplay();

	draw();

	emulatorEmitScreenshot();
	sceGuTerm();

	return 0;
}
