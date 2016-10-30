#include "shared.h"

void testCreate(const char *title, const char *name, u32 part, u32 attr, u32 size, u32 count, SceKernelTlsplOptParam *opt) {
	u32 before = sceKernelTotalFreeMemSize();
	SceUID tls = sceKernelCreateTlspl(name, part, attr, size, count, opt);
	u32 after = sceKernelTotalFreeMemSize();
	checkpoint(NULL);
	schedf("%s: (allocated %d bytes) ", title, before - after);
	schedfTlspl(tls);
	if (tls > 0) {
		sceKernelDeleteTlspl(tls);
	}
	u32 freed = sceKernelTotalFreeMemSize();
	if (freed != before) {
		schedf("LEAK %d bytes\n", before - freed);
	}
}

extern "C" int main(int argc, char *argv[]) {
	char temp[128];

	checkpointNext("Names:");
	testCreate("  Normal name", "Normal", PSP_MEMORY_PARTITION_USER, 0, 0x100, 4, NULL);
	testCreate("  NULL name", NULL, PSP_MEMORY_PARTITION_USER, 0, 0x100, 4, NULL);
	testCreate("  Blank name", "", PSP_MEMORY_PARTITION_USER, 0, 0x100, 4, NULL);
	testCreate("  Long name", "1234567890123456789012345678901234567890123456789012345678901234", 2, 0, 0x100, 4, NULL);

	checkpointNext("Partitions:");
	static const int parts[] = {-5, -1, 0, 1, 2, 3, 4, 6, 7, 8, 9, 10};
	for (size_t i = 0; i < ARRAY_SIZE(parts); ++i) {
		sprintf(temp, "  Partition %d", parts[i]);
		testCreate(temp, "tls", parts[i], 0, 0x100, 4, NULL);
	}

	checkpointNext("Attributes:");
	static const u32 attrs[] = {1, 0x100, 0x200, 0x400, 0x800, 0x1000, 0x2000, 0x4000, 0x8000, 0x10000, 0x20000, 0x40000, 0x80000};
	for (size_t i = 0; i < ARRAY_SIZE(attrs); ++i) {
		sprintf(temp, "  0x%x attr", attrs[i]);
		testCreate(temp, "tls", PSP_MEMORY_PARTITION_USER, attrs[i], 0x100, 4, NULL);
	}

	checkpointNext("Block sizes:");
	static const u32 sizes[] = {
		-1, 0, 1, 0x10, 0x20, 0x2F, 0x30, 0x31, 0x32, 0x36, 0x38, 0x39, 0x3A,
		0x131, 0x136, 0x139, 0x1000, 0x10000, 0x100000, 0x1000000, 0x10000000,
		0x1800000, 0x2000000,
	};
	for (size_t i = 0; i < ARRAY_SIZE(sizes); ++i) {
		sprintf(temp, "  Size 0x%08X", sizes[i]);
		testCreate(temp, "tls", PSP_MEMORY_PARTITION_USER, 0, sizes[i], 4, NULL);
	}

	checkpointNext("Counts:");
	static const u32 counts[] = {
		-1, 0, 1, 0x10, 0x20, 0x2F, 0x30, 0x31, 0x32, 0x36, 0x38, 0x39, 0x3A,
		0x131, 0x136, 0x139, 0x1000, 0x10000, 0x100000, 0x1000000, 0x10000000,
		0x1800000, 0x2000000,
	};
	for (size_t i = 0; i < ARRAY_SIZE(counts); ++i) {
		sprintf(temp, "  Count 0x%08X", counts[i]);
		testCreate(temp, "tls", PSP_MEMORY_PARTITION_USER, 0, 0x100, counts[i], NULL);
	}

	checkpointNext("Option sizes:");
	SceKernelTlsplOptParam opts = {0};
	static const u32 optsizes[] = {
		-1, 0, 1, 0x10, 0x20, 0x2F, 0x30, 0x31, 0x32, 0x36, 0x38, 0x39, 0x3A,
		0x131, 0x136, 0x139, 0x1000, 0x10000, 0x100000, 0x1000000, 0x10000000,
		0x1800000, 0x2000000,
	};
	for (size_t i = 0; i < ARRAY_SIZE(optsizes); ++i) {
		sprintf(temp, "  Options size 0x%08X", optsizes[i]);
		opts.size = optsizes[i];
		testCreate(temp, "tls", PSP_MEMORY_PARTITION_USER, 0, 1, 4, &opts);
	}

	checkpointNext("Alignments:");
	static const u32 alignments[] = {
		-1, 0, 1, 3, 0x10, 0x20, 0x2F, 0x30, 0x31, 0x32, 0x100, 0x131, 0x800,
		0x1000, 0x10000, 0x100000, 0x1000000, 0x10000000,
		0x1800000, 0x2000000,
	};
	for (size_t i = 0; i < ARRAY_SIZE(alignments); ++i) {
		sprintf(temp, "  Aligned to 0x%08X", alignments[i]);
		opts.size = sizeof(opts);
		opts.alignment = alignments[i];
		testCreate(temp, "tls", PSP_MEMORY_PARTITION_USER, 0, 1, 4, &opts);
	}
	
	checkpointNext("Multiple:");
	SceUID tls1 = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 0x100, 4, NULL);
	SceUID tls2 = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 0x100, 4, NULL);
	if (tls1 > 0 && tls2 > 0) {
		checkpoint("  Two with same name: OK");
	} else {
		checkpoint("  Two with same name: Failed (%08X, %08X)", tls1, tls2);
	}
	sceKernelDeleteTlspl(tls1);
	sceKernelDeleteTlspl(tls2);

	SceUID tlspls[1024];
	int result = 0;
	int i;
	for (i = 0; i < 1024; i++) {
		tlspls[i] = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 0x100, 4, NULL);
		if (tlspls[i] < 0) {
			result = tlspls[i];
			break;
		}
	}

	if (result != 0) {
		checkpoint("  Create 1024: Failed at %d (%08X)", i, result);
	} else {
		checkpoint("  Create 1024: OK");
	}

	if (i > 0) {
		checkpoint(NULL);
		schedf("  Last successful: ");
		schedfTlspl(tlspls[i - 1]);
	}

	while (--i >= 0) {
		sceKernelDeleteTlspl(tlspls[i]);
	}

	return 0;
}