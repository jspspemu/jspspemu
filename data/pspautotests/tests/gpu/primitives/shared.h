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

typedef struct {
	u16 u, v;
} Vertex_UV16;

typedef struct {
	u16 u, v;
	s8 x, y, z;
	u8 pad1;
} Vertex_UV16_P8;

typedef struct {
	u16 u, v;
	s16 x, y, z;
} Vertex_UV16_P16;

typedef struct {
	u16 u, v;
	float x, y, z;
} Vertex_UV16_P32;

typedef struct {
	u32 c;
} Vertex_C8888;

typedef struct {
	u32 c;
	s8 x, y, z;
	u8 pad1;
} Vertex_C8888_P8;

typedef struct {
	u32 c;
	s16 x, y, z;
	u16 pad1;
} Vertex_C8888_P16;

typedef struct {
	u32 c;
	float x, y, z;
} Vertex_C8888_P32;

inline s8 norm8x(int x) { return x * 255 / SCR_WIDTH - 128; }
inline s8 norm8y(int x) { return 128 - x * 255 / SCR_HEIGHT; }
inline s16 norm16x(int x) { return x * 65536 / SCR_WIDTH - 32768; }
inline s16 norm16y(int x) { return 32768 - x * 65536 / SCR_HEIGHT; }
inline float norm32x(int x) { return 2.0f * (float)x / SCR_WIDTH - 1.0f; }
inline float norm32y(int y) { return 1.0f - 2.0f * (float)y / SCR_HEIGHT; }

void initDisplay();
void startFrame();
void endFrame();
void setSimpleTexture();
