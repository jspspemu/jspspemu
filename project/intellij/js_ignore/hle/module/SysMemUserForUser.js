///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _manager = require('../manager');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var console = logger.named('module.SysMemUserForUser');
var SysMemUserForUser = (function () {
    function SysMemUserForUser(context) {
        var _this = this;
        this.context = context;
        this.partitionUids = new UidCollection(1);
        this.blockUids = new UidCollection(1);
        this.sceKernelAllocPartitionMemory = createNativeFunction(0x237DBD4F, 150, 'int', 'int/string/int/int/int', this, function (partitionId, name, anchor, size, address) {
            if (name == null)
                return 2147614721 /* ERROR_ERROR */;
            try {
                var parentPartition = _this.context.memoryManager.memoryPartitionsUid[partitionId];
                var allocatedPartition = parentPartition.allocate(size, anchor, address, name);
                console.info(sprintf("SysMemUserForUser.sceKernelAllocPartitionMemory (partitionId:%d, name:'%s', type:%d, size:%d, address:%08X) : %08X-%08X", partitionId, name, anchor, size, address, allocatedPartition.low, allocatedPartition.high));
                return _this.partitionUids.allocate(allocatedPartition);
            }
            catch (e) {
                console.error(e);
                return 2147614937 /* ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK */;
            }
        });
        this.AllocMemoryBlock = createNativeFunction(0xFE707FDF, 150, 'int', 'string/uint/uint/void*', this, function (name, type, size, paramsAddrPtr) {
            if (name == null)
                return 2147614721 /* ERROR_ERROR */;
            if (type < 0 || type > 1)
                return 2147614936 /* ERROR_KERNEL_ILLEGAL_MEMBLOCK_ALLOC_TYPE */;
            if (size == 0)
                return 2147614937 /* ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK */;
            if (paramsAddrPtr) {
                var size = paramsAddrPtr.readInt32();
                var unk = paramsAddrPtr.readInt32();
                if (size != 4)
                    return 2147614930 /* ERROR_KERNEL_ILLEGAL_ARGUMENT */;
            }
            var parentPartition = _this.context.memoryManager.userPartition;
            try {
                var block = parentPartition.allocate(size, type, 0, name);
                return _this.blockUids.allocate(block);
            }
            catch (e) {
                console.error(e);
                return 2147614937 /* ERROR_KERNEL_FAILED_ALLOC_MEMBLOCK */;
            }
        });
        this.GetMemoryBlockAddr = createNativeFunction(0xDB83A952, 150, 'int', 'int', this, function (blockId) {
            if (!_this.blockUids.has(blockId))
                return 0;
            var block = _this.blockUids.get(blockId);
            return block.low;
        });
        this.FreeMemoryBlock = createNativeFunction(0x50F61D8A, 150, 'int', 'int', this, function (blockId) {
            if (!_this.blockUids.has(blockId))
                return 2147614923 /* ERROR_KERNEL_UNKNOWN_UID */;
            _this.blockUids.remove(blockId);
            return 0;
        });
        this.sceKernelFreePartitionMemory = createNativeFunction(0xB6D61D02, 150, 'int', 'int', this, function (partitionId) {
            if (!_this.partitionUids.has(partitionId))
                return 2147615158 /* ERROR_KERNEL_ILLEGAL_MEMBLOCK */;
            var partition = _this.partitionUids.get(partitionId);
            partition.deallocate();
            _this.partitionUids.remove(partitionId);
            return 0;
        });
        this.sceKernelTotalFreeMemSize = createNativeFunction(0xF919F628, 150, 'int', '', this, function () {
            return _this.context.memoryManager.userPartition.getTotalFreeMemory() - 0x8000;
        });
        this.sceKernelGetBlockHeadAddr = createNativeFunction(0x9D9A5BA1, 150, 'uint', 'int', this, function (partitionId) {
            if (!_this.partitionUids.has(partitionId))
                return 2147615158 /* ERROR_KERNEL_ILLEGAL_MEMBLOCK */;
            var block = _this.partitionUids.get(partitionId);
            return block.low;
        });
        /**
            * Get the size of the largest free memory block.
            */
        this.sceKernelMaxFreeMemSize = createNativeFunction(0xA291F107, 150, 'int', '', this, function () {
            return _this.context.memoryManager.userPartition.nonAllocatedPartitions.max(function (partition) { return partition.size; }).size;
        });
        this.sceKernelSetCompiledSdkVersion = createNativeFunction(0x7591C7DB, 150, 'int', 'uint', this, function (sdkVersion) {
            console.info(sprintf('sceKernelSetCompiledSdkVersion: %08X', sdkVersion));
        });
        this.sceKernelSetCompilerVersion = createNativeFunction(0xF77D77CB, 150, 'int', 'uint', this, function (version) {
            console.info(sprintf('sceKernelSetCompilerVersion: %08X', version));
        });
        this.sceKernelSetCompiledSdkVersion395 = createNativeFunction(0xEBD5C3E6, 150, 'int', 'uint', this, function (param) {
            console.info(sprintf('sceKernelSetCompiledSdkVersion395: %08X', param));
        });
        this.sceKernelDevkitVersion = createNativeFunction(0x3FC9AE6A, 150, 'int', 'uint', this, function (version) {
            //var Version = HleConfig.FirmwareVersion;
            //return (Version.Major << 24) | (Version.Minor << 16) | (Version.Revision << 8) | 0x10;
            return 0x02070110;
        });
        this.sceKernelPrintf = createNativeFunction(0x13A5ABEF, 150, 'void', 'Thread/string', this, function (thread, format) {
            var gprIndex = 5;
            var memory = _this.context.memory;
            var gpr = thread.state.gpr;
            var readParam = function (type) {
                switch (type) {
                    case '%s':
                        return memory.readStringz(gpr[gprIndex++]);
                    case '%d':
                        return String(gpr[gprIndex++]);
                }
                return '??[' + type + ']??';
            };
            console.info('sceKernelPrintf: ' + format.replace(/%[dsux]/g, function (data) {
                return readParam(data);
            }));
            //console.warn(this.context.memory.readStringz(thread.state.gpr[5]));
        });
    }
    return SysMemUserForUser;
})();
exports.SysMemUserForUser = SysMemUserForUser;
//# sourceMappingURL=SysMemUserForUser.js.map