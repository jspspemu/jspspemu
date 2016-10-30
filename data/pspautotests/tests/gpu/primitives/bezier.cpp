#include "shared.h"

Vertex_C8888_P16 vertices1_simple[16] = {
	{0xFF0000FF, 10, 10, 0},
	{0xFF0000FF, 20, 10, 0},
	{0xFF0000FF, 30, 10, 0},
	{0xFF0000FF, 40, 10, 0},
	{0xFF0000FF, 10, 20, 0},
	{0xFF0000FF, 20, 20, 0},
	{0xFF0000FF, 30, 20, 0},
	{0xFF0000FF, 40, 20, 0},
	{0xFF0000FF, 10, 30, 0},
	{0xFF0000FF, 20, 30, 0},
	{0xFF0000FF, 30, 30, 0},
	{0xFF0000FF, 40, 30, 0},
	{0xFF0000FF, 10, 40, 0},
	{0xFF0000FF, 20, 40, 0},
	{0xFF0000FF, 30, 40, 0},
	{0xFF0000FF, 40, 40, 0},
};

Vertex_UV16_P16 vertices2_uvs[16] = {
	{0, 0, 50, 10, 0},
	{1, 0, 60, 10, 0},
	{2, 0, 70, 10, 0},
	{2, 0, 80, 10, 0},
	{0, 1, 50, 20, 0},
	{1, 1, 60, 20, 0},
	{2, 1, 70, 20, 0},
	{2, 1, 80, 20, 0},
	{0, 2, 50, 30, 0},
	{1, 2, 60, 30, 0},
	{2, 2, 70, 30, 0},
	{2, 2, 80, 30, 0},
	{0, 2, 50, 40, 0},
	{1, 2, 60, 40, 0},
	{2, 2, 70, 40, 0},
	{2, 2, 80, 40, 0},
};

Vertex_C8888_P16 vertices3_colors[16] = {
	{0xFF0000FF, 90, 10, 0},
	{0xFF0000FF, 100, 10, 0},
	{0xFF0000FF, 110, 10, 0},
	{0xFF0000FF, 120, 10, 0},
	{0xFFFF0000, 90, 20, 0},
	{0xFFFF0000, 100, 20, 0},
	{0xFFFF0000, 110, 20, 0},
	{0xFFFF0000, 120, 20, 0},
	{0xFFFF0000, 90, 30, 0},
	{0xFFFF0000, 100, 30, 0},
	{0xFFFF0000, 110, 30, 0},
	{0xFFFF0000, 120, 30, 0},
	{0xFFFF0000, 90, 40, 0},
	{0xFFFF0000, 100, 40, 0},
	{0xFFFF0000, 110, 40, 0},
	{0xFFFF0000, 120, 40, 0},
};

Vertex_C8888_P16 vertices4_pos[16] = {
	{0xFF0000FF, 130, 10, 0},
	{0xFF0000FF, 140, 10, 0},
	{0xFF0000FF, 150, 10, 0},
	{0xFF0000FF, 160, 10, 0},
	{0xFF00FFFF, 130, 30, 0},
	{0xFF00FFFF, 140, 30, 0},
	{0xFF00FFFF, 150, 30, 0},
	{0xFF00FFFF, 160, 30, 0},
	{0xFF00FFFF, 130, 35, 0},
	{0xFF00FFFF, 140, 35, 0},
	{0xFF00FFFF, 150, 35, 0},
	{0xFF00FFFF, 160, 35, 0},
	{0xFF00FFFF, 130, 40, 0},
	{0xFF00FFFF, 140, 40, 0},
	{0xFF00FFFF, 150, 40, 0},
	{0xFF00FFFF, 160, 40, 0},
};

Vertex_C8888_P16 vertices5_lines[16] = {
	{0xFF0000FF, 170, 10, 0},
	{0xFF0000FF, 180, 10, 0},
	{0xFF0000FF, 190, 10, 0},
	{0xFF0000FF, 200, 10, 0},
	{0xFF00FFFF, 170, 30, 0},
	{0xFF00FFFF, 180, 30, 0},
	{0xFF00FFFF, 190, 30, 0},
	{0xFF00FFFF, 200, 30, 0},
	{0xFF00FFFF, 170, 35, 0},
	{0xFF00FFFF, 180, 35, 0},
	{0xFF00FFFF, 190, 35, 0},
	{0xFF00FFFF, 200, 35, 0},
	{0xFF00FFFF, 170, 40, 0},
	{0xFF00FFFF, 180, 40, 0},
	{0xFF00FFFF, 190, 40, 0},
	{0xFF00FFFF, 200, 40, 0},
};

Vertex_C8888_P16 vertices6_points[16] = {
	{0xFF0000FF, 210, 10, 0},
	{0xFF0000FF, 220, 10, 0},
	{0xFF0000FF, 230, 10, 0},
	{0xFF0000FF, 240, 10, 0},
	{0xFF00FFFF, 210, 30, 0},
	{0xFF00FFFF, 220, 30, 0},
	{0xFF00FFFF, 230, 30, 0},
	{0xFF00FFFF, 240, 30, 0},
	{0xFF00FFFF, 210, 35, 0},
	{0xFF00FFFF, 220, 35, 0},
	{0xFF00FFFF, 230, 35, 0},
	{0xFF00FFFF, 240, 35, 0},
	{0xFF00FFFF, 210, 40, 0},
	{0xFF00FFFF, 220, 40, 0},
	{0xFF00FFFF, 230, 40, 0},
	{0xFF00FFFF, 240, 40, 0},
};

Vertex_C8888_P16 vertices7_prim3[16] = {
	{0xFF0000FF, 250, 10, 0},
	{0xFF0000FF, 260, 10, 0},
	{0xFF0000FF, 270, 10, 0},
	{0xFF0000FF, 280, 10, 0},
	{0xFF00FFFF, 250, 30, 0},
	{0xFF00FFFF, 260, 30, 0},
	{0xFF00FFFF, 270, 30, 0},
	{0xFF00FFFF, 280, 30, 0},
	{0xFF00FFFF, 250, 35, 0},
	{0xFF00FFFF, 260, 35, 0},
	{0xFF00FFFF, 270, 35, 0},
	{0xFF00FFFF, 280, 35, 0},
	{0xFF00FFFF, 250, 40, 0},
	{0xFF00FFFF, 260, 40, 0},
	{0xFF00FFFF, 270, 40, 0},
	{0xFF00FFFF, 280, 40, 0},
};

Vertex_C8888_P16 vertices8_prim4[16] = {
	{0xFF0000FF, 290, 10, 0},
	{0xFF0000FF, 300, 10, 0},
	{0xFF0000FF, 310, 10, 0},
	{0xFF0000FF, 320, 10, 0},
	{0xFF00FFFF, 290, 30, 0},
	{0xFF00FFFF, 300, 30, 0},
	{0xFF00FFFF, 310, 30, 0},
	{0xFF00FFFF, 320, 30, 0},
	{0xFF00FFFF, 290, 35, 0},
	{0xFF00FFFF, 300, 35, 0},
	{0xFF00FFFF, 310, 35, 0},
	{0xFF00FFFF, 320, 35, 0},
	{0xFF00FFFF, 290, 40, 0},
	{0xFF00FFFF, 300, 40, 0},
	{0xFF00FFFF, 310, 40, 0},
	{0xFF00FFFF, 320, 40, 0},
};

Vertex_C8888_P16 vertices9_div1[16] = {
	{0xFF0000FF, 330, 10, 0},
	{0xFF0000FF, 340, 10, 0},
	{0xFF0000FF, 350, 10, 0},
	{0xFF0000FF, 360, 10, 0},
	{0xFFFF00FF, 330, 30, 0},
	{0xFFFF00FF, 340, 30, 0},
	{0xFFFF00FF, 350, 30, 0},
	{0xFFFF00FF, 360, 30, 0},
	{0xFFFF00FF, 330, 35, 0},
	{0xFFFF00FF, 340, 35, 0},
	{0xFFFF00FF, 350, 35, 0},
	{0xFFFF00FF, 360, 35, 0},
	{0xFFFF00FF, 330, 40, 0},
	{0xFFFF00FF, 340, 40, 0},
	{0xFFFF00FF, 350, 40, 0},
	{0xFFFF00FF, 360, 40, 0},
};

Vertex_C8888_P16 vertices10_div1_2[16] = {
	{0xFF0000FF, 370, 10, 0},
	{0xFF0000FF, 380, 10, 0},
	{0xFF0000FF, 390, 10, 0},
	{0xFF0000FF, 400, 10, 0},
	{0xFFFF00FF, 370, 30, 0},
	{0xFFFF00FF, 380, 30, 0},
	{0xFFFF00FF, 390, 30, 0},
	{0xFFFF00FF, 400, 30, 0},
	{0xFFFF00FF, 370, 35, 0},
	{0xFFFF00FF, 380, 35, 0},
	{0xFFFF00FF, 390, 35, 0},
	{0xFFFF00FF, 400, 35, 0},
	{0xFFFF00FF, 370, 40, 0},
	{0xFFFF00FF, 380, 40, 0},
	{0xFFFF00FF, 390, 40, 0},
	{0xFFFF00FF, 400, 40, 0},
};

Vertex_C8888_P16 vertices11_div2[16] = {
	{0xFF0000FF, 410, 10, 0},
	{0xFF0000FF, 420, 10, 0},
	{0xFF0000FF, 430, 10, 0},
	{0xFF0000FF, 440, 10, 0},
	{0xFFFF00FF, 410, 30, 0},
	{0xFFFF00FF, 420, 30, 0},
	{0xFFFF00FF, 430, 30, 0},
	{0xFFFF00FF, 440, 30, 0},
	{0xFFFF00FF, 410, 35, 0},
	{0xFFFF00FF, 420, 35, 0},
	{0xFFFF00FF, 430, 35, 0},
	{0xFFFF00FF, 440, 35, 0},
	{0xFFFF00FF, 410, 40, 0},
	{0xFFFF00FF, 420, 40, 0},
	{0xFFFF00FF, 430, 40, 0},
	{0xFFFF00FF, 440, 40, 0},
};

Vertex_C8888_P16 vertices12_4x2[8] = {
	{0xFF0000FF, 10, 50, 0},
	{0xFF0000FF, 20, 50, 0},
	{0xFF0000FF, 30, 50, 0},
	{0xFF0000FF, 40, 50, 0},
	{0xFFFFFF00, 10, 80, 0},
	{0xFFFFFF00, 20, 80, 0},
	{0xFFFFFF00, 30, 80, 0},
	{0xFFFFFF00, 40, 80, 0},
};

Vertex_C8888_P16 vertices13_4x5[20] = {
	{0xFF0000FF, 50, 50, 0},
	{0xFF0000FF, 60, 50, 0},
	{0xFF0000FF, 70, 50, 0},
	{0xFF0000FF, 80, 50, 0},
	{0xFFFFFF00, 50, 55, 0},
	{0xFFFFFF00, 60, 55, 0},
	{0xFFFFFF00, 70, 55, 0},
	{0xFFFFFF00, 80, 55, 0},
	{0xFFFFFF00, 50, 60, 0},
	{0xFFFFFF00, 60, 60, 0},
	{0xFFFFFF00, 70, 60, 0},
	{0xFFFFFF00, 80, 60, 0},
	{0xFFFFFF00, 50, 70, 0},
	{0xFFFFFF00, 60, 70, 0},
	{0xFFFFFF00, 70, 70, 0},
	{0xFFFFFF00, 80, 70, 0},
	{0xFFFFFF00, 50, 80, 0},
	{0xFFFFFF00, 60, 80, 0},
	{0xFFFFFF00, 70, 80, 0},
	{0xFFFFFF00, 80, 80, 0},
};

Vertex_C8888_P16 vertices14_4x8[32] = {
	{0xFF0000FF, 90, 50, 0},
	{0xFF0000FF, 100, 50, 0},
	{0xFF0000FF, 110, 50, 0},
	{0xFF0000FF, 120, 50, 0},
	{0xFFFFFF00, 90, 54, 0},
	{0xFFFFFF00, 100, 54, 0},
	{0xFFFFFF00, 110, 54, 0},
	{0xFFFFFF00, 120, 54, 0},
	{0xFFFFFF00, 90, 58, 0},
	{0xFFFFFF00, 100, 58, 0},
	{0xFFFFFF00, 110, 58, 0},
	{0xFFFFFF00, 120, 58, 0},
	{0xFFFFFF00, 90, 62, 0},
	{0xFFFFFF00, 100, 62, 0},
	{0xFFFFFF00, 110, 62, 0},
	{0xFFFFFF00, 120, 62, 0},
	{0xFFFFFF00, 90, 66, 0},
	{0xFFFFFF00, 100, 66, 0},
	{0xFFFFFF00, 110, 66, 0},
	{0xFFFFFF00, 120, 66, 0},
	{0xFFFFFF00, 90, 70, 0},
	{0xFFFFFF00, 100, 70, 0},
	{0xFFFFFF00, 110, 70, 0},
	{0xFFFFFF00, 120, 70, 0},
	{0xFFFFFF00, 90, 75, 0},
	{0xFFFFFF00, 100, 75, 0},
	{0xFFFFFF00, 110, 75, 0},
	{0xFFFFFF00, 120, 75, 0},
	{0xFFFFFF00, 90, 80, 0},
	{0xFFFFFF00, 100, 80, 0},
	{0xFFFFFF00, 110, 80, 0},
	{0xFFFFFF00, 120, 80, 0},
};

Vertex_C8888_P16 vertices15_inds8[4] = {
	{0xFFFF0000, 130, 50, 0}, // TL
	{0xFFFF0000, 160, 50, 0}, // TR
	{0xFFFFFFFF, 130, 80, 0}, // BL
	{0xFFFFFFFF, 160, 80, 0}, // BR
};
u8 indices15_inds8[16] = {
	0, 0, 1, 1,
	0, 0, 1, 1,
	2, 2, 3, 3,
	2, 2, 3, 3,
};

Vertex_C8888_P16 vertices16_inds16[4] = {
	{0xFFFF0000, 170, 50, 0}, // TL
	{0xFFFF0000, 200, 50, 0}, // TR
	{0xFF777777, 170, 80, 0}, // BL
	{0xFF777777, 200, 80, 0}, // BR
};
u16 indices16_inds16[16] = {
	0, 0, 1, 1,
	0, 0, 1, 1,
	2, 2, 3, 3,
	2, 2, 3, 3,
};

Vertex_C8888_P16 vertices17_inds32[4] = {
	{0xFFFF0000, 210, 50, 0}, // TL
	{0xFFFF0000, 240, 50, 0}, // TR
	{0xFF007FFF, 210, 80, 0}, // BL
	{0xFF007FFF, 240, 80, 0}, // BR
};
u32 indices17_inds32[16] = {
	0, 0, 1, 1,
	0, 0, 1, 1,
	2, 2, 3, 3,
	2, 2, 3, 3,
};

Vertex_C8888_P16 vertices18_19_inc[32] = {
	{0xFF0000FF, 250, 50, 0},
	{0xFF0000FF, 260, 50, 0},
	{0xFF0000FF, 270, 50, 0},
	{0xFF0000FF, 280, 50, 0},
	{0xFF000077, 250, 60, 0},
	{0xFF000077, 260, 60, 0},
	{0xFF000077, 270, 60, 0},
	{0xFF000077, 280, 60, 0},
	{0xFF000077, 250, 70, 0},
	{0xFF000077, 260, 70, 0},
	{0xFF000077, 270, 70, 0},
	{0xFF000077, 280, 70, 0},
	{0xFF000077, 250, 80, 0},
	{0xFF000077, 260, 80, 0},
	{0xFF000077, 270, 80, 0},
	{0xFF000077, 280, 80, 0},
	
	{0xFF0000FF, 290, 50, 0},
	{0xFF0000FF, 300, 50, 0},
	{0xFF0000FF, 310, 50, 0},
	{0xFF0000FF, 320, 50, 0},
	{0xFF007700, 290, 60, 0},
	{0xFF007700, 300, 60, 0},
	{0xFF007700, 310, 60, 0},
	{0xFF007700, 320, 60, 0},
	{0xFF007700, 290, 70, 0},
	{0xFF007700, 300, 70, 0},
	{0xFF007700, 310, 70, 0},
	{0xFF007700, 320, 70, 0},
	{0xFF007700, 290, 80, 0},
	{0xFF007700, 300, 80, 0},
	{0xFF007700, 310, 80, 0},
	{0xFF007700, 320, 80, 0},
};

Vertex_C8888_P16 vertices20_21_ind_inc[8] = {
	{0xFFFF0000, 330, 50, 0}, // TL
	{0xFFFF0000, 360, 50, 0}, // TR
	{0xFF770000, 330, 80, 0}, // BL
	{0xFF770000, 360, 80, 0}, // BR

	{0xFFFF0000, 370, 50, 0}, // TL
	{0xFFFF0000, 400, 50, 0}, // TR
	{0xFF777700, 370, 80, 0}, // BL
	{0xFF777700, 400, 80, 0}, // BR
};
u8 indices20_21_ind_inc[32] = {
	0, 0, 1, 1,
	0, 0, 1, 1,
	2, 2, 3, 3,
	2, 2, 3, 3,

	4, 4, 5, 5,
	4, 4, 5, 5,
	6, 6, 7, 7,
	6, 6, 7, 7,
};

u32 __attribute__((aligned(16))) clutRGBY[] = { 0xFF0000FF, 0xFF00FF00, 0xFFFF0000, 0xFF00FFFF };

u8 __attribute__((aligned(16))) imageDataPatch[4][16] = {
	{0, 0, 0, 0},
	{0, 1, 1, 0},
	{0, 1, 1, 0},
	{0, 0, 0, 0},
};

void draw() {
	startFrame();

	sceGuTexMode(GU_PSM_T8, 0, 0, GU_FALSE);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	sceGuTexFunc(GU_TFX_DECAL, GU_TCC_RGB);
	sceGuClutMode(GU_PSM_8888, 0, 0xFF, 0);
	sceGuTexImage(0, 2, 2, 16, imageDataPatch);

	sceGuClutLoad(1, clutRGBY);

	sceGuPatchPrim(GU_TRIANGLE_STRIP);
	sceGuPatchDivide(16, 16);
	sceGuPatchFrontFace(GU_CW);

	sceGuDisable(GU_TEXTURE_2D);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices1_simple);

	// Let's see how UVs are interpolated.  Simple bilinear will fail here.
	sceGuEnable(GU_TEXTURE_2D);
	sceGuDrawBezier(GU_TEXTURE_16BIT | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices2_uvs);

	sceGuDisable(GU_TEXTURE_2D);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices3_colors);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices4_pos);

	// Other primitive types.
	sceGuSendCommandi(55, 1);
	sceGuPatchDivide(4, 4);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices5_lines);

	sceGuSendCommandi(55, 2);
	sceGuPatchDivide(4, 4);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices6_points);

	sceGuSendCommandi(55, 3);
	sceGuPatchDivide(4, 4);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices7_prim3);

	sceGuSendCommandi(55, 4);
	sceGuPatchDivide(4, 4);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices8_prim4);

	sceGuPatchPrim(GU_TRIANGLE_STRIP);
	sceGuShadeModel(GU_FLAT);
	sceGuPatchDivide(1, 1);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices9_div1);
	sceGuPatchDivide(1, 2);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices10_div1_2);
	sceGuPatchDivide(2, 2);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices11_div2);

	sceGuPatchDivide(4, 4);
	sceGuShadeModel(GU_SMOOTH);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 2, NULL, vertices12_4x2);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 5, NULL, vertices13_4x5);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 8, NULL, vertices14_4x8);

	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 4, 4, indices15_inds8, vertices15_inds8);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_16BIT, 4, 4, indices16_inds16, vertices16_inds16);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_BITS, 4, 4, indices17_inds32, vertices17_inds32);

	// Does the vertex pointer increment?
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, vertices18_19_inc);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 4, 4, NULL, NULL);
	// And indices?
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 4, 4, indices20_21_ind_inc, vertices20_21_ind_inc);
	sceGuDrawBezier(GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D | GU_INDEX_8BIT, 4, 4, NULL, NULL);

	endFrame();
}

extern "C" int main(int argc, char *argv[]) {
	initDisplay();

	draw();

	emulatorEmitScreenshot();
	sceGuTerm();

	return 0;
}
