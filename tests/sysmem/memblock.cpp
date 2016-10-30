#include <common.h>
#include <pspsysmem.h>
#include <pspmodulemgr.h>

extern "C" {
	SceUID sceKernelAllocMemoryBlock(const char *name, int type, u32 size, void *params);
	int sceKernelGetMemoryBlockPtr(SceUID uid, void **ptr);
	int sceKernelFreeMemoryBlock(SceUID uid);
}

void testAlloc(const char *title, const char *name, int type, u32 size, void *params) {
	SceUID uid = sceKernelAllocMemoryBlock(name, type, size, params);
	if (uid >= 0) {
		checkpoint("%s: OK", title);
		sceKernelFreeMemoryBlock(uid);
	} else {
		checkpoint("%s: Failed (%08x)", title, uid);
	}
}

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("Names:");
	testAlloc("  NULL", NULL, 1, 0x100, NULL);
	testAlloc("  Blank", "", 1, 0x100, NULL);
	testAlloc("  Long", "123456789012345678901234567890123456789012345678901234567890", 1, 0x100, NULL);

	checkpointNext("Types:");
	static const int types[] = {-1, 0, 1, 2, 3, 4, 5, 0x11, 0x101, 0x1001, 0x10001, 0x100001, 0x1000001, 0x10000001};
	for (size_t i = 0; i < ARRAY_SIZE(types); ++i) {
		char temp[32];
		sprintf(temp, "  Type %x", types[i]);
		testAlloc(temp, "test", types[i], 0x100, NULL);
	}

	checkpointNext("Sizes:");
	static const int sizes[] = {-1, 0, 1, 2, 3, 4, 5, 0x11, 0x101, 0x1001, 0x10001};
	for (size_t i = 0; i < ARRAY_SIZE(sizes); ++i) {
		SceUID uid1 = sceKernelAllocMemoryBlock("test", 1, 0x100, NULL);
		SceUID uid2 = sceKernelAllocMemoryBlock("test", 1, sizes[i], NULL);
		if (uid2 >= 0) {
			u8 *ptr1;
			u8 *ptr2;
			sceKernelGetMemoryBlockPtr(uid1, (void **) &ptr1);
			sceKernelGetMemoryBlockPtr(uid2, (void **) &ptr2);

			checkpoint("  Size %x: OK, delta=%x", sizes[i], ptr1 - ptr2);
		} else {
			checkpoint("  Size %x: Failed (%08x)", sizes[i], uid2);
		}
	}

	checkpointNext("Param sizes:");
	u32 params[2];
	static const int paramSizes[] = {-1, 0, 1, 2, 3, 4, 5, 0x11, 0x101, 0x1001, 0x10001, 0x100001, 0x1000001, 0x10000001};
	for (size_t i = 0; i < ARRAY_SIZE(paramSizes); ++i) {
		char temp[32];
		sprintf(temp, "  Type %x", paramSizes[i]);
		params[0] = paramSizes[i];
		params[1] = 0x100;
		testAlloc(temp, "test", 1, 0x100, params);
	}

	checkpointNext("Partition usage:");
	void *ptr;
	SceUID uid = sceKernelAllocMemoryBlock("test", 1, 0x100, NULL);
	checkpoint("  sceKernelGetBlockHeadAddr: %08x", sceKernelGetBlockHeadAddr(uid) == NULL ? NULL : 0x1337);
	checkpoint("  sceKernelFreePartitionMemory: %08x", sceKernelFreePartitionMemory(uid));
	uid = sceKernelAllocPartitionMemory(PSP_MEMORY_PARTITION_USER, "test", PSP_SMEM_High, 0x100, NULL);
	checkpoint("  sceKernelGetMemoryBlockPtr: %08x", sceKernelGetMemoryBlockPtr(uid, &ptr));
	checkpoint("  sceKernelFreeMemoryBlock: %08x", sceKernelFreeMemoryBlock(uid));

	checkpointNext("Invalid uids:");
	checkpoint("  Free: %08x", sceKernelFreeMemoryBlock(uid));
	checkpoint("  BlockPtr: %08x", sceKernelGetMemoryBlockPtr(uid, &ptr));

	return 0;
}