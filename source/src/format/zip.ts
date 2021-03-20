import "../global"

import {AsyncStream, Stream} from "../global/stream";
import {StringWithSize, StructArray, StructClass, UInt16, UInt32} from "../global/struct";
import {ArrayBufferUtils, PromiseFast, StringDictionary} from "../global/utils";
import {BitUtils} from "../global/math";
import {zlib_inflate_raw} from "./zlib";

export class ZipEntry {
	private children: StringDictionary<ZipEntry> = {};
	zipDirEntry: ZipDirEntry;
	normalizedName: string;
	isDirectory: boolean;
	compressedData: Uint8Array;
	uncompressedData: Uint8Array;

	get size() {
		return this.uncompressedSize;
	}

	getChildList() {
		var list:ZipEntry[] = [];
		for (var key in this.children) list.push(this.children[key]);
		return list;
	}

	get date() {
		var dosDate = this.zipDirEntry.dosDate;
		var dosTime = this.zipDirEntry.dosTime;

		var seconds = BitUtils.extract(dosTime, 0, 5) * 2;
		var minutes = BitUtils.extract(dosTime, 5, 6);
		var hours = BitUtils.extract(dosTime, 11, 6);
		var day = BitUtils.extract(dosDate, 0, 5);
		var month = BitUtils.extract(dosDate, 5, 4);
		var year = BitUtils.extract(dosDate, 9, 7) + 1980;

		return new Date(year, month - 1, day, hours, minutes, seconds);
	}

	get compressedSize() {
		return this.zipDirEntry.compressedSize;
	}

	get uncompressedSize() {
		return this.zipDirEntry.uncompressedSize;
	}

	get compressionType() {
		return this.zipDirEntry.compType;
	}

	constructor(private zip: Zip, public name: string, private parent: ZipEntry) {
		this.normalizedName = ZipEntry.normalizeString(name);
	}

	private static normalizeString(string: string) {
		return string.toUpperCase();
	}

	readRawCompressedAsync():PromiseFast<Uint8Array> {
		if (this.compressedData) return PromiseFast.resolve(this.compressedData);
		return this.zip.zipStream.readChunkAsync(this.zipDirEntry.headerOffset, this.zipDirEntry.compressedSize + 1024).then((data) => {
			var stream = Stream.fromArrayBuffer(data);
			var zipFileRecord = ZipFileRecord.struct.read(stream);
			return this.compressedData = stream.readBytes(zipFileRecord.compressedSize);
		});
	}

	readChunkAsync(offset: number, length: number) {
		return this.readAsync().then((data) => {
			return ArrayBufferUtils.fromUInt8Array(data.subarray(offset, offset + length));
		});
	}
	
	readAsync() {
		if (this.uncompressedData) return PromiseFast.resolve(this.uncompressedData);
		return this.readRawCompressedAsync().then((data:Uint8Array) => {
			switch (this.compressionType) {
				case ZipCompressionType.DEFLATE:
					return zlib_inflate_raw(data);
				case ZipCompressionType.STORED:
					return data;
				default:
					throw (new Error("Unsupported compression type '" + this.compressionType + "'"));
			}
		}).then((data) => {
			return this.uncompressedData = <Uint8Array>data;
		});
	}

	access(path: string, create: boolean = false, fullPath: string = null): ZipEntry {
		if (fullPath === null) fullPath = path;
		if (path == '') return this;
		if (path == '.') return this;
		if (path == '..') return this.parent || this;

		var pathIndex = path.indexOf('/')
		// Single component
		if (pathIndex < 0) {
			var normalizedName = ZipEntry.normalizeString(path);
			var child = this.children[normalizedName];
			if (!child) {
				if (!create) {
					throw (new Error("ZIP: Can't access to path '" + fullPath + "'"));
				} else {
					child = this.children[normalizedName] = new ZipEntry(this.zip, path, this);
				}
			}
			return child;
		} else {
			return this.access(path.substr(0, pathIndex), create, fullPath).access(path.substr(pathIndex + 1), create, fullPath);
		}
	}
}

export class Zip {
	private root = new ZipEntry(this, '', null);

	constructor(public zipStream: AsyncStream, private zipDirEntries: ZipDirEntry[]) {
		zipDirEntries.forEach((zipDirEntry) => {
			var item = this.root.access(zipDirEntry.fileName, true);
			item.isDirectory = (zipDirEntry.fileName.substr(-1, 1) == '/');
			item.zipDirEntry = zipDirEntry;
		});
		//console.log(this.root);
	}

	get(path: string): ZipEntry {
		return this.root.access(path);
	}

	has(path: string) {
		try {
			this.root.access(path);
			return true;
		} catch (e) {
			return false;
		}
	}

	static fromStreamAsync(zipStream: AsyncStream) {
		//console.info('zipStream', zipStream);

		return zipStream.readChunkAsync(zipStream.size - ZipEndLocator.struct.length, ZipEndLocator.struct.length).then((data) => {
			var zipEndLocator = ZipEndLocator.struct.read(Stream.fromArrayBuffer(data));

			//console.log('zipEndLocator', zipEndLocator);

			return zipStream.readChunkAsync(zipEndLocator.directoryOffset, zipEndLocator.directorySize).then((data) => {
				var dirEntries = StructArray<ZipDirEntry>(ZipDirEntry.struct, zipEndLocator.entriesInDirectory).read(Stream.fromArrayBuffer(data));

				return new Zip(zipStream, dirEntries);
			});
		});
	}
}

export const enum ZipCompressionType {
	STORED = 0,
	SHRUNK = 1,
	REDUCED1 = 2,
	REDUCED2 = 3,
	REDUCED3 = 4,
	REDUCED4 = 5,
	IMPLODED = 6,
	TOKEN = 7,
	DEFLATE = 8,
	DEFLATE64 = 9    
}

export class ZipEndLocator {
	magic: number;
	currentDiskNumber: number;
	startDiskNumber: number;
	entriesOnDisk: number;
	entriesInDirectory: number;
	directorySize: number;
	directoryOffset: number;
	commentLength: number;

	static struct = StructClass.create<ZipEndLocator>(ZipEndLocator, [
		{ magic: UInt32 },
		{ currentDiskNumber: UInt16 },
		{ startDiskNumber: UInt16 },
		{ entriesOnDisk: UInt16 },
		{ entriesInDirectory: UInt16 },
		{ directorySize: UInt32 },
		{ directoryOffset: UInt32 },
		{ commentLength: UInt16 },
	]);
}

export class ZipFileRecord {
	magic: number;
	version: number;
	flags: number;
	compType: ZipCompressionType;
	dosTime: number;
	dosDate: number;
	crc32: number;
	compressedSize: number;
	uncompressedSize: number;
	fileNameLength: number;
	extraFieldLength: number;
	fileName: string;
	extraField: string;

	static struct = StructClass.create<ZipFileRecord>(ZipFileRecord, [
		{ magic: UInt32 },
		{ version: UInt16 },
		{ flags: UInt16 },
		{ compType: UInt16 },
		{ dosTime: UInt16 },
		{ dosDate: UInt16 },
		{ crc32: UInt32 },
		{ compressedSize: UInt32 },
		{ uncompressedSize: UInt32 },
		{ fileNameLength: UInt16 },
		{ extraFieldLength: UInt16 },
		{ fileName: StringWithSize(context => context.fileNameLength) },
		{ extraField: StringWithSize(context => context.extraFieldLength) },
	]);
}

export class ZipDirEntry {
	magic: number;
	versionMadeBy: number;
	versionToExtract: number;
	flags: number;
	compType: ZipCompressionType;
	dosTime: number;
	dosDate: number;
	crc32: number;
	compressedSize: number;
	uncompressedSize: number;
	fileNameLength: number;
	extraFieldLength: number;
	fileCommentsLength: number;
	diskNumberStart: number;
	internalAttributes: number;
	externalAttributes: number;
	headerOffset: number;
	fileName: string;
	extraField: string;
	fileComments: string;

	static struct = StructClass.create<ZipDirEntry>(ZipDirEntry, [
		{ magic: UInt32 },
		{ versionMadeBy: UInt16 },
		{ versionToExtract: UInt16 },
		{ flags: UInt16 },
		{ compType: UInt16 },
		{ dosTime: UInt16 },
		{ dosDate: UInt16 },
		{ crc32: UInt32 },
		{ compressedSize: UInt32 },
		{ uncompressedSize: UInt32 },
		{ fileNameLength: UInt16 },
		{ extraFieldLength: UInt16 },
		{ fileCommentsLength: UInt16 },
		{ diskNumberStart: UInt16 },
		{ internalAttributes: UInt16 },
		{ externalAttributes: UInt32 },
		{ headerOffset: UInt32 },
		{ fileName: StringWithSize(context => context.fileNameLength) },
		{ extraField: StringWithSize(context => context.extraFieldLength) },
		{ fileComments: StringWithSize(context => context.fileCommentsLength) },
	]);
}
