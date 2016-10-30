#include "shared.h"

u32 __attribute__((aligned(16))) list[262144];

GePtr fbp0 = 0;
GePtr dbp0 = fbp0 + 512 * 272 * sizeof(u32);

u32 __attribute__((aligned(16))) clutRedBlue[] = { 0xFFFF0000, 0xFF0000FF, 0xFFFF00FF };
u8 __attribute__((aligned(16))) imageData[2][16] = {
	{0, 1},
	{1, 2},
};

void initDisplay() { 
	sceGuInit();
	sceGuStart(GU_DIRECT, list);
	sceGuDrawBuffer(GU_PSM_8888, fbp0, 512);
	sceGuDispBuffer(480, 272, fbp0, 512);
	sceGuDepthBuffer(dbp0, 512);
	sceGuOffset(2048 - (480 / 2), 2048 - (272 / 2));
	sceGuViewport(2048, 2048, 480, 272);
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

	sceDisplaySetFrameBuf(sceGeEdramGetAddr(), 512, GU_PSM_8888, PSP_DISPLAY_SETBUF_IMMEDIATE);
	sceDisplaySetMode(0, 480, 272);
}

void startFrame() {
	sceGuStart(GU_DIRECT, list);
	sceGuClearColor(0);
	sceGuClear(GU_COLOR_BUFFER_BIT);
}

void endFrame() {
	sceGuFinish();
	sceGuSync(0, 0);

	sceDisplayWaitVblank();
}

void setSimpleTexture() {
	sceGuEnable(GU_TEXTURE_2D);
	sceGuTexMode(GU_PSM_T8, 0, 0, GU_FALSE);
	sceGuTexFilter(GU_NEAREST, GU_NEAREST);
	sceGuTexFunc(GU_TFX_DECAL, GU_TCC_RGB);
	sceGuClutMode(GU_PSM_8888, 0, 0xFF, 0);
	sceGuTexImage(0, 2, 2, 16, imageData);

	sceGuClutLoad(1, clutRedBlue);
}

Vertices::Vertices(u32 vtype, size_t size) {
	vtype_ = vtype;
	ptr_ = new s8[size];
	start_ = ptr_;
}

Vertices::~Vertices() {
	delete [] start_;
}

void Vertices::Weights(float *w) {
	int c = (vtype_ >> 14) & 7;
	int fmt = (vtype_ >> 9) & 3;

	Align(fmt);
	for (int i = 0; i < c; ++i) {
		Write(fmt, w[c]);
	}
}

void Vertices::Texcoord(float u, float v) {
	int fmt = (vtype_ >> 0) & 3;
	Align(fmt);
	Write(fmt, u);
	Write(fmt, v);
}

void Vertices::Color(u32 c) {
	int fmt = (vtype_ >> 2) & 7;
	Align(fmt);
	WriteCol(fmt, c);
}

void Vertices::Normal(float x, float y, float z) {
	int fmt = (vtype_ >> 5) & 3;
	Align(fmt);
	Write(fmt, x);
	Write(fmt, y);
	Write(fmt, z);
}

void Vertices::Pos(int x, int y, u16 z) {
	int fmt = (vtype_ >> 7) & 3;
	int through = (vtype_ >> 23) & 1;

	Align(fmt);
	if (through) {
		Write(fmt, x);
		Write(fmt, y);
		Write(fmt, (int)z);
	} else if (fmt == 1) {
		Write(fmt, norm8x(x));
		Write(fmt, norm8y(y));
		Write(fmt, (int)z);
	} else if (fmt == 2) {
		Write(fmt, norm16x(x));
		Write(fmt, norm16y(y));
		Write(fmt, (int)z);
	} else if (fmt == 3) {
		Write(fmt, norm32x(x));
		Write(fmt, norm32y(y));
		Write(fmt, (int)z);
	}
}

const void *Vertices::Ptr() {
	sceKernelDcacheWritebackRange(start_, Size());
	return start_;
}

u32 Vertices::Size() {
	return ptr_ - start_;
}

void Vertices::EndVert() {
	int fmts[] = {
		(vtype_ >> 0) & 3,
		(vtype_ >> 2) & 7,
		(vtype_ >> 5) & 3,
		(vtype_ >> 7) & 3,
		(vtype_ >> 9) & 3,
	};

	for (size_t i = 0; i < ARRAY_SIZE(fmts); ++i) {
		Align(fmts[i]);
	}
}

void Vertices::Align(int fmt) {
	// Color formats are last.
	static const int fmts[] = {1, 1, 2, 4, 2, 2, 2, 4};
	intptr_t pos = (intptr_t)ptr_;
	int fmtMask = fmts[fmt] - 1;
	if ((pos & fmtMask) != 0) {
		pos = (pos + fmtMask) & ~fmtMask;
		ptr_ = (s8 *)pos;
	}
}

void Vertices::Write(int fmt, int v) {
	switch (fmt) {
	case 0:
		// Write nothing.
		break;
	case 1:
		*ptr_++ = (s8)v;
		break;
	case 2:
		*ptr16_++ = (s16)v;
		break;
	case 3:
		*ptrf_++ = (float)v;
		break;
	}
}

void Vertices::Write(int fmt, float v) {
	switch (fmt) {
	case 0:
		// Write nothing.
		break;
	case 1:
		*ptr_++ = (s8)(int)v;
		break;
	case 2:
		*ptr16_++ = (s16)(int)v;
		break;
	case 3:
		*ptrf_++ = v;
		break;
	}
}

void Vertices::WriteCol(int fmt, u32 v) {
	switch (fmt) {
	case 0:
		// Write nothing.
		break;
	case 4:
		*ptr16_++ = To565(v);
		break;
	case 5:
		*ptr16_++ = To5551(v);
		break;
	case 6:
		*ptr16_++ = To4444(v);
		break;
	case 7:
		*ptr32_++ = v;
		break;
	}
}

u16 Vertices::To565(u32 px) {
	return ((px >> 3) & 0x001F) | ((px >> 5) & 0x07E0) | ((px >> 8) & 0xF800);
}

u16 Vertices::To5551(u32 px) {
	return ((px >> 3) & 0x001F) | ((px >> 6) & 0x03E0) | ((px >> 9) & 0x7C00) | ((px >> 16) & 0x8000);
}

u16 Vertices::To4444(u32 px) {
	return ((px >> 4) & 0x000F) | ((px >> 8) & 0x00F0) | ((px >> 12) & 0x0F00) | ((px >> 16) & 0xF000);
}
