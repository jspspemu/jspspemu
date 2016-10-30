#include <common.h>
#include <malloc.h>
#include <pspge.h>
#include <psputils.h>
#include <pspthreadman.h>
#include "commands.h"

unsigned int __attribute__((aligned(16))) dlist1[] = {
	0x00000000, // 0x00 NOP (for GE_CMD_TRANSFERSRC)
	0x00000000, // 0x01 NOP
	0x00000000, // 0x02 NOP (for GE_CMD_TRANSFERSRCPOS)
	0x00000000, // 0x03 NOP (for GE_CMD_TRANSFERDST)
	0x00000000, // 0x04 NOP
	0x00000000, // 0x05 NOP (for GE_CMD_TRANSFERDSTPOS)
	0x00000000, // 0x06 NOP (for GE_CMD_TRANSFERSIZE)
	0xEA000000, // 0x07 TRANSFERSTART
	0x0F000000, // 0x08 FINISH
	0x0C000000, // 0x09 END
};

static const int memsz = 16384 * 32 * sizeof(unsigned int);
unsigned int *mem1;
unsigned int *mem2;

int sameCount(const void *p1, const void *p2) {
	const u8 *b1 = (const u8 *)p1;
	const u8 *b2 = (const u8 *)p2;

	int i = 0;
	while (*b1++ == *b2++)
		++i;

	return i;
}

u32 transferCoords(int cmd, int x, int y) {
	return (cmd << 24) | ((y << 10) & 0x000FFC00) | (x & 0x3FF);
}

u32 transferAddr1(int cmd, void *p) {
	return (cmd << 24) | ((u32)p & 0x00FFFFFF);
}

u32 transferAddr2w(int cmd, void *p, int w) {
	return (cmd << 24) | (((u32)p & 0xFF000000) >> 8) | (w & 0x0000FFFF);
}

void testTransferSize(const char *title, int srcStride, int dstStride, int w, int h, int bpp) {
	memset(mem1, 0xAA, memsz);
	memset(mem2, 0xBB, memsz);

	dlist1[0] = transferAddr1(GE_CMD_TRANSFERSRC, mem1);
	dlist1[1] = transferAddr2w(GE_CMD_TRANSFERSRCW, mem1, srcStride);
	dlist1[2] = transferCoords(GE_CMD_TRANSFERSRCPOS, 0, 0);
	dlist1[3] = transferAddr1(GE_CMD_TRANSFERDST, mem2);
	dlist1[4] = transferAddr2w(GE_CMD_TRANSFERDSTW, mem2, dstStride);
	dlist1[5] = transferCoords(GE_CMD_TRANSFERDSTPOS, 0, 0);
	dlist1[6] = transferCoords(GE_CMD_TRANSFERSIZE, w - 1, h - 1);
	dlist1[7] = (GE_CMD_TRANSFERSTART << 24) | (bpp == 32 ? 1 : 0);

	sceKernelDcacheWritebackAll();
	sceGeListEnQueue(dlist1, dlist1 + 0x20, -1, NULL);
	sceGeDrawSync(0);

	checkpoint("%s: %d", title, sameCount(mem1, mem2));
}

extern "C" int main(int argc, char *argv[]) {
	mem1 = (unsigned int *)memalign(16, memsz);
	mem2 = (unsigned int *)memalign(16, memsz);

	checkpointNext("Block transfers - 16 bit:");
	testTransferSize("0 stride", 0, 0, 1024, 4, 16);
	testTransferSize("0x100 stride", 0x100, 0x100, 1024, 4, 16);
	testTransferSize("0x3F8 stride", 0x3F8, 0x3F8, 1024, 4, 16);
	testTransferSize("0x400 stride", 0x400, 0x400, 1024, 4, 16);
	testTransferSize("0x407 stride", 0x407, 0x407, 1024, 4, 16);
	testTransferSize("0x408 stride", 0x408, 0x408, 1024, 4, 16);
	testTransferSize("0x7FF stride", 0x7FF, 0x7FF, 1024, 4, 16);
	testTransferSize("0xFC00 stride", 0xFC00, 0xFC00, 1024, 4, 16);
	
	checkpointNext("Block transfers - 32 bit:");
	testTransferSize("0 stride", 0, 0, 1024, 4, 32);
	testTransferSize("0x100 stride", 0x100, 0x100, 1024, 4, 32);
	testTransferSize("0x3F8 stride", 0x3F8, 0x3F8, 1024, 4, 32);
	testTransferSize("0x400 stride", 0x400, 0x400, 1024, 4, 32);
	testTransferSize("0x407 stride", 0x407, 0x407, 1024, 4, 32);
	testTransferSize("0x408 stride", 0x408, 0x408, 1024, 4, 32);
	testTransferSize("0x7FF stride", 0x7FF, 0x7FF, 1024, 4, 32);
	testTransferSize("0xFC00 stride", 0xFC00, 0xFC00, 1024, 4, 32);
	
	checkpointNext("Sizes:");
	testTransferSize("1024x512", 0x200, 0x200, 1024, 512, 16);
	testTransferSize("1024x256", 0x200, 0x200, 1024, 256, 16);
	testTransferSize("1024x128", 0x200, 0x200, 1024, 128, 16);
	testTransferSize("1024x64", 0x200, 0x200, 1024, 64, 16);
	testTransferSize("1024x4", 0x200, 0x200, 1024, 4, 16);
	testTransferSize("1024x1", 0x200, 0x200, 1024, 1, 16);
	testTransferSize("1x1", 0x200, 0x200, 1, 1, 16);

	free(mem1);
	free(mem2);

	return 0;
}