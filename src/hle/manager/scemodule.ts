// 0x08400000

import {
    Struct,
    StructStructArray,
    StructStructStringz, StructUInt16,
    StructUInt32,
    UInt32
} from "../../global/struct";

export class SceModule extends Struct {
	@StructUInt32 next: number = 0
    @StructUInt16 attribute: number = 0
    @StructUInt16 version: number = 0
	@StructStructStringz(28) modname: string = ''
	@StructUInt32 status: number = 0
	@StructUInt32 unk1: number = 0
	@StructUInt32 modid: number = 0
	@StructUInt32 usermod_thid: number = 0
	@StructUInt32 memid: number = 0
	@StructUInt32 mpidtext: number = 0
	@StructUInt32 mpiddata: number = 0
	@StructUInt32 ent_top: number = 0
    @StructUInt32 ent_size: number = 0
    @StructUInt32 stub_top: number = 0
    @StructUInt32 stub_size: number = 0
    @StructUInt32 module_start_func: number = 0
    @StructUInt32 module_stop_func: number = 0
    @StructUInt32 module_bootstart_func: number = 0
    @StructUInt32 module_reboot_before_func: number = 0
    @StructUInt32 module_reboot_phase_func: number = 0
    @StructUInt32 entry_addr: number = 0
    @StructUInt32 gp_value: number = 0
    @StructUInt32 text_addr: number = 0
    @StructUInt32 text_size: number = 0
    @StructUInt32 data_size: number = 0
    @StructUInt32 bss_size: number = 0
    @StructUInt32 nsegment: number = 0
	@StructStructArray(UInt32, 4) segmentaddr: number[] = []
    @StructStructArray(UInt32, 4) segmentsize: number[] = []
    @StructUInt32 module_start_thread_priority: number = 0
    @StructUInt32 module_start_thread_stacksize: number = 0
    @StructUInt32 module_start_thread_attr: number = 0
    @StructUInt32 module_stop_thread_priority: number = 0
    @StructUInt32 module_stop_thread_stacksize: number = 0
    @StructUInt32 module_stop_thread_attr: number = 0
    @StructUInt32 module_reboot_before_thread_priority: number = 0
    @StructUInt32 module_reboot_before_thread_stacksize: number = 0
    @StructUInt32 module_reboot_before_thread_attr: number = 0
}

