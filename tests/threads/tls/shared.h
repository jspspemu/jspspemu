#include <common.h>
#include <stdarg.h>

#include <pspsdk.h>
#include <pspkernel.h>
#include <pspthreadman.h>

const static SceUInt NO_TIMEOUT = (SceUInt)-1337;

extern "C" {
typedef struct SceKernelTlsplOptParam {
	SceSize size;
	u32 alignment;
} SceKernelTlsplOptParam;

typedef struct SceKernelTlsplInfo {
	SceSize size;
	char name[32];
	u32 attr;
	s32 index;
	u32 blockSize;
	u32 totalBlocks;
	u32 freeBlocks;
	u32 numWaitThreads;
} SceKernelTlsplInfo;

enum {
	PSP_TLSPL_ATTR_FIFO     = 0,
	PSP_TLSPL_ATTR_PRIORITY = 0x100,
	PSP_TLSPL_ATTR_HIGHMEM  = 0x4000,
	PSP_TLSPL_ATTR_KNOWN    = PSP_TLSPL_ATTR_HIGHMEM | PSP_TLSPL_ATTR_PRIORITY | PSP_TLSPL_ATTR_FIFO,
};

SceUID sceKernelCreateTlspl(const char *name, u32 partitionid, u32 attr, u32 blockSize, u32 count, SceKernelTlsplOptParam *options);
int sceKernelDeleteTlspl(SceUID uid);
void *sceKernelGetTlsAddr(SceUID uid);
int sceKernelFreeTlspl(SceUID uid);
int sceKernelReferTlsplStatus(SceUID uid, SceKernelTlsplInfo *info);
}

inline void schedfTlsplInfo(const SceKernelTlsplInfo *info) {
	schedf("Tlspl: OK (size=%d,name=%s,attr=%08X,index=%d,blockSize=%08X,totalBlocks=%08X,freeBlocks=%08X,wait=%d)\n", info->size, info->name, info->attr, info->index, info->blockSize, info->totalBlocks, info->freeBlocks, info->numWaitThreads);
}

inline void schedfTlspl(SceUID tls) {
	if (tls > 0) {
		SceKernelTlsplInfo info;
		info.size = sizeof(info);

		int result = sceKernelReferTlsplStatus(tls, &info);
		if (result == 0) {
			schedfTlsplInfo(&info);
		} else {
			schedf("Tlspl: Invalid (%08X)\n", result);
		}
	} else {
		schedf("Tlspl: Failed (%08X)\n", tls);
	}
}

struct KernelObjectWaitThread {
	KernelObjectWaitThread(const char *name, SceUID uid, SceUInt timeout, int prio = 0x60)
		: name_(name), object_(uid), timeout_(timeout) {
		thread_ = sceKernelCreateThread(name, &run, prio, 0x1000, 0, NULL);
	}

	void start() {
		const void *arg[1] = { (void *)this };
		sceKernelStartThread(thread_, sizeof(arg), arg);
		sceKernelDelayThread(1000);
		checkpoint("  ** started %s", name_);
	}

	void stop() {
		if (thread_ >= 0) {
			if (sceKernelGetThreadExitStatus(thread_) != 0) {
				sceKernelDelayThread(1000);
				sceKernelTerminateDeleteThread(thread_);
				checkpoint("  ** stopped %s", name_);
			} else {
				sceKernelDeleteThread(thread_);
			}
		}
		thread_ = 0;
	}

	static int run(SceSize args, void *argp) {
		KernelObjectWaitThread *o = *(KernelObjectWaitThread **)argp;
		return o->wait();
	}

	virtual int wait() {
		checkpoint("ERROR: base wait() called.");
		return 1;
	}

	~KernelObjectWaitThread() {
		stop();
	}

	const char *name_;
	SceUID thread_;
	SceUID object_;
	SceUInt timeout_;
};

struct TlsplWaitThread : public KernelObjectWaitThread {
	TlsplWaitThread(const char *name, SceUID uid, int hold_ms = 1000, int prio = 0x60)
		: KernelObjectWaitThread(name, uid, NO_TIMEOUT, prio), hold_ms_(hold_ms) {
		start();
	}

	virtual int wait() {
		void *allocated = NULL;
		allocated = sceKernelGetTlsAddr(object_);
		checkpoint("  ** %s got result: %08x, received = %s", name_, allocated, allocated == NULL ? "NULL" : "ptr");
		if (allocated != NULL) {
			checkpoint("  ** %s delayed: %08x", name_, sceKernelDelayThread(hold_ms_));
			checkpoint("  ** %s freed: %08x", name_, sceKernelFreeFpl(object_, allocated));
		}
		return 0;
	}

	int hold_ms_;
};
