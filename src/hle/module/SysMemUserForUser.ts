import _utils = require('../utils');
import _manager = require('../manager');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');
import MemoryAnchor = _manager.MemoryAnchor;
import Thread = _manager.Thread;
import MemoryPartition = _manager.MemoryPartition;

export class SysMemUserForUser {
	constructor(private context: _context.EmulatorContext) { }

	private partitionUids = new UidCollection<MemoryPartition>(1);
	private blockUids = new UidCollection<MemoryPartition>(1);

	sceKernelAllocPartitionMemory = createNativeFunction(0x237DBD4F, 150, 'int', 'int/string/int/int/int', this, (partitionId: number, name: string, anchor: MemoryAnchor, size: number, address: number) => {
		if (name == null) return SceKernelErrors.ERROR_ERROR;

		try {
			var parentPartition = this.context.memoryManager.memoryPartitionsUid[partitionId];
			var allocatedPartition = parentPartition.allocate(size, anchor, address, name);
			console.info(sprintf("SysMemUserForUser.sceKernelAllocPartitionMemory (partitionId:%d, name:'%s', type:%d, size:%d, address:%08X) : %08X-%08X", partitionId, name, anchor, size, address, allocatedPartition.low, allocatedPartition.high));
			return this.partitionUids.allocate(allocatedPartition);
		} catch (e) {
			console.error(e);
			return SceKernelErrors.ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK;
		}
	});

	AllocMemoryBlock = createNativeFunction(0xFE707FDF, 150, 'int', 'string/uint/uint/void*', this, (name: string, type: MemoryAnchor, size: number, paramsAddrPtr: Stream) => {
		if (name == null) return SceKernelErrors.ERROR_ERROR;
		if (type < 0 || type > 1) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MEMBLOCK_ALLOC_TYPE;
		if (size == 0) return SceKernelErrors.ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK;
		if (paramsAddrPtr) {
			var size = paramsAddrPtr.readInt32();
			var unk = paramsAddrPtr.readInt32();
			if (size != 4) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ARGUMENT;
		}
		var parentPartition = this.context.memoryManager.userPartition;
		try {
			var block = parentPartition.allocate(size, type, 0, name);
			return this.blockUids.allocate(block);
		} catch (e) {
			console.error(e);
			return SceKernelErrors.ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK;
		}
	});

	GetMemoryBlockAddr = createNativeFunction(0xDB83A952, 150, 'int', 'int', this, (blockId: number) => {
		if (!this.blockUids.has(blockId)) return 0;
		var block = this.blockUids.get(blockId);
		return block.low;
	});

	FreeMemoryBlock = createNativeFunction(0x50F61D8A, 150, 'int', 'int', this, (blockId: number) => {
		if (!this.blockUids.has(blockId)) return SceKernelErrors.ERROR_KERNEL_UNKNOWN_UID;
		this.blockUids.remove(blockId);
		return 0;
	});

	sceKernelFreePartitionMemory = createNativeFunction(0xB6D61D02, 150, 'int', 'int', this, (partitionId: number) => {
		if (!this.partitionUids.has(partitionId)) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MEMBLOCK;
		var partition = this.partitionUids.get(partitionId);
		partition.deallocate();
		this.partitionUids.remove(partitionId);
		return 0;
	});

	sceKernelTotalFreeMemSize = createNativeFunction(0xF919F628, 150, 'int', '', this, () => {
		return this.context.memoryManager.userPartition.getTotalFreeMemory() - 0x8000;
	});

	sceKernelGetBlockHeadAddr = createNativeFunction(0x9D9A5BA1, 150, 'uint', 'int', this, (partitionId: number) => {
		if (!this.partitionUids.has(partitionId)) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_MEMBLOCK;
		var block = this.partitionUids.get(partitionId)
		return block.low;
	});

	/**
		* Get the size of the largest free memory block.
		*/
	sceKernelMaxFreeMemSize = createNativeFunction(0xA291F107, 150, 'int', '', this, () => {
		return this.context.memoryManager.userPartition.nonAllocatedPartitions.max(partition => partition.size).size;
	});

	sceKernelSetCompiledSdkVersion = createNativeFunction(0x7591C7DB, 150, 'int', 'uint', this, (sdkVersion: number) => {
		console.info(sprintf('sceKernelSetCompiledSdkVersion: %08X', sdkVersion));
	});

	sceKernelSetCompilerVersion = createNativeFunction(0xF77D77CB, 150, 'int', 'uint', this, (version: number) => {
		console.info(sprintf('sceKernelSetCompilerVersion: %08X', version));
	});

	sceKernelSetCompiledSdkVersion395 = createNativeFunction(0xEBD5C3E6, 150, 'int', 'uint', this, (param: number) => {
		console.info(sprintf('sceKernelSetCompiledSdkVersion395: %08X', param));
	});

	sceKernelDevkitVersion = createNativeFunction(0x3FC9AE6A, 150, 'int', 'uint', this, (version: number) => {
		//var Version = HleConfig.FirmwareVersion;
		//return (Version.Major << 24) | (Version.Minor << 16) | (Version.Revision << 8) | 0x10;
		return 0x02070110;
	});

	sceKernelPrintf = createNativeFunction(0x13A5ABEF, 150, 'void', 'Thread/string', this, (thread: Thread, format: string) => {
		var gprIndex = 5;
		var memory = this.context.memory;
		var gpr = thread.state.gpr;

		var readParam = (type) => {
			switch (type) {
				case '%s':
					return memory.readStringz(gpr[gprIndex++]);
				case '%d':
					return String(gpr[gprIndex++]);
			}
			return '??[' + type + ']??';
		};
		console.info('sceKernelPrintf: ' + format.replace(/%[dsux]/g, (data) => {
			return readParam(data);
		}));
		//console.warn(this.context.memory.readStringz(thread.state.gpr[5]));
	});
}
