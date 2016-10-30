#include "shared.h"

extern "C" int main(int argc, char *argv[]) {
	checkpointNext("Normal (FIFO):");
	{
		SceUID tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, 0, 0x100, 1, NULL);
		void *data = sceKernelGetTlsAddr(tls);
		TlsplWaitThread wait1("waiting thread 1", tls, 300, 0x30);
		TlsplWaitThread wait2("waiting thread 2", tls, 300, 0x34);
		TlsplWaitThread wait3("waiting thread 3", tls, 300, 0x31);
		sceKernelFreeTlspl(tls);
		schedfTlspl(tls);
		sceKernelDelayThread(200000);
		sceKernelDeleteTlspl(tls);
	}

	checkpointNext("Priority:");
	{
		SceUID tls = sceKernelCreateTlspl("tls", PSP_MEMORY_PARTITION_USER, PSP_TLSPL_ATTR_PRIORITY, 0x100, 1, NULL);
		void *data = sceKernelGetTlsAddr(tls);
		TlsplWaitThread wait1("waiting thread 1", tls, 300, 0x30);
		TlsplWaitThread wait2("waiting thread 2", tls, 300, 0x34);
		TlsplWaitThread wait3("waiting thread 3", tls, 300, 0x31);
		sceKernelFreeTlspl(tls);
		schedfTlspl(tls);
		sceKernelDelayThread(200000);
		sceKernelDeleteTlspl(tls);
	}
	return 0;
}
