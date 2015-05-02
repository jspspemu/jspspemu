///<reference path="../global.d.ts" />

enum DataType {
	Binary = 0,
	Text = 2,
	Int = 4,
}

class HeaderStruct {
	magic: number;
	version: number;
	keyTable: number;
	valueTable: number;
	numberOfPairs: number;

	static struct = StructClass.create<HeaderStruct>(HeaderStruct, [
		{ magic: UInt32 },
		{ version: UInt32 },
		{ keyTable: UInt32 },
		{ valueTable: UInt32 },
		{ numberOfPairs: UInt32 },
	]);
}

export interface IEntryStruct {
	key: string;
	value: any;
}

class EntryStruct implements IEntryStruct {
	key: string;
	value: any;

	keyOffset: number;
	private unknown: number;
	dataType: DataType;
	valueSize: number;
	valueSizePad: number;
	valueOffset: number;

	static struct = StructClass.create<EntryStruct>(EntryStruct, [
		{ keyOffset: UInt16 },
		{ unknown: UInt8 },
		{ dataType: UInt8 },
		{ valueSize: UInt32 },
		{ valueSizePad: UInt32 },
		{ valueOffset: UInt32 },
	]);
}

export class Psf {
	public entries: IEntryStruct[] = [];
	public entriesByName: StringDictionary<any> = {};
	private header: HeaderStruct;

	constructor() {
	}

	static fromStream(stream: Stream) {
		var psf = new Psf();
		psf.load(stream);
		return psf;
	}

	load(stream: Stream) {
		var header = this.header = HeaderStruct.struct.read(stream);
		if (header.magic != 0x46535000) throw ("Not a PSF file");
		var entries = StructArray<EntryStruct>(EntryStruct.struct, header.numberOfPairs).read(stream);
		var entriesByName: StringDictionary<IEntryStruct>  = {};

		var keysStream = stream.sliceWithLength(header.keyTable);
		var valuesStream = stream.sliceWithLength(header.valueTable);

		entries.forEach(entry => {
			var key = keysStream.sliceWithLength(entry.keyOffset).readUtf8Stringz();
			var valueStream = valuesStream.sliceWithLength(entry.valueOffset, entry.valueSize);
			entry.key = key;

			switch (entry.dataType) {
				case DataType.Binary: entry.value = valueStream.sliceWithLength(0); break;
				case DataType.Int: entry.value = valueStream.readInt32(); break;
				case DataType.Text: entry.value = valueStream.readUtf8Stringz(); break;
				default: throw `Unknown dataType: ${entry.dataType}`;
			}

			entriesByName[entry.key] = entry.value;
		});

		this.entries = entries;
		this.entriesByName = entriesByName;
	}
}
