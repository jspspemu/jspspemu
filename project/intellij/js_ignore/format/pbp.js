///<reference path="../global.d.ts" />
var PbpMagic;
(function (PbpMagic) {
    PbpMagic[PbpMagic["expected"] = 0x50425000] = "expected";
})(PbpMagic || (PbpMagic = {}));
var PbpHeader = (function () {
    function PbpHeader() {
    }
    PbpHeader.struct = StructClass.create(PbpHeader, [
        { magic: Int32 },
        { version: Int32 },
        { offsets: StructArray(Int32, 8) },
    ]);
    return PbpHeader;
})();
var Names = (function () {
    function Names() {
    }
    Names.ParamSfo = "param.sfo";
    Names.Icon0Png = "icon0.png";
    Names.Icon1Pmf = "icon1.pmf";
    Names.Pic0Png = "pic0.png";
    Names.Pic1Png = "pic1.png";
    Names.Snd0At3 = "snd0.at3";
    Names.PspData = "psp.data";
    Names.PsarData = "psar.data";
    return Names;
})();
exports.Names = Names;
var Pbp = (function () {
    function Pbp() {
    }
    Pbp.fromStream = function (stream) {
        var pbp = new Pbp();
        pbp.load(stream);
        return pbp;
    };
    Pbp.prototype.load = function (stream) {
        this.stream = stream;
        this.header = PbpHeader.struct.read(stream);
        if (this.header.magic != 1346523136 /* expected */)
            throw ("Not a PBP file");
        this.header.offsets.push(stream.length);
    };
    Pbp.prototype.get = function (name) {
        var index = Pbp.names.indexOf(name);
        return this.getByIndex(index);
    };
    Pbp.prototype.getByIndex = function (index) {
        var offsets = this.header.offsets;
        return this.stream.sliceWithLowHigh(offsets[index + 0], offsets[index + 1]);
    };
    Pbp.names = [Names.ParamSfo, Names.Icon0Png, Names.Icon1Pmf, Names.Pic0Png, Names.Pic1Png, Names.Snd0At3, Names.PspData, Names.PsarData];
    return Pbp;
})();
exports.Pbp = Pbp;
//# sourceMappingURL=pbp.js.map