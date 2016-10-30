#include "shared.h"

inline void testGet(const char *title, SceUID tlspl) {
	void *ptr = sceKernelGetTlsAddr(tlspl);
	if (ptr != NULL) {
		checkpoint(NULL);
		schedf("%s: OK (%08x) ", title, ptr);
		schedfTlspl(tlspl);
	} else {
		checkpoint(NULL);
		schedf("%s: Failed ", title);
		schedfTlspl(tlspl);
	}
}

extern "C" int main(int argc, char *argv[]) {
	SceUID tls1 = sceKernelCreateTlspl("tls1", PSP_MEMORY_PARTITION_USER, 0, 0x10, 8, NULL);
	SceUID tls2 = sceKernelCreateTlspl("tls2", PSP_MEMORY_PARTITION_USER, 0, 0x10, 8, NULL);

	checkpointNext("Objects:");
	testGet("  Normal", tls1);
	testGet("  Twice", tls1);
	testGet("  Second", tls2);
	testGet("  0", 0);
	testGet("  1", 1);
	testGet("  -1", -1);
	testGet("  0xF", 0xF);
	testGet("  0x10", 0x10);
	testGet("  0x17", 0x17);
	testGet("  0x18", 0x18);
	testGet("  Invalid", 0xDEADBEEF);
	sceKernelDeleteTlspl(tls1);
	testGet("  Deleted", tls1);

	SceUID tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 0x10, 3, NULL);
	checkpointNext("Allocation order");
	testGet("  Alloc #1", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #2", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #3", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #4", tls);
	sceKernelDeleteTlspl(tls);

	tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, PSP_TLSPL_ATTR_HIGHMEM, 0x10, 3, NULL);
	checkpointNext("Allocation order (high)");
	testGet("  Alloc #1", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #2", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #3", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #4", tls);
	sceKernelDeleteTlspl(tls);

	SceKernelTlsplOptParam opts;
	opts.size = sizeof(opts);
	opts.alignment = 0x100;
	tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 1, 3, &opts);
	checkpointNext("Allocation alignment (0x100)");
	testGet("  Alloc #1", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #2", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #3", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #4", tls);
	sceKernelDeleteTlspl(tls);

	opts.size = sizeof(opts);
	opts.alignment = 1;
	tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 1, 3, &opts);
	checkpointNext("Allocation alignment (1)");
	testGet("  Alloc #1", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #2", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #3", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #4", tls);
	sceKernelDeleteTlspl(tls);

	opts.size = sizeof(opts);
	opts.alignment = 0;
	tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 1, 3, &opts);
	checkpointNext("Allocation alignment (0)");
	testGet("  Alloc #1", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #2", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #3", tls);
	sceKernelFreeTlspl(tls);
	testGet("  Alloc #4", tls);
	sceKernelDeleteTlspl(tls);
	
	tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 0x10, 1, NULL);
	checkpointNext("Clearing:");
	void *temp = sceKernelGetTlsAddr(tls);
	sceKernelFreeTlspl(tls);
	// We made it only one block above, so this will be the same address.
	memset(temp, 0xCC, 0x100);
	checkpoint("  Before get: %08x", *(u32 *)temp);
	temp = sceKernelGetTlsAddr(tls);
	checkpoint("  After get 1: %08x", *(u32 *)temp);
	memset(temp, 0xCC, 0x100);
	temp = sceKernelGetTlsAddr(tls);
	checkpoint("  After get 2: %08x", *(u32 *)temp);
	sceKernelFreeTlspl(tls);
	memset(temp, 0xCC, 0x100);
	sceKernelDeleteTlspl(tls);
	checkpoint("  After delete: %08x", *(u32 *)temp);
	tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 0x10, 1, NULL);
	checkpoint("  After create: %08x", *(u32 *)temp);
	sceKernelDeleteTlspl(tls);

	return 0;
}
