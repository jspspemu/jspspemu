import "../emu/global"
import {Int32, Struct, StructArray, StructClass, StructInt32, StructStructArray} from "../global/struct";
import {Stream} from "../global/stream";

enum PbpMagic {
    expected = 0x50425000,
}

class PbpHeader extends Struct {
    @StructInt32 magic: PbpMagic = 0
    @StructInt32 version: number = 0
    @StructStructArray(Int32, 8) offsets: number[] = []
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

export const PbpNames = Names

export class Pbp {
    // @ts-ignore
    private header: PbpHeader
    // @ts-ignore
    private stream: Stream

    private static names = [Names.ParamSfo, Names.Icon0Png, Names.Icon1Pmf, Names.Pic0Png, Names.Pic1Png, Names.Snd0At3, Names.PspData, Names.PsarData];

    constructor() {
    }

    static fromStream(stream: Stream) {
        const pbp = new Pbp();
        pbp.load(stream);
        return pbp;
    }

    load(stream: Stream) {
        this.stream = stream;
        this.header = PbpHeader.struct.read(stream);
        if (this.header.magic != PbpMagic.expected) throw("Not a PBP file");
        this.header.offsets.push(stream.length);
    }

    get(name: string): Stream {
        const index = Pbp.names.indexOf(name);
        return this.getByIndex(index);
    }

    getByIndex(index: number): Stream {
        const offsets = this.header.offsets;
        return this.stream.sliceWithLowHigh(offsets[index + 0], offsets[index + 1]);
    }
}
