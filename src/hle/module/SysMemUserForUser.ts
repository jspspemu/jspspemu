import _utils = require('../utils');
import _manager = require('../manager');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');
import MemoryAnchor = _manager.MemoryAnchor;
import MemoryPartition = _manager.MemoryPartition;

export class SysMemUserForUser {
	constructor(private context: _context.EmulatorContext) { }

	private blockUids = new UidCollection<MemoryPartition>(1);

	sceKernelAllocPartitionMemory = createNativeFunction(0x237DBD4F, 150, 'int', 'int/string/int/int/int', this, (partitionId: number, name: string, anchor: MemoryAnchor, size: number, address: number) => {
		try {
			var parentPartition = this.context.memoryManager.memoryPartitionsUid[partitionId];
			var allocatedPartition = parentPartition.allocate(size, anchor, address, name);
			console.info(sprintf("SysMemUserForUser.sceKernelAllocPartitionMemory (partitionId:%d, name:'%s', type:%d, size:%d, address:%08X) : %08X-%08X", partitionId, name, anchor, size, address, allocatedPartition.low, allocatedPartition.high));
			return this.blockUids.allocate(allocatedPartition);
		} catch (e) {
			console.error(e);
			return SceKernelErrors.ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK;
		}
	});

	sceKernelFreePartitionMemory = createNativeFunction(0xB6D61D02, 150, 'int', 'int', this, (blockId: number) => {
		var partition = this.blockUids.get(blockId);
		partition.deallocate();
		this.blockUids.remove(blockId);
		return 0;
	});

	sceKernelTotalFreeMemSize = createNativeFunction(0xF919F628, 150, 'int', '', this, () => {
		return this.context.memoryManager.userPartition.getTotalFreeMemory() - 0x8000;
	});

	sceKernelGetBlockHeadAddr = createNativeFunction(0x9D9A5BA1, 150, 'int', 'int', this, (blockId: number) => {
		var block = this.blockUids.get(blockId)
		return block.low;
	});

	/**
		* Get the size of the largest free memory block.
		*/
	sceKernelMaxFreeMemSize = createNativeFunction(0xA291F107, 150, 'int', '', this, () => {
		return this.context.memoryManager.userPartition.nonAllocatedPartitions.max(partition => partition.size);
	});

	sceKernelSetCompiledSdkVersion = createNativeFunction(0x7591C7DB, 150, 'int', 'uint', this, (sdkVersion: number) => {
		console.info(sprintf('sceKernelSetCompiledSdkVersion: %08X', sdkVersion));
	});

	sceKernelSetCompilerVersion = createNativeFunction(0xF77D77CB, 150, 'int', 'uint', this, (version: number) => {
		console.info(sprintf('sceKernelSetCompilerVersion: %08X', version));
	});

	sceKernelPrintf = createNativeFunction(0x13A5ABEF, 150, 'void', 'string', this, (format: string) => {
		console.info('sceKernelPrintf: ' + format);
	});
}
