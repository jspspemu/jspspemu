interface IType {
	read(stream: Stream, context?: any): any;
	write(stream: Stream, value: any, context?: any): void;
	length: number;
}

interface StructEntry {
	[name: string]: IType;
}

class Int64Type implements IType {
	constructor(public endian: Endian) { }

	read(stream: Stream): any {
		if (this.endian == Endian.LITTLE) {
			var low = stream.readUInt32(this.endian);
			var high = stream.readUInt32(this.endian);
		} else {
			var high = stream.readUInt32(this.endian);
			var low = stream.readUInt32(this.endian);
		}
		return high * Math.pow(2, 32) + low;
	}
	write(stream: Stream, value: any): void {
		var low = Math.floor(value % Math.pow(2, 32));
		var high = Math.floor(value / Math.pow(2, 32));
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

class Int32Type implements IType {
	constructor(public endian: Endian) { }
	read(stream: Stream): any { return stream.readInt32(this.endian); }
	write(stream: Stream, value: any): void { stream.writeInt32(value, this.endian); }
	get length() { return 4; }
}

class Int16Type implements IType {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readInt16(this.endian); }
	write(stream: Stream, value: any): void { stream.writeInt16(value, this.endian); }
	get length() { return 2; }
}

class Int8Type implements IType {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readInt8(this.endian); }
	write(stream: Stream, value: any): void { stream.writeInt8(value, this.endian); }
	get length() { return 1; }
}

class UInt32Type implements IType {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readUInt32(this.endian); }
	write(stream: Stream, value: any): void { stream.writeUInt32(value, this.endian); }
	get length() { return 4; }
}

class UInt16Type implements IType {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readUInt16(this.endian); }
	write(stream: Stream, value: any): void { stream.writeUInt16(value, this.endian); }
	get length() { return 2; }
}

class UInt8Type implements IType {
	constructor(public endian: Endian) { }

	read(stream: Stream): any { return stream.readUInt8(this.endian); }
	write(stream: Stream, value: any): void { stream.writeUInt8(value, this.endian); }
	get length() { return 1; }
}

interface StructEntryProcessed {
	name: string;
	type: IType;
}

class Struct<T> implements IType {
	processedItems: StructEntryProcessed[] = [];

	constructor(private items: StructEntry[]) {
		this.processedItems = items.map(item => {
			for (var key in item) return { name: key, type: item[key] };
			throw (new Error("Entry must have one item"));
		});
	}

	static create<T>(items: StructEntry[]) {
		return new Struct<T>(items);
	}

	read(stream: Stream): T {
		var out: any = {};
		this.processedItems.forEach(item => { out[item.name] = item.type.read(stream, out); });
		return out;
	}
	write(stream: Stream, value: T): void {
		this.processedItems.forEach(item => { item.type.write(stream, value[item.name], value); });
	}
	get length() {
		return this.processedItems.sum<number>(item => {
			if (!item) throw ("Invalid item!!");
			if (!item.type) throw ("Invalid item type!!");
			return item.type.length;
		});
	}
}

class StructClass<T> implements IType {
	processedItems: StructEntryProcessed[] = [];

	constructor(private _class: any, private items: StructEntry[]) {
		this.processedItems = items.map(item => {
			for (var key in item) return { name: key, type: item[key] };
			throw (new Error("Entry must have one item"));
		});
	}

	static create<T>(_class: any, items: StructEntry[]) {
		return new StructClass<T>(_class, items);
	}

	read(stream: Stream): T {
		var _class = this._class;
		var out: T = new _class();
		this.processedItems.forEach(item => { out[item.name] = item.type.read(stream, out); });
		return out;
	}
	write(stream: Stream, value: T): void {
		this.processedItems.forEach(item => { item.type.write(stream, value[item.name], value); });
	}
	get length() {
		return this.processedItems.sum<number>(item => {
			if (!item) throw ("Invalid item!!");
			if (!item.type) {
				console.log(item);
				throw ("Invalid item type!!");
			}
			return item.type.length;
		});
	}
}

class StructArrayClass<T> implements IType {
	constructor(private elementType: IType, private count: number) {
	}

	read(stream: Stream): T[] {
		var out = [];
		for (var n = 0; n < this.count; n++) {
			out.push(this.elementType.read(stream, out));
		}
		return out;
	}
	write(stream: Stream, value: T[]): void {
		for (var n = 0; n < this.count; n++) this.elementType.write(stream, value[n], value);
	}
	get length() {
		return this.elementType.length * this.count;
	}
}

function StructArray<T>(elementType: IType, count: number) {
	return new StructArrayClass<T>(elementType, count);
}

class StructStringn {
	constructor(private count: number) {
	}

	read(stream: Stream): string {
		var out = '';
		for (var n = 0; n < this.count; n++) {
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

class StructStringz {
	stringn: StructStringn;

	constructor(private count: number) {
		this.stringn = new StructStringn(count);
	}

	read(stream: Stream): string {
		return this.stringn.read(stream).split(String.fromCharCode(0))[0];
	}
	write(stream: Stream, value: string): void {
		var items = value.split('').map(char => char.charCodeAt(0));
		while (items.length < this.count) items.push(0);
		for (var n = 0; n < items.length; n++) stream.writeUInt8(items[n]);
	}
	get length() {
		return this.count;
	}
}

class StructStringzVariable {
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

class UInt32_2lbStruct implements IType {
	read(stream: Stream): number {
		var l = stream.readUInt32(Endian.LITTLE);
		var b = stream.readUInt32(Endian.BIG);
		return l;
	}
	write(stream: Stream, value: number): void {
		stream.writeUInt32(value, Endian.LITTLE);
		stream.writeUInt32(value, Endian.BIG);
	}
	get length() { return 8; }
}

class UInt16_2lbStruct implements IType {
	read(stream: Stream): number {
		var l = stream.readUInt16(Endian.LITTLE);
		var b = stream.readUInt16(Endian.BIG);
		return l;
	}
	write(stream: Stream, value: number): void {
		stream.writeUInt16(value, Endian.LITTLE);
		stream.writeUInt16(value, Endian.BIG);
	}
	get length() { return 4; }
}

class StructStringWithSize {
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

var Int16 = new Int16Type(Endian.LITTLE);
var Int32 = new Int32Type(Endian.LITTLE);
var Int64 = new Int64Type(Endian.LITTLE);
var Int8 = new Int8Type(Endian.LITTLE);

var UInt16 = new UInt16Type(Endian.LITTLE);
var UInt32 = new UInt32Type(Endian.LITTLE);
var UInt8 = new UInt8Type(Endian.LITTLE);

var UInt16_b = new UInt16Type(Endian.BIG);
var UInt32_b = new UInt32Type(Endian.BIG);

var UInt32_2lb = new UInt32_2lbStruct();
var UInt16_2lb = new UInt16_2lbStruct();

var StringzVariable = new StructStringzVariable();

function Stringn(count: number) { return new StructStringn(count); }
function Stringz(count: number) { return new StructStringz(count); }
function StringWithSize(callback: (context: any) => number) {
	return new StructStringWithSize(callback);
}
