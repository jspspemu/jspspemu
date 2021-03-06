﻿import "./window"
import "./utils"
import "./stream"
import {Endian, PromiseFast, Utf8} from "./utils";
import {Stream} from "./stream";
import {Integer64} from "./int64";

export interface IType<T> {
	read(stream: Stream, context?: any): T;
	write(stream: Stream, value: T, context?: any): void;
	length: number;
}

export interface StructEntry {
	[name: string]: IType<any>;
}

export class Int64Type implements IType<number> {
	constructor(public endian: Endian) { }

	read(stream: Stream): number {
	    let low: number
        let high: number
		if (this.endian == Endian.LITTLE) {
			low = stream.readUInt32(this.endian);
			high = stream.readUInt32(this.endian);
		} else {
			high = stream.readUInt32(this.endian);
			low = stream.readUInt32(this.endian);
		}
		return high * Math.pow(2, 32) + low;
	}
	write(stream: Stream, value: number): void {
        const low = Math.floor(value % Math.pow(2, 32));
        const high = Math.floor(value / Math.pow(2, 32));
        if (this.endian == Endian.LITTLE) {
			stream.writeInt32(low, this.endian);
			stream.writeInt32(high, this.endian);
		} else {
			stream.writeInt32(high, this.endian);
			stream.writeInt32(low, this.endian);
		}
	}
	get length() { return 8; }
}

export class Integer64Type implements IType<Integer64> {
	constructor(public endian: Endian) { }

	read(stream: Stream): Integer64 {
		let high;
        let low;
        if (this.endian == Endian.LITTLE) {
			low = stream.readUInt32(this.endian);
			high = stream.readUInt32(this.endian);
		} else {
            high = stream.readUInt32(this.endian);
            low = stream.readUInt32(this.endian);
        }
		return new Integer64(low, high);
	}
	write(stream: Stream, value: Integer64): void {
        const low = value.low;
        const high = value.high;
        if (this.endian == Endian.LITTLE) {
			stream.writeInt32(low, this.endian);
			stream.writeInt32(high, this.endian);
		} else {
			stream.writeInt32(high, this.endian);
			stream.writeInt32(low, this.endian);
		}
	}
	get length() { return 8; }
}

export class Int32Type implements IType<number> {
	constructor(public endian: Endian) { }
	read(stream: Stream): number { return stream.readInt32(this.endian); }
	write(stream: Stream, value: number): void { stream.writeInt32(value, this.endian); }
	get length() { return 4; }
}

export class Int16Type implements IType<number> {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readInt16(this.endian); }
	write(stream: Stream, value: any): void { stream.writeInt16(value, this.endian); }
	get length() { return 2; }
}

export class Int8Type implements IType<number> {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readInt8(this.endian); }
	write(stream: Stream, value: any): void { stream.writeInt8(value, this.endian); }
	get length() { return 1; }
}

export class UInt32Type implements IType<number> {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readUInt32(this.endian); }
	write(stream: Stream, value: any): void { stream.writeUInt32(value, this.endian); }
	get length() { return 4; }
}

export class PtrType implements IType<number> {
    read(stream: Stream): any { return stream.readUInt32LE(); }
    write(stream: Stream, value: any): void { stream.writeUInt32LE(value); }
    get length() { return 4; }
}

export class UInt16Type implements IType<number> {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readUInt16(this.endian); }
	write(stream: Stream, value: any): void { stream.writeUInt16(value, this.endian); }
	get length() { return 2; }
}

export class UInt8Type implements IType<number> {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readUInt8(this.endian); }
	write(stream: Stream, value: any): void { stream.writeUInt8(value, this.endian); }
	get length() { return 1; }
}

export class Float32Type implements IType<number> {
    constructor(public endian: Endian) { }

    read(stream: Stream): any { return stream.readFloat32(this.endian); }
    write(stream: Stream, value: any): void { stream.writeFloat32(value, this.endian); }
    get length() { return 4; }
}

export interface StructEntryProcessed<T> {
	name: string;
	type: IType<T>;
}

export interface Class<T> { new (...args: any[]): T; }

export class UIntReference {
	constructor(private stream: Stream) {
	}
	
	get value(): number {
		return this.stream.clone().readUInt32();
	}
	set value(value:number) {
		this.stream.clone().writeUInt32(value);
	}
}

export class StructClass<T> implements IType<T> {
	processedItems: StructEntryProcessed<T>[] = [];

	constructor(private _class: any, private items: StructEntry[]) {
	    for (const item of items) {
	        let add = 0
            for (const key in item) {
                this.addItem(key, item[key])
                add++
            }
            if (!add) throw new Error("Entry must have one item");
        }
	}

	addItem(name: string, type: any) {
        this.processedItems.push({ name: name, type: type })
    }

	static create<T>(_class: Class<T>, items: StructEntry[]) {
		return new StructClass<T>(_class, items);
	}

	createProxy(stream: Stream): T {
		stream = stream.clone();
        const objectf: any = function (stream: Stream) {};
        const object = new objectf(stream);
        this.processedItems.forEach(item => {
			const getOffset = () => { return this.offsetOfField(item.name); };
			if (item.type instanceof StructClass) {
				object[item.name] = (<StructClass<any>><any>item.type).createProxy(stream.sliceFrom(getOffset())); 
			} else {
				Object.defineProperty(objectf.prototype, item.name, {
					enumerable: true,
					configurable: true,
					get: () => { return item.type.read(stream.sliceFrom(getOffset())); },
					set: (value: any) => { item.type.write(stream.sliceFrom(getOffset()), value); }
				});
			}
		})
		return <T>object;
	}

	async readWriteAsync<T2>(stream: Stream, callback: (p: T) => T2 | Promise<T2>, process?: (p: T, v: T2) => T2) {
        const p = this.read(stream.clone());
        const v = await callback(p);
        if (process != null) process(p, v);
        this.write(stream.clone(), p);
        return v;
	}

	read(stream: Stream): T {
        const _class = this._class;
        const out: T = new _class();
        for (let n = 0; n < this.processedItems.length; n++) {
            const item = this.processedItems[n];
            (<any>out)[item.name] = item.type.read(stream, out);
		}
		return out;
	}
	write(stream: Stream, value: T): void {
		for (let n = 0; n < this.processedItems.length; n++) {
			const item = this.processedItems[n];
			item.type.write(stream, (<any>value)[item.name], value);
		}
	}
	offsetOfField(name: string) {
        let offset = 0;
        for (let n = 0; n < this.processedItems.length; n++) {
            const item = this.processedItems[n];
            if (item.name == name) return offset;
			offset += item.type.length;
		}
		return -1;
	}
	get length() {
        let sum = 0;
        for (let n = 0; n < this.processedItems.length; n++) {
            const item = this.processedItems[n];
            if (!item) throw ("Invalid item!!");
			if (!item.type) {
				console.log(item);
				throw ("Invalid item type!!");
			}
			sum += item.type.length;
		}
		return sum;
	}
}

export class StructArrayClass<T> implements IType<T[]> {
	constructor(private elementType: IType<T>, private count: number) {
	}

	read(stream: Stream): T[] {
        const out: any[] = [];
        for (let n = 0; n < this.count; n++) {
			out.push(this.elementType.read(stream, out));
		}
		return out;
	}
	write(stream: Stream, value: T[]): void {
		for (let n = 0; n < this.count; n++) this.elementType.write(stream, value[n], value);
	}
	get length() {
		return this.elementType.length * this.count;
	}
}

export function StructArray<T>(elementType: IType<T>, count: number) {
	return new StructArrayClass<T>(elementType, count);
}

export class StructStringn implements IType<string> {
	constructor(private count: number) {
	}

	read(stream: Stream): string {
        let out = '';
        for (let n = 0; n < this.count; n++) {
			out += String.fromCharCode(stream.readUInt8());
		}
		return out;
	}
	write(stream: Stream, value: string): void {
		throw ("Not implemented StructStringn.write");
	}
	get length() {
		return this.count;
	}
}

export class StructStringz {
	stringn: StructStringn;

	constructor(private count: number, private readTransformer?: (s:string) => string, private writeTransformer?: (s:string) => string) {
		this.stringn = new StructStringn(count);
	}

	read(stream: Stream): string {
        let value = this.stringn.read(stream).split(String.fromCharCode(0))[0];
        if (this.readTransformer) value = this.readTransformer(value);
		return value;
	}
	write(stream: Stream, value: string): void {
		if (this.writeTransformer) value = this.writeTransformer(value);
		if (!value) value = '';
        const items = value.split('').map(char => char.charCodeAt(0));
        while (items.length < this.count) items.push(0);
		for (let n = 0; n < items.length; n++) stream.writeUInt8(items[n]);
	}
	get length() {
		return this.count;
	}
}

export class StructStringzVariable {
	constructor() {
	}

	read(stream: Stream): string {
		return stream.readStringz();
	}
	write(stream: Stream, value: string): void {
		stream.writeString(value);
		stream.writeUInt8(0);
	}
	get length() {
		return 0;
	}
}

export class UInt32_2lbStruct implements IType<number> {
	read(stream: Stream): number {
        const l = stream.readUInt32(Endian.LITTLE);
        const b = stream.readUInt32(Endian.BIG);
        return l;
	}
	write(stream: Stream, value: number): void {
		stream.writeUInt32(value, Endian.LITTLE);
		stream.writeUInt32(value, Endian.BIG);
	}
	get length() { return 8; }
}

export class UInt16_2lbStruct implements IType<number> {
	read(stream: Stream): number {
        const l = stream.readUInt16(Endian.LITTLE);
        const b = stream.readUInt16(Endian.BIG);
        return l;
	}
	write(stream: Stream, value: number): void {
		stream.writeUInt16(value, Endian.LITTLE);
		stream.writeUInt16(value, Endian.BIG);
	}
	get length() { return 4; }
}

export class StructStringWithSize {
	constructor(private getStringSize: (context: any) => number) {
	}

	read(stream: Stream, context: any): string {
		return stream.readString(this.getStringSize(context));
	}
	write(stream: Stream, value: string, context: any): void {
		stream.writeString(value);
	}
	get length() {
		return 0;
	}
}

export const Int16 = new Int16Type(Endian.LITTLE);
export const Int32 = new Int32Type(Endian.LITTLE);
export const Int64 = new Int64Type(Endian.LITTLE);
export const Int8 = new Int8Type(Endian.LITTLE);

export const Int16_l = new Int16Type(Endian.LITTLE);
export const Int32_l = new Int32Type(Endian.LITTLE);
export const Int64_l = new Int64Type(Endian.LITTLE);
export const Int8_l = new Int8Type(Endian.LITTLE);

export const Int16_b = new Int16Type(Endian.BIG);
export const Int32_b = new Int32Type(Endian.BIG);
export const Int64_b = new Int64Type(Endian.BIG);
export const Int8_b = new Int8Type(Endian.BIG);

export const UInt8 = new UInt8Type(Endian.LITTLE);
export const UInt16 = new UInt16Type(Endian.LITTLE);
export const UInt32 = new UInt32Type(Endian.LITTLE);

export const Ptr = new PtrType();

export const Float32 = new Float32Type(Endian.LITTLE);
//export const UInt64 = new UInt64Type(Endian.LITTLE);

export const UInt16_l = new UInt16Type(Endian.LITTLE);
export const UInt32_l = new UInt32Type(Endian.LITTLE);

export const UInt16_b = new UInt16Type(Endian.BIG);
export const UInt32_b = new UInt32Type(Endian.BIG);
//export const UInt64_b = new UInt64Type(Endian.BIG);

export const UInt32_2lb = new UInt32_2lbStruct();
export const UInt16_2lb = new UInt16_2lbStruct();

export const Integer64_l = new Integer64Type(Endian.LITTLE);
export const Integer64_b = new Integer64Type(Endian.BIG);

export const StringzVariable = new StructStringzVariable();

export function Stringn(count: number) { return new StructStringn(count); }
export function Stringz(count: number) { return new StructStringz(count); }
export function Utf8Stringz(count: number) { return new StructStringz(count, s => Utf8.decode(s), s => Utf8.encode(s)); }
export function StringWithSize(callback: (context: any) => number) {
	return new StructStringWithSize(callback);
}

export class StructPointerStruct<T> implements IType<Pointer<T>> {
	constructor(private elementType: IType<T>) {
	}
	read(stream: Stream, context: any): Pointer<T> {
        const address = stream.readInt32(Endian.LITTLE);
		return new Pointer<T>(this.elementType, context['memory'], address);
	}
	write(stream: Stream, value: Pointer<T>, context: any): void {
        const address = value.address;
		stream.writeInt32(address, Endian.LITTLE);
	}
	get length() {
		return 4;
	}
}

export function StructPointer<T>(type: IType<T>) {
	return new StructPointerStruct<T>(type);
}

export interface PointerMemory {
	getPointerStream(address: number, size?: number): Stream | null;
}

export class Pointer<T> {
	private stream: Stream;

	constructor(private type: IType<T>, public memory: PointerMemory, public address: number) {
		this.stream = memory.getPointerStream(this.address)!
	}

	readWrite(callback: (item: T) => void) {
        const value = this.read();
		try {
			callback(value);
		} finally {
			this.write(value);
		}
	}

	read() {
		return this.type.read(this.stream.clone());
	}

	write(value: T) {
		this.type.write(this.stream.clone(), value);
	}
}



export function StructMember<T>(kind: IType<T>): any {
    return (target: any, key: string, descriptor: TypedPropertyDescriptor<T>) => {
        //console.log("StructMember", kind, target, key, descriptor)
        //console.log(target.$$struct)
        //console.log(target.constructor)
        if (!target.$$struct) {
            target.$$struct = StructClass.create(target.constructor, [])
        }
        target.$$struct!.addItem(key, kind)
        //console.log(target, key, descriptor);
        //if (typeof target.natives == 'undefined') target.natives = [];
        //if (!descriptor) {
        //    console.error("descriptor == null");
        //    console.error(target);
        //    console.error(key);
        //    console.error(descriptor);
        //}
        //target.natives.push((target: any) => {
        //    return createNativeFunction(exportId, firmwareVersion, retval, args, target, descriptor.value, options, `${target.constructor.name}`, key)
        //});
        return descriptor;
    };
}

export const StructUInt8: any = StructMember(UInt8)
export const StructInt8: any = StructMember(Int8)
export const StructUInt16: any = StructMember(UInt16)
export const StructInt16: any = StructMember(Int16)
export const StructInt32: any = StructMember(Int32)
export const StructUInt32: any = StructMember(UInt32)
export const StructUInt32_2lb: any = StructMember(UInt32_2lb)
export const StructUInt16_2lb: any = StructMember(UInt16_2lb)

export const StructInt32_l: any = StructMember(Int32_l)
export const StructUInt32_l: any = StructMember(UInt32_l)

export const StructInt32_b: any = StructMember(Int32_b)
export const StructUInt32_b: any = StructMember(UInt32_b)

export const StructInt64: any = StructMember(Int64)

export const StructInteger64_l: any = StructMember(Integer64_l)
export const StructInteger64_b: any = StructMember(Integer64_b)

export const StructStructStringzVariable: any = StructMember(StringzVariable)

export function StructStructStringn(count: number): any { return StructMember(Stringn(count)) }
export function StructStructStringz(count: number): any { return StructMember(Stringz(count)) }
export function StructStructUtf8Stringz(count: number): any { return StructMember(Utf8Stringz(count)) }
export function StructStructArray<T>(elementType: IType<T>, count: number): any { return StructMember(StructArray(elementType, count)) }

export class Struct {
    // @ts-ignore
    static get struct(): StructClass<this> { return GetStruct(this) }
}

//Struct.struct

export function GetStruct<T extends Struct>(clazz: Class<T>): StructClass<T> {
    return (clazz as any).prototype.$$struct || (clazz as any).struct
}
