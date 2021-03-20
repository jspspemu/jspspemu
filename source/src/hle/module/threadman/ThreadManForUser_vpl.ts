import * as _utils from '../../utils';
import * as _context from '../../../context';
import nativeFunction = _utils.nativeFunction;
import * as _manager from '../../manager';
import MemoryAnchor = _manager.MemoryAnchor;
import {UidCollection} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {SceKernelErrors} from "../../SceKernelErrors";

export class ThreadManForUser {
	constructor(private context: _context.EmulatorContext) { }

	private vplUid = new UidCollection<Vpl>(1);

	@nativeFunction(0x56C039B5, 150, 'int', 'string/int/int/int/void*')
	sceKernelCreateVpl(name: string, partitionId: number, attribute: VplAttributeFlags, size: number, optionsPtr: Stream) {
		var partition = this.context.memoryManager.memoryPartitionsUid[partitionId];
		var allocatedPartition = partition.allocate(size, (attribute & VplAttributeFlags.PSP_VPL_ATTR_ADDR_HIGH) ? MemoryAnchor.High : MemoryAnchor.Low);

		var vpl = new Vpl(name, allocatedPartition);
		return this.vplUid.allocate(vpl);
	}

	@nativeFunction(0xAF36D708, 150, 'int', 'int/int/void*')
	sceKernelTryAllocateVpl(vplId:number, size: number, addressPtr: Stream) {
		var vpl = this.vplUid.get(vplId)
		//console.log('sceKernelTryAllocateVpl', vplId, size, addressPtr);
		try {
			var item = vpl.partition.allocateLow(size);
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
	constructor(public name: string, public partition: _manager.MemoryPartition) {
	}
}

enum VplAttributeFlags {
	PSP_VPL_ATTR_MASK = 0x41FF, // Anything outside this mask is an illegal attr.
	PSP_VPL_ATTR_ADDR_HIGH = 0x4000, // Create the vpl in high memory.
	PSP_VPL_ATTR_EXT = 0x8000, // Extend the vpl memory area (exact purpose is unknown).
}