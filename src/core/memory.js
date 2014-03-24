///<reference path="../util/utils.ts" />
var core;
(function (core) {
    var Memory = (function () {
        function Memory() {
            this.buffer = new ArrayBuffer(0x10000000);
            this.data = new DataView(this.buffer);
            this.s8 = new Int8Array(this.buffer);
            this.u8 = new Uint8Array(this.buffer);
            this.u16 = new Uint16Array(this.buffer);
            this.s16 = new Int16Array(this.buffer);
            this.u32 = new Uint32Array(this.buffer);
            this.f32 = new Float32Array(this.buffer);
        }
        Memory.prototype.getPointerDataView = function (address, size) {
            return new DataView(this.buffer, address & Memory.MASK, size);
        };

        Memory.prototype.getPointerStream = function (address, size) {
            if (address == 0)
                return null;
            return new Stream(this.getPointerDataView(address, size));
        };

        //writeInt8(address: number, value: number) { this.data.setUint8(address & Memory.MASK, value); }
        //readInt8(address: number) { return this.data.getInt8(address & Memory.MASK); }
        //readUInt8(address: number) { return this.data.getUint8(address & Memory.MASK); }
        //
        //writeInt16(address: number, value: number) { this.data.setUint16(address & Memory.MASK, value, true); }
        //readInt16(address: number) { return this.data.getInt16(address & Memory.MASK, true); }
        //readUInt16(address: number) { return this.data.getUint16(address & Memory.MASK, true); }
        //
        //writeInt32(address: number, value: number) { this.data.setUint32(address & Memory.MASK, value, true); }
        //readInt32(address: number) { return this.data.getInt32(address & Memory.MASK, true); }
        //readUInt32(address: number) { return this.data.getUint32(address & Memory.MASK, true); }
        //
        //writeFloat32(address: number, value: number) { this.data.setFloat32(address & Memory.MASK, value, true); }
        //readFloat32(address: number) { return this.data.getFloat32(address & Memory.MASK, true); }
        Memory.prototype.writeInt8 = function (address, value) {
            this.u8[(address >> 0) & Memory.MASK] = value;
        };
        Memory.prototype.readInt8 = function (address) {
            return this.s8[(address >> 0) & Memory.MASK];
        };
        Memory.prototype.readUInt8 = function (address) {
            return this.u8[(address >> 0) & Memory.MASK];
        };

        Memory.prototype.writeInt16 = function (address, value) {
            this.u16[(address >> 1) & Memory.MASK] = value;
        };
        Memory.prototype.readInt16 = function (address) {
            return this.s16[(address >> 1) & Memory.MASK];
        };
        Memory.prototype.readUInt16 = function (address) {
            return this.u16[(address >> 1) & Memory.MASK];
        };

        Memory.prototype.writeInt32 = function (address, value) {
            this.u32[(address >> 2) & Memory.MASK] = value;
        };
        Memory.prototype.readInt32 = function (address) {
            return this.u32[(address >> 2) & Memory.MASK];
        };
        Memory.prototype.readUInt32 = function (address) {
            return this.u32[(address >> 2) & Memory.MASK];
        };

        Memory.prototype.writeFloat32 = function (address, value) {
            this.f32[(address >> 2) & Memory.MASK] = value;
        };
        Memory.prototype.readFloat32 = function (address) {
            return this.f32[(address >> 2) & Memory.MASK];
        };

        Memory.prototype.writeBytes = function (address, data) {
            Memory.memoryCopy(data, 0, this.buffer, address, data.byteLength);
        };

        Memory.prototype.readBytes = function (address, length) {
            return new Uint8Array(this.buffer, address, length);
        };

        Memory.prototype.writeStream = function (address, stream) {
            stream = stream.sliceWithLength(0, stream.length);
            while (stream.available > 0) {
                this.writeInt8(address++, stream.readUInt8());
            }
        };

        Memory.prototype.readStringz = function (address) {
            var out = '';
            while (true) {
                var char = this.readUInt8(address++);
                if (char == 0)
                    break;
                out += String.fromCharCode(char);
            }
            return out;
        };

        Memory.prototype.sliceWithBounds = function (low, high) {
            return new Stream(new DataView(this.buffer, low, high - low));
        };

        Memory.prototype.sliceWithSize = function (address, size) {
            return new Stream(new DataView(this.buffer, address, size));
        };

        Memory.prototype.copy = function (from, to, length) {
            for (var n = 0; n < length; n++) {
                this.u8[to + n] = this.u8[from + n];
            }
        };

        Memory.memoryCopy = function (source, sourcePosition, destination, destinationPosition, length) {
            var _source = new Uint8Array(source, sourcePosition, length);
            var _destination = new Uint8Array(destination, destinationPosition, length);
            _destination.set(_source);
        };
        Memory.DEFAULT_FRAME_ADDRESS = 0x04100000;
        Memory.MASK = 0x0FFFFFFF;
        Memory.MAIN_OFFSET = 0x08000000;
        return Memory;
    })();
    core.Memory = Memory;
})(core || (core = {}));
//# sourceMappingURL=memory.js.map
