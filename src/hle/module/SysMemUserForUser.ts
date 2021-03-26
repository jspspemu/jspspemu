import { SceKernelErrors } from '../SceKernelErrors';
import {logger, sprintf, UidCollection} from "../../global/utils";
import {Stream} from "../../global/stream";
import {EmulatorContext} from "../../emu/context";
import {MemoryAnchor, MemoryPartition} from "../manager/memory";
import {nativeFunction} from "../utils";
import {Thread} from "../manager/thread";

const console = logger.named('module.SysMemUserForUser');

export class SysMemUserForUser {
	constructor(private context: EmulatorContext) { }

	private partitionUids = new UidCollection<MemoryPartition>(1);
	private blockUids = new UidCollection<MemoryPartition>(1);

	@nativeFunction(0x237DBD4F, 150, 'int', 'int/string/int/int/int')
	sceKernelAllocPartitionMemory(partitionId: number, name: string, anchor: MemoryAnchor, size: number, address: number) {
		if (name == null) return SceKernelErrors.ERROR_ERROR;

		try {
            const parentPartition = this.context.memoryManager.memoryPartitionsUid[partitionId];
            const allocatedPartition = parentPartition.allocate(size, anchor, address, name);
            console.info(sprintf("SysMemUserForUser.sceKernelAllocPartitionMemory (partitionId:%d, name:'%s', type:%d, size:%d, address:%08X) : %08X-%08X", partitionId, name, anchor, size, address, allocatedPartition.low, allocatedPartition.high));
			return this.partitionUids.allocate(allocatedPartition);
		} catch (e) {
			console.error(e);
			return SceKernelErrors.ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK;
		}
	}

	@nativeFunction(0xFE707FDF, 150, 'int', 'string/uint/uint/void*')
	AllocMemoryBlock(name: string, type: MemoryAnchor, size: number, paramsAddrPtr: Stream) {
		if (name == null) return SceKernelErrors.ERROR_ERROR;
		if (type < 0 || type > 1) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MEMBLOCK_ALLOC_TYPE;
		if (size == 0) return SceKernelErrors.ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK;
		if (paramsAddrPtr) {
			const size = paramsAddrPtr.readInt32();
            const unk = paramsAddrPtr.readInt32();
			if (size != 4) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ARGUMENT;
		}
        const parentPartition = this.context.memoryManager.userPartition;
		try {
            const block = parentPartition.allocate(size, type, 0, name);
			return this.blockUids.allocate(block);
		} catch (e) {
			console.error(e);
			return SceKernelErrors.ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK;
		}
	}

	@nativeFunction(0xDB83A952, 150, 'int', 'int')
	GetMemoryBlockAddr(blockId: number) {
		if (!this.blockUids.has(blockId)) return 0;
        const block = this.blockUids.get(blockId);
        return block.low;
	}

	@nativeFunction(0x50F61D8A, 150, 'int', 'int')
	FreeMemoryBlock(blockId: number) {
		if (!this.blockUids.has(blockId)) return SceKernelErrors.ERROR_KERNEL_UNKNOWN_UID;
		this.blockUids.remove(blockId);
		return 0;
	}

	@nativeFunction(0xB6D61D02, 150, 'int', 'int')
	sceKernelFreePartitionMemory(partitionId: number) {
		if (!this.partitionUids.has(partitionId)) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MEMBLOCK;
        const partition = this.partitionUids.get(partitionId);
        partition.deallocate();
		this.partitionUids.remove(partitionId);
		return 0;
	}

	@nativeFunction(0xF919F628, 150, 'int', '')
	sceKernelTotalFreeMemSize() {
		return this.context.memoryManager.userPartition.getTotalFreeMemory() - 0x8000;
	}

	@nativeFunction(0x9D9A5BA1, 150, 'uint', 'int')
	sceKernelGetBlockHeadAddr(partitionId: number) {
		if (!this.partitionUids.has(partitionId)) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MEMBLOCK;
        const block = this.partitionUids.get(partitionId);
        return block.low;
	}

	/**
		* Get the size of the largest free memory block.
		*/
	@nativeFunction(0xA291F107, 150, 'int', '')
	sceKernelMaxFreeMemSize() {
		return this.context.memoryManager.userPartition.nonAllocatedPartitions.max(partition => partition.size).size;
	}

	@nativeFunction(0x7591C7DB, 150, 'int', 'uint')
	sceKernelSetCompiledSdkVersion(sdkVersion: number) {
		console.info(sprintf('sceKernelSetCompiledSdkVersion: %08X', sdkVersion));
	}

	@nativeFunction(0xF77D77CB, 150, 'int', 'uint')
	sceKernelSetCompilerVersion(version: number) {
		console.info(sprintf('sceKernelSetCompilerVersion: %08X', version));
	}

	@nativeFunction(0xEBD5C3E6, 150, 'int', 'uint')
	sceKernelSetCompiledSdkVersion395(param: number) {
		console.info(sprintf('sceKernelSetCompiledSdkVersion395: %08X', param));
	}

	@nativeFunction(0x3FC9AE6A, 150, 'int', 'uint')
	sceKernelDevkitVersion(version: number) {
		//const Version = HleConfig.FirmwareVersion;
		//return (Version.Major << 24) | (Version.Minor << 16) | (Version.Revision << 8) | 0x10;
		return 0x02070110;
	}

	@nativeFunction(0x13A5ABEF, 150, 'void', 'Thread/string')
	sceKernelPrintf(thread: Thread, format: string) {
        let gprIndex = 5;
        const memory = this.context.memory;
        let state = thread.state;

		const readParam = (type:string): string => {
			switch (type) {
				case '%s': return memory.readStringz(state.getGPR(gprIndex++))!
				case '%d': return String(state.getGPR(gprIndex++));
			}
			return `??[${type}]??`;
		};
		console.info(`sceKernelPrintf: ${format.replace(/%[dsux]/g, (data) => {
            return readParam(data);
        })}`);
		//console.warn(this.context.memory.readStringz(thread.state.GPR5));
	}
}
