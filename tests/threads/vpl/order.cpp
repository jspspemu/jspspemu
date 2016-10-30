#include <common.h>
#include <pspthreadman.h>

inline void schedVplInfo(SceKernelVplInfo *info) {
	schedf("VPL: OK (size=%d,name=%s,attr=%08X,poolSize=%08X,freeSize=%08X,wait=%d)\n", info->size, info->name, info->attr, info->poolSize, info->freeSize, info->numWaitThreads);
}

inline void schedfVpl(SceUID vpl) {
	if (vpl > 0) {
		SceKernelVplInfo info;
		info.size = sizeof(info);

		int result = sceKernelReferVplStatus(vpl, &info);
		if (result == 0) {
			schedVplInfo(&info);
		} else {
			schedf("VPL: Invalid (%08X)\n", result);
		}
	} else {
		schedf("VPL: Failed (%08X)\n", vpl);
	}
}

struct VplBlock {
	VplBlock *next;
	u32 sizeDiv8;
};

struct VplAccounting {
	void *start;
	void *start2;
	void *startPlusSeven;
	u32 totalSizeMinus8;
	u32 allocatedInBlocks;
	VplBlock *nextFreeBlock;
	VplBlock bottomBlock;
};

void schedfAcct(VplAccounting *acct) {
	if (acct->start != acct->start2) {
		schedf("VPL acct: start %08x, again %08x\n", acct->start, acct->start2);
	}
	if ((char *)acct->start + 7 != (char *)acct->startPlusSeven) {
		schedf("VPL acct: start %08x, startPlusSeven %08x\n", acct->start, acct->startPlusSeven);
	}
	if (acct->nextFreeBlock == 0) {
		schedf("VPL top bad?\n");
	}
	schedf("VPL acct: totalSizeMinus8: %08x, allocated=%08x\n", acct->totalSizeMinus8, acct->allocatedInBlocks * 8);
	schedf("VPL bottom block: at %08x, next->%08x, %08x\n", (char *)&acct->bottomBlock - (char *)acct, (char *)acct->bottomBlock.next - (char *)acct, acct->bottomBlock.sizeDiv8 * 8);

	VplBlock *b = &acct->bottomBlock;
	while (b != NULL) {
		bool isfree = false;
		VplBlock *freeb = acct->nextFreeBlock;
		while (freeb != NULL) {
			if (freeb == b) {
				isfree = true;
				break;
			}
			freeb = freeb->next;
			if (freeb == acct->nextFreeBlock) {
				break;
			}
		}
		const char *desc = "alloc";
		if (acct->nextFreeBlock == b) {
			desc = "next free";
		} else if (isfree) {
			desc = "free";
		}
		schedf("VPL block: at %08x, next->%08x, %08x (%s)\n", (char *)b - (char *)acct, (char *)b->next - (char *)acct, b->sizeDiv8 * 8, desc);
		if (b->sizeDiv8 == 0) {
			break;
		}
		b += b->sizeDiv8;
	}
}

extern "C" int main(int argc, char *argv[]) {
	int result;
	void *addr;
	void *addr1;
	void *addr3;
	void *addrs[50];

	SceUID uid1 = sceKernelCreateVpl("bottom", 2, 0x4300, 0x100, NULL);
	SceUID uid2 = sceKernelCreateVpl("middle", 2, 0x4300, 0x100, NULL);
	SceUID uid3 = sceKernelCreateVpl("top", 2, 0x4300, 0x100, NULL);

	result = sceKernelAllocateVpl(uid1, 0x10, &addr1, NULL);
	result = sceKernelAllocateVpl(uid3, 0x10, &addr3, NULL);

	VplAccounting *acct = (VplAccounting *)((char *)addr3 + 0x18);
	schedfAcct(acct);
	schedfVpl(uid2);

	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[0], NULL);
	checkpoint("alloc 0");
	schedfAcct(acct);
	schedfVpl(uid2);

	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[1], NULL);
	checkpoint("alloc 1");
	schedfAcct(acct);
	schedfVpl(uid2);

	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[2], NULL);
	checkpoint("alloc 2");
	schedfAcct(acct);
	schedfVpl(uid2);

	checkpoint("free 1: %08x", sceKernelFreeVpl(uid2, addrs[1]));
	schedfAcct(acct);
	schedfVpl(uid2);

	checkpoint("free 0: %08x", sceKernelFreeVpl(uid2, addrs[0]));
	schedfAcct(acct);
	schedfVpl(uid2);

	checkpoint("free 2: %08x", sceKernelFreeVpl(uid2, addrs[2]));
	schedfAcct(acct);
	schedfVpl(uid2);

	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[0], NULL);
	checkpoint("alloc 0");
	schedfAcct(acct);
	schedfVpl(uid2);

	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[1], NULL);
	checkpoint("alloc 1");
	schedfAcct(acct);
	schedfVpl(uid2);

	checkpoint("free 1: %08x", sceKernelFreeVpl(uid2, addrs[1]));
	schedfAcct(acct);
	schedfVpl(uid2);

	checkpoint("free 0: %08x", sceKernelFreeVpl(uid2, addrs[0]));
	schedfAcct(acct);
	schedfVpl(uid2);

	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[0], NULL);
	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[1], NULL);
	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[2], NULL);
	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[3], NULL);
	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[4], NULL);
	void *addr2 = addrs[4];
	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[5], NULL);
	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[6], NULL);
	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[7], NULL);
	result = sceKernelAllocateVpl(uid2, 0x18, &addrs[8], NULL);

	schedfAcct(acct);
	schedfVpl(uid2);

	checkpoint("free 4: %08x", sceKernelFreeVpl(uid2, addr2));
	schedfAcct(acct);
	schedfVpl(uid2);

	for (int i = 0; i <= 8; i += 2) {
		sceKernelFreeVpl(uid2, addrs[i]);
		checkpoint("free %d", i);
		schedfAcct(acct);
		schedfVpl(uid2);
	}
	checkpoint("free every other");
	schedfAcct(acct);
	schedfVpl(uid2);

	for (int i = 8; i >= 0; --i) {
		sceKernelFreeVpl(uid2, addrs[i]);
	}
	checkpoint("free all");
	schedfAcct(acct);
	schedfVpl(uid2);

	result = sceKernelAllocateVpl(uid2, 0x10, &addrs[0], NULL);
	checkpoint("alloc 1");
	schedfAcct(acct);
	schedfVpl(uid2);

	result = sceKernelFreeVpl(uid2, addrs[0]);
	checkpoint("free 1");
	schedfAcct(acct);
	schedfVpl(uid2);

	return 0;
}
