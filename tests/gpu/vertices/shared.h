#pragma once

#include <common.h>
#include <pspdisplay.h>
#include <pspgu.h>
#include <pspkernel.h>

extern "C" int sceDmacMemcpy(void *dest, const void *source, unsigned int size);

#define BUF_WIDTH 512
#define SCR_WIDTH 480
#define SCR_HEIGHT 272

extern u32 __attribute__((aligned(16))) list[262144];

typedef u8 *GePtr;
extern GePtr fbp0;
extern GePtr dbp0;

struct Vertices {
	enum {
		STANDARD_SIZE = 0x1000,
	};

	Vertices(u32 vtype, size_t size = STANDARD_SIZE);
	~Vertices();

	void Weights(float *w);
	void Texcoord(float u, float v);
	void Color(u32 c);
	void Normal(float x, float y, float z);
	void Pos(int x, int y, u16 z);
	void EndVert();

	void TP(float u, float v, int x, int y, u16 z) {
		Texcoord(u, v);
		Pos(x, y, z);
		EndVert();
	}
	void CP(u32 c, int x, int y, u16 z) {
		Color(c);
		Pos(x, y, z);
		EndVert();
	}
	void P(int x, int y, u16 z) {
		Pos(x, y, z);
		EndVert();
	}

	const void *Ptr();
	u32 Size();
	u32 VType() {
		return vtype_;
	}

	void Reset() {
		ptr_ = start_;
	}

protected:
	void Align(int fmt);
	void Write(int fmt, int v);
	void Write(int fmt, float v);
	void WriteCol(int fmt, u32 v);

	u16 To565(u32);
	u16 To5551(u32);
	u16 To4444(u32);

	u32 vtype_;
	union {
		s8 *ptr_;
		s16 *ptr16_;
		s32 *ptr32_;
		float *ptrf_;
	};
	s8 *start_;
};

inline s8 norm8x(int x) { return x * 255 / SCR_WIDTH - 128; }
inline s8 norm8y(int x) { return 128 - x * 255 / SCR_HEIGHT; }
inline s16 norm16x(int x) { return x * 65536 / SCR_WIDTH - 32768; }
inline s16 norm16y(int x) { return 32768 - x * 65536 / SCR_HEIGHT; }
inline float norm32x(int x) { return 2.0f * (float)x / SCR_WIDTH - 1.0f; }
inline float norm32y(int y) { return 1.0f - 2.0f * (float)y / SCR_HEIGHT; }

static const u32 COLORS[] = {
	0xFF0000FF,
	0xFF00FF00,
	0xFFFF0000,
	0xFF00FFFF,
	0xFFFF00FF,
	0xFFFFFF00,
	0xFFFFFFFF,
	0xFF777777,
	0xFF007FFF,
	0xFF000077,
	0xFF007700,
	0xFF770000,
	0xFF777700,
	0xFF007777,
	0xFF9999FF,
	0xFF993366,
	0xFFFFFFCC,
	0xFF660066,
	0xFFFF8080,
	0xFF0066CC,
};

void initDisplay();
void startFrame();
void endFrame();
void setSimpleTexture();
