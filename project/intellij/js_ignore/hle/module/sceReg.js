///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var createNativeFunction = _utils.createNativeFunction;
var sceReg = (function () {
    function sceReg(context) {
        this.context = context;
        this.sceRegOpenRegistry = createNativeFunction(0x92E41280, 150, 'int', 'void*/int/void*', this, function (regParamPtr, mode, regHandlePtr) {
            var regParam = RegParam.struct.read(regParamPtr);
            console.warn('sceRegOpenRegistry: ' + regParam.name);
            regHandlePtr.writeInt32(0);
            return 0;
        });
        this.sceRegOpenCategory = createNativeFunction(0x1D8A762E, 150, 'int', 'int/string/int/void*', this, function (regHandle, name, mode, regCategoryHandlePtr) {
            console.warn('sceRegOpenCategory: ' + name);
            return 0;
        });
        this.sceRegGetKeyInfo = createNativeFunction(0xD4475AA8, 150, 'int', 'int/string/void*/void*/void*', this, function (categoryHandle, name, regKeyHandlePtr, regKeyTypesPtr, sizePtr) {
            console.warn('sceRegGetKeyInfo: ' + name);
            return 0;
        });
        this.sceRegGetKeyValue = createNativeFunction(0x28A8E98A, 150, 'int', 'int/int/void*/int', this, function (categoryHandle, regKeyHandle, bufferPtr, size) {
            console.warn('sceRegGetKeyValue');
            return 0;
        });
        this.sceRegFlushCategory = createNativeFunction(0x0D69BF40, 150, 'int', 'int', this, function (categoryHandle) {
            console.warn('sceRegFlushCategory');
            return 0;
        });
        this.sceRegCloseCategory = createNativeFunction(0x0CAE832B, 150, 'int', 'int', this, function (categoryHandle) {
            console.warn('sceRegCloseCategory');
            return 0;
        });
        this.sceRegFlushRegistry = createNativeFunction(0x39461B4D, 150, 'int', 'int', this, function (regHandle) {
            console.warn('sceRegFlushRegistry');
            return 0;
        });
        this.sceRegCloseRegistry = createNativeFunction(0xFA8A5739, 150, 'int', 'int', this, function (regHandle) {
            console.warn('sceRegCloseRegistry');
            return 0;
        });
    }
    return sceReg;
})();
exports.sceReg = sceReg;
var RegParam = (function () {
    function RegParam() {
    }
    RegParam.struct = StructClass.create(RegParam, [
        { regType: UInt32 },
        { name: Stringz(256) },
        { nameLength: Int32 },
        { unknown2: Int32 },
        { unknown3: Int32 },
    ]);
    return RegParam;
})();
//# sourceMappingURL=sceReg.js.map