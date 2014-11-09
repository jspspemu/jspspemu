///<reference path="../global.d.ts" />
var Memory = (function () {
    function Memory() {
        this.invalidateDataRange = new Signal();
        this.invalidateDataAll = new Signal();
        this.writeBreakpoints = [];
        //this.buffer = new ArrayBuffer(0x0FFFFFFF + 1);
        this.buffer = new ArrayBuffer(0xa000000 + 4);
        this.data = new DataView(this.buffer);
        this.s8 = new Int8Array(this.buffer);
        this.u8 = new Uint8Array(this.buffer);
        this.u16 = new Uint16Array(this.buffer);
        this.s16 = new Int16Array(this.buffer);
        this.s32 = new Int32Array(this.buffer);
        this.u32 = new Uint32Array(this.buffer);
        this.f32 = new Float32Array(this.buffer);
        this._updateWriteFunctions();
    }
    Object.defineProperty(Memory, "instance", {
        get: function () {
            if (!Memory._instance)
                Memory._instance = new Memory();
            return Memory._instance;
        },
        enumerable: true,
        configurable: true
    });
    Memory.prototype.reset = function () {
        this.memset(Memory.DEFAULT_FRAME_ADDRESS, 0, 0x200000);
    };
    Memory.prototype.availableAfterAddress = function (address) {
        return this.buffer.byteLength - (address & Memory.MASK);
    };
    Memory.prototype.getPointerPointer = function (type, address) {
        if (address == 0)
            return null;
        return new Pointer(type, this, address);
    };
    Memory.prototype.getPointerDataView = function (address, size) {
        if (!size)
            size = this.availableAfterAddress(address);
        return new DataView(this.buffer, address & Memory.MASK, size);
    };
    Memory.prototype.getPointerU8Array = function (address, size) {
        if (!size)
            size = this.availableAfterAddress(address);
        return new Uint8Array(this.buffer, address & Memory.MASK, size);
    };
    Memory.prototype.getPointerU16Array = function (address, size) {
        if (!size)
            size = this.availableAfterAddress(address);
        return new Uint16Array(this.buffer, address & Memory.MASK, size >> 1);
    };
    Memory.prototype.isAddressInRange = function (address, min, max) {
        address &= Memory.MASK;
        address >>>= 0;
        min &= Memory.MASK;
        min >>>= 0;
        max &= Memory.MASK;
        max >>>= 0;
        return (address >= min) && (address < max);
    };
    Memory.prototype.isValidAddress = function (address) {
        address &= Memory.MASK;
        if ((address & 0x3E000000) == 0x08000000)
            return true;
        if ((address & 0x3F800000) == 0x04000000)
            return true;
        if ((address & 0xBFFF0000) == 0x00010000)
            return true;
        if (this.isAddressInRange(address, Memory.DEFAULT_FRAME_ADDRESS, Memory.DEFAULT_FRAME_ADDRESS + 0x200000))
            return true;
        if (this.isAddressInRange(address, 0x08000000, 0x08000000 + 0x04000000))
            return true;
        return false;
    };
    Memory.prototype.getPointerStream = function (address, size) {
        //console.log(sprintf("getPointerStream: %08X", address));
        if (address == 0)
            return null;
        if (size === 0)
            return new Stream(new DataView(new ArrayBuffer(0)));
        if (!this.isValidAddress(address))
            return Stream.INVALID;
        if (size === undefined)
            size = this.availableAfterAddress(address & Memory.MASK);
        if (size < 0)
            return Stream.INVALID;
        if (size > this.u8.length - (address & Memory.MASK))
            return Stream.INVALID;
        return new Stream(this.getPointerDataView(address & Memory.MASK, size));
    };
    Memory.prototype.getU8Array = function (address, size) {
        if (address == 0)
            return null;
        if (!this.isValidAddress(address))
            return null;
        if (!size)
            size = this.availableAfterAddress(address & Memory.MASK);
        return this.getPointerU8Array(address & Memory.MASK, size);
    };
    Memory.prototype.getU16Array = function (address, size) {
        if (address == 0)
            return null;
        if (!this.isValidAddress(address))
            return null;
        if (!size)
            size = this.availableAfterAddress(address & Memory.MASK);
        return this.getPointerU16Array(address & Memory.MASK, size);
    };
    Memory.prototype._updateWriteFunctions = function () {
        if (this.writeBreakpoints.length > 0) {
            this.writeInt8 = this._writeInt8_break;
            this.writeInt16 = this._writeInt16_break;
            this.writeInt32 = this._writeInt32_break;
            this.writeFloat32 = this._writeFloat32_break;
        }
        else {
            this.writeInt8 = this._writeInt8;
            this.writeInt16 = this._writeInt16;
            this.writeInt32 = this._writeInt32;
            this.writeFloat32 = this._writeFloat32;
        }
    };
    Memory.prototype.addWatch4 = function (address) {
        var _this = this;
        this.addWriteAction(address, function (address) {
            console.log(sprintf('Watch:0x%08X <- 0x%08X', address, _this.readUInt32(address)));
        });
    };
    Memory.prototype.addBreakpointOnValue = function (address, value) {
        //Watch: 0x0951044C < - 0x2A000000 
        var _this = this;
        this.addWriteAction(address, function (actualAddress) {
            var actualValue = _this.readUInt32(address);
            console.log(sprintf('TryBreakpoint:0x%08X <- 0x%08X | 0x%08X (%d)', address, actualValue, value, (actualValue == value)));
            if (actualValue == value) {
                debugger;
            }
        });
    };
    Memory.prototype.addWriteAction = function (address, action) {
        this.writeBreakpoints.push({ address: address, action: action });
        this._updateWriteFunctions();
    };
    Memory.prototype._checkWriteBreakpoints = function (start, end) {
        start &= Memory.MASK;
        end &= Memory.MASK;
        for (var n = 0; n < this.writeBreakpoints.length; n++) {
            var writeBreakpoint = this.writeBreakpoints[n];
            var addressCheck = writeBreakpoint.address & Memory.MASK;
            if (addressCheck >= start && addressCheck < end) {
                writeBreakpoint.action(writeBreakpoint.address);
            }
        }
    };
    Memory.prototype._writeInt8 = function (address, value) {
        this.u8[(address & Memory.MASK) >> 0] = value;
    };
    Memory.prototype._writeInt16 = function (address, value) {
        this.u16[(address & Memory.MASK) >> 1] = value;
    };
    Memory.prototype._writeInt32 = function (address, value) {
        this.u32[(address & Memory.MASK) >> 2] = value;
    };
    Memory.prototype._writeFloat32 = function (address, value) {
        this.f32[(address & Memory.MASK) >> 2] = value;
    };
    Memory.prototype._writeInt8_break = function (address, value) {
        this._writeInt8(address, value);
        this._checkWriteBreakpoints(address, address + 1);
    };
    Memory.prototype._writeInt16_break = function (address, value) {
        this._writeInt16(address, value);
        this._checkWriteBreakpoints(address, address + 2);
    };
    Memory.prototype._writeInt32_break = function (address, value) {
        this._writeInt32(address, value);
        this._checkWriteBreakpoints(address, address + 4);
    };
    Memory.prototype._writeFloat32_break = function (address, value) {
        this._writeFloat32(address, value);
        this._checkWriteBreakpoints(address, address + 4);
    };
    Memory.prototype.writeInt8 = function (address, value) {
        this._writeInt8(address, value);
    };
    Memory.prototype.writeInt16 = function (address, value) {
        this._writeInt16(address, value);
    };
    Memory.prototype.writeInt32 = function (address, value) {
        this._writeInt32(address, value);
    };
    Memory.prototype.writeFloat32 = function (address, value) {
        this._writeFloat32(address, value);
    };
    Memory.prototype.readInt8 = function (address) {
        return this.s8[(address & Memory.MASK) >> 0];
    };
    Memory.prototype.readUInt8 = function (address) {
        return this.u8[(address & Memory.MASK) >> 0];
    };
    Memory.prototype.readInt16 = function (address) {
        return this.s16[(address & Memory.MASK) >> 1];
    };
    Memory.prototype.readUInt16 = function (address) {
        return this.u16[(address & Memory.MASK) >> 1];
    };
    Memory.prototype.readInt32 = function (address) {
        return this.s32[(address & Memory.MASK) >> 2];
    };
    Memory.prototype.readUInt32 = function (address) {
        return this.u32[(address & Memory.MASK) >> 2];
    };
    Memory.prototype.readFloat32 = function (address) {
        return this.f32[(address & Memory.MASK) >> 2];
    };
    Memory.prototype.writeBytes = function (address, data) {
        Memory.memoryCopy(data, 0, this.buffer, address & Memory.MASK, data.byteLength);
        this._checkWriteBreakpoints(address, address + data.byteLength);
    };
    Memory.prototype.readArrayBuffer = function (address, length) {
        return this.buffer.slice(address, address + length);
    };
    Memory.prototype.readBytes = function (address, length) {
        return new Uint8Array(this.buffer, address, length);
    };
    Memory.prototype.writeUint8Array = function (address, data) {
        for (var n = 0; n < data.length; n++)
            this.writeInt8(address + n, data[n]);
        this._checkWriteBreakpoints(address, address + data.length);
    };
    Memory.prototype.writeStream = function (address, stream) {
        stream = stream.sliceWithLength(0, stream.length);
        while (stream.available > 0) {
            this.writeInt8(address++, stream.readUInt8());
        }
        this._checkWriteBreakpoints(address, address + stream.length);
    };
    Memory.prototype.readStringz = function (address) {
        if (address == 0)
            return null;
        var out = '';
        while (true) {
            var _char = this.readUInt8(address++);
            if (_char == 0)
                break;
            out += String.fromCharCode(_char);
        }
        return out;
    };
    Memory.prototype.sliceWithBounds = function (low, high) {
        return new Stream(new DataView(this.buffer, low & Memory.MASK, high - low));
    };
    Memory.prototype.sliceWithSize = function (address, size) {
        return new Stream(new DataView(this.buffer, address & Memory.MASK, size));
    };
    Memory.prototype.copy = function (from, to, length) {
        this.u8.set(new Uint8Array(this.buffer, from & Memory.MASK, length), to & Memory.MASK);
        this._checkWriteBreakpoints(to, to + length);
    };
    Memory.prototype.memset = function (address, value, length) {
        address &= Memory.MASK;
        var start = address;
        var end = start + length;
        var value8 = value & 0xFF;
        while (address < end)
            this.u8[address++] = value8;
        this._checkWriteBreakpoints(address, address + length);
        /*
        var value16 = value8 | (value8 << 8);
        var value32 = value16 | (value16 << 16);

        debugger;

        while ((address & 3) && (address < end)) this.u8[address++] = value8;

        var end32 = end & ~3;

        while (address < end32) {
            this.u32[address >>> 2] = value32;
            address += 4;
        }

        // @TODO: Optimize generating 32-bit values
        while (address < end) this.u8[address++] = value8;
        */
    };
    /*
    private hashAligned(result:number, address: number, count: number) {
        var u32 = this.u32;
        var address4 = (address >> 2);
        var count4 = (count >> 2);
        var m = 0;
        for (var n = 0; n < count4; n++) {
            var v = u32[address4++];
            result ^= n << 22;
            result += (v >> 24) & 0xFF;
            result += (v >> 16) & 0xFF;
            result += (v >> 8) & 0xFF;
            result += (v >> 0) & 0xFF;
        }
        return result;
    }

    hash(address: number, count: number) {
        var result = 0;
        var u8 = this.u8;
        while (address & 3) { result += u8[address++]; count--; }
        this.hashAligned(result, address, count);
        return result;
    }
    */
    Memory.prototype.hashWordCount = function (addressAligned, count) {
        /*
        addressAligned >>>= 2;
        count >>>= 2;
        count >>>= 1;

        var result = 0;
        var u32 = this.u32;
        while (count-- > 0) {
            result += u32[addressAligned++];
            result ^= u32[addressAligned++];
        }
        return result;
        */
        addressAligned >>>= 2;
        count >>>= 2;
        var result = 0;
        var u32 = this.u32;
        for (var n = 0; n < count; n++) {
            var v = u32[addressAligned + n];
            result = (result + v ^ n) | 0;
        }
        return result;
        /*
        var result1 = 0;
        var result2 = 0;
        var u32 = this.u32;
        for (var n = 0; n < count; n++) {
            var v = u32[addressAligned + n];

            result1 = (result1 + v * n) | 0;
            result2 = ((result2 + v + n) ^ (n << 17)) | 0;
        }
        return result1 + result2 * Math.pow(2, 24);
        */
    };
    Memory.prototype.hash = function (address, count) {
        var result = 0;
        while (address & 3) {
            result += this.u8[address++];
            count--;
        }
        var count2 = MathUtils.prevAligned(count, 4);
        result += this.hashWordCount(address, count2);
        address += count2;
        count -= count2;
        while (address & 3) {
            result += this.u8[address++] * 7;
            count--;
        }
        return result;
        /*
        var result1 = 0;
        var result2 = 0;
        var u8 = this.u8;
        for (var n = 0; n < count; n++) {
            var byte = u8[address++];
            result1 = (result1 + Math.imul(byte, n + 1)) | 0;
            result2 = ((result2 + byte + n) ^ (n << 17)) | 0;
        }
        return result1 + result2 * Math.pow(2, 24);
        */
    };
    Memory.memoryCopy = function (source, sourcePosition, destination, destinationPosition, length) {
        var _source = new Uint8Array(source, sourcePosition, length);
        var _destination = new Uint8Array(destination, destinationPosition, length);
        _destination.set(_source);
    };
    Memory.prototype.dump = function (name) {
        if (name === void 0) { name = 'memory.bin'; }
        saveAs(new Blob([this.getPointerDataView(0x08000000, 0x2000000)]), name);
    };
    Memory.DEFAULT_FRAME_ADDRESS = 0x04000000;
    Memory.MASK = 0x0FFFFFFF;
    Memory.MAIN_OFFSET = 0x08000000;
    return Memory;
})();
exports.Memory = Memory;
//# sourceMappingURL=memory.js.map