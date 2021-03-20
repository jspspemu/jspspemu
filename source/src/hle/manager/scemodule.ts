// 0x08400000

import {Stringz, StructArray, StructClass, UInt16, UInt32} from "../../global/struct";

export class SceModule {
	next: number;
	attribute: number;
	version: number;
	modname: string;
	status: number;
	unk1: number;
	modid: number;
	usermod_thid: number;
	memid: number;
	mpidtext: number;
	mpiddata: number;
	ent_top: number;
	ent_size: number;
	stub_top: number;
	stub_size: number;
	module_start_func: number;
	module_stop_func: number;
	module_bootstart_func: number;
	module_reboot_before_func: number;
	module_reboot_phase_func: number;
	entry_addr: number;
	gp_value: number;
	text_addr: number;
	text_size: number;
	data_size: number;
	bss_size: number;
	nsegment: number;
	segmentaddr: number[];
	segmentsize: number[];
	module_start_thread_priority: number;
	module_start_thread_stacksize: number;
	module_start_thread_attr: number;
	module_stop_thread_priority: number;
	module_stop_thread_stacksize: number;
	module_stop_thread_attr: number;
	module_reboot_before_thread_priority: number;
	module_reboot_before_thread_stacksize: number;
	module_reboot_before_thread_attr: number;

	static struct = StructClass.create<SceModule>(SceModule, [
		{ next: UInt32 },
		{ attribute: UInt16 },
		{ version: UInt16 },
		{ modname: Stringz(28) },
		{ status: UInt32 },
		{ unk1: UInt32 },
		{ modid: UInt32 },
		{ usermod_thid: UInt32 },
		{ memid: UInt32 },
		{ mpidtext: UInt32 },
		{ mpiddata: UInt32 },
		{ ent_top: UInt32 },
		{ ent_size: UInt32 },
		{ stub_top: UInt32 },
		{ stub_size: UInt32 },
		{ module_start_func: UInt32 },
		{ module_stop_func: UInt32 },
		{ module_bootstart_func: UInt32 },
		{ module_reboot_before_func: UInt32 },
		{ module_reboot_phase_func: UInt32 },
		{ entry_addr: UInt32 },
		{ gp_value: UInt32 },
		{ text_addr: UInt32 },
		{ text_size: UInt32 },
		{ data_size: UInt32 },
		{ bss_size: UInt32 },
		{ nsegment: UInt32 },
		{ segmentaddr: StructArray<number>(UInt32, 4) },
		{ segmentsize: StructArray<number>(UInt32, 4) },
		{ module_start_thread_priority: UInt32 },
		{ module_start_thread_stacksize: UInt32 },
		{ module_start_thread_attr: UInt32 },
		{ module_stop_thread_priority: UInt32 },
		{ module_stop_thread_stacksize: UInt32 },
		{ module_stop_thread_attr: UInt32 },
		{ module_reboot_before_thread_priority: UInt32 },
		{ module_reboot_before_thread_stacksize: UInt32 },
		{ module_reboot_before_thread_attr: UInt32 },
	]);
}

