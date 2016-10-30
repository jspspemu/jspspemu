#include <common.h>

extern "C" {
#include "sysmem-imports.h"

int sceKernelSetCompilerVersion(int ver);
}

extern "C" int main(int argc, char *argv[]) {
	static const int versions[] = {-1, 0, 1, 2, 0x10, 0x1000010, 0x1000011, 0x3060010, 0x3070010, 0x6060010, 0x11111111};

	checkpointNext("sceKernelSetCompiledSdkVersion:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion(versions[i]), sceKernelGetCompiledSdkVersion());
	}

	checkpointNext("sceKernelSetCompiledSdkVersion370:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion370(versions[i]), sceKernelGetCompiledSdkVersion());
	}

	checkpointNext("sceKernelSetCompiledSdkVersion380_390:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion380_390(versions[i]), sceKernelGetCompiledSdkVersion());
	}

	checkpointNext("sceKernelSetCompiledSdkVersion395:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion395(versions[i]), sceKernelGetCompiledSdkVersion());
	}

	checkpointNext("sceKernelSetCompiledSdkVersion401_402:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion401_402(versions[i]), sceKernelGetCompiledSdkVersion());
	}

	checkpointNext("sceKernelSetCompiledSdkVersion500_505:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion500_505(versions[i]), sceKernelGetCompiledSdkVersion());
	}

	checkpointNext("sceKernelSetCompiledSdkVersion507:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion507(versions[i]), sceKernelGetCompiledSdkVersion());
	}

	checkpointNext("sceKernelSetCompiledSdkVersion600_602:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion600_602(versions[i]), sceKernelGetCompiledSdkVersion());
	}

	checkpointNext("sceKernelSetCompiledSdkVersion603_605:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion603_605(versions[i]), sceKernelGetCompiledSdkVersion());
	}

	checkpointNext("sceKernelSetCompiledSdkVersion606:");
	// Crashes the PSP hard.
	//for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
	//	checkpoint("  %x: %08x -> %x", versions[i], sceKernelSetCompiledSdkVersion606(versions[i]), sceKernelGetCompiledSdkVersion());
	//}
	// Still crashes the PSP hard.
	//checkpoint("  %x: %08x -> %x", 0x6050000, sceKernelSetCompiledSdkVersion606(0x6050000), sceKernelGetCompiledSdkVersion());
	checkpoint("  %x: %08x -> %x", 0x6060000, sceKernelSetCompiledSdkVersion606(0x6060000), sceKernelGetCompiledSdkVersion());
	checkpoint("  %x: %08x -> %x", 0x6060010, sceKernelSetCompiledSdkVersion606(0x6060010), sceKernelGetCompiledSdkVersion());
	checkpoint("  %x: %08x -> %x", 0x6060100, sceKernelSetCompiledSdkVersion606(0x6060100), sceKernelGetCompiledSdkVersion());
	checkpoint("  %x: %08x -> %x", 0x6061000, sceKernelSetCompiledSdkVersion606(0x6061000), sceKernelGetCompiledSdkVersion());
	checkpoint("  %x: %08x -> %x", 0x606FFFF, sceKernelSetCompiledSdkVersion606(0x606FFFF), sceKernelGetCompiledSdkVersion());
	// In case you didn't guess, this also crashes the PSP hard.
	//checkpoint("  %x: %08x -> %x", 0x6070010, sceKernelSetCompiledSdkVersion606(0x6070010), sceKernelGetCompiledSdkVersion());

	checkpointNext("sceKernelSetCompilerVersion:");
	for (size_t i = 0; i < ARRAY_SIZE(versions); ++i) {
		checkpoint("  %x: %08x", versions[i], sceKernelSetCompilerVersion(versions[i]));
	}

	return 0;
}