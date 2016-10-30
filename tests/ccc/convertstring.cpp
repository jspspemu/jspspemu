#include "shared.h"

void testUTF8toUTF16(const char *title, u16 *dst, u32 dstSize, const char *src) {
	if (dst) {
		memset(dst, 0xCC, 8);
	}
	int result = sceCccUTF8toUTF16(dst, dstSize, src);
	if (result >= 0) {
		if (dst) {
			checkpoint("%s: OK (%d) - %04x %04x %04x %04x", title, result, dst[0], dst[1], dst[2], dst[3]);
		} else {
			checkpoint("%s: OK (%d)", title, result);
		}
	} else {
		if (dst) {
			checkpoint("%s: Failed (%08x) - %04x %04x %04x %04x", title, result, dst[0], dst[1], dst[2], dst[3]);
		} else {
			checkpoint("%s: Failed (%08x)", title, result);
		}
	}
}

void runUTF8ToUTF16Tests() {
	const char *src = "Hello, cruel world.";
	const char *srcShort = "AB";
	const char srcInvalid[] = {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0};
	u16 dst[100];

	checkpointNext("sceCccUTF8toUTF16:");
	testUTF8toUTF16("  Normal", dst, sizeof(dst), src);
	testUTF8toUTF16("  Short", dst, sizeof(dst), srcShort);
	// Crashes.
	//testUTF8toUTF16("  NULL src", dst, sizeof(dst), NULL);
	testUTF8toUTF16("  NULL dst", NULL, 0, src);
	testUTF8toUTF16("  Invalid data", dst, sizeof(dst), srcInvalid);

	testUTF8toUTF16("  Truncate to 1", dst, 1, src);
	testUTF8toUTF16("  Truncate to 2", dst, 2, src);
	testUTF8toUTF16("  Truncate to 4", dst, 4, src);
}

void testUTF8toSJIS(const char *title, char *dst, u32 dstSize, const char *src) {
	if (dst) {
		memset(dst, 0xCC, 8);
	}
	int result = sceCccUTF8toSJIS(dst, dstSize, src);
	if (result >= 0) {
		if (dst) {
			checkpoint("%s: OK (%d) - %02x %02x %02x %02x", title, result, (u8)dst[0], (u8)dst[1], (u8)dst[2], (u8)dst[3]);
		} else {
			checkpoint("%s: OK (%d)", title, result);
		}
	} else {
		if (dst) {
			checkpoint("%s: Failed (%08x) - %02x %02x %02x %02x", title, result, (u8)dst[0], (u8)dst[1], (u8)dst[2], (u8)dst[3]);
		} else {
			checkpoint("%s: Failed (%08x)", title, result);
		}
	}
}

void runUTF8ToSJISTests() {
	const char *src = "Hello, cruel world.";
	const char *srcShort = "AB";
	const char srcInvalid[] = {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0};
	char dst[100];

	checkpointNext("sceCccUTF8toSJIS:");
	// Crashes without table set.
	if (!LoadCCCTables()) {
		checkpoint("  *** Unable to load tables, skipping...");
		return;
	}

	testUTF8toSJIS("  Normal", dst, sizeof(dst), src);
	testUTF8toSJIS("  Short", dst, sizeof(dst), srcShort);
	// Crashes.
	//testUTF8toSJIS("  NULL src", dst, sizeof(dst), NULL);
	testUTF8toSJIS("  NULL dst", NULL, 0, src);
	testUTF8toSJIS("  Invalid data", dst, sizeof(dst), srcInvalid);

	testUTF8toSJIS("  Truncate to 1", dst, 1, src);
	testUTF8toSJIS("  Truncate to 2", dst, 2, src);
	testUTF8toSJIS("  Truncate to 4", dst, 4, src);
}

void testUTF16toUTF8(const char *title, char *dst, u32 dstSize, const u16 *src) {
	if (dst) {
		memset(dst, 0xCC, 8);
	}
	int result = sceCccUTF16toUTF8(dst, dstSize, src);
	if (result >= 0) {
		if (dst) {
			checkpoint("%s: OK (%d) - %02x %02x %02x %02x", title, result, (u8)dst[0], (u8)dst[1], (u8)dst[2], (u8)dst[3]);
		} else {
			checkpoint("%s: OK (%d)", title, result);
		}
	} else {
		if (dst) {
			checkpoint("%s: Failed (%08x) - %02x %02x %02x %02x", title, result, (u8)dst[0], (u8)dst[1], (u8)dst[2], (u8)dst[3]);
		} else {
			checkpoint("%s: Failed (%08x)", title, result);
		}
	}
}

void runUTF16toUTF8Tests() {
	const u16 src[] = {'H', 'e', 'l', 'l', 'o', ',', ' ', 'c', 'r', 'u', 'e', 'l', ' ', 'w', 'o', 'r', 'l', 'd', '.', 0};
	const u16 srcShort[] = {'A', 'B', 0};
	// UTF-16 is very tolerant, but incorrectly paired surrogates are invalid.
	const u16 srcInvalid[] = {0xD800, 0x0041, 0xD800, 0x0041, 0xD800, 0x0041, 0xD800, 0x0041, 0xD800, 0x0041, 0};
	char dst[100];

	checkpointNext("sceCccUTF16toUTF8:");

	testUTF16toUTF8("  Normal", dst, sizeof(dst), src);
	testUTF16toUTF8("  Short", dst, sizeof(dst), srcShort);
	// Crashes.
	//testUTF16toUTF8("  NULL src", dst, sizeof(dst), NULL);
	testUTF16toUTF8("  NULL dst", NULL, 0, src);
	testUTF16toUTF8("  Invalid data", dst, sizeof(dst), srcInvalid);

	testUTF16toUTF8("  Truncate to 1", dst, 1, src);
	testUTF16toUTF8("  Truncate to 2", dst, 2, src);
	testUTF16toUTF8("  Truncate to 4", dst, 4, src);
}

void testUTF16toSJIS(const char *title, char *dst, u32 dstSize, const u16 *src) {
	if (dst) {
		memset(dst, 0xCC, 8);
	}
	int result = sceCccUTF16toSJIS(dst, dstSize, src);
	if (result >= 0) {
		if (dst) {
			checkpoint("%s: OK (%d) - %02x %02x %02x %02x", title, result, (u8)dst[0], (u8)dst[1], (u8)dst[2], (u8)dst[3]);
		} else {
			checkpoint("%s: OK (%d)", title, result);
		}
	} else {
		if (dst) {
			checkpoint("%s: Failed (%08x) - %02x %02x %02x %02x", title, result, (u8)dst[0], (u8)dst[1], (u8)dst[2], (u8)dst[3]);
		} else {
			checkpoint("%s: Failed (%08x)", title, result);
		}
	}
}

void runUTF16toSJISTests() {
	const u16 src[] = {'H', 'e', 'l', 'l', 'o', ',', ' ', 'c', 'r', 'u', 'e', 'l', ' ', 'w', 'o', 'r', 'l', 'd', '.', 0};
	const u16 srcShort[] = {'A', 'B', 0};
	// UTF-16 is very tolerant, but incorrectly paired surrogates are invalid.
	const u16 srcInvalid[] = {0xD800, 0x0041, 0xD800, 0x0041, 0xD800, 0x0041, 0xD800, 0x0041, 0xD800, 0x0041, 0};
	char dst[100];

	checkpointNext("sceCccUTF16toSJIS:");
	// Crashes without table set.
	if (!LoadCCCTables()) {
		checkpoint("  *** Unable to load tables, skipping...");
		return;
	}

	testUTF16toSJIS("  Normal", dst, sizeof(dst), src);
	testUTF16toSJIS("  Short", dst, sizeof(dst), srcShort);
	// Crashes.
	//testUTF16toSJIS("  NULL src", dst, sizeof(dst), NULL);
	testUTF16toSJIS("  NULL dst", NULL, 0, src);
	testUTF16toSJIS("  Invalid data", dst, sizeof(dst), srcInvalid);

	testUTF16toSJIS("  Truncate to 1", dst, 1, src);
	testUTF16toSJIS("  Truncate to 2", dst, 2, src);
	testUTF16toSJIS("  Truncate to 4", dst, 4, src);
}

void testSJIStoUTF8(const char *title, char *dst, u32 dstSize, const char *src) {
	if (dst) {
		memset(dst, 0xCC, 8);
	}
	int result = sceCccSJIStoUTF8(dst, dstSize, src);
	if (result >= 0) {
		if (dst) {
			checkpoint("%s: OK (%d) - %02x %02x %02x %02x", title, result, (u8)dst[0], (u8)dst[1], (u8)dst[2], (u8)dst[3]);
		} else {
			checkpoint("%s: OK (%d)", title, result);
		}
	} else {
		if (dst) {
			checkpoint("%s: Failed (%08x) - %02x %02x %02x %02x", title, result, (u8)dst[0], (u8)dst[1], (u8)dst[2], (u8)dst[3]);
		} else {
			checkpoint("%s: Failed (%08x)", title, result);
		}
	}
}

void runSJIStoUTF8Tests() {
	const char *src = "Hello, cruel world.";
	const char *srcShort = "AB";
	const char srcInvalid[] = {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0};
	char dst[100];

	checkpointNext("sceCccSJIStoUTF8:");
	// Crashes without table set.
	if (!LoadCCCTables()) {
		checkpoint("  *** Unable to load tables, skipping...");
		return;
	}

	testSJIStoUTF8("  Normal", dst, sizeof(dst), src);
	testSJIStoUTF8("  Short", dst, sizeof(dst), srcShort);
	// Crashes.
	//testSJIStoUTF8("  NULL src", dst, sizeof(dst), NULL);
	testSJIStoUTF8("  NULL dst", NULL, 0, src);
	testSJIStoUTF8("  Invalid data", dst, sizeof(dst), srcInvalid);

	testSJIStoUTF8("  Truncate to 1", dst, 1, src);
	testSJIStoUTF8("  Truncate to 2", dst, 2, src);
	testSJIStoUTF8("  Truncate to 4", dst, 4, src);
}

void testSJIStoUTF16(const char *title, u16 *dst, u32 dstSize, const char *src) {
	if (dst) {
		memset(dst, 0xCC, 8);
	}
	int result = sceCccSJIStoUTF16(dst, dstSize, src);
	if (result >= 0) {
		if (dst) {
			checkpoint("%s: OK (%d) - %04x %04x %04x %04x", title, result, dst[0], dst[1], dst[2], dst[3]);
		} else {
			checkpoint("%s: OK (%d)", title, result);
		}
	} else {
		if (dst) {
			checkpoint("%s: Failed (%08x) - %04x %04x %04x %04x", title, result, dst[0], dst[1], dst[2], dst[3]);
		} else {
			checkpoint("%s: Failed (%08x)", title, result);
		}
	}
}

void runSJIStoUTF16Tests() {
	const char *src = "Hello, cruel world.";
	const char *srcShort = "AB";
	const char srcInvalid[] = {0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0};
	u16 dst[100];

	checkpointNext("sceCccSJIStoUTF16:");
	// Crashes without table set.
	if (!LoadCCCTables()) {
		checkpoint("  *** Unable to load tables, skipping...");
		return;
	}

	testSJIStoUTF16("  Normal", dst, sizeof(dst), src);
	testSJIStoUTF16("  Short", dst, sizeof(dst), srcShort);
	// Crashes.
	//testSJIStoUTF16("  NULL src", dst, sizeof(dst), NULL);
	testSJIStoUTF16("  NULL dst", NULL, 0, src);
	testSJIStoUTF16("  Invalid data", dst, sizeof(dst), srcInvalid);

	testSJIStoUTF16("  Truncate to 1", dst, 1, src);
	testSJIStoUTF16("  Truncate to 2", dst, 2, src);
	testSJIStoUTF16("  Truncate to 4", dst, 4, src);
}

extern "C" int main(int argc, char *argv[]) {
	AutoCCCModule mod;
	if (!mod.IsValid()) {
		return 1;
	}

	runUTF8ToUTF16Tests();
	runUTF8ToSJISTests();
	runUTF16toUTF8Tests();
	runUTF16toSJISTests();
	runSJIStoUTF8Tests();
	runSJIStoUTF16Tests();

	return 0;
}