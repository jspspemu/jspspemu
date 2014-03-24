module format.pbp {
	enum PbpMagic {
		expected = 0x50425000,
	}

	class PbpHeader {
		magic: PbpMagic;
		version: number;
		offsets: number[];

		static struct = StructClass.create<PbpHeader>(PbpHeader, [
			{ type: Int32, name: 'magic' },
			{ type: Int32, name: 'version' },
			{ type: new StructArray<number>(Int32, 8), name: 'offsets' },
		]);
	}

	export class Pbp {
		private header: PbpHeader;
		private stream: Stream;

		private static names = ["param.sfo", "icon0.png", "icon1.pmf", "pic0.png", "pic1.png", "snd0.at3", "psp.data", "psar.data"];

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

		get(name: string) {
			var index = Pbp.names.indexOf(name);
			return this.getByIndex(index);
		}

		getByIndex(index: number) {
			var offsets = this.header.offsets;
			return this.stream.sliceWithLowHigh(offsets[index + 0], offsets[index + 1]);
		}
	}
}
