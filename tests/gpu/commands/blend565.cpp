#include <common.h>
#include <pspdisplay.h>
#include <pspgu.h>
#include <pspkernel.h>

extern "C" int sceDmacMemcpy(void *dest, const void *source, unsigned int size);

const int GU_DOUBLE_SRC_ALPHA = 6;
const int GU_ONE_MINUS_DOUBLE_SRC_ALPHA = 7;
const int GU_DOUBLE_DST_ALPHA = 8;
const int GU_ONE_MINUS_DOUBLE_DST_ALPHA = 9;

typedef struct {
	u32 color;
	float x, y, z;
} VertexColorF32;

u8 *fbp0 = 0;
u8 *dbp0 = fbp0 + 512 * 272 * sizeof(u32);

static u16 copybuf[512 * 272];
unsigned int __attribute__((aligned(16))) list[262144];
__attribute__((aligned(16))) VertexColorF32 vertices_f32[256];

inline VertexColorF32 makeVertex32(u32 c, float x, float y, float z) {
	VertexColorF32 v;
	v.color = c;
	v.x = x;
	v.y = y;
	v.z = z;
	return v;
}

void displayBuffer(const char *reason) {
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(copybuf, sceGeEdramGetAddr(), sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	const u16 *buf = copybuf;

	checkpoint("%s: COLOR=%04x", reason, buf[0]);

	// Reset.
	memset(copybuf, 0x44, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(sceGeEdramGetAddr(), copybuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
}

void drawBoxCommands(u32 c) {
	vertices_f32[0] = makeVertex32(c, -1.0, -1.0, 0.0);
	vertices_f32[1] = makeVertex32(c, 1.0, 1.0, 0.0);

	// Clearing cache is fun.  Let's do it all the time.
	sceKernelDcacheWritebackInvalidateAll();
	sceGuDrawArray(GU_SPRITES, GU_COLOR_8888 | GU_VERTEX_32BITF | GU_TRANSFORM_2D, 2, NULL, vertices_f32);
}

void init() { 
	sceGuInit();
	sceGuStart(GU_DIRECT, list);
	sceGuDrawBuffer(GU_PSM_5650, fbp0, 512);
	sceGuDispBuffer(480, 272, fbp0, 512);
	sceGuDepthBuffer(dbp0, 512);
	sceGuOffset(2048 - (240 / 2), 2048 - (136 / 2));
	sceGuViewport(2048, 2048, 240, 136);
	sceGuDepthRange(65535, 0);
	sceGuDepthMask(0);
	sceGuScissor(0, 0, 480, 272);
	sceGuEnable(GU_SCISSOR_TEST);
	sceGuFrontFace(GU_CW);
	sceGuShadeModel(GU_SMOOTH);
	sceGuDisable(GU_TEXTURE_2D);

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

	memset(copybuf, 0x44, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(sceGeEdramGetAddr(), copybuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();

	displayBuffer("Initial");
}

void testBlendFunc(const char *title, u16 prev, u32 c, int op, int src, int dst, u32 fixa, u32 fixb) {
	for (size_t i = 0; i < ARRAY_SIZE(copybuf); ++i) {
		copybuf[i] = prev;
	}
	sceKernelDcacheWritebackInvalidateAll();
	sceDmacMemcpy(sceGeEdramGetAddr(), copybuf, sizeof(copybuf));
	sceKernelDcacheWritebackInvalidateAll();

	sceGuStart(GU_DIRECT, list);

	sceGuEnable(GU_BLEND);
	sceGuBlendFunc(op, src, dst, fixa, fixb);

	sceGuEnable(GU_STENCIL_TEST);
	sceGuStencilFunc(GU_ALWAYS, 0xAA, 0xFF);
	sceGuStencilOp(GU_REPLACE, GU_REPLACE, GU_REPLACE);

	drawBoxCommands(c);

	sceGuFinish();
	sceGuSync(GU_SYNC_WAIT, GU_SYNC_WHAT_DONE);

	displayBuffer(title);

	sceGuDisable(GU_BLEND);
}

extern "C" int main(int argc, char *argv[]) {
	init();

	schedf("framebuf: %08x\n", sceDisplaySetFrameBuf(sceGeEdramGetAddr(), 512, GU_PSM_5650, PSP_DISPLAY_SETBUF_IMMEDIATE));
	schedf("dispmode: %08x\n", sceDisplaySetMode(0, 480, 272));

	checkpointNext("Common:");
	testBlendFunc("  One + Zero", 0x4444, 0xEEDDCCBB, GU_ADD, GU_FIX, GU_FIX, 0xFFFFFFFF, 0x00000000);
	testBlendFunc("  Zero + One", 0x4444, 0xEEDDCCBB, GU_ADD, GU_FIX, GU_FIX, 0x00000000, 0xFFFFFFFF);
	testBlendFunc("  Alpha + Inverse alpha", 0x4444, 0xEEDDCCBB, GU_ADD, GU_SRC_ALPHA, GU_ONE_MINUS_SRC_ALPHA, 0x80808080, 0x80808080);

	checkpointNext("Doubling:");
	testBlendFunc("  Double source alpha + Zero 0x80808080", 0x4444, 0x80808080, GU_ADD, GU_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double source alpha + Zero 0x80909090", 0x4444, 0x80909090, GU_ADD, GU_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double source alpha + Zero 0x90808080", 0x4444, 0x90808080, GU_ADD, GU_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double source alpha + Zero 0xFF707070", 0x4444, 0xFF707070, GU_ADD, GU_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double source alpha + Zero 0xFF909090", 0x4444, 0xFF909090, GU_ADD, GU_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double source alpha + Zero 0x7FFFFFFF", 0x4444, 0x7FFFFFFF, GU_ADD, GU_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double source alpha + Zero 0xFF7F7F7F", 0x4444, 0xFF7F7F7F, GU_ADD, GU_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double source alpha + Zero 0x80808080", 0x4444, 0x80808080, GU_ADD, GU_ONE_MINUS_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double source alpha + Zero 0x80909090", 0x4444, 0x80909090, GU_ADD, GU_ONE_MINUS_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double source alpha + Zero 0x90808080", 0x4444, 0x90808080, GU_ADD, GU_ONE_MINUS_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double source alpha + Zero 0x40808080", 0x4444, 0x40808080, GU_ADD, GU_ONE_MINUS_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double source alpha + Zero 0xFF1188FF", 0x4444, 0xFF1188FF, GU_ADD, GU_ONE_MINUS_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double source alpha + Zero 0x7FFFFFFF", 0x4444, 0x7FFFFFFF, GU_ADD, GU_ONE_MINUS_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double source alpha + Zero 0xFF7F7F7F", 0x4444, 0xFF7F7F7F, GU_ADD, GU_ONE_MINUS_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double dest alpha + Zero 0x80808080", 0x4444, 0x80808080, GU_ADD, GU_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double dest alpha + Zero 0x80808080", 0x9444, 0x80808080, GU_ADD, GU_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double dest alpha + Zero 0x80909090", 0x4444, 0x80909090, GU_ADD, GU_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double dest alpha + Zero 0x70707070", 0xF444, 0x70707070, GU_ADD, GU_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double dest alpha + Zero 0x90909090", 0xF444, 0x90909090, GU_ADD, GU_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double dest alpha + Zero 0xFFFFFFFF", 0x7444, 0xFFFFFFFF, GU_ADD, GU_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double dest alpha + Zero 0x7F7F7F7F", 0xF444, 0x7F7F7F7F, GU_ADD, GU_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double dest alpha + Zero 0x80808080", 0x4444, 0x80808080, GU_ADD, GU_ONE_MINUS_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double dest alpha + Zero 0x80909090", 0x9444, 0x80909090, GU_ADD, GU_ONE_MINUS_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double dest alpha + Zero 0x80808080", 0x4444, 0x80808080, GU_ADD, GU_ONE_MINUS_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double dest alpha + Zero 0x80808080", 0xF444, 0x80808080, GU_ADD, GU_ONE_MINUS_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double dest alpha + Zero 0xFF1188FF", 0xF444, 0xFF1188FF, GU_ADD, GU_ONE_MINUS_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double dest alpha + Zero 0xFFFFFFFF", 0x7444, 0xFFFFFFFF, GU_ADD, GU_ONE_MINUS_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double dest alpha + Zero 0x7F7F7F7F", 0xF444, 0x7F7F7F7F, GU_ADD, GU_ONE_MINUS_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);

	checkpointNext("Factors:");
	testBlendFunc("  Dest color + Zero", 0x5444, 0x90808080, GU_ADD, GU_DST_COLOR, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse dest color + Zero", 0x5444, 0x90808080, GU_ADD, GU_ONE_MINUS_DST_COLOR, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Src alpha + Zero", 0x5444, 0x90808080, GU_ADD, GU_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse src alpha + Zero", 0x5444, 0x90808080, GU_ADD, GU_ONE_MINUS_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Dest alpha + Zero", 0x5444, 0x90808080, GU_ADD, GU_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse dest alpha + Zero", 0x5444, 0x90808080, GU_ADD, GU_ONE_MINUS_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double src alpha + Zero", 0x5444, 0x90808080, GU_ADD, GU_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double src alpha + Zero", 0x5444, 0x90808080, GU_ADD, GU_ONE_MINUS_DOUBLE_SRC_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Double dest alpha + Zero", 0x5444, 0x90808080, GU_ADD, GU_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Inverse double dest alpha + Zero", 0x5444, 0x90808080, GU_ADD, GU_ONE_MINUS_DOUBLE_DST_ALPHA, GU_FIX, 0x00000000, 0x00000000);
	testBlendFunc("  Fix + Zero", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_FIX, 0x90808080, 0x00000000);

	testBlendFunc("  Zero + Src color", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_SRC_COLOR, 0x00000000, 0x00000000);
	testBlendFunc("  Zero + Inverse dest color", 0x5440, 0x90808080, GU_ADD, GU_FIX, GU_ONE_MINUS_SRC_COLOR, 0x00000000, 0x00000000);
	testBlendFunc("  Zero + Src alpha", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_SRC_ALPHA, 0x00000000, 0x00000000);
	testBlendFunc("  Zero + Inverse src alpha", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_ONE_MINUS_SRC_ALPHA, 0x00000000, 0x00000000);
	testBlendFunc("  Zero + Dest alpha", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_DST_ALPHA, 0x00000000, 0x00000000);
	testBlendFunc("  Zero + Inverse dest alpha", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_ONE_MINUS_DST_ALPHA, 0x00000000, 0x00000000);
	testBlendFunc("  Zero + Double src alpha", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_DOUBLE_SRC_ALPHA, 0x00000000, 0x00000000);
	testBlendFunc("  Zero + Inverse double src alpha", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_ONE_MINUS_DOUBLE_SRC_ALPHA, 0x00000000, 0x00000000);
	testBlendFunc("  Zero + Double dest alpha", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_DOUBLE_DST_ALPHA, 0x00000000, 0x00000000);
	testBlendFunc("  Zero + Inverse double dest alpha", 0x5444, 0x90808080, GU_ADD, GU_FIX, GU_ONE_MINUS_DOUBLE_DST_ALPHA, 0x00000000, 0x00000000);

	checkpointNext("Add:");
	testBlendFunc("  F0 + 0F", 0xFFFF, 0xFFFFFFFF, GU_ADD, GU_FIX, GU_FIX, 0xF0F0F0F0, 0x0F0F0F0F);
	testBlendFunc("  0F + F0", 0xFFFF, 0xFFFFFFFF, GU_ADD, GU_FIX, GU_FIX, 0x0F0F0F0F, 0xF0F0F0F0);

	checkpointNext("Subtract:");
	testBlendFunc("  F0 - 0F", 0xFFFF, 0xFFFFFFFF, GU_SUBTRACT, GU_FIX, GU_FIX, 0xF0F0F0F0, 0x0F0F0F0F);
	testBlendFunc("  0F - F0", 0xFFFF, 0xFFFFFFFF, GU_SUBTRACT, GU_FIX, GU_FIX, 0x0F0F0F0F, 0xF0F0F0F0);

	checkpointNext("Reverse subtract:");
	testBlendFunc("  Reverse F0 - 0F", 0xFFFF, 0xFFFFFFFF, GU_REVERSE_SUBTRACT, GU_FIX, GU_FIX, 0xF0F0F0F0, 0x0F0F0F0F);
	testBlendFunc("  Reverse 0F - F0", 0xFFFF, 0xFFFFFFFF, GU_REVERSE_SUBTRACT, GU_FIX, GU_FIX, 0x0F0F0F0F, 0xF0F0F0F0);

	checkpointNext("Min:");
	testBlendFunc("  Min CC, 33", 0xCCCC, 0x33333333, GU_MIN, GU_FIX, GU_FIX, 0x80808080, 0x80808080);
	testBlendFunc("  Min 33, CC", 0x3333, 0xCCCCCCCC, GU_MIN, GU_FIX, GU_FIX, 0x80808080, 0x80808080);

	checkpointNext("Max:");
	testBlendFunc("  Max CC, 33", 0xCCCC, 0x33333333, GU_MAX, GU_FIX, GU_FIX, 0x80808080, 0x80808080);
	testBlendFunc("  Max 33, CC", 0x3333, 0xCCCCCCCC, GU_MAX, GU_FIX, GU_FIX, 0x80808080, 0x80808080);

	checkpointNext("Absolute difference:");
	testBlendFunc("  Abs CC - 33", 0xCCCC, 0x33333333, GU_ABS, GU_FIX, GU_FIX, 0x80808080, 0x80808080);
	testBlendFunc("  Abs 33 - CC", 0x3333, 0xCCCCCCCC, GU_ABS, GU_FIX, GU_FIX, 0x80808080, 0x80808080);

	sceGuTerm();

	return 0;
}
