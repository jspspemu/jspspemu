///<reference path="../util/utils.ts" />

module core {
	export class Memory {
		buffer: ArrayBuffer;
		s8: Uint8Array;
		u8: Uint8Array;
		s16: Int16Array;
		u16: Uint16Array;
		s32: Uint32Array;
		u32: Uint32Array;
		f32: Float32Array;
		data: DataView;

		static DEFAULT_FRAME_ADDRESS: number = 0x04000000;

		static MASK = 0x0FFFFFFF;
		static MAIN_OFFSET = 0x08000000;


		private static _instance: Memory;
		static get instance() {
			if (!Memory._instance) Memory._instance = new Memory();
			return Memory._instance;
		}

		constructor() {
			this.buffer = new ArrayBuffer(0x0FFFFFFF + 1);
			this.data = new DataView(this.buffer);
			this.s8 = new Int8Array(this.buffer);
			this.u8 = new Uint8Array(this.buffer);
			this.u16 = new Uint16Array(this.buffer);
			this.s16 = new Int16Array(this.buffer);
			this.s32 = new Int32Array(this.buffer);
			this.u32 = new Uint32Array(this.buffer);
			this.f32 = new Float32Array(this.buffer);
		}

		reset() {
			this.memset(Memory.DEFAULT_FRAME_ADDRESS, 0, 0x200000);
		}

		private availableAfterAddress(address:number) {
			return this.buffer.byteLength - (address & Memory.MASK);
		}

		getPointerDataView(address: number, size?: number) {
			if (!size) size = this.availableAfterAddress(address);
			return new DataView(this.buffer, address & Memory.MASK, size);
		}

		getPointerStream(address: number, size?: number) {
			address &= Memory.MASK;
			if (address == 0) return null;
			if (!size) size = this.availableAfterAddress(address);
			return new Stream(this.getPointerDataView(address, size));
		}


		writeInt8(address: number, value: number) { this.u8[(address & Memory.MASK) >> 0] = value; }
		readInt8(address: number) { return this.s8[(address & Memory.MASK) >> 0]; }
		readUInt8(address: number) { return this.u8[(address & Memory.MASK) >> 0]; }

		writeInt16(address: number, value: number) { this.u16[(address & Memory.MASK) >> 1] = value; }
		readInt16(address: number) { return this.s16[(address & Memory.MASK) >> 1]; }
		readUInt16(address: number) { return this.u16[(address & Memory.MASK) >> 1]; }

		writeInt32(address: number, value: number) { this.u32[(address & Memory.MASK) >> 2] = value; }
		readInt32(address: number) { return this.s32[(address & Memory.MASK) >> 2]; }
		readUInt32(address: number) { return this.u32[(address & Memory.MASK) >> 2]; }

		writeFloat32(address: number, value: number) { this.f32[(address & Memory.MASK) >> 2] = value; }
		readFloat32(address: number) { return this.f32[(address & Memory.MASK) >> 2]; }

		writeBytes(address: number, data: ArrayBuffer) {
			Memory.memoryCopy(data, 0, this.buffer, address & Memory.MASK, data.byteLength);
		}

		readBytes(address: number, length: number) {
			return new Uint8Array(this.buffer, address, length);
		}

		writeStream(address: number, stream: Stream) {
			stream = stream.sliceWithLength(0, stream.length);
			while (stream.available > 0) {
				this.writeInt8(address++, stream.readUInt8());
			}
		}

		readStringz(address: number) {
			if (address == 0) return null;
			var out = '';
			while (true) {
				var char = this.readUInt8(address++);
				if (char == 0) break;
				out += String.fromCharCode(char);
			}
			return out;
		}

		sliceWithBounds(low: number, high: number) {
			return new Stream(new DataView(this.buffer, low & Memory.MASK, high - low));
		}

		sliceWithSize(address: number, size: number) {
			return new Stream(new DataView(this.buffer, address & Memory.MASK, size));
		}

		copy(from: number, to: number, length: number) {
			from &= Memory.MASK;
			to &= Memory.MASK;
			for (var n = 0; n < length; n++) {
				this.u8[to + n] = this.u8[from + n];
			}
		}

		memset(address: number, value: number, length: number) {
			address &= Memory.MASK;
			for (var n = 0; n < length; n++) {
				this.u8[address + n] = value;
			}
		}

		hash(address: number, count: number) {
			var result = 0;
			for (var n = 0; n < count; n++) {
				result ^= n << 28;
				result += this.u8[address + n];
			}
			return result;
		}

		static memoryCopy(source: ArrayBuffer, sourcePosition: number, destination: ArrayBuffer, destinationPosition: number, length: number) {
			var _source = new Uint8Array(source, sourcePosition, length);
			var _destination = new Uint8Array(destination, destinationPosition, length);
			_destination.set(_source);
		}
	}
}
