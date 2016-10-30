#include "shared.h"

inline void testDelete(const char *title, SceUID tls) {
	int result = sceKernelDeleteTlspl(tls);
	if (result == 0) {
		checkpoint("%s: OK", title);
	} else {
		checkpoint("%s: Failed (%08x)", title, result);
	}
}

extern "C" int main(int argc, char *argv[]) {
	SceUID tls = sceKernelCreateTlspl("delete", PSP_MEMORY_PARTITION_USER, 0, 0x100, 1, NULL);

	testDelete("Normal", tls);
	testDelete("NULL", 0);
	testDelete("Invalid", 0xDEADBEEF);
	testDelete("Deleted", tls);

	checkpointNext("Waits (1 slot):");
	{
		tls = sceKernelCreateTlspl("delete", PSP_MEMORY_PARTITION_USER, 0, 1, 1, NULL);
		// Make sure there's nothing free so the threads wait.
		void *allocated = sceKernelGetTlsAddr(tls);
		TlsplWaitThread wait1("waiting thread 1", tls);
		TlsplWaitThread wait2("waiting thread 2", tls);
		checkpoint("  With waiting threads (1 slot): %08x", sceKernelDeleteTlspl(tls));
	}

	checkpointNext("Waits (2 slots):");
	{
		tls = sceKernelCreateTlspl("delete", PSP_MEMORY_PARTITION_USER, 0, 1, 2, NULL);
		// Make sure there's nothing free so the threads wait.
		void *allocated = sceKernelGetTlsAddr(tls);
		TlsplWaitThread wait1("waiting thread 1", tls);
		TlsplWaitThread wait2("waiting thread 2", tls);
		checkpoint("  With waiting threads (2 slots): %08x", sceKernelDeleteTlspl(tls));
	}

	checkpointNext("Waits (3 slots):");
	{
		tls = sceKernelCreateTlspl("delete", PSP_MEMORY_PARTITION_USER, 0, 1, 3, NULL);
		// Make sure there's nothing free so the threads wait.
		void *allocated = sceKernelGetTlsAddr(tls);
		TlsplWaitThread wait1("waiting thread 1", tls);
		TlsplWaitThread wait2("waiting thread 2", tls);
		checkpoint("  With waiting threads (3 slots): %08x", sceKernelDeleteTlspl(tls));
	}

	return 0;
}