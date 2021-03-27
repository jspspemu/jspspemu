import "../emu/global"
import {fields, printf, Signal0, Signal2, sprintf} from "../global/utils";
import {IType, Pointer} from "../global/struct";
import {Stream} from "../global/stream";
import {MathUtils} from "../global/math";

function saveAs(data: Blob, fileName: string): void {
    const a = document.createElement("a");
    document.body.appendChild(a)
    a.style.display = 'none'
    const url = URL.createObjectURL(data)
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
}

const MASK = 0x0FFFFFFF;

const LWR_MASK = new Uint32Array([0x00000000, 0xFF000000, 0xFFFF0000, 0xFFFFFF00]);
const LWR_SHIFT = new Uint32Array([0, 8, 16, 24]);

const LWL_MASK = new Uint32Array([0x00FFFFFF, 0x0000FFFF, 0x000000FF, 0x00000000]);
const LWL_SHIFT = new Uint32Array([24, 16, 8, 0]);

const SWL_MASK = new Uint32Array([0xFFFFFF00, 0xFFFF0000, 0xFF000000, 0x00000000]);
const SWL_SHIFT = new Uint32Array([24, 16, 8, 0]);

const SWR_MASK = new Uint32Array([0x00000000, 0x000000FF, 0x0000FFFF, 0x00FFFFFF]);
const SWR_SHIFT = new Uint32Array([0, 8, 16, 24]);

export abstract class Memory {
    read8(addr: number): number {
        return this.lb(addr)
    }

    lwl(address: number, value: number) {
        const align = address & 3;
        const oldvalue = this.lw(address & ~3);
        return ((oldvalue << LWL_SHIFT[align]) | (value & LWL_MASK[align]));
	}

	lwr(address: number, value: number) {
        const align = address & 3;
        const oldvalue = this.lw(address & ~3);
        return ((oldvalue >>> LWR_SHIFT[align]) | (value & LWR_MASK[align]));
	}

	swl(address: number, value: number) {
        const align = address & 3;
        const aadress = address & ~3;
        const vwrite = (value >>> SWL_SHIFT[align]) | (this.lw(aadress) & SWL_MASK[align]);
        this.sw(aadress, vwrite);
	}

	swr(address: number, value: number) {
        const align = address & 3;
        const aadress = address & ~3;
        const vwrite = (value << SWR_SHIFT[align]) | (this.lw(aadress) & SWR_MASK[align]);
        this.sw(aadress, vwrite);
	}

	// ALIASES!
	writeInt8(address: number, value: number) { this.sb(address, value); }
	writeInt16(address: number, value: number) { this.sh(address, value); }
	writeInt32(address: number, value: number) { this.sw(address, value); }
	writeFloat32(address: number, value: number) { this.swc1(address, value); }
	readInt8(address: number) { return this.lb(address); }
	readUInt8(address: number) { return this.lbu(address); }
	readInt16(address: number) { return this.lh(address); }
	readUInt16(address: number) { return this.lhu(address); }
	readInt32(address: number) { return this.lw(address); }
	readUInt32(address: number) { return this.lwu(address); }
	readFloat32(address: number) { return this.lwc1(address); }
	readUInt32_2(address: number) { return this.lw_2(address); }
	
	sb(address: number, value: number): void { throw `Must override`; }
	sh(address: number, value: number): void { throw `Must override`; }
	sw(address: number, value: number): void { throw `Must override`; }
	swc1(address: number, value: number): void { throw `Must override`; }
	lb(address: number): number { throw `Must override`; }
	lbu(address: number): number { throw `Must override`; }
	lh(address: number): number { throw `Must override`; }
	lhu(address: number): number { throw `Must override`; }
	lw(address: number): number { throw `Must override`; }
	lwu(address: number): number { throw `Must override`; }
	lwc1(address: number): number { throw `Must override`; }
	lw_2(address: number): number { throw `Must override`; }

	protected getBuffer(address: number):ArrayBuffer { throw `Must override`; }
	protected getOffsetInBuffer(address: number):number { throw `Must override`; }
	availableAfterAddress(address: number): number { throw `Must override`; }

	static DEFAULT_FRAME_ADDRESS: number = 0x04000000;
	static MASK = 0x0FFFFFFF;
	static MAIN_OFFSET = 0x08000000;

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

	invalidateDataRange = new Signal2<number, number>();
	invalidateDataAll = new Signal0();

	constructor() {
		//this._updateWriteFunctions();
	}

	getPointerPointer<T>(type: IType<T>, address: number) {
		if (address == 0) return null;
		return new Pointer<T>(type, this, address);
	}

	getPointerDataView(address: number, size: number = this.availableAfterAddress(address)) {
        const buffer = this.getBuffer(address), offset = this.getOffsetInBuffer(address);
        return new DataView(buffer, offset, size);
	}
	
	slice(low: number, high: number) {
        const buffer = this.getBuffer(low), offset = this.getOffsetInBuffer(low);
        return new Uint8Array(buffer, offset, high - low);
	}

	getPointerU8Array(address: number, size: number = this.availableAfterAddress(address)): Uint8Array {
        const buffer = this.getBuffer(address), offset = this.getOffsetInBuffer(address);
        return new Uint8Array(buffer, offset, size);
	}

	getPointerU16Array(address: number, size: number = this.availableAfterAddress(address)) {
        const buffer = this.getBuffer(address), offset = this.getOffsetInBuffer(address);
        return new Uint16Array(buffer, offset, size / 2);
	}

	getPointerU32Array(address: number, size: number = this.availableAfterAddress(address)) {
        const buffer = this.getBuffer(address), offset = this.getOffsetInBuffer(address);
        return new Uint32Array(buffer, offset, size / 4);
	}

	getPointerStream(address: number, size?: number): Stream | null {
		//console.log(sprintf("getPointerStream: %08X", address));
		if (address == 0) return null;
		if (size === 0) return new Stream(new DataView(new ArrayBuffer(0)));
		if (!this.isValidAddress(address)) return Stream.INVALID;
		if (size === undefined) size = this.availableAfterAddress(address & FastMemory.MASK);
		if (size < 0) return Stream.INVALID;
		//if (size > this.u8.length - (address & FastMemory.MASK)) return Stream.INVALID;
		return new Stream(this.getPointerDataView(address & FastMemory.MASK, size));
	}

	getU8Array(address: number, size?: number) {
		if (address == 0) return null;
		if (!this.isValidAddress(address)) return null;
		return this.getPointerU8Array(address & FastMemory.MASK, size);
	}

	getU16Array(address: number, size?: number) {
		if (address == 0) return null;
		if (!this.isValidAddress(address)) return null;
		return this.getPointerU16Array(address & FastMemory.MASK, size);
	}

	private writeBreakpoints = <{ address: number; action: (address: number) => void; }[]>[]

	/*
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

	protected _writeInt8(address: number, value: number) { this.writeInt8(address, value); }
	protected _writeInt16(address: number, value: number) { this.writeInt16(address, value); }
	protected _writeInt32(address: number, value: number) { this.writeInt32(address, value); }
	protected _writeFloat32(address: number, value: number) { this.writeFloat32(address, value); }

	protected _writeInt8_break(address: number, value: number) { this._writeInt8(address, value); this._checkWriteBreakpoints(address, address + 1); }
	protected _writeInt16_break(address: number, value: number) { this._writeInt16(address, value); this._checkWriteBreakpoints(address, address + 2); }
	protected _writeInt32_break(address: number, value: number) { this._writeInt32(address, value); this._checkWriteBreakpoints(address, address + 4); }
	protected _writeFloat32_break(address: number, value: number) { this._writeFloat32(address, value); this._checkWriteBreakpoints(address, address + 4); }
	*/

	addWatch4(address: number) {
		this.addWriteAction(address, (address: number) => {
			console.log(sprintf('Watch:0x%08X <- 0x%08X', address, this.lwu(address)));
		});
	}

	addBreakpointOnValue(address: number, value: number) {
		//Watch: 0x0951044C < - 0x2A000000 

		this.addWriteAction(address, (actualAddress: number) => {
            const actualValue: number = this.lwu(address);

            console.log(sprintf('TryBreakpoint:0x%08X <- 0x%08X | 0x%08X (%d)', address, actualValue, value, (actualValue == value)));

			if (actualValue == value) {
				debugger;
			}
		});
	}

	addWriteAction(address: number, action: (address: number) => void) {
		this.writeBreakpoints.push({ address: address, action: action });
		//this._updateWriteFunctions();
	}

	/*
	_checkWriteBreakpoints(start: number, end: number) {
		start &= FastMemory.MASK;
		end &= FastMemory.MASK;
		for (let n = 0; n < this.writeBreakpoints.length; n++) {
			const writeBreakpoint = this.writeBreakpoints[n];
			const addressCheck = writeBreakpoint.address & FastMemory.MASK;
			if (addressCheck >= start && addressCheck < end) {
				writeBreakpoint.action(writeBreakpoint.address);
			}
		}
	}
	*/

	readArrayBuffer(address: number, length: number) {
		const out = new Uint8Array(length);
		out.set(this.getPointerU8Array(address, length));
		return out.buffer;
	}

	sliceWithBounds(low: number, high: number) {
		return new Stream(this.getPointerDataView(low, high - low));
	}

	sliceWithSize(address: number, size: number) {
		return new Stream(this.getPointerDataView(address, size));
	}

	abstract reset(): this

	copy(from: number, to: number, length: number) {
		if (length <= 0) return;
		//console.warn('copy:', from, to, length);
		this.getPointerU8Array(to, length).set(this.getPointerU8Array(from, length));
		//this._checkWriteBreakpoints(to, to + length);
	}

	memset(address: number, value: number, length: number) {
		let buffer = this.getPointerU8Array(address, length);
        let value8 = value & 0xFF;
		if (typeof buffer.fill != 'undefined') {
			buffer.fill(value8);
		} else {
			for (let n = 0; n < buffer.length; n++) buffer[n] = value8;
		}
		//this._checkWriteBreakpoints(address, address + length);
	}

	writeBytes(address: number, data: ArrayBuffer) {
		this.getPointerU8Array(address, data.byteLength).set(new Uint8Array(data));
		//this._checkWriteBreakpoints(address, address + data.byteLength);
	}

	writeUint8Array(address: number, data: Uint8Array) {
		this.getPointerU8Array(address, data.length).set(data);
		//this._checkWriteBreakpoints(address, address + data.length);
	}

	writeStream(address: number, stream: Stream) {
		this.writeUint8Array(address, stream.slice().readAllBytes());
		//this._checkWriteBreakpoints(address, address + stream.length);
	}

	readStringz(address: number): string|null {
		if (address == 0) return null;
        let endAddress = address;
        while (this.lbu(endAddress) != 0) endAddress++;
        const length = endAddress - address
        const data = this.getPointerU8Array(address, length)
		// @ts-ignore
        return String.fromUint8Array(data);
	}

	/*
	hashWordCount(addressAligned: number, count: number) {
		addressAligned >>>= 2;
		count >>>= 2;

		let result = 0;
		for (let n = 0; n < count; n++) {
			const v = this.lw_2(addressAligned + n);
			result = (result + v ^ n) | 0;
		}
		return result;
	}
	*/

	hashWordCount(_addressAligned: number, _count: number) {
		let addressAligned = (_addressAligned >>> 2) | 0;
		let count = (_count >>> 2) | 0;

        let result = 0;
        for (let n = 0; n < count; n++) {
            const v = this.lw_2(addressAligned + n);
            result = (result + v ^ n);
		}
		return result;
	}

	hash(address: number, count: number) {
		let result = 0;
		
		address &= MASK;

		while ((address & 3) != 0) { result += this.lbu(address++); count--; }

		const count2 = MathUtils.prevAligned(count, 4);

		result += this.hashWordCount(address, count2);

		address += count2;
		count -= count2;

		while ((address & 3) != 0) { result += this.lbu(address++) * 7; count--; }

		return result;
	}

	static memoryCopy(source: ArrayBuffer, sourcePosition: number, destination: ArrayBuffer, destinationPosition: number, length: number) {
        const _source = new Uint8Array(source, sourcePosition, length);
        const _destination = new Uint8Array(destination, destinationPosition, length);
        _destination.set(_source);
	}

	dump(name = 'memory.bin') {
		saveAs(new Blob([this.getPointerDataView(0x08000000, 0x2000000)]), name);
	}
}

export const MemoryFields = fields<Memory>()

class FastMemory extends Memory {
	private buffer: ArrayBuffer;
	private s8: Int8Array;
	private u8: Uint8Array;
	private s16: Int16Array;
	private u16: Uint16Array;
	private s32: Int32Array;
	private u32: Uint32Array;
	private f32: Float32Array;

	constructor(size: number = 0x0a000000 + 4) {
		super();
		this.buffer = new ArrayBuffer(size);
		this.s8 = new Int8Array(this.buffer);
		this.u8 = new Uint8Array(this.buffer);
		this.u16 = new Uint16Array(this.buffer);
		this.s16 = new Int16Array(this.buffer);
		this.s32 = new Int32Array(this.buffer);
		this.u32 = new Uint32Array(this.buffer);
		this.f32 = new Float32Array(this.buffer);
	}

	reset() {
	    this.s8.fill(0)
        return this
    }

    sb(address: number, value: number) { this.u8[(address & MASK) >> 0] = value; }
	sh(address: number, value: number) { this.u16[(address & MASK) >> 1] = value; }
	sw(address: number, value: number) { this.u32[(address & MASK) >> 2] = value; }
	swc1(address: number, value: number) { this.f32[(address & MASK) >> 2] = value; }
	lb(address: number) { return this.s8[(address & MASK) >> 0]; }
	lbu(address: number) { return this.u8[(address & MASK) >> 0]; }
	lh(address: number) { return this.s16[(address & MASK) >> 1]; }
	lhu(address: number) { return this.u16[(address & MASK) >> 1]; }
	lw(address: number) { return this.s32[(address & MASK) >> 2]; }
	lwu(address: number) { return this.u32[(address & MASK) >> 2]; }
	lwc1(address: number) { return this.f32[(address & MASK) >> 2]; }
	lw_2(address: number) { return this.u32[address]; }

	protected getBuffer(address: number):ArrayBuffer { return this.buffer; }
	protected getOffsetInBuffer(address: number):number { return address & MASK; }

	availableAfterAddress(address: number): number {
		return this.buffer.byteLength - (address & MASK);
	}
}

class LowMemorySegment {
	size: number;
	low: number;
	high: number;
	s8: Int8Array;
	u8: Uint8Array;
	s16: Int16Array;
	u16: Uint16Array;
	s32: Int32Array;
	u32: Uint32Array;
	f32: Float32Array;

	constructor(public name: string, public offset: number, public buffer: ArrayBuffer) {
		this.size = buffer.byteLength;
		this.low = offset;
		this.high = this.low + this.size;
		this.s8 = new Int8Array(this.buffer);
		this.u8 = new Uint8Array(this.buffer);
		this.u16 = new Uint16Array(this.buffer);
		this.s16 = new Int16Array(this.buffer);
		this.s32 = new Int32Array(this.buffer);
		this.u32 = new Uint32Array(this.buffer);
		this.f32 = new Float32Array(this.buffer);
	}

	contains(address: number) {
		address &= MASK;
		return address >= this.low && address < this.high;
	}

	private fixAddress(address:number) { return (address & MASK) - this.offset; }

	sb(address: number, value: number) { this.u8[this.fixAddress(address) >> 0] = value; }
	sh(address: number, value: number) { this.u16[this.fixAddress(address) >> 1] = value; }
	sw(address: number, value: number) { this.u32[this.fixAddress(address) >> 2] = value; }
	swc1(address: number, value: number) { this.f32[this.fixAddress(address) >> 2] = value; }
	lb(address: number) { return this.s8[this.fixAddress(address) >> 0]; }
	lbu(address: number) { return this.u8[this.fixAddress(address) >> 0]; }
	lh(address: number) { return this.s16[this.fixAddress(address) >> 1]; }
	lhu(address: number) { return this.u16[this.fixAddress(address) >> 1]; }
	lw(address: number) { return this.s32[this.fixAddress(address) >> 2]; }
	lwu(address: number) { return this.u32[this.fixAddress(address) >> 2]; }
	lwc1(address: number) { return this.f32[this.fixAddress(address) >> 2]; }

	getBuffer(address: number):ArrayBuffer { return this.buffer; }
	getOffsetInBuffer(address: number):number { return this.fixAddress(address); }

	availableAfterAddress(address: number): number {
		return this.buffer.byteLength - this.fixAddress(address);
	}
}

class LowMemory extends Memory {
	private scratchpad: LowMemorySegment;
	private videomem: LowMemorySegment;
	private mainmem: LowMemorySegment;

	constructor() {
		super();
		//this.scratchpad = new LowMemorySegment('scatchpad', 0x00010000, new ArrayBuffer(16 * 1024));
		this.scratchpad = new LowMemorySegment('scatchpad', 0x00000000, new ArrayBuffer(16 * 1024 + 0x00010000));
		//this.scratchpad = new LowMemorySegment('scatchpad', 0x00000000, new ArrayBuffer(0x00010000 + 16 * 1024));
		this.videomem = new LowMemorySegment('videomem', 0x04000000, new ArrayBuffer(2 * 1024 * 1024));
		this.mainmem = new LowMemorySegment('mainmem', 0x08000000, new ArrayBuffer(32 * 1024 * 1024));
		//this.mainmem = new LowMemorySegment('mainmem', 0x08000000, new ArrayBuffer(64 * 1024 * 1024));
	}

    reset() {
	    this.scratchpad.u8.fill(0)
        this.videomem.u8.fill(0)
        this.mainmem.u8.fill(0)
        return this
    }

    getMemRange(address: number): LowMemorySegment | null {
		address &= MASK;
		if (address >= 0x08000000) {
			return this.mainmem;
		} else {
            if (this.mainmem.contains(address)) return this.mainmem;
            if (this.videomem.contains(address)) return this.videomem;
			if (this.scratchpad.contains(address)) return this.scratchpad;
			// 02203738
			printf("Unmapped: %08X", address);
			return null;
		}
	}

	sb(address: number, value: number) { this.getMemRange(address)!.sb(address, value); }
	sh(address: number, value: number) { this.getMemRange(address)!.sh(address, value); }
	sw(address: number, value: number) { this.getMemRange(address)!.sw(address, value); }
	swc1(address: number, value: number) { this.getMemRange(address)!.swc1(address, value); }
	lb(address: number) { return this.getMemRange(address)!.lb(address); }
	lbu(address: number) { return this.getMemRange(address)!.lbu(address); }
	lh(address: number) { return this.getMemRange(address)!.lh(address); }
	lhu(address: number) { return this.getMemRange(address)!.lhu(address); }
	lw(address: number) { return this.getMemRange(address)!.lw(address); }
	lwu(address: number) { return this.getMemRange(address)!.lwu(address); }
	lwc1(address: number) { return this.getMemRange(address)!.lwc1(address); }
	lw_2(address4: number) { return this.getMemRange(address4 * 4)!.lw(address4 * 4); }

	protected getBuffer(address: number):ArrayBuffer { return this.getMemRange(address)!.getBuffer(address); }
	protected getOffsetInBuffer(address: number):number { return this.getMemRange(address)!.getOffsetInBuffer(address); }

	availableAfterAddress(address: number): number {
		return this.getMemRange(address)!.availableAfterAddress(address);
	}
}

export class TestMemory extends FastMemory {
    constructor(size: number) {
        super(size);
    }
}

declare const process: any;
function isNodeJs() {
	return typeof process != 'undefined';
}

function allowBigAlloc() {
	try {
        const ab = new ArrayBuffer(0x0a000000 + 4);
        return true;
	} catch (e) {
		return false;
	}
}

function supportFastMemory() {
	//return !isNodeJs() && allowBigAlloc();
	//return !isNodeJs();
	return true;
}

export function create(): Memory {
	if (supportFastMemory()) {
		return new FastMemory();
	} else {
		return new LowMemory();
	}
}

let _instance: Memory | null = null;
export function getMemoryInstance() {
	if (_instance == null) _instance = create();
	return _instance;
}

export function getMemoryInstanceReset() {
    return getMemoryInstance().reset()
}
