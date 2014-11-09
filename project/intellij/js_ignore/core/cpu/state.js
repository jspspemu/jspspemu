///<reference path="../../global.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var memory = require('../memory');
(function (CpuSpecialAddresses) {
    CpuSpecialAddresses[CpuSpecialAddresses["EXIT_THREAD"] = 0x0FFFFFFF] = "EXIT_THREAD";
})(exports.CpuSpecialAddresses || (exports.CpuSpecialAddresses = {}));
var CpuSpecialAddresses = exports.CpuSpecialAddresses;
var VfpuPrefixBase = (function () {
    function VfpuPrefixBase(vfrc, index) {
        this.vfrc = vfrc;
        this.index = index;
        this.enabled = false;
    }
    VfpuPrefixBase.prototype._readInfo = function () {
        this._info = this.getInfo();
    };
    VfpuPrefixBase.prototype.eat = function () {
        this.enabled = false;
    };
    VfpuPrefixBase.prototype.getInfo = function () {
        return this.vfrc[this.index];
    };
    VfpuPrefixBase.prototype.setInfo = function (info) {
        this.vfrc[this.index] = info;
        this.enabled = true;
    };
    return VfpuPrefixBase;
})();
var VfpuPrefixRead = (function (_super) {
    __extends(VfpuPrefixRead, _super);
    function VfpuPrefixRead() {
        _super.apply(this, arguments);
    }
    //private getSourceIndex(i: number) { return BitUtils.extract(this._info, 0 + i * 2, 2); }
    //private getSourceAbsolute(i: number) { return BitUtils.extractBool(this._info, 8 + i * 1); }
    //private getSourceConstant(i: number) { return BitUtils.extractBool(this._info, 12 + i * 1); }
    //private getSourceNegate(i: number) { return BitUtils.extractBool(this._info, 16 + i * 1); }
    VfpuPrefixRead.prototype.transformValues = function (input, output) {
        this._readInfo();
        var info = this._info;
        if (!this.enabled) {
            for (var n = 0; n < input.length; n++)
                output[n] = input[n];
        }
        else {
            for (var n = 0; n < input.length; n++) {
                //var sourceIndex = this.getSourceIndex(n);
                //var sourceAbsolute = this.getSourceAbsolute(n);
                //var sourceConstant = this.getSourceConstant(n);
                //var sourceNegate = this.getSourceNegate(n);
                var sourceIndex = (info >> (0 + n * 2)) & 3;
                var sourceAbsolute = (info >> (8 + n * 1)) & 1;
                var sourceConstant = (info >> (12 + n * 1)) & 1;
                var sourceNegate = (info >> (16 + n * 1)) & 1;
                var value;
                if (sourceConstant) {
                    switch (sourceIndex) {
                        case 0:
                            value = sourceAbsolute ? (3) : (0);
                            break;
                        case 1:
                            value = sourceAbsolute ? (1 / 3) : (1);
                            break;
                        case 2:
                            value = sourceAbsolute ? (1 / 4) : (2);
                            break;
                        case 3:
                            value = sourceAbsolute ? (1 / 6) : (1 / 2);
                            break;
                        default:
                            throw (new Error("Invalid operation"));
                            break;
                    }
                }
                else {
                    //debugger;
                    value = input[sourceIndex];
                    if (sourceAbsolute)
                        value = Math.abs(value);
                }
                if (sourceNegate)
                    value = MathFloat.neg(value);
                output[n] = value;
            }
        }
    };
    return VfpuPrefixRead;
})(VfpuPrefixBase);
var VfpuPrefixWrite = (function (_super) {
    __extends(VfpuPrefixWrite, _super);
    function VfpuPrefixWrite() {
        _super.apply(this, arguments);
    }
    //getDestinationSaturation(i: number) { return (this._info >> (0 + i * 2)) & 3; }
    //getDestinationMask(i: number) { return (this._info >> (8 + i * 1)) & 1; }
    VfpuPrefixWrite.prototype.storeTransformedValues = function (vfpr, indices, values) {
        this._readInfo();
        var info = this._info;
        if (!this.enabled) {
            for (var n = 0; n < indices.length; n++) {
                vfpr[indices[n]] = values[n];
            }
        }
        else {
            for (var n = 0; n < indices.length; n++) {
                //var destinationSaturation = this.getDestinationSaturation(n);
                //var destinationMask = this.getDestinationMask(n);
                var destinationSaturation = (info >> (0 + n * 2)) & 3;
                var destinationMask = (info >> (8 + n * 1)) & 1;
                if (destinationMask) {
                }
                else {
                    var value = values[n];
                    switch (destinationSaturation) {
                        case 1:
                            value = MathFloat.sat0(value);
                            break;
                        case 3:
                            value = MathFloat.sat1(value);
                            break;
                        default:
                            break;
                    }
                    vfpr[indices[n]] = value;
                }
            }
        }
    };
    return VfpuPrefixWrite;
})(VfpuPrefixBase);
(function (VFPU_CTRL) {
    VFPU_CTRL[VFPU_CTRL["SPREFIX"] = 0] = "SPREFIX";
    VFPU_CTRL[VFPU_CTRL["TPREFIX"] = 1] = "TPREFIX";
    VFPU_CTRL[VFPU_CTRL["DPREFIX"] = 2] = "DPREFIX";
    VFPU_CTRL[VFPU_CTRL["CC"] = 3] = "CC";
    VFPU_CTRL[VFPU_CTRL["INF4"] = 4] = "INF4";
    VFPU_CTRL[VFPU_CTRL["RSV5"] = 5] = "RSV5";
    VFPU_CTRL[VFPU_CTRL["RSV6"] = 6] = "RSV6";
    VFPU_CTRL[VFPU_CTRL["REV"] = 7] = "REV";
    VFPU_CTRL[VFPU_CTRL["RCX0"] = 8] = "RCX0";
    VFPU_CTRL[VFPU_CTRL["RCX1"] = 9] = "RCX1";
    VFPU_CTRL[VFPU_CTRL["RCX2"] = 10] = "RCX2";
    VFPU_CTRL[VFPU_CTRL["RCX3"] = 11] = "RCX3";
    VFPU_CTRL[VFPU_CTRL["RCX4"] = 12] = "RCX4";
    VFPU_CTRL[VFPU_CTRL["RCX5"] = 13] = "RCX5";
    VFPU_CTRL[VFPU_CTRL["RCX6"] = 14] = "RCX6";
    VFPU_CTRL[VFPU_CTRL["RCX7"] = 15] = "RCX7";
    VFPU_CTRL[VFPU_CTRL["MAX"] = 16] = "MAX";
})(exports.VFPU_CTRL || (exports.VFPU_CTRL = {}));
var VFPU_CTRL = exports.VFPU_CTRL;
(function (VCondition) {
    VCondition[VCondition["FL"] = 0] = "FL";
    VCondition[VCondition["EQ"] = 1] = "EQ";
    VCondition[VCondition["LT"] = 2] = "LT";
    VCondition[VCondition["LE"] = 3] = "LE";
    VCondition[VCondition["TR"] = 4] = "TR";
    VCondition[VCondition["NE"] = 5] = "NE";
    VCondition[VCondition["GE"] = 6] = "GE";
    VCondition[VCondition["GT"] = 7] = "GT";
    VCondition[VCondition["EZ"] = 8] = "EZ";
    VCondition[VCondition["EN"] = 9] = "EN";
    VCondition[VCondition["EI"] = 10] = "EI";
    VCondition[VCondition["ES"] = 11] = "ES";
    VCondition[VCondition["NZ"] = 12] = "NZ";
    VCondition[VCondition["NN"] = 13] = "NN";
    VCondition[VCondition["NI"] = 14] = "NI";
    VCondition[VCondition["NS"] = 15] = "NS";
})(exports.VCondition || (exports.VCondition = {}));
var VCondition = exports.VCondition;
;
var CpuState = (function () {
    function CpuState(memory, syscallManager) {
        this.memory = memory;
        this.syscallManager = syscallManager;
        this.gpr_Buffer = new ArrayBuffer(32 * 4);
        this.gpr = new Int32Array(this.gpr_Buffer);
        this.gpr_f = new Float32Array(this.gpr_Buffer);
        this.temp = new Array(16);
        this.fpr_Buffer = new ArrayBuffer(32 * 4);
        this.fpr = new Float32Array(this.fpr_Buffer);
        this.fpr_i = new Int32Array(this.fpr_Buffer);
        //fpr: Float32Array = new Float32Array(32);
        this.vfpr_Buffer = new ArrayBuffer(128 * 4);
        this.vfpr = new Float32Array(this.vfpr_Buffer);
        this.vfpr_i = new Int32Array(this.vfpr_Buffer);
        this.vfprc = [0, 0, 0, 0xFF, 0, 0, 0, 0, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000];
        this.vpfxs = new VfpuPrefixRead(this.vfprc, 0 /* SPREFIX */);
        this.vpfxt = new VfpuPrefixRead(this.vfprc, 1 /* TPREFIX */);
        this.vpfxd = new VfpuPrefixWrite(this.vfprc, 2 /* DPREFIX */);
        this.vector_vs = [0, 0, 0, 0];
        this.vector_vt = [0, 0, 0, 0];
        this.vector_vd = [0, 0, 0, 0];
        this.BRANCHFLAG = false;
        this.BRANCHPC = 0;
        this.PC = 0;
        this.IC = 0;
        this.LO = 0;
        this.HI = 0;
        this.thread = null;
        this.callstack = [];
        this.fcr31_rm = 0;
        this.fcr31_2_21 = 0;
        this.fcr31_25_7 = 0;
        this.fcr31_cc = false;
        this.fcr31_fs = false;
        this.fcr0 = 0x00003351;
        this.fcr0 = 0x00003351;
        this.fcr31 = 0x00000e00;
    }
    CpuState.prototype.setVfrCc = function (index, value) {
        if (value) {
            this.vfprc[3 /* CC */] |= (1 << index);
        }
        else {
            this.vfprc[3 /* CC */] &= ~(1 << index);
        }
    };
    CpuState.prototype.vrnds = function () {
    };
    CpuState.prototype.vrndi = function () {
        var v = 0;
        for (var n = 0; n < 4; n++) {
            v <<= 8;
            v |= (Math.round(Math.random() * 255) & 0xFF);
        }
        return v;
    };
    CpuState.prototype.vrndf1 = function () {
        return Math.random() * 2;
    };
    CpuState.prototype.vrndf2 = function () {
        return Math.random() * 4;
    };
    CpuState.prototype.getVfrCc = function (index) {
        return ((this.vfprc[3 /* CC */] & (1 << index)) != 0);
    };
    CpuState.prototype.vcmp = function (cond, vsValues, vtValues) {
        var vectorSize = vsValues.length;
        this.loadVs_prefixed(vsValues);
        this.loadVt_prefixed(vtValues);
        var s = this.vector_vs;
        var t = this.vector_vt;
        var cc = 0;
        var or_val = 0;
        var and_val = 1;
        var affected_bits = (1 << 4) | (1 << 5); // 4 and 5
        for (var i = 0; i < vectorSize; i++) {
            var c = false;
            switch (cond) {
                case 0 /* FL */:
                    c = false;
                    break;
                case 1 /* EQ */:
                    c = s[i] == t[i];
                    break;
                case 2 /* LT */:
                    c = s[i] < t[i];
                    break;
                case 3 /* LE */:
                    c = s[i] <= t[i];
                    break;
                case 4 /* TR */:
                    c = true;
                    break;
                case 5 /* NE */:
                    c = s[i] != t[i];
                    break;
                case 6 /* GE */:
                    c = s[i] >= t[i];
                    break;
                case 7 /* GT */:
                    c = s[i] > t[i];
                    break;
                case 8 /* EZ */:
                    c = s[i] == 0.0 || s[i] == -0.0;
                    break;
                case 9 /* EN */:
                    c = MathFloat.isnan(s[i]);
                    break;
                case 10 /* EI */:
                    c = MathFloat.isinf(s[i]);
                    break;
                case 11 /* ES */:
                    c = MathFloat.isnanorinf(s[i]);
                    break;
                case 12 /* NZ */:
                    c = s[i] != 0;
                    break;
                case 13 /* NN */:
                    c = !MathFloat.isnan(s[i]);
                    break;
                case 14 /* NI */:
                    c = !MathFloat.isinf(s[i]);
                    break;
                case 15 /* NS */:
                    c = !(MathFloat.isnanorinf(s[i]));
                    break;
            }
            var c_i = (c ? 1 : 0);
            cc |= (c_i << i);
            or_val |= c_i;
            and_val &= c_i;
            affected_bits |= 1 << i;
        }
        this.vfprc[3 /* CC */] = (this.vfprc[3 /* CC */] & ~affected_bits) | ((cc | (or_val << 4) | (and_val << 5)) & affected_bits);
        this.eatPrefixes();
    };
    CpuState.prototype.vcmovtf = function (register, _true, vdRegs, vsRegs) {
        var _this = this;
        var vectorSize = vdRegs.length;
        this.loadVs_prefixed(vsRegs.map(function (reg) { return _this.vfpr[reg]; }));
        this.loadVdRegs(vdRegs);
        var compare = _true ? 1 : 0;
        var cc = this.vfprc[3 /* CC */];
        if (register < 6) {
            if (((cc >> register) & 1) == compare) {
                for (var n = 0; n < vectorSize; n++) {
                    this.vector_vd[n] = this.vector_vs[n];
                }
            }
        }
        if (register == 6) {
            for (var n = 0; n < vectorSize; n++) {
                if (((cc >> n) & 1) == compare) {
                    this.vector_vd[n] = this.vector_vs[n];
                }
            }
        }
        else {
        }
        this.storeVdRegsWithPrefix(vdRegs);
    };
    CpuState.prototype.setVpfxt = function (value) {
        this.vpfxt.setInfo(value);
    };
    CpuState.prototype.setVpfxs = function (value) {
        this.vpfxs.setInfo(value);
    };
    CpuState.prototype.setVpfxd = function (value) {
        this.vpfxd.setInfo(value);
    };
    Object.defineProperty(CpuState.prototype, "vfpumatrix0", {
        get: function () {
            return this.getVfpumatrix(0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "vfpumatrix1", {
        get: function () {
            return this.getVfpumatrix(1);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "vfpumatrix2", {
        get: function () {
            return this.getVfpumatrix(2);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "vfpumatrix3", {
        get: function () {
            return this.getVfpumatrix(3);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "vfpumatrix4", {
        get: function () {
            return this.getVfpumatrix(4);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "vfpumatrix5", {
        get: function () {
            return this.getVfpumatrix(5);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "vfpumatrix6", {
        get: function () {
            return this.getVfpumatrix(6);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "vfpumatrix7", {
        get: function () {
            return this.getVfpumatrix(7);
        },
        enumerable: true,
        configurable: true
    });
    CpuState.prototype.eatPrefixes = function () {
        this.vpfxd.eat();
        this.vpfxt.eat();
        this.vpfxs.eat();
    };
    CpuState.prototype.getVfpumatrix = function (index) {
        var values = [];
        for (var r = 0; r < 4; r++) {
            for (var c = 0; c < 4; c++) {
                values.push(this.vfpr[r * 32 + index * 4 + c]);
            }
        }
        return values;
    };
    CpuState.prototype.loadVdRegs = function (regs) {
        for (var n = 0; n < regs.length; n++) {
            this.vector_vd[n] = this.vfpr[regs[n]];
        }
    };
    CpuState.prototype.storeVdRegsWithPrefix = function (regs) {
        this.vpfxd.storeTransformedValues(this.vfpr, regs, this.vector_vd);
        this.vpfxd.eat();
        this.storeVdRegs(regs);
    };
    CpuState.prototype.storeVdRegsWithPrefix1 = function (regs) {
        this.vpfxd.storeTransformedValues(this.vfpr, regs, this.vector_vd);
        this.vpfxd.eat();
        this.storeVdRegs(regs);
    };
    CpuState.prototype.storeVdRegs = function (regs) {
        for (var n = 0; n < regs.length; n++)
            this.vfpr[regs[n]] = this.vector_vd[n];
    };
    CpuState.prototype.loadVs_prefixed = function (values) {
        this.vpfxs.transformValues(values, this.vector_vs);
        this.vpfxs.eat();
    };
    CpuState.prototype.loadVt_prefixed = function (values) {
        this.vpfxt.transformValues(values, this.vector_vt);
        this.vpfxt.eat();
    };
    CpuState.prototype.storeVd_prefixed = function (indices, values) {
        this.vpfxd.storeTransformedValues(this.vfpr, indices, values);
        this.vpfxd.eat();
    };
    CpuState.prototype.storeVd_prefixed_i = function (indices, values) {
        this.vpfxd.storeTransformedValues(this.vfpr_i, indices, values);
        this.vpfxd.eat();
    };
    CpuState.prototype._vt4444_step = function (i0, i1) {
        var o = 0;
        o |= ((i0 >> 4) & 15) << 0;
        o |= ((i0 >> 12) & 15) << 4;
        o |= ((i0 >> 20) & 15) << 8;
        o |= ((i0 >> 28) & 15) << 12;
        o |= ((i1 >> 4) & 15) << 16;
        o |= ((i1 >> 12) & 15) << 20;
        o |= ((i1 >> 20) & 15) << 24;
        o |= ((i1 >> 28) & 15) << 28;
        return o;
    };
    CpuState.prototype._vt5551_step = function (i0, i1) {
        var o = 0;
        o |= ((i0 >> 3) & 31) << 0;
        o |= ((i0 >> 11) & 31) << 5;
        o |= ((i0 >> 19) & 31) << 10;
        o |= ((i0 >> 31) & 1) << 15;
        o |= ((i1 >> 3) & 31) << 16;
        o |= ((i1 >> 11) & 31) << 21;
        o |= ((i1 >> 19) & 31) << 26;
        o |= ((i1 >> 31) & 1) << 31;
        return o;
    };
    CpuState.prototype._vt5650_step = function (i0, i1) {
        var o = 0;
        o |= ((i0 >> 3) & 31) << 0;
        o |= ((i0 >> 10) & 63) << 5;
        o |= ((i0 >> 19) & 31) << 11;
        o |= ((i1 >> 3) & 31) << 16;
        o |= ((i1 >> 10) & 63) << 21;
        o |= ((i1 >> 19) & 31) << 27;
        return o;
    };
    CpuState.prototype.svl_q = function (address, r) {
        var k = (3 - ((address >>> 2) & 3));
        address &= ~0xF;
        for (var n = k; n < 4; n++, address += 4)
            this.memory.writeInt32(address, this.vfpr_i[r[n]]);
    };
    CpuState.prototype.svr_q = function (address, r) {
        var k = (4 - ((address >>> 2) & 3));
        for (var n = 0; n < k; n++, address += 4)
            this.memory.writeInt32(address, this.vfpr_i[r[n]]);
    };
    CpuState.prototype.lvl_q = function (address, r) {
        var k = (3 - ((address >>> 2) & 3));
        address &= ~0xF;
        for (var n = k; n < 4; n++, address += 4)
            this.vfpr_i[r[n]] = this.memory.readInt32(address);
    };
    CpuState.prototype.lvr_q = function (address, r) {
        var k = (4 - ((address >>> 2) & 3));
        for (var n = 0; n < k; n++, address += 4)
            this.vfpr_i[r[n]] = this.memory.readInt32(address);
    };
    CpuState.prototype.storeFloats = function (address, values) {
        for (var n = 0; n < values.length; n++) {
            this.memory.writeFloat32(address + n * 4, values[n]);
        }
    };
    CpuState.prototype.vfpuStore = function (indices, values) {
        for (var n = 0; n < indices.length; n++)
            this.vfpr[indices[n]] = values[n];
    };
    CpuState.prototype.vfpuStore_i = function (indices, values) {
        for (var n = 0; n < indices.length; n++)
            this.vfpr_i[indices[n]] = values[n];
    };
    CpuState.prototype.vfpuSetMatrix = function (m, values) {
        // @TODO
        this.vfpr[0] = 0;
    };
    CpuState.prototype.preserveRegisters = function (callback) {
        var temp = new CpuState(this.memory, this.syscallManager);
        temp.copyRegistersFrom(this);
        try {
            callback();
        }
        finally {
            this.copyRegistersFrom(temp);
        }
    };
    CpuState.prototype.copyRegistersFrom = function (other) {
        this.PC = other.PC;
        this.IC = other.IC;
        this.LO = other.LO;
        this.HI = other.HI;
        for (var n = 0; n < 32; n++)
            this.gpr[n] = other.gpr[n];
        for (var n = 0; n < 32; n++)
            this.fpr[n] = other.fpr[n];
        for (var n = 0; n < 128; n++)
            this.vfpr[n] = other.vfpr[n];
        for (var n = 0; n < 8; n++)
            this.vfprc[n] = other.vfprc[n];
    };
    Object.defineProperty(CpuState.prototype, "V0", {
        get: function () {
            return this.gpr[2];
        },
        set: function (value) {
            this.gpr[2] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "V1", {
        get: function () {
            return this.gpr[3];
        },
        set: function (value) {
            this.gpr[3] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "K0", {
        get: function () {
            return this.gpr[26];
        },
        set: function (value) {
            this.gpr[26] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "GP", {
        get: function () {
            return this.gpr[28];
        },
        set: function (value) {
            this.gpr[28] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "SP", {
        get: function () {
            return this.gpr[29];
        },
        set: function (value) {
            this.gpr[29] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "FP", {
        get: function () {
            return this.gpr[30];
        },
        set: function (value) {
            this.gpr[30] = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "RA", {
        get: function () {
            return this.gpr[31];
        },
        set: function (value) {
            this.gpr[31] = value;
        },
        enumerable: true,
        configurable: true
    });
    CpuState.prototype.getRA = function () {
        return this.gpr[31];
    };
    CpuState.prototype.setRA = function (value) {
        this.gpr[31] = value;
    };
    CpuState.prototype.callstackPush = function (PC) {
        //this.callstack.push(PC);
    };
    CpuState.prototype.callstackPop = function () {
        //this.callstack.pop();
    };
    CpuState.prototype.printCallstack = function (symbolLookup) {
        if (symbolLookup === void 0) { symbolLookup = null; }
        this.getCallstack().forEach(function (PC) {
            var line = sprintf("%08X", PC);
            if (symbolLookup) {
                line += sprintf(' : %s', symbolLookup.getSymbolAt(PC));
            }
            console.log(line);
        });
    };
    CpuState.prototype.getCallstack = function () {
        return this.callstack.slice(0);
    };
    CpuState.prototype.getPointerStream = function (address, size) {
        return this.memory.getPointerStream(address, size);
    };
    CpuState.prototype.getPointerU8Array = function (address, size) {
        return this.memory.getPointerU8Array(address, size);
    };
    Object.defineProperty(CpuState.prototype, "REGS", {
        get: function () {
            return sprintf('r1: %08X, r2: %08X, r3: %08X, r3: %08X', this.gpr[1], this.gpr[2], this.gpr[3], this.gpr[4]);
        },
        enumerable: true,
        configurable: true
    });
    CpuState.prototype._trace_state = function () {
        console.info(this);
        throw ('_trace_state');
    };
    Object.defineProperty(CpuState.prototype, "fcr31", {
        get: function () {
            var value = 0;
            value = BitUtils.insert(value, 0, 2, this.fcr31_rm);
            value = BitUtils.insert(value, 2, 21, this.fcr31_2_21);
            value = BitUtils.insert(value, 23, 1, this.fcr31_cc ? 1 : 0);
            value = BitUtils.insert(value, 24, 1, this.fcr31_fs ? 1 : 0);
            value = BitUtils.insert(value, 25, 7, this.fcr31_25_7);
            return value;
        },
        set: function (value) {
            this.fcr31_rm = BitUtils.extract(value, 0, 2);
            this.fcr31_2_21 = BitUtils.extract(value, 2, 21);
            this.fcr31_cc = (BitUtils.extract(value, 23, 1) != 0);
            this.fcr31_fs = (BitUtils.extract(value, 24, 1) != 0);
            this.fcr31_25_7 = BitUtils.extract(value, 25, 7);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "fcr0_rev", {
        get: function () {
            return BitUtils.extract(this.fcr0, 0, 8);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CpuState.prototype, "fcr0_imp", {
        get: function () {
            return BitUtils.extract(this.fcr0, 8, 24);
        },
        enumerable: true,
        configurable: true
    });
    CpuState.prototype._cfc1_impl = function (d, t) {
        switch (d) {
            case 0:
                this.gpr[t] = this.fcr0;
                break;
            case 31:
                this.gpr[t] = this.fcr31;
                break;
            default:
                this.gpr[t] = 0;
                break;
        }
    };
    CpuState.prototype._ctc1_impl = function (d, t) {
        switch (d) {
            case 31:
                this.fcr31 = t;
                break;
        }
    };
    CpuState.prototype._comp_impl = function (s, t, fc_unordererd, fc_equal, fc_less, fc_inv_qnan) {
        if (isNaN(s) || isNaN(t)) {
            this.fcr31_cc = fc_unordererd;
        }
        else {
            //bool cc = false;
            //if (fc_equal) cc = cc || (s == t);
            //if (fc_less) cc = cc || (s < t);
            //return cc;
            var equal = (fc_equal) && (s == t);
            var less = (fc_less) && (s < t);
            this.fcr31_cc = (less || equal);
        }
    };
    CpuState.prototype._cvt_w_s_impl = function (FS) {
        switch (this.fcr31_rm) {
            case 0:
                return MathFloat.rint(FS);
            case 1:
                return MathFloat.cast(FS);
            case 2:
                return MathFloat.ceil(FS);
            case 3:
                return MathFloat.floor(FS);
        }
        throw ("RM has an invalid value!!");
    };
    CpuState.prototype.cache = function (rs, type, offset) {
        //if (DebugOnce('state.cache', 100)) console.warn(sprintf('cache opcode! %08X+%d, type: %d', rs, offset, type));
    };
    CpuState.prototype.syscall = function (id) {
        this.syscallManager.call(this, id);
    };
    CpuState.prototype.sb = function (value, address) {
        this.memory.writeInt8(address, value);
    };
    CpuState.prototype.sh = function (value, address) {
        this.memory.writeInt16(address, value);
    };
    CpuState.prototype.sw = function (value, address) {
        this.memory.writeInt32(address, value);
    };
    CpuState.prototype.swc1 = function (value, address) {
        this.memory.writeFloat32(address, value);
    };
    CpuState.prototype.lb = function (address) {
        return this.memory.readInt8(address);
    };
    CpuState.prototype.lbu = function (address) {
        return this.memory.readUInt8(address);
    };
    CpuState.prototype.lh = function (address) {
        return this.memory.readInt16(address);
    };
    CpuState.prototype.lhu = function (address) {
        return this.memory.readUInt16(address);
    };
    CpuState.prototype.lw = function (address) {
        return this.memory.readInt32(address);
    };
    CpuState.prototype.lwc1 = function (address) {
        return this.memory.readFloat32(address);
    };
    CpuState.prototype.min = function (a, b) {
        return ((a | 0) < (b | 0)) ? a : b;
    };
    CpuState.prototype.max = function (a, b) {
        return ((a | 0) > (b | 0)) ? a : b;
    };
    CpuState.prototype.slt = function (a, b) {
        return ((a | 0) < (b | 0)) ? 1 : 0;
    };
    CpuState.prototype.sltu = function (a, b) {
        return ((a >>> 0) < (b >>> 0)) ? 1 : 0;
    };
    CpuState.prototype.lwl = function (RS, Offset, ValueToWrite) {
        var Address = (RS + Offset);
        var AddressAlign = Address & 3;
        var Value = this.memory.readInt32(Address & ~3);
        return ((Value << CpuState.LwlShift[AddressAlign]) | (ValueToWrite & CpuState.LwlMask[AddressAlign]));
    };
    CpuState.prototype.lwr = function (RS, Offset, ValueToWrite) {
        var Address = (RS + Offset);
        var AddressAlign = Address & 3;
        var Value = this.memory.readInt32(Address & ~3);
        return ((Value >>> CpuState.LwrShift[AddressAlign]) | (ValueToWrite & CpuState.LwrMask[AddressAlign]));
    };
    CpuState.prototype.swl = function (RS, Offset, ValueToWrite) {
        var Address = (RS + Offset);
        var AddressAlign = Address & 3;
        var AddressPointer = Address & ~3;
        var WordToWrite = (ValueToWrite >>> CpuState.SwlShift[AddressAlign]) | (this.memory.readInt32(AddressPointer) & CpuState.SwlMask[AddressAlign]);
        this.memory.writeInt32(AddressPointer, WordToWrite);
    };
    CpuState.prototype.swr = function (RS, Offset, ValueToWrite) {
        var Address = (RS + Offset);
        var AddressAlign = Address & 3;
        var AddressPointer = Address & ~3;
        var WordToWrite = (ValueToWrite << CpuState.SwrShift[AddressAlign]) | (this.memory.readInt32(AddressPointer) & CpuState.SwrMask[AddressAlign]);
        this.memory.writeInt32(AddressPointer, WordToWrite);
    };
    CpuState.prototype.div = function (rs, rt) {
        rs |= 0; // signed
        rt |= 0; // signed
        this.LO = (rs / rt) | 0;
        this.HI = (rs % rt) | 0;
    };
    CpuState.prototype.divu = function (rs, rt) {
        rs >>>= 0; // unsigned
        rt >>>= 0; // unsigned
        this.LO = (rs / rt) | 0;
        this.HI = (rs % rt) | 0;
    };
    CpuState.prototype.mult = function (rs, rt) {
        Math.imul32_64(rs, rt, CpuState._mult_temp);
        this.LO = CpuState._mult_temp[0];
        this.HI = CpuState._mult_temp[1];
    };
    CpuState.prototype.madd = function (rs, rt) {
        var a64 = Integer64.fromInt(rs);
        var b64 = Integer64.fromInt(rt);
        var result = Integer64.fromBits(this.LO, this.HI).add(a64.multiply(b64));
        this.HI = result.high;
        this.LO = result.low;
    };
    CpuState.prototype.msub = function (rs, rt) {
        var a64 = Integer64.fromInt(rs);
        var b64 = Integer64.fromInt(rt);
        var result = Integer64.fromBits(this.LO, this.HI).sub(a64.multiply(b64));
        this.HI = result.high;
        this.LO = result.low;
    };
    CpuState.prototype.multu = function (rs, rt) {
        var info = Math.umul32_64(rs, rt, CpuState._mult_temp);
        this.LO = info[0];
        this.HI = info[1];
    };
    CpuState.prototype.maddu = function (rs, rt) {
        var a64 = Integer64.fromUnsignedInt(rs);
        var b64 = Integer64.fromUnsignedInt(rt);
        var result = Integer64.fromBits(this.LO, this.HI).add(a64.multiply(b64));
        this.HI = result.high;
        this.LO = result.low;
    };
    CpuState.prototype.msubu = function (rs, rt) {
        var a64 = Integer64.fromUnsignedInt(rs);
        var b64 = Integer64.fromUnsignedInt(rt);
        var result = Integer64.fromBits(this.LO, this.HI).sub(a64.multiply(b64));
        this.HI = result.high;
        this.LO = result.low;
    };
    CpuState.prototype.callPC = function (pc) {
        this.PC = pc;
        var ra = this.getRA();
        this.executor.executeUntilPCReachesWithoutCall(ra);
    };
    CpuState.prototype.callPCSafe = function (pc) {
        this.PC = pc;
        var ra = this.getRA();
        while (this.PC != ra) {
            try {
                this.executor.executeUntilPCReachesWithoutCall(ra);
            }
            catch (e) {
                if (!(e instanceof CpuBreakException)) {
                    console.error(e);
                    console.error(e['stack']);
                    throw (e);
                }
            }
        }
    };
    CpuState.prototype.break = function () {
        throw (new CpuBreakException());
    };
    CpuState.LwrMask = [0x00000000, 0xFF000000, 0xFFFF0000, 0xFFFFFF00];
    CpuState.LwrShift = [0, 8, 16, 24];
    CpuState.LwlMask = [0x00FFFFFF, 0x0000FFFF, 0x000000FF, 0x00000000];
    CpuState.LwlShift = [24, 16, 8, 0];
    CpuState.SwlMask = [0xFFFFFF00, 0xFFFF0000, 0xFF000000, 0x00000000];
    CpuState.SwlShift = [24, 16, 8, 0];
    CpuState.SwrMask = [0x00000000, 0x000000FF, 0x0000FFFF, 0x00FFFFFF];
    CpuState.SwrShift = [0, 8, 16, 24];
    CpuState._mult_temp = [0, 0];
    return CpuState;
})();
exports.CpuState = CpuState;
//# sourceMappingURL=state.js.map