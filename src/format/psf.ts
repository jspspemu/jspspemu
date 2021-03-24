import "../emu/global"
import {StructArray, StructClass, UInt16, UInt32, UInt8} from "../global/struct";
import {StringDictionary} from "../global/utils";
import {Stream} from "../global/stream";

enum DataType {
	Binary = 0,
	Text = 2,
	Int = 4,
}

class HeaderStruct {
	magic: number = 0
	version: number = 0
	keyTable: number = 0
	valueTable: number = 0
	numberOfPairs: number = 0

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
	key: string = ''
	value: any

	keyOffset: number = 0
	private unknown: number = 0
	dataType: DataType = DataType.Binary
	valueSize: number = 0
	valueSizePad: number = 0
	valueOffset: number = 0

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
	// @ts-ignore
    private header: HeaderStruct;

	constructor() {
	}

	static fromStream(stream: Stream) {
        const psf = new Psf();
        psf.load(stream);
		return psf;
	}

	load(stream: Stream) {
        const header = this.header = HeaderStruct.struct.read(stream);
        if (header.magic != 0x46535000) throw ("Not a PSF file");
        const entries = StructArray<EntryStruct>(EntryStruct.struct, header.numberOfPairs).read(stream);
        const entriesByName: StringDictionary<IEntryStruct> = {};

        const keysStream = stream.sliceWithLength(header.keyTable);
        const valuesStream = stream.sliceWithLength(header.valueTable);

        entries.forEach(entry => {
            const key = keysStream.sliceWithLength(entry.keyOffset).readUtf8Stringz();
            const valueStream = valuesStream.sliceWithLength(entry.valueOffset, entry.valueSize);
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
