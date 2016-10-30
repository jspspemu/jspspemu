#include <common.h>

#include <pspsdk.h>
#include <pspkernel.h>
#include <pspthreadman.h>
#include <psploadexec.h>

inline void schedfVTimer(SceUID vtimer) {
	SceKernelVTimerInfo info = {0};
	if (vtimer >= 0) {
		info.size = sizeof(info);
		int result = sceKernelReferVTimerStatus(vtimer, &info);
		if (result >= 0) {
			u64 base = *(u64 *)&info.base;
			u64 current = *(u64 *)&info.current;
			u64 schedule = *(u64 *)&info.schedule;

			char current_s[32], schedule_s[32];
			if (current == 0) {
				sprintf(current_s, "0");
			} else {
				sprintf(current_s, "N");
			}
			if (schedule == 0) {
				sprintf(schedule_s, "0");
			} else if (base == 0) {
				sprintf(schedule_s, "N");
			} else {
				sprintf(schedule_s, "+%lld", schedule);
			}

			schedf("VTimer: (size=%d,name=%s,active=%d,handler=%d,common=%08x,base=%s,current=%s,schedule=%s)\n", info.size, info.name, info.active, info.handler == 0 ? 0 : 1, info.common, base == 0 ? "0" : "N", current_s, schedule_s);
		} else {
			schedf("VTimer: Invalid (%08x)\n", result);
		}
	} else {
		schedf("VTimer: Failed (%08x)\n", vtimer);
	}
}
