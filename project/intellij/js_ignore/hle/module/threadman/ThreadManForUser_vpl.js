///<reference path="../../../global.d.ts" />
var _utils = require('../../utils');
var _cpu = require('../../../core/cpu');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../../SceKernelErrors');
var _manager = require('../../manager');
var MemoryAnchor = _manager.MemoryAnchor;
var ThreadManForUser = (function () {
    function ThreadManForUser(context) {
        var _this = this;
        this.context = context;
        this.vplUid = new UidCollection(1);
        this.sceKernelCreateVpl = createNativeFunction(0x56C039B5, 150, 'int', 'string/int/int/int/void*', this, function (name, partitionId, attribute, size, optionsPtr) {
            var partition = _this.context.memoryManager.memoryPartitionsUid[partitionId];
            var allocatedPartition = partition.allocate(size, (attribute & 16384 /* PSP_VPL_ATTR_ADDR_HIGH */) ? 1 /* High */ : 0 /* Low */);
            var vpl = new Vpl(name, allocatedPartition);
            return _this.vplUid.allocate(vpl);
        });
        this.sceKernelTryAllocateVpl = createNativeFunction(0xAF36D708, 150, 'int', 'int/int/void*', this, function (vplId, size, addressPtr) {
            var vpl = _this.vplUid.get(vplId);
            try {
                var item = vpl.partition.allocateLow(size);
                console.log('-->', item.low);
                if (addressPtr)
                    addressPtr.writeInt32(item.low);
                return 0;
            }
            catch (e) {
                console.error(e);
                return 2147615120 /* ERROR_KERNEL_NO_MEMORY */;
            }
        });
    }
    return ThreadManForUser;
})();
exports.ThreadManForUser = ThreadManForUser;
var Vpl = (function () {
    function Vpl(name, partition) {
        this.name = name;
        this.partition = partition;
    }
    return Vpl;
})();
var VplAttributeFlags;
(function (VplAttributeFlags) {
    VplAttributeFlags[VplAttributeFlags["PSP_VPL_ATTR_MASK"] = 0x41FF] = "PSP_VPL_ATTR_MASK";
    VplAttributeFlags[VplAttributeFlags["PSP_VPL_ATTR_ADDR_HIGH"] = 0x4000] = "PSP_VPL_ATTR_ADDR_HIGH";
    VplAttributeFlags[VplAttributeFlags["PSP_VPL_ATTR_EXT"] = 0x8000] = "PSP_VPL_ATTR_EXT";
})(VplAttributeFlags || (VplAttributeFlags = {}));
//# sourceMappingURL=ThreadManForUser_vpl.js.map