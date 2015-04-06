///<reference path="../global.d.ts" />

declare function saveAs(data: Blob, name: string):void;

class FastMemory {
	private buffer: ArrayBuffer;
	private s8: Uint8Array;
	private u8: Uint8Array;
	private s16: Int16Array;
	private u16: Uint16Array;
	private s32: Uint32Array;
	private u32: Uint32Array;
	private f32: Float32Array;
	private data: DataView;

	static DEFAULT_FRAME_ADDRESS: number = 0x04000000;

	static MASK = 0x0FFFFFFF;
	static MAIN_OFFSET = 0x08000000;

	invalidateDataRange = new Signal<NumericRange>();
	invalidateDataAll = new Signal();

	constructor() {
		//this.buffer = new ArrayBuffer(0x0FFFFFFF + 1);
		this.buffer = new ArrayBuffer(0x0a000000 + 4);
		//this.buffer = new ArrayBuffer(0x07000000 + 4);
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

	private availableAfterAddress(address:number) {
		return this.buffer.byteLength - (address & FastMemory.MASK);
	}

	getPointerPointer<T>(type: IType, address: number) {
		if (address == 0) return null;
		return new Pointer<T>(type, this, address);
	}

	getPointerDataView(address: number, size?: number) {
		if (!size) size = this.availableAfterAddress(address);
		return new DataView(this.buffer, address & FastMemory.MASK, size);
	}

	getPointerU8Array(address: number, size?: number) {
		if (!size) size = this.availableAfterAddress(address);
		return new Uint8Array(this.buffer, address & FastMemory.MASK, size);
	}

	getPointerU16Array(address: number, size?: number) {
		if (!size) size = this.availableAfterAddress(address);
		return new Uint16Array(this.buffer, address & FastMemory.MASK, size >> 1);
	}

	isAddressInRange(address: number, min: number, max: number) {
		address &= FastMemory.MASK; address >>>= 0;
		min &= FastMemory.MASK; min >>>= 0;
		max &= FastMemory.MASK; max >>>= 0;

		return (address >= min) && (address < max);
	}

	isValidAddress(address: number) {
		address &= FastMemory.MASK;
		if ((address & 0x3E000000) == 0x08000000) return true;
		if ((address & 0x3F800000) == 0x04000000) return true;
		if ((address & 0xBFFF0000) == 0x00010000) return true;
		if (this.isAddressInRange(address, FastMemory.DEFAULT_FRAME_ADDRESS, FastMemory.DEFAULT_FRAME_ADDRESS + 0x200000)) return true;
		if (this.isAddressInRange(address, 0x08000000, 0x08000000 + 0x04000000)) return true;
		return false;
	}

	getPointerStream(address: number, size?: number) {
		//console.log(sprintf("getPointerStream: %08X", address));
		if (address == 0) return null;
		if (size === 0) return new Stream(new DataView(new ArrayBuffer(0)));
		if (!this.isValidAddress(address)) return Stream.INVALID;
		if (size === undefined) size = this.availableAfterAddress(address & FastMemory.MASK);
		if (size < 0) return Stream.INVALID;
		if (size > this.u8.length - (address & FastMemory.MASK)) return Stream.INVALID;
		return new Stream(this.getPointerDataView(address & FastMemory.MASK, size));
	}

	getU8Array(address: number, size?: number) {
		if (address == 0) return null;
		if (!this.isValidAddress(address)) return null;
		if (!size) size = this.availableAfterAddress(address & FastMemory.MASK);
		return this.getPointerU8Array(address & FastMemory.MASK, size);
	}

	getU16Array(address: number, size?: number) {
		if (address == 0) return null;
		if (!this.isValidAddress(address)) return null;
		if (!size) size = this.availableAfterAddress(address & FastMemory.MASK);
		return this.getPointerU16Array(address & FastMemory.MASK, size);
	}

	private writeBreakpoints = <{ address: number; action: (address: number) => void; }[]>[]

	_updateWriteFunctions() {
		if (this.writeBreakpoints.length > 0) {
			this.writeInt8 = this._writeInt8_break;
			this.writeInt16 = this._writeInt16_break;
			this.writeInt32 = this._writeInt32_break;
			this.writeFloat32 = this._writeFloat32_break;
		} else {
			this.writeInt8 = this._writeInt8;
			this.writeInt16 = this._writeInt16;
			this.writeInt32 = this._writeInt32;
			this.writeFloat32 = this._writeFloat32;
		}
	}

	addWatch4(address: number) {
		this.addWriteAction(address, (address: number) => {
			console.log(sprintf('Watch:0x%08X <- 0x%08X', address, this.readUInt32(address)));
		});
	}

	addBreakpointOnValue(address: number, value: number) {
		//Watch: 0x0951044C < - 0x2A000000 

		this.addWriteAction(address, (actualAddress: number) => {
			var actualValue: number = this.readUInt32(address);

			console.log(sprintf('TryBreakpoint:0x%08X <- 0x%08X | 0x%08X (%d)', address, actualValue, value, (actualValue == value)));

			if (actualValue == value) {
				debugger;
			}
		});
	}

	addWriteAction(address: number, action: (address: number) => void) {
		this.writeBreakpoints.push({ address: address, action: action });

		this._updateWriteFunctions();
	}

	_checkWriteBreakpoints(start: number, end:number) {
		start &= FastMemory.MASK;
		end &= FastMemory.MASK;
		for (var n = 0; n < this.writeBreakpoints.length; n++) {
			var writeBreakpoint = this.writeBreakpoints[n];
			var addressCheck = writeBreakpoint.address & FastMemory.MASK;
			if (addressCheck >= start && addressCheck < end) {
				writeBreakpoint.action(writeBreakpoint.address);
			}
		}
	}

	protected _writeInt8(address: number, value: number) { this.u8[(address & FastMemory.MASK) >> 0] = value; }
	protected _writeInt16(address: number, value: number) { this.u16[(address & FastMemory.MASK) >> 1] = value; }
	protected _writeInt32(address: number, value: number) { this.u32[(address & FastMemory.MASK) >> 2] = value; }
	protected _writeFloat32(address: number, value: number) { this.f32[(address & FastMemory.MASK) >> 2] = value; }

	protected _writeInt8_break(address: number, value: number) { this._writeInt8(address, value); this._checkWriteBreakpoints(address, address + 1); }
	protected _writeInt16_break(address: number, value: number) { this._writeInt16(address, value); this._checkWriteBreakpoints(address, address + 2); }
	protected _writeInt32_break(address: number, value: number) { this._writeInt32(address, value); this._checkWriteBreakpoints(address, address + 4); }
	protected _writeFloat32_break(address: number, value: number) { this._writeFloat32(address, value); this._checkWriteBreakpoints(address, address + 4); }

	writeInt8(address: number, value: number) { this._writeInt8(address, value); }
	writeInt16(address: number, value: number) { this._writeInt16(address, value); }
	writeInt32(address: number, value: number) { this._writeInt32(address, value); }
	writeFloat32(address: number, value: number) { this._writeFloat32(address, value); }

	readInt8(address: number) { return this.s8[(address & FastMemory.MASK) >> 0]; }
	readUInt8(address: number) { return this.u8[(address & FastMemory.MASK) >> 0]; }
	readInt16(address: number) { return this.s16[(address & FastMemory.MASK) >> 1]; }
	readUInt16(address: number) { return this.u16[(address & FastMemory.MASK) >> 1]; }
	readInt32(address: number) { return this.s32[(address & FastMemory.MASK) >> 2]; }
	readUInt32(address: number) { return this.u32[(address & FastMemory.MASK) >> 2]; }
	readFloat32(address: number) { return this.f32[(address & FastMemory.MASK) >> 2]; }

	readUInt32_2(address: number) { return this.u32[address]; }

	writeBytes(address: number, data: ArrayBuffer) {
		FastMemory.memoryCopy(data, 0, this.buffer, address & FastMemory.MASK, data.byteLength);
		this._checkWriteBreakpoints(address, address + data.byteLength);
	}

	readArrayBuffer(address: number, length: number) {
		return this.buffer.slice(address, address + length);
	}

	readBytes(address: number, length: number) {
		return new Uint8Array(this.buffer, address, length);
	}

	writeUint8Array(address: number, data: Uint8Array) {
		for (var n = 0; n < data.length; n++) this.writeInt8(address + n, data[n]);
		this._checkWriteBreakpoints(address, address + data.length);
	}

	writeStream(address: number, stream: Stream) {
		stream = stream.sliceWithLength(0, stream.length);
		while (stream.available > 0) {
			this.writeInt8(address++, stream.readUInt8());
		}

		this._checkWriteBreakpoints(address, address + stream.length);
	}

	readStringz(address: number) {
		if (address == 0) return null;
		var out = '';
		while (true) {
			var _char = this.readUInt8(address++);
			if (_char == 0) break;
			out += String.fromCharCode(_char);
		}
		return out;
	}

	hashWordCount(addressAligned: number, count: number) {
		addressAligned >>>= 2;
		count >>>= 2;

		var result = 0;
		var u32 = this.u32;
		for (var n = 0; n < count; n++) {
			var v = u32[addressAligned + n];
			result = (result + v ^ n) | 0;
		}
		return result;
	}

	hash(address: number, count: number) {
		var result = 0;

		while ((address & 3) != 0) { result += this.u8[address++]; count--; }

		var count2 = MathUtils.prevAligned(count, 4);

		result += this.hashWordCount(address, count2);

		address += count2;
		count -= count2;

		while ((address & 3) != 0) { result += this.u8[address++] * 7; count--; }

		return result;
	}

	static memoryCopy(source: ArrayBuffer, sourcePosition: number, destination: ArrayBuffer, destinationPosition: number, length: number) {
		var _source = new Uint8Array(source, sourcePosition, length);
		var _destination = new Uint8Array(destination, destinationPosition, length);
		_destination.set(_source);
	}

	dump(name = 'memory.bin') {
		saveAs(new Blob([this.getPointerDataView(0x08000000, 0x2000000)]), name);
	}

	sliceWithBounds(low: number, high: number) {
		return new Stream(new DataView(this.buffer, low & FastMemory.MASK, high - low));
	}

	sliceWithSize(address: number, size: number) {
		return new Stream(new DataView(this.buffer, address & FastMemory.MASK, size));
	}

	/*
	getBuffer(address: number) {
		return this.buffer;
	}
	getBufferOffset(address:number) {
		return address;
	}
	*/
}

export class Memory extends FastMemory {
	private static _instance: Memory;
	static get instance() {
		if (!Memory._instance) Memory._instance = new Memory();
		return Memory._instance;
	}

	reset() {
		this.memset(FastMemory.DEFAULT_FRAME_ADDRESS, 0, 0x200000);
	}

	copy(from: number, to: number, length: number) {
		if (length <= 0) return;
		//console.warn('copy:', from, to, length);
		this.getPointerU8Array(to, length).set(this.getPointerU8Array(from, length));
		this._checkWriteBreakpoints(to, to + length);
	}

	memset(address: number, value: number, length: number) {
		var buffer = this.getPointerU8Array(address, length);
		for (var n = 0; n < buffer.length; n++) buffer[n] = value & 0xFF;
		this._checkWriteBreakpoints(address, address + length);
	}
}