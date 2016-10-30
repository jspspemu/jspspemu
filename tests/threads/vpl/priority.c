#include "shared.h"

typedef enum {
	TEST_TYPE_WHOLE,
	TEST_TYPE_HALF,
	TEST_TYPE_TRY,
} TestType;

TestType g_testType;
SceUID vpl;

int threadFunction(SceSize argc, void *argv) {
	int n = *(int *) argv;
	void *data;

	int sz = 0x900 - n * 0x100;
	schedf("      [%d] Waiting (%x)...\n", n, sz);

	int tryResult = -1;
	int result = -1;
	if (g_testType == TEST_TYPE_TRY) {
		tryResult = sceKernelTryAllocateVpl(vpl, sz, &data);
		schedf("      [%d] Try Allocated (%x -> %08x).\n", n, sz, tryResult);
	}
	if (tryResult < 0) {
		result = sceKernelAllocateVpl(vpl, sz, &data, NULL);
	} else {
		result = tryResult;
	}

	int intr = sceKernelCpuSuspendIntr();
	schedf("      [%d] Allocated (%x -> %08x).\n", n, sz, result);

	schedf("        ");
	schedfVpl(vpl);
	sceKernelCpuResumeIntr(intr);

	schedf("      [%d] Freeing (%x)...\n", n, sz);
	sceKernelFreeVpl(vpl, data);
	return 0;
}

void testPriority(const char *title, u32 attr, TestType testType) {
	g_testType = testType;

	checkpointNext(title);
	vpl = sceKernelCreateVpl("vpl", PSP_MEMORY_PARTITION_USER, attr, 0x1000 + 0x20, NULL);

	SceUID threads[7];
	int numbers[7] = {1, 2, 3, 4, 5, 6, 7};

	void *data1;
	void *data2;
	checkpoint("  [ ] Blocked");
	if (testType == TEST_TYPE_HALF) {
		sceKernelAllocateVpl(vpl, 0x780, &data1, NULL);
		sceKernelAllocateVpl(vpl, 0x780, &data2, NULL);
	} else {
		sceKernelAllocateVpl(vpl, 0x980, &data1, NULL);
	}

	int i;
	for (i = 0; i < 7; i++) {
		threads[i] = CREATE_PRIORITY_THREAD(threadFunction, 0x18 - i);
		sceKernelStartThread(threads[i], sizeof(int), (void *) &numbers[i]);
	}

	sceKernelDelayThread(1000);
	if (testType == TEST_TYPE_HALF) {
		checkpoint("  [ ] Unblock half");
		sceKernelFreeVpl(vpl, data2);
		checkpoint("  [ ] Unblock whole");
		sceKernelFreeVpl(vpl, data1);
	} else {
		checkpoint("  [ ] Unblock");
		sceKernelFreeVpl(vpl, data1);
	}

	sceKernelDelayThread(100 * 1000);

	checkpoint("  [ ] Deleting");
	sceKernelDeleteVpl(vpl);

	for (i = 0; i < 7; i++) {
		sceKernelTerminateDeleteThread(threads[i]);
	}

	checkpoint("Done");
}

int main(int argc, char **argv) {
	testPriority("FIFO/whole:", PSP_VPL_ATTR_FIFO, TEST_TYPE_WHOLE);
	testPriority("PRIORITY/whole:", PSP_VPL_ATTR_PRIORITY, TEST_TYPE_WHOLE);
	testPriority("SMALLEST/whole:", PSP_VPL_ATTR_SMALLEST, TEST_TYPE_WHOLE);
	testPriority("PRIORITY|SMALLEST/whole:", PSP_VPL_ATTR_PRIORITY | PSP_VPL_ATTR_SMALLEST, TEST_TYPE_WHOLE);

	testPriority("FIFO/half:", PSP_VPL_ATTR_FIFO, TEST_TYPE_HALF);
	testPriority("PRIORITY/half:", PSP_VPL_ATTR_PRIORITY, TEST_TYPE_HALF);
	testPriority("SMALLEST/half:", PSP_VPL_ATTR_SMALLEST, TEST_TYPE_HALF);
	testPriority("PRIORITY|SMALLEST/half:", PSP_VPL_ATTR_PRIORITY | PSP_VPL_ATTR_SMALLEST, TEST_TYPE_HALF);

	testPriority("FIFO/try:", PSP_VPL_ATTR_FIFO, TEST_TYPE_TRY);
	testPriority("PRIORITY/try:", PSP_VPL_ATTR_PRIORITY, TEST_TYPE_TRY);
	testPriority("SMALLEST/try:", PSP_VPL_ATTR_SMALLEST, TEST_TYPE_TRY);
	testPriority("PRIORITY|SMALLEST/try:", PSP_VPL_ATTR_PRIORITY | PSP_VPL_ATTR_SMALLEST, TEST_TYPE_TRY);

	return 0;
}