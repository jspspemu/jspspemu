#include <common.h>
#include <pspthreadman.h>
#include <pspmodulemgr.h>

extern "C" {
typedef struct SceKernelTlsplOptParam {
	SceSize size;
	u32 alignment;
} SceKernelTlsplOptParam;

SceUID sceKernelCreateTlspl(const char *name, u32 partitionid, u32 attr, u32 blockSize, u32 count, SceKernelTlsplOptParam *options);
int sceKernelDeleteTlspl(SceUID uid);
}

void testIdList(const char *title, int type, int size, bool useBuffer = true, bool useCount = true, int adjust = 0) {
	SceUID buffer[1025];
	int count = -1337;
	memset(buffer, -1, sizeof(buffer));

	SceUID *b = useBuffer ? buffer : NULL;
	int *c = useCount ? &count : NULL;
	int result = sceKernelGetThreadmanIdList((SceKernelIdListType)type, b, size, c);

	int n = 0;
	for (size_t i = 0; i < ARRAY_SIZE(buffer); ++i) {
		if (buffer[i] != -1 && buffer[i] != 0) {
			++n;
		}
	}

	if (adjust == -1) {
		checkpoint("%s: res=%08x c=%d", title, result < 0 ? result : 0x1337, count == -1337 ? -1337 : 1337);
	} else if (result < 0) {
		checkpoint("%s: res=%08x c=%d n=%d", title, result - adjust, count - adjust, n - adjust);
	} else {
		checkpoint("%s: res=%d c=%d n=%d", title, result - adjust, count - adjust, n - adjust);
	}
}

int dormantThreadFunc(SceSize args, void *argp) {
	return 0;
}

int sleepThreadFunc(SceSize args, void *argp) {
	sceKernelSleepThread();
	return 0;
}

int delayThreadFunc(SceSize args, void *argp) {
	sceKernelDelayThread(1000000);
	return 0;
}

int suspendThreadFunc(SceSize args, void *argp) {
	return 0;
}

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("Threads dormant:");

	int initialCounts[0x100] = {0};
	for (int i = 0; i < 0x100; ++i) {
		sceKernelGetThreadmanIdList((SceKernelIdListType)i, NULL, 0, &initialCounts[i]);
	}

	SceUID thread = sceKernelCreateThread("dormant", dormantThreadFunc, 0x1F, 0x1000, 0, NULL);
	testIdList("  Normal threads (+1 dormant)", 1, 1024, true, true, initialCounts[1]);
	testIdList("  Sleeping threads (+1 dormant)", 0x40, 1024, true, true, initialCounts[0x40]);
	testIdList("  Delaying threads (+1 dormant)", 0x41, 1024, true, true, initialCounts[0x41]);
	testIdList("  Suspended threads (+1 dormant)", 0x42, 1024, true, true, initialCounts[0x42]);
	testIdList("  Dormant threads (+1 dormant)", 0x43, 1024, true, true, initialCounts[0x43]);
	sceKernelTerminateDeleteThread(thread);

	checkpointNext("Threads sleeping:");
	thread = sceKernelCreateThread("sleeping", sleepThreadFunc, 0x1F, 0x1000, 0, NULL);
	sceKernelStartThread(thread, 0, NULL);
	testIdList("  Normal threads (+1 sleeping)", 1, 1024, true, true, initialCounts[1]);
	testIdList("  Sleeping threads (+1 sleeping)", 0x40, 1024, true, true, initialCounts[0x40]);
	testIdList("  Delaying threads (+1 sleeping)", 0x41, 1024, true, true, initialCounts[0x41]);
	testIdList("  Suspended threads (+1 sleeping)", 0x42, 1024, true, true, initialCounts[0x42]);
	testIdList("  Dormant threads (+1 sleeping)", 0x43, 1024, true, true, initialCounts[0x43]);
	sceKernelTerminateDeleteThread(thread);

	checkpointNext("Threads delaying:");
	thread = sceKernelCreateThread("delaying", delayThreadFunc, 0x1F, 0x1000, 0, NULL);
	sceKernelStartThread(thread, 0, NULL);
	testIdList("  Normal threads (+1 delaying)", 1, 1024, true, true, initialCounts[1]);
	testIdList("  Sleeping threads (+1 delaying)", 0x40, 1024, true, true, initialCounts[0x40]);
	testIdList("  Delaying threads (+1 delaying)", 0x41, 1024, true, true, initialCounts[0x41]);
	testIdList("  Suspended threads (+1 delaying)", 0x42, 1024, true, true, initialCounts[0x42]);
	testIdList("  Dormant threads (+1 delaying)", 0x43, 1024, true, true, initialCounts[0x43]);
	sceKernelTerminateDeleteThread(thread);

	checkpointNext("Threads suspended:");
	thread = sceKernelCreateThread("suspended", suspendThreadFunc, 0x2F, 0x1000, 0, NULL);
	sceKernelStartThread(thread, 0, NULL);
	sceKernelSuspendThread(thread);
	testIdList("  Normal threads (+1 suspended)", 1, 1024, true, true, initialCounts[1]);
	testIdList("  Sleeping threads (+1 suspended)", 0x40, 1024, true, true, initialCounts[0x40]);
	testIdList("  Delaying threads (+1 suspended)", 0x41, 1024, true, true, initialCounts[0x41]);
	testIdList("  Suspended threads (+1 suspended)", 0x42, 1024, true, true, initialCounts[0x42]);
	testIdList("  Dormant threads (+1 suspended)", 0x43, 1024, true, true, initialCounts[0x43]);
	sceKernelResumeThread(thread);
	sceKernelTerminateDeleteThread(thread);

	checkpointNext("Types:");
	static const int types[] = {-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 64, 65, 66, 67, 68, 69, 70, 71, 72, 0x80, 0x81, 0x100, 0x101, 0x200, 0x201, 0x1000, 0x1001, 0x100001, 0x80000000};
	for (size_t i = 0; i < ARRAY_SIZE(types); ++i) {
		char temp[256];
		snprintf(temp, sizeof(temp), "  Type %x", types[i]);
		testIdList(temp, types[i], 1024, true, true, -1);
	}

	SceUID tlspl = sceKernelCreateTlspl("test", PSP_MEMORY_PARTITION_USER, 0, 0x100, 1, NULL);
	testIdList("  Tlspl (+1)", 14, 1024);
	sceKernelDeleteTlspl(tlspl);

	checkpointNext("Sizes:");
	static const int sizes[] = {-2, -1, 0, 1, 2, 3, 4};
	for (size_t i = 0; i < ARRAY_SIZE(sizes); ++i) {
		char temp[256];
		snprintf(temp, sizeof(temp), "  Size %x", sizes[i]);
		testIdList(temp, 1, sizes[i], true, true, -1);
	}

	checkpointNext("Pointers:");
	// Crashes.
	//testIdList("  No buffer", 1, 1024, false, true, -1);
	testIdList("  No buffer, no size", 1, 0, false, true, -1);
	testIdList("  No count", 1, 1024, true, false, -1);

	return 0;
}