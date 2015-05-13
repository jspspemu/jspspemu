///<reference path="../global.d.ts" />

enum PbpMagic {
	expected = 0x50425000,
}

class PbpHeader {
	magic: PbpMagic;
	version: number;
	offsets: number[];

	static struct = StructClass.create<PbpHeader>(PbpHeader, [
		{ magic: Int32 },
		{ version: Int32 },
		{ offsets: StructArray(Int32, 8) },
	]);
}

export class Names {
	static ParamSfo = "param.sfo";
	static Icon0Png = "icon0.png";
	static Icon1Pmf = "icon1.pmf";
	static Pic0Png = "pic0.png";
	static Pic1Png = "pic1.png";
	static Snd0At3 = "snd0.at3";
	static PspData = "psp.data";
	static PsarData = "psar.data";
}

export class Pbp {
	private header: PbpHeader;
	private stream: Stream;

	private static names = [Names.ParamSfo, Names.Icon0Png, Names.Icon1Pmf, Names.Pic0Png, Names.Pic1Png, Names.Snd0At3, Names.PspData, Names.PsarData];

	constructor() {
	}

	static fromStream(stream: Stream) {
		var pbp = new Pbp();
		pbp.load(stream);
		return pbp;
	}

	load(stream: Stream) {
		this.stream = stream;
		this.header = PbpHeader.struct.read(stream);
		if (this.header.magic != PbpMagic.expected) throw("Not a PBP file");
		this.header.offsets.push(stream.length);
	}

	get(name: string):Stream {
		var index = Pbp.names.indexOf(name);
		return this.getByIndex(index);
	}

	getByIndex(index: number):Stream {
		var offsets = this.header.offsets;
		return this.stream.sliceWithLowHigh(offsets[index + 0], offsets[index + 1]);
	}
}
