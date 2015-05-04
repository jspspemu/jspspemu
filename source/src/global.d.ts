///<reference path="global/utils.ts" />
///<reference path="global/array.ts" />
///<reference path="global/async.ts" />
///<reference path="global/int64.ts" />
///<reference path="global/math.ts" />
///<reference path="global/me.d.ts" />
///<reference path="global/stream.ts" />
///<reference path="global/struct.ts" />
///<reference path="../typings/jquery/jquery.d.ts" />
///<reference path="../typings/underscore/underscore.d.ts" />

declare class DataView {
	constructor(ab:ArrayBuffer, index?:number, length?:number);
	buffer: ArrayBuffer;
	byteOffset: number;
	byteLength: number;
	
	getInt8(byteOffset:number):number;
	getInt16(byteOffset:number, littleEndian?:boolean):number;
	getInt32(byteOffset:number, littleEndian?:boolean):number;
	getUint8(byteOffset:number):number;
	getUint16(byteOffset:number, littleEndian?:boolean):number;
	getUint32(byteOffset:number, littleEndian?:boolean):number;
	getFloat32(byteOffset:number, littleEndian?:boolean):number;
	getFloat64(byteOffset:number, littleEndian?:boolean):number;

	setInt8(byteOffset:number, value:number):number;
	setInt16(byteOffset:number, value:number, littleEndian?:boolean):number;
	setInt32(byteOffset:number, value:number, littleEndian?:boolean):number;
	setUint8(byteOffset:number, value:number):number;
	setUint16(byteOffset:number, value:number, littleEndian?:boolean):number;
	setUint32(byteOffset:number, value:number, littleEndian?:boolean):number;
	setFloat32(byteOffset:number, value:number, littleEndian?:boolean):number;
	setFloat64(byteOffset:number, value:number, littleEndian?:boolean):number;
}