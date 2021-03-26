import "../emu/global"

import {AsyncStream, Stream} from "../global/stream";
import {
    StringWithSize,
    Struct,
    StructArray,
    StructMember,
    StructUInt16,
    StructUInt32
} from "../global/struct";
import {ArrayBufferUtils, PromiseFast, StringDictionary} from "../global/utils";
import {BitUtils} from "../global/math";
import {zlib_inflate_raw} from "./zlib";

export class ZipEntry {
	private children: StringDictionary<ZipEntry> = {};
	// @ts-ignore
    zipDirEntry: ZipDirEntry;
	normalizedName: string;
	isDirectory: boolean = false
    // @ts-ignore
	compressedData: Uint8Array;
    // @ts-ignore
	uncompressedData: Uint8Array;

	get size() {
		return this.uncompressedSize;
	}

	getChildList() {
        const list: ZipEntry[] = [];
        for (const key in this.children) list.push(this.children[key]);
		return list;
	}

	get date() {
        const dosDate = this.zipDirEntry.dosDate;
        const dosTime = this.zipDirEntry.dosTime;

        const seconds = BitUtils.extract(dosTime, 0, 5) * 2;
        const minutes = BitUtils.extract(dosTime, 5, 6);
        const hours = BitUtils.extract(dosTime, 11, 6);
        const day = BitUtils.extract(dosDate, 0, 5);
        const month = BitUtils.extract(dosDate, 5, 4);
        const year = BitUtils.extract(dosDate, 9, 7) + 1980;

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

	constructor(private zip: Zip, public name: string, private parent: ZipEntry|null) {
		this.normalizedName = ZipEntry.normalizeString(name);
	}

	private static normalizeString(string: string) {
		return string.toUpperCase();
	}

	readRawCompressedAsync():PromiseFast<Uint8Array> {
		if (this.compressedData) return PromiseFast.resolve(this.compressedData);
		return this.zip.zipStream.readChunkAsync(this.zipDirEntry.headerOffset, this.zipDirEntry.compressedSize + 1024).thenFast((data) => {
            const stream = Stream.fromArrayBuffer(data);
            const zipFileRecord = ZipFileRecord.struct.read(stream);
            return this.compressedData = stream.readBytes(zipFileRecord.compressedSize);
		});
	}

	readChunkAsync(offset: number, length: number) {
		return this.readAsync().thenFast((data) => {
			return ArrayBufferUtils.fromUInt8Array(data.subarray(offset, offset + length));
		});
	}
	
	readAsync() {
		if (this.uncompressedData) return PromiseFast.resolve(this.uncompressedData);
		return this.readRawCompressedAsync().thenFast((data:Uint8Array) => {
			switch (this.compressionType) {
				case ZipCompressionType.DEFLATE:
					return zlib_inflate_raw(data);
				case ZipCompressionType.STORED:
					return data;
				default:
					throw (new Error("Unsupported compression type '" + this.compressionType + "'"));
			}
		}).thenFast((data) => {
			return this.uncompressedData = <Uint8Array>data;
		});
	}

	access(path: string, create: boolean = false, fullPath: string = path): ZipEntry {
		if (path == '') return this;
		if (path == '.') return this;
		if (path == '..') return this.parent || this;

        const pathIndex = path.indexOf('/');
        // Single component
		if (pathIndex < 0) {
            const normalizedName = ZipEntry.normalizeString(path);
            let child = this.children[normalizedName];
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
            const item = this.root.access(zipDirEntry.fileName, true);
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

	static async fromStreamAsync(zipStream: AsyncStream) {
		//console.info('zipStream', zipStream);

        const data = await zipStream.readChunkAsync(zipStream.size - ZipEndLocator.struct.length, ZipEndLocator.struct.length);
        const zipEndLocator = ZipEndLocator.struct.read(Stream.fromArrayBuffer(data));

        //console.log('zipEndLocator', zipEndLocator);

        const data2 = await zipStream.readChunkAsync(zipEndLocator.directoryOffset, zipEndLocator.directorySize)
        const dirEntries = StructArray<ZipDirEntry>(ZipDirEntry.struct, zipEndLocator.entriesInDirectory).read(Stream.fromArrayBuffer(data2));
        return new Zip(zipStream, dirEntries);
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

export class ZipEndLocator extends Struct {
	@StructUInt32 magic: number = 0
    @StructUInt16 currentDiskNumber: number = 0
    @StructUInt16 startDiskNumber: number = 0
    @StructUInt16 entriesOnDisk: number = 0
    @StructUInt16 entriesInDirectory: number = 0
    @StructUInt32 directorySize: number = 0
    @StructUInt32 directoryOffset: number = 0
    @StructUInt16 commentLength: number = 0
}

export class ZipFileRecord extends Struct {
	@StructUInt32 magic: number = 0
    @StructUInt16 version: number = 0
    @StructUInt16 flags: number = 0
    @StructUInt16 compType: ZipCompressionType = ZipCompressionType.STORED
    @StructUInt16 dosTime: number = 0
    @StructUInt16 dosDate: number = 0
    @StructUInt32 crc32: number = 0
    @StructUInt32 compressedSize: number = 0
    @StructUInt32 uncompressedSize: number = 0
    @StructUInt16 fileNameLength: number = 0
    @StructUInt16 extraFieldLength: number = 0
	@StructMember(StringWithSize((context: ZipFileRecord) => context.fileNameLength)) fileName: string = ''
    @StructMember(StringWithSize((context: ZipFileRecord) => context.extraFieldLength)) extraField: string = ''
}

export class ZipDirEntry extends Struct {
	@StructUInt32 magic: number = 0
	@StructUInt16 versionMadeBy: number = 0
    @StructUInt16 versionToExtract: number = 0
    @StructUInt16 flags: number = 0
    @StructUInt16 compType: ZipCompressionType = ZipCompressionType.STORED
    @StructUInt16 dosTime: number = 0
    @StructUInt16 dosDate: number = 0
    @StructUInt32 crc32: number = 0
    @StructUInt32 compressedSize: number = 0
    @StructUInt32 uncompressedSize: number = 0
    @StructUInt16 fileNameLength: number = 0
    @StructUInt16 extraFieldLength: number = 0
    @StructUInt16 fileCommentsLength: number = 0
    @StructUInt16 diskNumberStart: number = 0
    @StructUInt16 internalAttributes: number = 0
    @StructUInt32 externalAttributes: number = 0
    @StructUInt32 headerOffset: number = 0
	@StructMember(StringWithSize((context: ZipDirEntry) => context.fileNameLength)) fileName: string = ''
    @StructMember(StringWithSize((context: ZipDirEntry) => context.extraFieldLength)) extraField: string = ''
    @StructMember(StringWithSize((context: ZipDirEntry) => context.fileCommentsLength)) fileComments: string = ''
}
