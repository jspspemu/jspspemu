import {UidCollection} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {SceKernelErrors} from "../../SceKernelErrors";
import {EmulatorContext} from "../../../emu/context";
import {I32, nativeFunctionEx, PTR, STRING, U32} from "../../utils";
import {MemoryAnchor, MemoryPartition} from "../../manager/memory";

export class ThreadManForUser {
	constructor(private context: EmulatorContext) { }

	private vplUid = new UidCollection<Vpl>(1);

	@nativeFunctionEx(0x56C039B5, 150)
	@U32 sceKernelCreateVpl(@STRING name: string, @I32 partitionId: number, @I32 attribute: VplAttributeFlags, @I32 size: number, @PTR optionsPtr: Stream) {
        const partition = this.context.memoryManager.memoryPartitionsUid[partitionId];
        const allocatedPartition = partition.allocate(size, (attribute & VplAttributeFlags.PSP_VPL_ATTR_ADDR_HIGH) ? MemoryAnchor.High : MemoryAnchor.Low);

        const vpl = new Vpl(name, allocatedPartition);
        return this.vplUid.allocate(vpl);
	}

	@nativeFunctionEx(0xAF36D708, 150)
	@U32 sceKernelTryAllocateVpl(@I32 vplId: number, @I32 size: number, @PTR addressPtr: Stream) {
        const vpl = this.vplUid.get(vplId);
        //console.log('sceKernelTryAllocateVpl', vplId, size, addressPtr);
		try {
            const item = vpl.partition.allocateLow(size);
            console.log('-->', item.low);
			if (addressPtr) addressPtr.writeInt32(item.low);
			return 0;
		} catch (e) {
			console.error(e);
			return SceKernelErrors.ERROR_KERNEL_NO_MEMORY;
		}
	}
}

class Vpl {
	constructor(public name: string, public partition: MemoryPartition) {
	}
}

enum VplAttributeFlags {
	PSP_VPL_ATTR_MASK = 0x41FF, // Anything outside this mask is an illegal attr.
	PSP_VPL_ATTR_ADDR_HIGH = 0x4000, // Create the vpl in high memory.
	PSP_VPL_ATTR_EXT = 0x8000, // Extend the vpl memory area (exact purpose is unknown).
}