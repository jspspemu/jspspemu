var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _vfs = require('./vfs');
var _manager = require('../manager');
_manager.CallbackManager;
var _memory = require('../../core/memory');
var SceKernelErrors = require('../SceKernelErrors');
var ProxyVfs = _vfs.ProxyVfs;
var MemoryStickVfs = (function (_super) {
    __extends(MemoryStickVfs, _super);
    function MemoryStickVfs(parentVfsList, callbackManager, memory) {
        _super.call(this, parentVfsList);
        this.callbackManager = callbackManager;
        this.memory = memory;
    }
    MemoryStickVfs.prototype.devctlAsync = function (command, input, output) {
        switch (command) {
            case 37902371 /* CheckInserted */:
                if (output == null || output.length < 4)
                    return 2147549206 /* ERROR_ERRNO_INVALID_ARGUMENT */;
                // 0 - Device is not assigned (callback not registered).
                // 1 - Device is assigned (callback registered).
                output.writeInt32(1);
                return 0;
            case 37836833 /* MScmRegisterMSInsertEjectCallback */:
                if (input == null || input.length < 4)
                    return 2147549206 /* ERROR_ERRNO_INVALID_ARGUMENT */;
                var callbackId = input.readInt32();
                this.callbackManager.notify(callbackId, 1);
                return 0;
            case 37836834 /* MScmUnregisterMSInsertEjectCallback */:
                // Ignore.
                return 0;
            case 37902360 /* GetMemoryStickCapacity */:
                if (input == null || input.length < 4)
                    return 2147549206 /* ERROR_ERRNO_INVALID_ARGUMENT */;
                var structAddress = input.readInt32();
                var structStream = this.memory.getPointerStream(structAddress, SizeInfoStruct.struct.length);
                var sizeInfo = new SizeInfoStruct();
                var memoryStickSectorSize = (32 * 1024);
                //var TotalSpaceInBytes = 2L * 1024 * 1024 * 1024;
                var freeSpaceInBytes = 1 * 1024 * 1024 * 1024;
                sizeInfo.sectorSize = 0x200;
                sizeInfo.sectorCount = (memoryStickSectorSize / sizeInfo.sectorSize);
                sizeInfo.maxClusters = (freeSpaceInBytes * 95 / 100) / (sizeInfo.sectorSize * sizeInfo.sectorCount);
                sizeInfo.freeClusters = sizeInfo.maxClusters;
                sizeInfo.maxSectors = sizeInfo.maxClusters;
                SizeInfoStruct.struct.write(structStream, sizeInfo);
                return 0;
            case 33708038 /* CheckMemoryStickIsInserted */:
                output.writeInt32(1);
                return 0;
            case 33708033 /* CheckMemoryStickStatus */:
                // 0 <- Busy
                // 1 <- Ready
                output.writeInt32(4);
                return 0;
            default:
                throw (new Error("Invalid MemoryStick command '" + command + "'"));
                break;
        }
        return 0;
    };
    return MemoryStickVfs;
})(ProxyVfs);
exports.MemoryStickVfs = MemoryStickVfs;
(function (CommandType) {
    CommandType[CommandType["CheckInserted"] = 0x02425823] = "CheckInserted";
    CommandType[CommandType["MScmRegisterMSInsertEjectCallback"] = 0x02415821] = "MScmRegisterMSInsertEjectCallback";
    CommandType[CommandType["MScmUnregisterMSInsertEjectCallback"] = 0x02415822] = "MScmUnregisterMSInsertEjectCallback";
    CommandType[CommandType["GetMemoryStickCapacity"] = 0x02425818] = "GetMemoryStickCapacity";
    CommandType[CommandType["CheckMemoryStickIsInserted"] = 0x02025806] = "CheckMemoryStickIsInserted";
    CommandType[CommandType["CheckMemoryStickStatus"] = 0x02025801] = "CheckMemoryStickStatus";
})(exports.CommandType || (exports.CommandType = {}));
var CommandType = exports.CommandType;
var SizeInfoStruct = (function () {
    function SizeInfoStruct() {
    }
    SizeInfoStruct.struct = StructClass.create(SizeInfoStruct, [
        { maxClusters: UInt32 },
        { freeClusters: UInt32 },
        { maxSectors: UInt32 },
        { sectorSize: UInt32 },
        { sectorCount: UInt32 },
    ]);
    return SizeInfoStruct;
})();
//# sourceMappingURL=vfs_ms.js.map