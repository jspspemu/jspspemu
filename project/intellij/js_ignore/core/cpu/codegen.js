///<reference path="../../global.d.ts" />
var instructions = require('./instructions');
var _ast = require('./ast_builder');
var ast;
function assignGpr(index, expr) {
    return ast.assignGpr(index, expr);
}
function assignFpr(index, expr) {
    return ast.assignFpr(index, expr);
}
function assignFpr_I(index, expr) {
    return ast.assignFpr_I(index, expr);
}
function assignIC(expr) {
    return ast.assignIC(expr);
}
function fcr31_cc() {
    return ast.fcr31_cc();
}
function fpr(index) {
    return ast.fpr(index);
}
function fpr_i(index) {
    return ast.fpr_i(index);
}
function gpr(index) {
    return ast.gpr(index);
}
function gpr_f(index) {
    return ast.gpr_f(index);
}
function tempr(index) {
    return ast.tempr(index);
}
function vfpr(reg) {
    return ast.vfpr(reg);
}
function vfprc(reg) {
    return ast.vfprc(reg);
}
function vfpr_i(index) {
    return ast.vfpr_i(index);
}
function immBool(value) {
    return ast.imm32(value ? 1 : 0);
}
function imm32(value) {
    return ast.imm32(value);
}
function imm_f(value) {
    return ast.imm_f(value);
}
function u_imm32(value) {
    return ast.u_imm32(value);
}
function unop(op, right) {
    return ast.unop(op, right);
}
function binop(left, op, right) {
    return ast.binop(left, op, right);
}
function binop_i(left, op, right) {
    return ast.binop_i(left, op, right);
}
function _if(cond, codeTrue, codeFalse) {
    return ast._if(cond, codeTrue, codeFalse);
}
function call(name, exprList) {
    return ast.call(name, exprList);
}
function call_stm(name, exprList) {
    return stm(ast.call(name, exprList));
}
function stm(expr) {
    return ast.stm(expr);
}
function stms(stms) {
    return ast.stms(stms);
}
function pc() {
    return ast.pc();
}
function lo() {
    return ast.lo();
}
function hi() {
    return ast.hi();
}
function ic() {
    return ast.ic();
}
function branchflag() {
    return ast.branchflag();
}
function branchpc() {
    return ast.branchpc();
}
function assign(ref, value) {
    return ast.assign(ref, value);
}
function assign_stm(ref, value) {
    return stm(ast.assign(ref, value));
}
function i_simm16(i) {
    return imm32(i.imm16);
}
function i_uimm16(i) {
    return u_imm32(i.u_imm16);
}
function rs_imm16(i) {
    return binop(binop(gpr(i.rs), '+', imm32(i.imm16)), '|', imm32(0));
}
function cast_uint(expr) {
    return binop(expr, '>>>', ast.imm32(0));
}
var VMatRegClass = (function () {
    function VMatRegClass(reg) {
        this.reg = reg;
    }
    VMatRegClass.prototype._setMatrix = function (generator) {
        // @TODO
        var array = [];
        for (var column = 0; column < 4; column++) {
            for (var row = 0; row < 4; row++) {
                array.push(generator(column, row));
            }
        }
        return stm(ast.call('state.vfpuSetMatrix', [imm32(this.reg), ast.array(array)]));
    };
    VMatRegClass.prototype.setMatrix = function (generator) {
        return stms([
            this._setMatrix(generator),
            stm(ast.debugger('wip vfpu'))
        ]);
    };
    VMatRegClass.prototype.setMatrixDebug = function (generator) {
        return stms([
            this._setMatrix(generator),
            stm(ast.debugger('wip vfpu'))
        ]);
    };
    return VMatRegClass;
})();
var VVecRegClass = (function () {
    function VVecRegClass(reg, size) {
        this.reg = reg;
    }
    VVecRegClass.prototype._setVector = function (generator) {
        // @TODO
        var array = [];
        var statements = [];
        var regs = getVectorRegs(this.reg, 4 /* Quad */);
        statements.push(stm(ast.call('state.vfpuStore', [
            ast.array(regs.map(function (item) { return imm32(item); })),
            ast.array([0, 1, 2, 3].map(function (index) { return generator(index); }))
        ])));
        return stms(statements);
    };
    VVecRegClass.prototype.setVector = function (generator) {
        return stms([
            this._setVector(generator),
            stm(ast.debugger('wip vfpu'))
        ]);
    };
    return VVecRegClass;
})();
function VMatReg(index) {
    return new VMatRegClass(index);
}
function VVecReg(index, size) {
    return new VVecRegClass(index, size);
}
(function (VectorSize) {
    VectorSize[VectorSize["Single"] = 1] = "Single";
    VectorSize[VectorSize["Pair"] = 2] = "Pair";
    VectorSize[VectorSize["Triple"] = 3] = "Triple";
    VectorSize[VectorSize["Quad"] = 4] = "Quad";
})(exports.VectorSize || (exports.VectorSize = {}));
var VectorSize = exports.VectorSize;
(function (MatrixSize) {
    MatrixSize[MatrixSize["M_2x2"] = 2] = "M_2x2";
    MatrixSize[MatrixSize["M_3x3"] = 3] = "M_3x3";
    MatrixSize[MatrixSize["M_4x4"] = 4] = "M_4x4";
})(exports.MatrixSize || (exports.MatrixSize = {}));
var MatrixSize = exports.MatrixSize;
;
function getVectorRegs(vectorReg, N) {
    var mtx = (vectorReg >>> 2) & 7;
    var col = vectorReg & 3;
    var row = 0;
    var length = 0;
    var transpose = (vectorReg >>> 5) & 1;
    switch (N) {
        case 1 /* Single */:
            transpose = 0;
            row = (vectorReg >>> 5) & 3;
            length = 1;
            break;
        case 2 /* Pair */:
            row = (vectorReg >>> 5) & 2;
            length = 2;
            break;
        case 3 /* Triple */:
            row = (vectorReg >>> 6) & 1;
            length = 3;
            break;
        case 4 /* Quad */:
            row = (vectorReg >>> 5) & 2;
            length = 4;
            break;
        default:
            debugger;
    }
    var regs = new Array(length);
    for (var i = 0; i < length; i++) {
        var index = mtx * 4;
        if (transpose) {
            index += ((row + i) & 3) + col * 32;
        }
        else {
            index += col + ((row + i) & 3) * 32;
        }
        regs[i] = index;
    }
    return regs;
}
function getMatrixRegs(matrixReg, N) {
    var mtx = (matrixReg >> 2) & 7;
    var col = matrixReg & 3;
    var row = 0;
    var side = 0;
    switch (N) {
        case 2 /* M_2x2 */:
            row = (matrixReg >> 5) & 2;
            side = 2;
            break;
        case 3 /* M_3x3 */:
            row = (matrixReg >> 6) & 1;
            side = 3;
            break;
        case 4 /* M_4x4 */:
            row = (matrixReg >> 5) & 2;
            side = 4;
            break;
        default:
            debugger;
    }
    var transpose = (matrixReg >> 5) & 1;
    var regs = new Array(side * side);
    for (var i = 0; i < side; i++) {
        for (var j = 0; j < side; j++) {
            var index = mtx * 4;
            if (transpose) {
                index += ((row + i) & 3) + ((col + j) & 3) * 32;
            }
            else {
                index += ((col + j) & 3) + ((row + i) & 3) * 32;
            }
            regs[j * side + i] = index;
        }
    }
    return regs;
}
function readVector_f(vectorReg, N) {
    return getVectorRegs(vectorReg, N).map(function (index) { return vfpr(index); });
}
function readVector_i(vectorReg, N) {
    return getVectorRegs(vectorReg, N).map(function (index) { return vfpr_i(index); });
}
function readVector_type(vectorReg, N, type) {
    return (type == 'float') ? readVector_f(vectorReg, N) : readVector_i(vectorReg, N);
}
function readMatrix(vectorReg, N) {
    return getMatrixRegs(vectorReg, N).map(function (index) { return vfpr(index); });
}
function setMemoryVector(offset, items) {
    return call_stm('state.storeFloats', [offset, ast.array(items)]);
}
function memoryRef(type, address) {
    switch (type) {
        case 'float':
            return new _ast.ANodeExprLValueSetGet('state.swc1($0, #)', 'state.lwc1($0)', [address]);
        default:
            throw (new Error("Not implemented memoryRef type '" + type + "'"));
    }
}
function getMemoryVector(offset, count) {
    return ArrayUtils.range(0, count).map(function (item) { return memoryRef('float', binop(offset, '+', imm32(item * 4))); });
}
function setItems(leftList, values) {
    return stms(leftList.map(function (left, index) { return ast.assign(left, values[index]); }));
}
function address_RS_IMM14(i, offset) {
    if (offset === void 0) { offset = 0; }
    return binop(gpr(i.rs), '+', imm32(i.IMM14 * 4 + offset));
}
function setMatrix(leftList, generator) {
    var side = Math.sqrt(leftList.length);
    return call_stm('state.vfpuStore', [
        ast.array(leftList.map(function (item) { return imm32(item); })),
        ast.array(ArrayUtils.range(0, leftList.length).map(function (index) { return generator(Math.floor(index % side), Math.floor(index / side), index); }))
    ]);
}
function setVector(leftList, generator) {
    return call_stm('state.vfpuStore', [
        ast.array(leftList.map(function (item) { return imm32(item); })),
        ast.array(ArrayUtils.range(0, leftList.length).map(function (index) { return generator(index); }))
    ]);
}
function setVector_i(leftList, generator) {
    return call_stm('state.vfpuStore_i', [
        ast.array(leftList.map(function (item) { return imm32(item); })),
        ast.array(ArrayUtils.range(0, leftList.length).map(function (index) { return generator(index); }))
    ]);
}
/*
private AstNodeExpr Address_RS_IMM14(int Offset = 0)
{
return ast.Cast<uint>(ast.Binary(ast.GPR_s(RS), "+", Instruction.IMM14 * 4 + Offset), false);
}
*/
var VfpuConstants = [
    { name: "VFPU_ZERO", value: 0.0 },
    { name: "VFPU_HUGE", value: 340282346638528859811704183484516925440 },
    { name: "VFPU_SQRT2", value: Math.sqrt(2.0) },
    { name: "VFPU_SQRT1_2", value: Math.sqrt(1.0 / 2.0) },
    { name: "VFPU_2_SQRTPI", value: 2.0 / Math.sqrt(Math.PI) },
    { name: "VFPU_2_PI", value: 2.0 / Math.PI },
    { name: "VFPU_1_PI", value: 1.0 / Math.PI },
    { name: "VFPU_PI_4", value: Math.PI / 4.0 },
    { name: "VFPU_PI_2", value: Math.PI / 2.0 },
    { name: "VFPU_PI", value: Math.PI },
    { name: "VFPU_E", value: Math.E },
    { name: "VFPU_LOG2E", value: Math.log2(Math.E) },
    { name: "VFPU_LOG10E", value: Math.log10(Math.E) },
    { name: "VFPU_LN2", value: Math.log(2) },
    { name: "VFPU_LN10", value: Math.log(10) },
    { name: "VFPU_2PI", value: 2.0 * Math.PI },
    { name: "VFPU_PI_6", value: Math.PI / 6.0 },
    { name: "VFPU_LOG10TWO", value: Math.log10(2.0) },
    { name: "VFPU_LOG2TEN", value: Math.log2(10.0) },
    { name: "VFPU_SQRT3_2", value: Math.sqrt(3.0) / 2.0 },
];
function getMatrixRegsVD(i) {
    return getMatrixRegs(i.VD, i.ONE_TWO);
}
var VfpuPrefixes = (function () {
    function VfpuPrefixes() {
    }
    VfpuPrefixes.transformRead = function (n, info, values) {
        var sourceIndex = (info >> (0 + n * 2)) & 3;
        var sourceAbsolute = (info >> (8 + n * 1)) & 1;
        var sourceConstant = (info >> (12 + n * 1)) & 1;
        var sourceNegate = (info >> (16 + n * 1)) & 1;
        var value;
        if (sourceConstant) {
            switch (sourceIndex) {
                case 0:
                    value = imm_f(sourceAbsolute ? (3) : (0));
                    break;
                case 1:
                    value = imm_f(sourceAbsolute ? (1 / 3) : (1));
                    break;
                case 2:
                    value = imm_f(sourceAbsolute ? (1 / 4) : (2));
                    break;
                case 3:
                    value = imm_f(sourceAbsolute ? (1 / 6) : (1 / 2));
                    break;
                default:
                    throw (new Error("Invalid operation"));
                    break;
            }
        }
        else {
            value = values[sourceIndex];
            if (sourceAbsolute)
                value = call('Math.abs', [value]);
        }
        if (sourceNegate)
            value = call('MathFloat.neg', [value]);
        return value;
    };
    VfpuPrefixes.transformStore = function (n, info, left, value) {
        var destinationSaturation = (info >> (0 + n * 2)) & 3;
        var destinationMask = (info >> (8 + n * 1)) & 1;
        if (destinationMask) {
            return ast.stm(); // Masked. No write value.
        }
        else {
            var value = value;
            switch (destinationSaturation) {
                case 1:
                    value = call('MathFloat.sat0', [value]);
                    break;
                case 3:
                    value = call('MathFloat.sat1', [value]);
                    break;
                default:
                    break;
            }
            return assign_stm(left, value);
        }
    };
    return VfpuPrefixes;
})();
var PrefixPrediction = (function () {
    function PrefixPrediction(default_value) {
        this.default_value = default_value;
        this.known = true;
        this.value = this.default_value;
    }
    PrefixPrediction.prototype.reset = function () {
        this.set(this.default_value);
        //this.setUnknown();
    };
    PrefixPrediction.prototype.eat = function () {
        this.set(this.default_value);
    };
    PrefixPrediction.prototype.set = function (value) {
        this.known = true;
        this.value = value;
    };
    PrefixPrediction.prototype.setUnknown = function () {
        this.known = false;
        this.value = this.default_value;
    };
    PrefixPrediction.DEFAULT_LOAD_VALUE = 0xDC0000E4;
    PrefixPrediction.DEFAULT_STORE_VALUE = 0x00000000;
    return PrefixPrediction;
})();
var InstructionAst = (function () {
    function InstructionAst() {
        this._vpfxs = new PrefixPrediction(PrefixPrediction.DEFAULT_LOAD_VALUE);
        this._vpfxt = new PrefixPrediction(PrefixPrediction.DEFAULT_LOAD_VALUE);
        this._vpfxd = new PrefixPrediction(PrefixPrediction.DEFAULT_STORE_VALUE);
        this.enableStaticPrefixVfpuOptimization = true;
        ast = new _ast.MipsAstBuilder();
    }
    //private enableStaticPrefixVfpuOptimization = false;
    InstructionAst.prototype.reset = function () {
        this._vpfxs.reset();
        this._vpfxt.reset();
        this._vpfxd.reset();
    };
    InstructionAst.prototype.eatPrefixes = function () {
        this._vpfxs.eat();
        this._vpfxt.eat();
        this._vpfxd.eat();
    };
    InstructionAst.prototype.lui = function (i) {
        return assignGpr(i.rt, u_imm32(i.imm16 << 16));
    };
    InstructionAst.prototype._vset1 = function (i, generate, destSize, destType) {
        if (destSize === void 0) { destSize = 0; }
        if (destType === void 0) { destType = 'float'; }
        var st = [];
        this._vset_storeVD(st, i, destType, destSize, function (index) { return generate(index); });
        return stms(st);
    };
    InstructionAst.prototype._vset2 = function (i, generate, destSize, srcSize, destType, srcType) {
        if (destSize === void 0) { destSize = 0; }
        if (srcSize === void 0) { srcSize = 0; }
        if (destType === void 0) { destType = 'float'; }
        if (srcType === void 0) { srcType = 'float'; }
        var st = [];
        var src = this._vset_readVS(st, i, srcType, srcSize);
        this._vset_storeVD(st, i, destType, destSize, function (index) { return generate(index, src); });
        return stms(st);
    };
    InstructionAst.prototype._vset3 = function (i, generate, destSize, srcSize, targetSize, destType, srcType, targetType) {
        if (destSize === void 0) { destSize = 0; }
        if (srcSize === void 0) { srcSize = 0; }
        if (targetSize === void 0) { targetSize = 0; }
        if (destType === void 0) { destType = 'float'; }
        if (srcType === void 0) { srcType = 'float'; }
        if (targetType === void 0) { targetType = 'float'; }
        var st = [];
        var src = this._vset_readVS(st, i, srcType, srcSize);
        var target = this._vset_readVT(st, i, targetType, targetSize);
        this._vset_storeVD(st, i, destType, destSize, function (index) { return generate(index, src, target); });
        return stms(st);
    };
    InstructionAst.prototype._vset_readVS = function (st, i, type, size) {
        return this._vset_readVSVT(st, i, type, size, 'vs');
    };
    InstructionAst.prototype._vset_readVT = function (st, i, type, size) {
        return this._vset_readVSVT(st, i, type, size, 'vt');
    };
    InstructionAst.prototype._vset_readVSVT = function (st, i, type, size, name) {
        if (size <= 0)
            size = i.ONE_TWO;
        var regs = readVector_type((name == 'vs') ? i.VS : i.VT, size, type);
        var prefix = (name == 'vs') ? this._vpfxs : this._vpfxt;
        if (this.enableStaticPrefixVfpuOptimization && prefix.known) {
            var out = [];
            for (var n = 0; n < size; n++) {
                var vname = ((name == 'vs') ? 's' : 't') + n;
                out.push(ast.raw(vname));
                st.push(ast.allocVar(vname, VfpuPrefixes.transformRead(n, prefix.value, regs)));
            }
            //if (prefix.value != PrefixPrediction.DEFAULT_LOAD_VALUE) st.push(ast.debugger());
            return out;
        }
        else {
            st.push(call_stm(((name == 'vs') ? 'state.loadVs_prefixed' : 'state.loadVt_prefixed'), [ast.array(regs)]));
        }
        return xrange(0, size).map(function (index) { return (name == 'vs') ? ast.vector_vs(index) : ast.vector_vt(index); });
    };
    InstructionAst.prototype._vset_storeVD = function (st, i, type, size, generate) {
        if (size <= 0)
            size = i.ONE_TWO;
        var dest_regs = getVectorRegs(i.VD, size);
        if (this.enableStaticPrefixVfpuOptimization && this._vpfxd.known) {
            for (var n = 0; n < size; n++) {
                var dest_reg = dest_regs[n];
                st.push(VfpuPrefixes.transformStore(n, this._vpfxd.value, (type == 'float') ? vfpr(dest_reg) : vfpr_i(dest_reg), generate(n)));
            }
        }
        else {
            st.push(call_stm((type == 'float') ? 'state.storeVd_prefixed' : 'state.storeVd_prefixed_i', [
                ast.arrayNumbers(dest_regs),
                ast.array(xrange(0, size).map(function (n) { return generate(n); })),
            ]));
        }
        st.push(call_stm('state.eatPrefixes', []));
        //st.push(ast.debugger());
        this.eatPrefixes();
    };
    // Prefixes
    InstructionAst.prototype.vpfxs = function (i) {
        this._vpfxs.set(i.data);
        return stms([
            call_stm('state.setVpfxs', [imm32(i.data)]),
        ]);
    };
    InstructionAst.prototype.vpfxt = function (i) {
        this._vpfxt.set(i.data);
        return stms([
            call_stm('state.setVpfxt', [imm32(i.data)]),
        ]);
    };
    InstructionAst.prototype.vpfxd = function (i) {
        this._vpfxd.set(i.data);
        return stms([
            call_stm('state.setVpfxd', [imm32(i.data)]),
        ]);
    };
    // Memory read/write
    InstructionAst.prototype["lv.s"] = function (i) {
        return assign_stm(vfpr(i.VT5_2), call('state.lwc1', [address_RS_IMM14(i, 0)]));
    };
    InstructionAst.prototype["sv.s"] = function (i) {
        return call_stm('state.swc1', [vfpr(i.VT5_2), address_RS_IMM14(i, 0)]);
    };
    InstructionAst.prototype["lv.q"] = function (i) {
        return setItems(readVector_f(i.VT5_1, 4 /* Quad */), getMemoryVector(address_RS_IMM14(i), 4));
    };
    InstructionAst.prototype["lvl.q"] = function (i) {
        return call_stm('state.lvl_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, 4 /* Quad */).map(function (item) { return imm32(item); }))]);
    };
    InstructionAst.prototype["lvr.q"] = function (i) {
        return call_stm('state.lvr_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, 4 /* Quad */).map(function (item) { return imm32(item); }))]);
    };
    InstructionAst.prototype["sv.q"] = function (i) {
        return setMemoryVector(address_RS_IMM14(i), readVector_f(i.VT5_1, 4 /* Quad */));
    };
    InstructionAst.prototype["svl.q"] = function (i) {
        return call_stm('state.svl_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, 4 /* Quad */).map(function (item) { return imm32(item); }))]);
    };
    InstructionAst.prototype["svr.q"] = function (i) {
        return call_stm('state.svr_q', [address_RS_IMM14(i, 0), ast.array(getVectorRegs(i.VT5_1, 4 /* Quad */).map(function (item) { return imm32(item); }))]);
    };
    // Constants
    // @TODO: d-prefix in vt register
    InstructionAst.prototype.viim = function (i) {
        return assign_stm(vfpr(i.VT), imm32(i.imm16));
    };
    InstructionAst.prototype.vfim = function (i) {
        return assign_stm(vfpr(i.VT), imm_f(i.IMM_HF));
    };
    InstructionAst.prototype.vcst = function (i) {
        return assign_stm(vfpr(i.VD), imm_f(VfpuConstants[i.IMM5].value));
    };
    InstructionAst.prototype.vhdp = function (i) {
        var _this = this;
        var vectorSize = i.ONE_TWO;
        return this._vset3(i, function (_, src, target) {
            return _this._aggregateV(imm_f(0), vectorSize, function (aggregate, index) {
                return binop(aggregate, '+', binop(target[index], '*', (index == (vectorSize - 1)) ? imm_f(1.0) : src[index]));
            });
        }, 1, vectorSize, vectorSize);
    };
    InstructionAst.prototype.vmidt = function (i) {
        return setMatrix(getMatrixRegsVD(i), function (c, r) { return imm32((c == r) ? 1 : 0); });
    };
    InstructionAst.prototype.vmzero = function (i) {
        return setMatrix(getMatrixRegsVD(i), function (c, r) { return imm32(0); });
    };
    InstructionAst.prototype.vmone = function (i) {
        return setMatrix(getMatrixRegsVD(i), function (c, r) { return imm32(1); });
    };
    InstructionAst.prototype._vtfm_x = function (i, vectorSize) {
        var _this = this;
        var srcMat = readMatrix(i.VS, vectorSize);
        var st = [];
        st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector_f(i.VT, vectorSize))]));
        st.push(call_stm('state.storeVd_prefixed', [
            ast.arrayNumbers(getVectorRegs(i.VD, vectorSize)),
            ast.array(xrange(0, vectorSize).map(function (n) {
                return _this._aggregateV(imm_f(0), vectorSize, function (aggregated, m) { return binop(aggregated, '+', binop(srcMat[n * vectorSize + m], '*', ast.vector_vt(m))); });
            })),
        ]));
        //if (vectorSize == 3) st.push(ast.debugger());
        this.eatPrefixes();
        return stms(st);
    };
    InstructionAst.prototype._vhtfm_x = function (i, vectorSize) {
        var _this = this;
        var srcMat = readMatrix(i.VS, vectorSize);
        var st = [];
        st.push(call_stm('state.loadVt_prefixed', [ast.array(readVector_f(i.VT, vectorSize))]));
        st.push(call_stm('state.storeVd_prefixed', [
            ast.arrayNumbers(getVectorRegs(i.VD, vectorSize)),
            ast.array(xrange(0, vectorSize).map(function (n) {
                return _this._aggregateV(imm_f(0), vectorSize, function (aggregated, m) { return binop(aggregated, '+', binop(srcMat[n * vectorSize + m], '*', ((m == vectorSize - 1) ? imm_f(1) : ast.vector_vt(m)))); });
            })),
        ]));
        this.eatPrefixes();
        return stms(st);
    };
    InstructionAst.prototype.vtfm2 = function (i) {
        return this._vtfm_x(i, 2);
    };
    InstructionAst.prototype.vtfm3 = function (i) {
        return this._vtfm_x(i, 3);
    };
    InstructionAst.prototype.vtfm4 = function (i) {
        return this._vtfm_x(i, 4);
    };
    InstructionAst.prototype.vhtfm2 = function (i) {
        return this._vhtfm_x(i, 2);
    };
    InstructionAst.prototype.vhtfm3 = function (i) {
        return this._vhtfm_x(i, 3);
    };
    InstructionAst.prototype.vhtfm4 = function (i) {
        return this._vhtfm_x(i, 4);
    };
    InstructionAst.prototype.vmscl = function (i) {
        var vectorSize = i.ONE_TWO;
        //return ast.stm(ast.debugger('not implemented'));
        var src = readMatrix(i.VS, vectorSize);
        return setMatrix(getMatrixRegsVD(i), function (c, r, index) { return binop(src[index], '*', vfpr(i.VT)); });
    };
    InstructionAst.prototype.vzero = function (i) {
        return this._vset1(i, function (i) { return imm_f(0); });
    };
    InstructionAst.prototype.vone = function (i) {
        return this._vset1(i, function (i) { return imm_f(1); });
    };
    InstructionAst.prototype.vmov = function (i) {
        return this._vset3(i, function (i, s, t) { return s[i]; });
    }; // vset3 in order to eat prefixes
    InstructionAst.prototype.vrcp = function (i) {
        return this._vset2(i, function (i, s) { return binop(imm_f(1.0), '/', s[i]); });
    };
    InstructionAst.prototype.vmul = function (i) {
        return this._vset3(i, function (i, s, t) { return binop(s[i], '*', t[i]); });
    };
    InstructionAst.prototype.vbfy1 = function (i) {
        return this._vset2(i, function (i, src) {
            switch (i) {
                case 0:
                    return binop(src[0], '+', src[1]);
                case 1:
                    return binop(src[0], '-', src[1]);
                case 2:
                    return binop(src[2], '+', src[3]);
                case 3:
                    return binop(src[2], '-', src[3]);
                default:
                    throw (new Error("vbfy1: Invalid operation"));
            }
        });
    };
    InstructionAst.prototype.vbfy2 = function (i) {
        return this._vset2(i, function (i, src) {
            switch (i) {
                case 0:
                    return binop(src[0], '+', src[2]);
                case 1:
                    return binop(src[1], '+', src[3]);
                case 2:
                    return binop(src[0], '-', src[2]);
                case 3:
                    return binop(src[1], '-', src[3]);
                default:
                    throw (new Error("vbfy1: Invalid operation"));
            }
        });
    };
    InstructionAst.prototype.vsocp = function (i) {
        var vectorSize = i.ONE_TWO;
        return this._vset2(i, function (index, src) {
            switch (index) {
                case 0:
                    return ast.call('MathFloat.sat0', [binop(imm_f(1), '-', src[0])]);
                case 1:
                    return ast.call('MathFloat.sat0', [src[0]]);
                case 2:
                    return ast.call('MathFloat.sat0', [binop(imm_f(1), '-', src[1])]);
                case 3:
                    return ast.call('MathFloat.sat0', [src[1]]);
                default:
                    throw (new Error("vsocp: " + index));
            }
        }, vectorSize * 2, vectorSize);
    };
    InstructionAst.prototype.vsrt1 = function (i) {
        return this._vset2(i, function (i, src) {
            switch (i) {
                case 0:
                    return call('MathFloat.min', [src[0], src[1]]);
                case 1:
                    return call('MathFloat.max', [src[0], src[1]]);
                case 2:
                    return call('MathFloat.min', [src[2], src[3]]);
                case 3:
                    return call('MathFloat.max', [src[2], src[3]]);
                default:
                    throw (new Error("vsrt1: Invalid operation"));
            }
        }, i.ONE_TWO, 4);
    };
    InstructionAst.prototype.vsrt2 = function (i) {
        return this._vset2(i, function (i, src) {
            switch (i) {
                case 0:
                    return call('MathFloat.min', [src[0], src[3]]);
                case 1:
                    return call('MathFloat.min', [src[1], src[2]]);
                case 2:
                    return call('MathFloat.max', [src[1], src[2]]);
                case 3:
                    return call('MathFloat.max', [src[0], src[3]]);
                default:
                    throw (new Error("vsrt2: Invalid operation"));
            }
        }, i.ONE_TWO, 4);
    };
    InstructionAst.prototype.vsrt3 = function (i) {
        return this._vset2(i, function (i, src) {
            switch (i) {
                case 0:
                    return call('MathFloat.max', [src[0], src[1]]);
                case 1:
                    return call('MathFloat.min', [src[0], src[1]]);
                case 2:
                    return call('MathFloat.max', [src[2], src[3]]);
                case 3:
                    return call('MathFloat.min', [src[2], src[3]]);
                default:
                    throw (new Error("vsrt3: Invalid operation"));
            }
        }, i.ONE_TWO, 4);
    };
    InstructionAst.prototype.vsrt4 = function (i) {
        return this._vset2(i, function (i, src) {
            switch (i) {
                case 0:
                    return call('MathFloat.max', [src[0], src[3]]);
                case 1:
                    return call('MathFloat.max', [src[1], src[2]]);
                case 2:
                    return call('MathFloat.min', [src[1], src[2]]);
                case 3:
                    return call('MathFloat.min', [src[0], src[3]]);
                default:
                    throw (new Error("vsrt4: Invalid operation"));
            }
        }, i.ONE_TWO, 4);
    };
    InstructionAst.prototype.vrnds = function (i) {
        return call_stm('state.vrnds', []);
    };
    InstructionAst.prototype.vrndi = function (i) {
        return this._vset1(i, function (i) { return call('state.vrndi', []); }, undefined, 'int');
    };
    InstructionAst.prototype.vrndf1 = function (i) {
        return this._vset1(i, function (i) { return call('state.vrndf1', []); });
    };
    InstructionAst.prototype.vrndf2 = function (i) {
        return this._vset1(i, function (i) { return call('state.vrndf2', []); });
    };
    /*
    public AstNodeStm vrnds(i: Instruction) { return ast.Statement(ast.CallStatic((Action < CpuThreadState, int>) CpuEmitterUtils._vrnds, ast.CpuThreadState)); }
    public AstNodeStm vrndi(i: Instruction) { return VEC_VD_i.SetVector(Index => ast.CallStatic((Func < CpuThreadState, int>) CpuEmitterUtils._vrndi, ast.CpuThreadState), PC); }
    public AstNodeStm vrndf1(i: Instruction) { return VEC_VD.SetVector(Index => ast.CallStatic((Func < CpuThreadState, float>) CpuEmitterUtils._vrndf1, ast.CpuThreadState), PC); }
    public AstNodeStm vrndf2(i: Instruction) { return VEC_VD.SetVector(Index => ast.CallStatic((Func < CpuThreadState, float>) CpuEmitterUtils._vrndf2, ast.CpuThreadState), PC); }
    */
    InstructionAst.prototype._aggregateV = function (val, size, generator) {
        for (var n = 0; n < size; n++)
            val = generator(val, n);
        return val;
    };
    InstructionAst.prototype.vnop = function (i) {
        return ast.stm();
    };
    InstructionAst.prototype.vsync = function (i) {
        return ast.stm();
    };
    InstructionAst.prototype.vflush = function (i) {
        return ast.stm();
    };
    InstructionAst.prototype.vfad = function (i) {
        var _this = this;
        var vectorSize = i.ONE_TWO;
        return this._vset2(i, function (i, src) {
            return _this._aggregateV(imm_f(0), vectorSize, function (value, index) { return binop(value, '+', src[index]); });
        }, 1, vectorSize);
    };
    InstructionAst.prototype.vavg = function (i) {
        var _this = this;
        var vectorSize = i.ONE_TWO;
        return this._vset2(i, function (i, src) {
            return binop(_this._aggregateV(imm_f(0), vectorSize, function (value, index) { return binop(value, '+', src[index]); }), '/', imm_f(vectorSize));
        }, 1, vectorSize);
    };
    InstructionAst.prototype.vidt = function (i) {
        return this._vset1(i, function (index) { return imm_f((index == (i.IMM7 % i.ONE_TWO)) ? 1 : 0); });
    };
    InstructionAst.prototype["vcrs.t"] = function (i) {
        return this._vset3(i, function (index, src, target) {
            switch (index) {
                case 0:
                    return binop(src[1], '*', target[2]);
                case 1:
                    return binop(src[2], '*', target[0]);
                case 2:
                    return binop(src[0], '*', target[1]);
                default:
                    throw (new Error("vcrs_t not implemented"));
            }
        }, 3, 3, 3);
    };
    InstructionAst.prototype["vcrsp.t"] = function (i) {
        return this._vset3(i, function (index, src, target) {
            switch (index) {
                case 0:
                    return binop(binop(src[1], '*', target[2]), '-', binop(src[2], '*', target[1]));
                case 1:
                    return binop(binop(src[2], '*', target[0]), '-', binop(src[0], '*', target[2]));
                case 2:
                    return binop(binop(src[0], '*', target[1]), '-', binop(src[1], '*', target[0]));
                default:
                    throw (new Error("vcrs_t assert"));
            }
        }, 3, 3, 3);
    };
    InstructionAst.prototype.vc2i = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vc2i', [imm32(index), src[0]]); }, 0, 1, 'int', 'int');
    };
    InstructionAst.prototype.vuc2i = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vuc2i', [imm32(index), src[0]]); }, 0, 1, 'int', 'int');
    };
    InstructionAst.prototype.vs2i = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vs2i', [imm32(index), src[Math.floor(index / 2)]]); }, i.ONE_TWO * 2, i.ONE_TWO, 'int', 'int');
    };
    InstructionAst.prototype.vi2f = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vi2f', [src[index], imm32(-i.IMM5)]); }, 0, 0, 'float', 'int');
    };
    InstructionAst.prototype.vi2uc = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vi2uc', [src[0], src[1], src[2], src[3]]); }, 1, 4, 'int', 'int');
    };
    InstructionAst.prototype.vf2id = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vf2id', [src[index], imm32(i.IMM5)]); }, 0, 0, 'int', 'float');
    };
    InstructionAst.prototype.vf2in = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vf2in', [src[index], imm32(i.IMM5)]); }, 0, 0, 'int', 'float');
    };
    InstructionAst.prototype.vf2iu = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vf2iu', [src[index], imm32(i.IMM5)]); }, 0, 0, 'int', 'float');
    };
    InstructionAst.prototype.vf2iz = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vf2iz', [src[index], imm32(i.IMM5)]); }, 0, 0, 'int', 'float');
    };
    InstructionAst.prototype.vf2h = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vf2h', [imm32(index), src[index]]); }, 0, 0, 'float', 'float');
    };
    InstructionAst.prototype.vh2f = function (i) {
        return this._vset2(i, function (index, src) { return call('MathVfpu.vh2f', [imm32(index), src[index]]); }, 0, 0, 'float', 'float');
    };
    InstructionAst.prototype.vdet = function (i) {
        return this._vset3(i, function (i, s, t) {
            return binop(binop(s[0], '*', t[1]), '-', binop(s[1], '*', t[0]));
        }, 1, 2, 2);
    };
    InstructionAst.prototype.vqmul = function (i) {
        return this._vset3(i, function (i, s, t) {
            switch (i) {
                case 0:
                    return call('MathVfpu.vqmul0', [s[0], s[1], s[2], s[3], t[0], t[1], t[2], t[3]]);
                case 1:
                    return call('MathVfpu.vqmul1', [s[0], s[1], s[2], s[3], t[0], t[1], t[2], t[3]]);
                case 2:
                    return call('MathVfpu.vqmul2', [s[0], s[1], s[2], s[3], t[0], t[1], t[2], t[3]]);
                case 3:
                    return call('MathVfpu.vqmul3', [s[0], s[1], s[2], s[3], t[0], t[1], t[2], t[3]]);
            }
        }, 4, 4, 4);
    };
    InstructionAst.prototype.vslt = function (i) {
        return this._vset3(i, function (i, s, t) { return call('MathFloat.vslt', [s[i], t[i]]); });
    };
    InstructionAst.prototype.vsle = function (i) {
        return this._vset3(i, function (i, s, t) { return call('MathFloat.vsle', [s[i], t[i]]); });
    };
    InstructionAst.prototype.vsge = function (i) {
        return this._vset3(i, function (i, s, t) { return call('MathFloat.vsge', [s[i], t[i]]); });
    };
    InstructionAst.prototype.vsgt = function (i) {
        return this._vset3(i, function (i, s, t) { return call('MathFloat.vsgt', [s[i], t[i]]); });
    };
    InstructionAst.prototype.vscmp = function (i) {
        return this._vset3(i, function (i, s, t) { return call('MathFloat.sign2', [s[i], t[i]]); });
    };
    InstructionAst.prototype._bvtf = function (i, cond) {
        var reg = i.IMM3;
        var branchExpr = ast.VCC(reg);
        if (!cond)
            branchExpr = unop("!", branchExpr);
        return this._branch(i, branchExpr);
    };
    InstructionAst.prototype.bvf = function (i) {
        return this._bvtf(i, false);
    };
    InstructionAst.prototype.bvt = function (i) {
        return this._bvtf(i, true);
    };
    InstructionAst.prototype.bvfl = function (i) {
        return this.bvf(i);
    };
    InstructionAst.prototype.bvtl = function (i) {
        return this.bvt(i);
    };
    InstructionAst.prototype.mtv = function (i) {
        return this._vset1(i, function (_) { return gpr(i.rt); }, 1, 'int');
    };
    InstructionAst.prototype.mfv = function (i) {
        return assign_stm(gpr(i.rt), vfpr_i(i.VD));
    };
    InstructionAst.prototype.mtvc = function (i) {
        switch (i.IMM7) {
            case 0:
                this._vpfxs.setUnknown();
                break;
            case 1:
                this._vpfxt.setUnknown();
                break;
            case 2:
                this._vpfxd.setUnknown();
                break;
        }
        return assign_stm(vfprc(i.IMM7), gpr(i.rt));
    };
    InstructionAst.prototype.mfvc = function (i) {
        return assign_stm(gpr(i.rt), vfprc(i.IMM7));
    };
    InstructionAst.prototype._vcmovtf = function (i, True) {
        var result = call_stm('state.vcmovtf', [
            imm32(i.IMM3),
            immBool(True),
            ast.arrayNumbers(getVectorRegs(i.VD, i.ONE_TWO)),
            ast.arrayNumbers(getVectorRegs(i.VS, i.ONE_TWO))
        ]);
        this.eatPrefixes();
        return result;
    };
    InstructionAst.prototype.vcmovt = function (i) {
        return this._vcmovtf(i, true);
    };
    InstructionAst.prototype.vcmovf = function (i) {
        return this._vcmovtf(i, false);
    };
    InstructionAst.prototype.vcmp = function (i) {
        var result = call_stm('state.vcmp', [
            imm32(i.IMM4),
            ast.array(readVector_f(i.VS, i.ONE_TWO)),
            ast.array(readVector_f(i.VT, i.ONE_TWO))
        ]);
        this.eatPrefixes();
        return result;
    };
    // @TODO:
    //vwbn(i: Instruction) { return ast.stm(ast.debugger('not implemented')); }
    //vsbn(i: Instruction) { return ast.stm(ast.debugger('not implemented')); }
    InstructionAst.prototype.vwbn = function (i) {
        return ast.stm();
    };
    InstructionAst.prototype.vsbn = function (i) {
        return ast.stm();
    };
    InstructionAst.prototype.vabs = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.abs', [src[i]]); });
    };
    InstructionAst.prototype.vocp = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.ocp', [src[i]]); });
    };
    InstructionAst.prototype.vneg = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.neg', [src[i]]); });
    };
    InstructionAst.prototype.vsgn = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.sign', [src[i]]); });
    };
    InstructionAst.prototype.vsat0 = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.sat0', [src[i]]); });
    };
    InstructionAst.prototype.vsat1 = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.sat1', [src[i]]); });
    };
    InstructionAst.prototype.vrsq = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.rsq', [src[i]]); });
    };
    InstructionAst.prototype.vsin = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.sinv1', [src[i]]); });
    };
    InstructionAst.prototype.vcos = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.cosv1', [src[i]]); });
    };
    InstructionAst.prototype.vexp2 = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.exp2', [src[i]]); });
    };
    InstructionAst.prototype.vrexp2 = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.rexp2', [src[i]]); });
    };
    InstructionAst.prototype.vlog2 = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.log2', [src[i]]); });
    };
    InstructionAst.prototype.vsqrt = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.sqrt', [src[i]]); });
    };
    InstructionAst.prototype.vasin = function (i) {
        //return this._vset2(i, (i, src) => call('MathFloat.asinv1', [src[i]]));
        return stms([
            this._vset2(i, function (i, src) { return call('MathFloat.asinv1', [src[i]]); }),
        ]);
    };
    InstructionAst.prototype.vnsin = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.nsinv1', [src[i]]); });
    };
    InstructionAst.prototype.vnrcp = function (i) {
        return this._vset2(i, function (i, src) { return call('MathFloat.nrcp', [src[i]]); });
    };
    InstructionAst.prototype.vmin = function (i) {
        return this._vset3(i, function (i, src, target) { return call('MathFloat.min', [src[i], target[i]]); });
    };
    InstructionAst.prototype.vmax = function (i) {
        return this._vset3(i, function (i, src, target) { return call('MathFloat.max', [src[i], target[i]]); });
    };
    InstructionAst.prototype.vdiv = function (i) {
        return this._vset3(i, function (i, src, target) { return binop(src[i], '/', target[i]); });
    };
    InstructionAst.prototype.vadd = function (i) {
        return this._vset3(i, function (i, src, target) { return binop(src[i], '+', target[i]); });
    };
    InstructionAst.prototype.vsub = function (i) {
        return this._vset3(i, function (i, src, target) { return binop(src[i], '-', target[i]); });
    };
    InstructionAst.prototype.vscl = function (i) {
        return this._vset3(i, function (i, src, target) { return binop(src[i], '*', target[0]); }, 0, 0, 1);
    };
    InstructionAst.prototype.vdot = function (i) {
        var _this = this;
        var vectorSize = i.ONE_TWO;
        return this._vset3(i, function (i, s, t) {
            return _this._aggregateV(imm_f(0), vectorSize, function (sum, n) { return binop(sum, '+', binop(s[n], '*', t[n])); });
        }, 1, vectorSize, vectorSize);
    };
    InstructionAst.prototype.vrot = function (i) {
        var vectorSize = i.ONE_TWO;
        var imm5 = i.IMM5;
        var cosIndex = BitUtils.extract(imm5, 0, 2);
        var sinIndex = BitUtils.extract(imm5, 2, 2);
        var negateSin = BitUtils.extractBool(imm5, 4);
        var dest = getVectorRegs(i.VD, i.ONE_TWO);
        return this._vset2(i, function (i, s) {
            var sine = call('MathFloat.sinv1', [s[0]]);
            var cosine = call('MathFloat.cosv1', [s[0]]);
            if (negateSin)
                sine = unop('-', sine);
            if (i == cosIndex)
                return cosine;
            if (i == sinIndex)
                return sine;
            return (sinIndex == cosIndex) ? sine : imm32(0);
        }, vectorSize, 1);
    };
    InstructionAst.prototype.vmmov = function (i) {
        var vectorSize = i.ONE_TWO;
        var dest = getMatrixRegs(i.VD, vectorSize);
        var src = readMatrix(i.VS, vectorSize);
        //var target = readMatrix(i.VT, i.ONE_TWO);
        var result = setMatrix(dest, function (column, row, index) { return src[index]; });
        this.eatPrefixes();
        return result;
    };
    InstructionAst.prototype.vmmul = function (i) {
        var VectorSize = i.ONE_TWO;
        var dest = getMatrixRegs(i.VD, VectorSize);
        var src = readMatrix(i.VS, VectorSize);
        var target = readMatrix(i.VT, VectorSize);
        var st = [];
        //st.push(ast.debugger());
        st.push(setMatrix(dest, function (Column, Row, Index) {
            var sum = imm_f(0);
            for (var n = 0; n < VectorSize; n++) {
                sum = binop(sum, '+', binop(src[Column * VectorSize + n], '*', target[Row * VectorSize + n]));
            }
            return sum;
        }));
        st.push(call_stm('state.eatPrefixes', []));
        this.eatPrefixes();
        return stms(st);
    };
    InstructionAst.prototype['vt4444.q'] = function (i) {
        return this._vtXXX_q(i, '_vt4444_step');
    };
    InstructionAst.prototype['vt5551.q'] = function (i) {
        return this._vtXXX_q(i, '_vt5551_step');
    };
    InstructionAst.prototype['vt5650.q'] = function (i) {
        return this._vtXXX_q(i, '_vt5650_step');
    };
    InstructionAst.prototype._vtXXX_q = function (i, func) {
        var size = i.ONE_TWO;
        if (size != 4)
            throw (new Error("Not implemented _vtXXXX_q for VectorSize=" + size));
        var dest = getVectorRegs(i.VD, 2);
        var src = readVector_i(i.VS, 4);
        var result = setVector_i(dest, function (index) { return ast.call('state.' + func, [src[index * 2 + 0], src[index * 2 + 1]]); });
        this.eatPrefixes();
        return result;
    };
    // CPU
    InstructionAst.prototype.add = function (i) {
        return this.addu(i);
    };
    InstructionAst.prototype.addu = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '+', gpr(i.rt)));
    };
    InstructionAst.prototype.addi = function (i) {
        return this.addiu(i);
    };
    InstructionAst.prototype.addiu = function (i) {
        return assignGpr(i.rt, binop(gpr(i.rs), '+', imm32(i.imm16)));
    };
    InstructionAst.prototype.sub = function (i) {
        return this.subu(i);
    };
    InstructionAst.prototype.subu = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '-', gpr(i.rt)));
    };
    InstructionAst.prototype.sll = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '<<', imm32(i.pos)));
    };
    InstructionAst.prototype.sra = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '>>', imm32(i.pos)));
    };
    InstructionAst.prototype.srl = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '>>>', imm32(i.pos)));
    };
    InstructionAst.prototype.rotr = function (i) {
        return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), imm32(i.pos)]));
    };
    InstructionAst.prototype.sllv = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '<<', binop(gpr(i.rs), '&', imm32(31))));
    };
    InstructionAst.prototype.srav = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '>>', binop(gpr(i.rs), '&', imm32(31))));
    };
    InstructionAst.prototype.srlv = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rt), '>>>', binop(gpr(i.rs), '&', imm32(31))));
    };
    //srlv(i: Instruction) { return assignGpr(i.rd, call('BitUtils.srl', [gpr(i.rt), gpr(i.rs)])); }
    InstructionAst.prototype.rotrv = function (i) {
        return assignGpr(i.rd, call('BitUtils.rotr', [gpr(i.rt), gpr(i.rs)]));
    };
    InstructionAst.prototype.bitrev = function (i) {
        return assignGpr(i.rd, call('BitUtils.bitrev32', [gpr(i.rt)]));
    };
    InstructionAst.prototype.and = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '&', gpr(i.rt)));
    };
    InstructionAst.prototype.or = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '|', gpr(i.rt)));
    };
    InstructionAst.prototype.xor = function (i) {
        return assignGpr(i.rd, binop(gpr(i.rs), '^', gpr(i.rt)));
    };
    InstructionAst.prototype.nor = function (i) {
        return assignGpr(i.rd, unop('~', binop(gpr(i.rs), '|', gpr(i.rt))));
    };
    InstructionAst.prototype.andi = function (i) {
        return assignGpr(i.rt, binop(gpr(i.rs), '&', u_imm32(i.u_imm16)));
    };
    InstructionAst.prototype.ori = function (i) {
        return assignGpr(i.rt, binop(gpr(i.rs), '|', u_imm32(i.u_imm16)));
    };
    InstructionAst.prototype.xori = function (i) {
        return assignGpr(i.rt, binop(gpr(i.rs), '^', u_imm32(i.u_imm16)));
    };
    InstructionAst.prototype.mflo = function (i) {
        return assignGpr(i.rd, lo());
    };
    InstructionAst.prototype.mfhi = function (i) {
        return assignGpr(i.rd, hi());
    };
    InstructionAst.prototype.mfic = function (i) {
        return assignGpr(i.rt, ic());
    };
    InstructionAst.prototype.mtlo = function (i) {
        return assign(lo(), gpr(i.rs));
    };
    InstructionAst.prototype.mthi = function (i) {
        return assign(hi(), gpr(i.rs));
    };
    InstructionAst.prototype.mtic = function (i) {
        return assignIC(gpr(i.rt));
    };
    InstructionAst.prototype.slt = function (i) {
        return assignGpr(i.rd, call('state.slt', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.sltu = function (i) {
        return assignGpr(i.rd, call('state.sltu', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.slti = function (i) {
        return assignGpr(i.rt, call('state.slt', [gpr(i.rs), imm32(i.imm16)]));
    };
    InstructionAst.prototype.sltiu = function (i) {
        return assignGpr(i.rt, call('state.sltu', [gpr(i.rs), u_imm32(i.imm16)]));
    };
    InstructionAst.prototype.movz = function (i) {
        return _if(binop(gpr(i.rt), '==', imm32(0)), assignGpr(i.rd, gpr(i.rs)));
    };
    InstructionAst.prototype.movn = function (i) {
        return _if(binop(gpr(i.rt), '!=', imm32(0)), assignGpr(i.rd, gpr(i.rs)));
    };
    InstructionAst.prototype.ext = function (i) {
        return assignGpr(i.rt, call('BitUtils.extract', [gpr(i.rs), imm32(i.pos), imm32(i.size_e)]));
    };
    InstructionAst.prototype.ins = function (i) {
        return assignGpr(i.rt, call('BitUtils.insert', [gpr(i.rt), imm32(i.pos), imm32(i.size_i), gpr(i.rs)]));
    };
    InstructionAst.prototype.clz = function (i) {
        return assignGpr(i.rd, call('BitUtils.clz', [gpr(i.rs)]));
    };
    InstructionAst.prototype.clo = function (i) {
        return assignGpr(i.rd, call('BitUtils.clo', [gpr(i.rs)]));
    };
    InstructionAst.prototype.seb = function (i) {
        return assignGpr(i.rd, call('BitUtils.seb', [gpr(i.rt)]));
    };
    InstructionAst.prototype.seh = function (i) {
        return assignGpr(i.rd, call('BitUtils.seh', [gpr(i.rt)]));
    };
    InstructionAst.prototype.wsbh = function (i) {
        return assignGpr(i.rd, call('BitUtils.wsbh', [gpr(i.rt)]));
    };
    InstructionAst.prototype.wsbw = function (i) {
        return assignGpr(i.rd, call('BitUtils.wsbw', [gpr(i.rt)]));
    };
    InstructionAst.prototype._trace_state = function () {
        return stm(ast.call('state._trace_state', []));
    };
    InstructionAst.prototype["mov.s"] = function (i) {
        return assignFpr(i.fd, fpr(i.fs));
    };
    InstructionAst.prototype["add.s"] = function (i) {
        return assignFpr(i.fd, binop(fpr(i.fs), '+', fpr(i.ft)));
    };
    InstructionAst.prototype["sub.s"] = function (i) {
        return assignFpr(i.fd, binop(fpr(i.fs), '-', fpr(i.ft)));
    };
    InstructionAst.prototype["mul.s"] = function (i) {
        return assignFpr(i.fd, binop(fpr(i.fs), '*', fpr(i.ft)));
    };
    InstructionAst.prototype["div.s"] = function (i) {
        return assignFpr(i.fd, binop(fpr(i.fs), '/', fpr(i.ft)));
    };
    InstructionAst.prototype["abs.s"] = function (i) {
        return assignFpr(i.fd, call('Math.abs', [fpr(i.fs)]));
    };
    InstructionAst.prototype["sqrt.s"] = function (i) {
        return assignFpr(i.fd, call('Math.sqrt', [fpr(i.fs)]));
    };
    InstructionAst.prototype["neg.s"] = function (i) {
        return assignFpr(i.fd, unop('-', fpr(i.fs)));
    };
    InstructionAst.prototype.min = function (i) {
        return assignGpr(i.rd, call('state.min', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.max = function (i) {
        return assignGpr(i.rd, call('state.max', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.div = function (i) {
        return stm(call('state.div', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.divu = function (i) {
        return stm(call('state.divu', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.mult = function (i) {
        return stm(call('state.mult', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.multu = function (i) {
        return stm(call('state.multu', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.madd = function (i) {
        return stm(call('state.madd', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.maddu = function (i) {
        return stm(call('state.maddu', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.msub = function (i) {
        return stm(call('state.msub', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.msubu = function (i) {
        return stm(call('state.msubu', [gpr(i.rs), gpr(i.rt)]));
    };
    InstructionAst.prototype.cache = function (i) {
        return stm(call('state.cache', [gpr(i.rs), imm32(i.rt), imm32(i.imm16)]));
    };
    InstructionAst.prototype.syscall = function (i) {
        return stm(call('state.syscall', [imm32(i.syscall)]));
    };
    InstructionAst.prototype["break"] = function (i) {
        return stm(call('state.break', []));
    };
    InstructionAst.prototype.dbreak = function (i) {
        return ast.debugger("dbreak");
    };
    InstructionAst.prototype._likely = function (isLikely, code) {
        return isLikely ? _if(branchflag(), code) : code;
    };
    InstructionAst.prototype._postBranch = function (nextPc) {
        return _if(branchflag(), stm(assign(pc(), branchpc())), stms([stm(assign(pc(), u_imm32(nextPc)))]));
    };
    InstructionAst.prototype._storePC = function (_pc) {
        return assign(pc(), u_imm32(_pc));
    };
    InstructionAst.prototype._branch = function (i, cond) {
        return stms([
            stm(assign(branchflag(), cond)),
            stm(assign(branchpc(), u_imm32(i.PC + i.imm16 * 4 + 4)))
        ]);
    };
    InstructionAst.prototype.beq = function (i) {
        return this._branch(i, binop(gpr(i.rs), "==", gpr(i.rt)));
    };
    InstructionAst.prototype.bne = function (i) {
        return this._branch(i, binop(gpr(i.rs), "!=", gpr(i.rt)));
    };
    InstructionAst.prototype.bltz = function (i) {
        return this._branch(i, binop(gpr(i.rs), "<", imm32(0)));
    };
    InstructionAst.prototype.blez = function (i) {
        return this._branch(i, binop(gpr(i.rs), "<=", imm32(0)));
    };
    InstructionAst.prototype.bgtz = function (i) {
        return this._branch(i, binop(gpr(i.rs), ">", imm32(0)));
    };
    InstructionAst.prototype.bgez = function (i) {
        return this._branch(i, binop(gpr(i.rs), ">=", imm32(0)));
    };
    InstructionAst.prototype.beql = function (i) {
        return this.beq(i);
    };
    InstructionAst.prototype.bnel = function (i) {
        return this.bne(i);
    };
    InstructionAst.prototype.bltzl = function (i) {
        return this.bltz(i);
    };
    InstructionAst.prototype.blezl = function (i) {
        return this.blez(i);
    };
    InstructionAst.prototype.bgtzl = function (i) {
        return this.bgtz(i);
    };
    InstructionAst.prototype.bgezl = function (i) {
        return this.bgez(i);
    };
    InstructionAst.prototype.bltzal = function (i) {
        return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltz(i)]);
    };
    InstructionAst.prototype.bltzall = function (i) {
        return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bltzl(i)]);
    };
    InstructionAst.prototype.bgezal = function (i) {
        return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgez(i)]);
    };
    InstructionAst.prototype.bgezall = function (i) {
        return stms([assignGpr(31, u_imm32(i.PC + 8)), this.bgezl(i)]);
    };
    InstructionAst.prototype.bc1t = function (i) {
        return this._branch(i, fcr31_cc());
    };
    InstructionAst.prototype.bc1f = function (i) {
        return this._branch(i, unop("!", fcr31_cc()));
    };
    InstructionAst.prototype.bc1tl = function (i) {
        return this.bc1t(i);
    };
    InstructionAst.prototype.bc1fl = function (i) {
        return this.bc1f(i);
    };
    InstructionAst.prototype.sb = function (i) {
        return stm(call('state.sb', [gpr(i.rt), rs_imm16(i)]));
    };
    InstructionAst.prototype.sh = function (i) {
        return stm(call('state.sh', [gpr(i.rt), rs_imm16(i)]));
    };
    InstructionAst.prototype.sw = function (i) {
        return stm(call('state.sw', [gpr(i.rt), rs_imm16(i)]));
    };
    InstructionAst.prototype.swc1 = function (i) {
        return stm(call('state.swc1', [fpr(i.ft), rs_imm16(i)]));
    };
    InstructionAst.prototype.lwc1 = function (i) {
        return assignFpr_I(i.ft, call('state.lw', [rs_imm16(i)]));
    };
    InstructionAst.prototype.mfc1 = function (i) {
        return assignGpr(i.rt, ast.fpr_i(i.fs));
    };
    InstructionAst.prototype.mtc1 = function (i) {
        return assignFpr_I(i.fs, ast.gpr(i.rt));
    };
    InstructionAst.prototype.cfc1 = function (i) {
        return stm(call('state._cfc1_impl', [imm32(i.rd), imm32(i.rt)]));
    };
    InstructionAst.prototype.ctc1 = function (i) {
        return stm(call('state._ctc1_impl', [imm32(i.rd), gpr(i.rt)]));
    };
    InstructionAst.prototype["trunc.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('MathFloat.trunc', [fpr(i.fs)]));
    };
    InstructionAst.prototype["round.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('MathFloat.round', [fpr(i.fs)]));
    };
    InstructionAst.prototype["ceil.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('MathFloat.ceil', [fpr(i.fs)]));
    };
    InstructionAst.prototype["floor.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('MathFloat.floor', [fpr(i.fs)]));
    };
    InstructionAst.prototype["cvt.s.w"] = function (i) {
        return assignFpr(i.fd, fpr_i(i.fs));
    };
    InstructionAst.prototype["cvt.w.s"] = function (i) {
        return assignFpr_I(i.fd, call('state._cvt_w_s_impl', [fpr(i.fs)]));
    };
    InstructionAst.prototype.lb = function (i) {
        return assignGpr(i.rt, call('state.lb', [rs_imm16(i)]));
    };
    InstructionAst.prototype.lbu = function (i) {
        return assignGpr(i.rt, call('state.lbu', [rs_imm16(i)]));
    };
    InstructionAst.prototype.lh = function (i) {
        return assignGpr(i.rt, call('state.lh', [rs_imm16(i)]));
    };
    InstructionAst.prototype.lhu = function (i) {
        return assignGpr(i.rt, call('state.lhu', [rs_imm16(i)]));
    };
    InstructionAst.prototype.lw = function (i) {
        return assignGpr(i.rt, call('state.lw', [rs_imm16(i)]));
    };
    InstructionAst.prototype.lwl = function (i) {
        return assignGpr(i.rt, call('state.lwl', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
    };
    InstructionAst.prototype.lwr = function (i) {
        return assignGpr(i.rt, call('state.lwr', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
    };
    InstructionAst.prototype.swl = function (i) {
        return stm(call('state.swl', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
    };
    InstructionAst.prototype.swr = function (i) {
        return stm(call('state.swr', [gpr(i.rs), i_simm16(i), gpr(i.rt)]));
    };
    InstructionAst.prototype._callstackPush = function (i) {
        //return stm(call('state.callstackPush', [imm32(i.PC)]));
        return ast.stm();
    };
    InstructionAst.prototype._callstackPop = function (i) {
        //return stm(call('state.callstackPop', []));
        return ast.stm();
    };
    InstructionAst.prototype.j = function (i) {
        return stms([stm(assign(branchflag(), imm32(1))), stm(assign(branchpc(), u_imm32(i.u_imm26 * 4)))]);
    };
    InstructionAst.prototype.jr = function (i) {
        var statements = [];
        statements.push(stm(assign(branchflag(), imm32(1))));
        statements.push(stm(assign(branchpc(), gpr(i.rs))));
        if (i.rs == 31) {
            statements.push(this._callstackPop(i));
        }
        return stms(statements);
    };
    InstructionAst.prototype.jal = function (i) {
        return stms([this.j(i), this._callstackPush(i), assignGpr(31, u_imm32(i.PC + 8))]);
    };
    InstructionAst.prototype.jalr = function (i) {
        return stms([this.jr(i), this._callstackPush(i), assignGpr(i.rd, u_imm32(i.PC + 8)), ]);
    };
    InstructionAst.prototype._comp = function (i, fc02, fc3) {
        var fc_unordererd = ((fc02 & 1) != 0);
        var fc_equal = ((fc02 & 2) != 0);
        var fc_less = ((fc02 & 4) != 0);
        var fc_inv_qnan = (fc3 != 0); // TODO -- Only used for detecting invalid operations?
        return stm(call('state._comp_impl', [fpr(i.fs), fpr(i.ft), immBool(fc_unordererd), immBool(fc_equal), immBool(fc_less), immBool(fc_inv_qnan)]));
    };
    InstructionAst.prototype["c.f.s"] = function (i) {
        return this._comp(i, 0, 0);
    };
    InstructionAst.prototype["c.un.s"] = function (i) {
        return this._comp(i, 1, 0);
    };
    InstructionAst.prototype["c.eq.s"] = function (i) {
        return this._comp(i, 2, 0);
    };
    InstructionAst.prototype["c.ueq.s"] = function (i) {
        return this._comp(i, 3, 0);
    };
    InstructionAst.prototype["c.olt.s"] = function (i) {
        return this._comp(i, 4, 0);
    };
    InstructionAst.prototype["c.ult.s"] = function (i) {
        return this._comp(i, 5, 0);
    };
    InstructionAst.prototype["c.ole.s"] = function (i) {
        return this._comp(i, 6, 0);
    };
    InstructionAst.prototype["c.ule.s"] = function (i) {
        return this._comp(i, 7, 0);
    };
    InstructionAst.prototype["c.sf.s"] = function (i) {
        return this._comp(i, 0, 1);
    };
    InstructionAst.prototype["c.ngle.s"] = function (i) {
        return this._comp(i, 1, 1);
    };
    InstructionAst.prototype["c.seq.s"] = function (i) {
        return this._comp(i, 2, 1);
    };
    InstructionAst.prototype["c.ngl.s"] = function (i) {
        return this._comp(i, 3, 1);
    };
    InstructionAst.prototype["c.lt.s"] = function (i) {
        return this._comp(i, 4, 1);
    };
    InstructionAst.prototype["c.nge.s"] = function (i) {
        return this._comp(i, 5, 1);
    };
    InstructionAst.prototype["c.le.s"] = function (i) {
        return this._comp(i, 6, 1);
    };
    InstructionAst.prototype["c.ngt.s"] = function (i) {
        return this._comp(i, 7, 1);
    };
    return InstructionAst;
})();
exports.InstructionAst = InstructionAst;
//# sourceMappingURL=codegen.js.map