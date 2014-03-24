var hle;
(function (hle) {
    (function (modules) {
        var SysMemUserForUser = (function () {
            function SysMemUserForUser(context) {
                var _this = this;
                this.context = context;
                this.blockUids = new UidCollection(1);
                this.sceKernelAllocPartitionMemory = hle.modules.createNativeFunction(0x237DBD4F, 150, 'int', 'int/string/int/int/int', this, function (partitionId, name, anchor, size, address) {
                    var parentPartition = _this.context.memoryManager.memoryPartitionsUid[partitionId];
                    var allocatedPartition = parentPartition.allocate(size, anchor, address, name);
                    console.info(sprintf("SysMemUserForUser.sceKernelAllocPartitionMemory (partitionId:%d, name:%s, type:%d, size:%d, address:%08X)", partitionId, name, anchor, size, address));
                    return _this.blockUids.allocate(allocatedPartition);
                });
                this.sceKernelFreePartitionMemory = hle.modules.createNativeFunction(0xB6D61D02, 150, 'int', 'int', this, function (blockId) {
                    var partition = _this.blockUids.get(blockId);
                    partition.deallocate();
                    _this.blockUids.remove(blockId);
                    return 0;
                });
                this.sceKernelGetBlockHeadAddr = hle.modules.createNativeFunction(0x9D9A5BA1, 150, 'int', 'int', this, function (blockId) {
                    var block = _this.blockUids.get(blockId);
                    return block.low;
                });
                /**
                * Get the size of the largest free memory block.
                */
                this.sceKernelMaxFreeMemSize = hle.modules.createNativeFunction(0xA291F107, 150, 'int', '', this, function () {
                    return _this.context.memoryManager.userPartition.nonAllocatedPartitions.max(function (partition) {
                        return partition.size;
                    });
                });
                this.sceKernelSetCompiledSdkVersion = hle.modules.createNativeFunction(0x7591C7DB, 150, 'int', 'uint', this, function (sdkVersion) {
                    console.info(sprintf('sceKernelSetCompiledSdkVersion: %08X', sdkVersion));
                });
                this.sceKernelSetCompilerVersion = hle.modules.createNativeFunction(0xF77D77CB, 150, 'int', 'uint', this, function (version) {
                    console.info(sprintf('sceKernelSetCompilerVersion: %08X', version));
                });
            }
            return SysMemUserForUser;
        })();
        modules.SysMemUserForUser = SysMemUserForUser;
    })(hle.modules || (hle.modules = {}));
    var modules = hle.modules;
})(hle || (hle = {}));
//# sourceMappingURL=SysMemUserForUser.js.map
