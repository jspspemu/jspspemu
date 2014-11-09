///<reference path="../../global.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var state = require('./state');
var ANode = (function () {
    function ANode() {
    }
    ANode.prototype.toJs = function () {
        return '';
    };
    ANode.prototype.optimize = function () {
        return this;
    };
    return ANode;
})();
exports.ANode = ANode;
var ANodeStm = (function (_super) {
    __extends(ANodeStm, _super);
    function ANodeStm() {
        _super.apply(this, arguments);
    }
    return ANodeStm;
})(ANode);
exports.ANodeStm = ANodeStm;
var ANodeStmJump = (function (_super) {
    __extends(ANodeStmJump, _super);
    function ANodeStmJump(label) {
        _super.call(this);
        this.label = label;
    }
    return ANodeStmJump;
})(ANodeStm);
exports.ANodeStmJump = ANodeStmJump;
var ANodeStmReturn = (function (_super) {
    __extends(ANodeStmReturn, _super);
    function ANodeStmReturn() {
        _super.apply(this, arguments);
    }
    ANodeStmReturn.prototype.toJs = function () {
        return 'return;';
    };
    return ANodeStmReturn;
})(ANodeStm);
exports.ANodeStmReturn = ANodeStmReturn;
var ANodeStmList = (function (_super) {
    __extends(ANodeStmList, _super);
    function ANodeStmList(childs) {
        _super.call(this);
        this.childs = childs;
        this.labels = {};
    }
    ANodeStmList.prototype.createLabel = function (label) {
        this.labels[label] = this.childs.length;
        return this.childs.length;
    };
    ANodeStmList.prototype.add = function (node) {
        this.childs.push(node);
    };
    ANodeStmList.prototype.toJs = function () {
        var jumpCount = 0;
        var usedLabels = {};
        for (var n = 0; n < this.childs.length; n++) {
            var item = this.childs[n];
            if (item instanceof ANodeStmJump) {
                jumpCount++;
                usedLabels[item.label] = true;
            }
        }
        if (jumpCount > 1)
            throw (new Error("Not supported more than one jump at this point!"));
        var lines = [];
        for (var n = 0; n < this.childs.length; n++) {
            var child = this.childs[n];
            if (usedLabels[n] !== undefined) {
                lines.push('while(true) {');
            }
            //console.log(usedLabels);
            lines.push(child.toJs());
            if (child instanceof ANodeStmJump) {
                lines.push('}');
            }
        }
        return lines.join("\n");
    };
    return ANodeStmList;
})(ANodeStm);
exports.ANodeStmList = ANodeStmList;
var ANodeStmRaw = (function (_super) {
    __extends(ANodeStmRaw, _super);
    function ANodeStmRaw(content) {
        _super.call(this);
        this.content = content;
    }
    ANodeStmRaw.prototype.toJs = function () {
        return this.content;
    };
    return ANodeStmRaw;
})(ANodeStm);
exports.ANodeStmRaw = ANodeStmRaw;
var ANodeStmExpr = (function (_super) {
    __extends(ANodeStmExpr, _super);
    function ANodeStmExpr(expr) {
        _super.call(this);
        this.expr = expr;
    }
    ANodeStmExpr.prototype.toJs = function () {
        return this.expr.toJs() + ';';
    };
    return ANodeStmExpr;
})(ANodeStm);
exports.ANodeStmExpr = ANodeStmExpr;
var ANodeAllocVarStm = (function (_super) {
    __extends(ANodeAllocVarStm, _super);
    function ANodeAllocVarStm(name, initialValue) {
        _super.call(this);
        this.name = name;
        this.initialValue = initialValue;
    }
    ANodeAllocVarStm.prototype.toJs = function () {
        return 'var ' + this.name + ' = ' + this.initialValue.toJs() + ';';
    };
    return ANodeAllocVarStm;
})(ANodeStm);
exports.ANodeAllocVarStm = ANodeAllocVarStm;
var ANodeExpr = (function (_super) {
    __extends(ANodeExpr, _super);
    function ANodeExpr() {
        _super.apply(this, arguments);
    }
    return ANodeExpr;
})(ANode);
exports.ANodeExpr = ANodeExpr;
var ANodeExprLValue = (function (_super) {
    __extends(ANodeExprLValue, _super);
    function ANodeExprLValue() {
        _super.apply(this, arguments);
    }
    ANodeExprLValue.prototype.toAssignJs = function (right) {
        return '';
    };
    return ANodeExprLValue;
})(ANodeExpr);
exports.ANodeExprLValue = ANodeExprLValue;
var ANodeExprLValueSetGet = (function (_super) {
    __extends(ANodeExprLValueSetGet, _super);
    function ANodeExprLValueSetGet(setTemplate, getTemplate, replacements) {
        _super.call(this);
        this.setTemplate = setTemplate;
        this.getTemplate = getTemplate;
        this.replacements = replacements;
    }
    ANodeExprLValueSetGet.prototype._toJs = function (template, right) {
        var _this = this;
        return template.replace(/(\$\d|#)/g, function (match) {
            if (match == '#') {
                return right.toJs();
            }
            else if (match.startsWith('$')) {
                return _this.replacements[parseInt(match.substr(1))].toJs();
            }
        });
    };
    ANodeExprLValueSetGet.prototype.toAssignJs = function (right) {
        return this._toJs(this.setTemplate, right);
    };
    ANodeExprLValueSetGet.prototype.toJs = function () {
        return this._toJs(this.getTemplate);
    };
    return ANodeExprLValueSetGet;
})(ANodeExpr);
exports.ANodeExprLValueSetGet = ANodeExprLValueSetGet;
var ANodeExprLValueVar = (function (_super) {
    __extends(ANodeExprLValueVar, _super);
    function ANodeExprLValueVar(name) {
        _super.call(this);
        this.name = name;
    }
    ANodeExprLValueVar.prototype.toAssignJs = function (right) {
        return this.name + ' = ' + right.toJs();
    };
    ANodeExprLValueVar.prototype.toJs = function () {
        return this.name;
    };
    return ANodeExprLValueVar;
})(ANodeExprLValue);
exports.ANodeExprLValueVar = ANodeExprLValueVar;
var ANodeExprI32 = (function (_super) {
    __extends(ANodeExprI32, _super);
    function ANodeExprI32(value) {
        _super.call(this);
        this.value = value;
    }
    ANodeExprI32.prototype.toJs = function () {
        return String(this.value);
    };
    return ANodeExprI32;
})(ANodeExpr);
exports.ANodeExprI32 = ANodeExprI32;
var ANodeExprFloat = (function (_super) {
    __extends(ANodeExprFloat, _super);
    function ANodeExprFloat(value) {
        _super.call(this);
        this.value = value;
    }
    ANodeExprFloat.prototype.toJs = function () {
        var rfloat = MathFloat.reinterpretFloatAsInt(this.value);
        if (rfloat & 0x80000000) {
            return '-' + MathFloat.reinterpretIntAsFloat(rfloat & 0x7FFFFFFF);
        }
        else {
            return String(this.value);
        }
    };
    return ANodeExprFloat;
})(ANodeExpr);
exports.ANodeExprFloat = ANodeExprFloat;
var ANodeExprU32 = (function (_super) {
    __extends(ANodeExprU32, _super);
    function ANodeExprU32(value) {
        _super.call(this);
        this.value = value;
    }
    ANodeExprU32.prototype.toJs = function () {
        return '0x' + IntUtils.toHexString(this.value, 8);
        //return sprintf('0x%08X', this.value);
    };
    return ANodeExprU32;
})(ANodeExpr);
exports.ANodeExprU32 = ANodeExprU32;
var ANodeExprBinop = (function (_super) {
    __extends(ANodeExprBinop, _super);
    function ANodeExprBinop(left, op, right) {
        _super.call(this);
        this.left = left;
        this.op = op;
        this.right = right;
        if (!this.left || !this.left.toJs)
            debugger;
        if (!this.right || !this.right.toJs)
            debugger;
    }
    ANodeExprBinop.prototype.toJs = function () {
        return '(' + this.left.toJs() + ' ' + this.op + ' ' + this.right.toJs() + ')';
    };
    return ANodeExprBinop;
})(ANodeExpr);
exports.ANodeExprBinop = ANodeExprBinop;
var ANodeExprUnop = (function (_super) {
    __extends(ANodeExprUnop, _super);
    function ANodeExprUnop(op, right) {
        _super.call(this);
        this.op = op;
        this.right = right;
    }
    ANodeExprUnop.prototype.toJs = function () {
        return '(' + this.op + '(' + this.right.toJs() + '))';
    };
    return ANodeExprUnop;
})(ANodeExpr);
exports.ANodeExprUnop = ANodeExprUnop;
var ANodeExprAssign = (function (_super) {
    __extends(ANodeExprAssign, _super);
    function ANodeExprAssign(left, right) {
        _super.call(this);
        this.left = left;
        this.right = right;
        if (!this.left || !this.left.toAssignJs)
            debugger;
        if (!this.right)
            debugger;
    }
    ANodeExprAssign.prototype.toJs = function () {
        return this.left.toAssignJs(this.right);
    };
    return ANodeExprAssign;
})(ANodeExpr);
exports.ANodeExprAssign = ANodeExprAssign;
var ANodeExprArray = (function (_super) {
    __extends(ANodeExprArray, _super);
    function ANodeExprArray(_items) {
        _super.call(this);
        this._items = _items;
    }
    ANodeExprArray.prototype.toJs = function () {
        return '[' + this._items.map(function (item) { return item.toJs(); }).join(', ') + ']';
    };
    return ANodeExprArray;
})(ANodeExpr);
exports.ANodeExprArray = ANodeExprArray;
var ANodeExprCall = (function (_super) {
    __extends(ANodeExprCall, _super);
    function ANodeExprCall(name, _arguments) {
        _super.call(this);
        this.name = name;
        this._arguments = _arguments;
        if (!_arguments)
            debugger;
        this._arguments.forEach(function (argument) {
            if (!argument || !(argument instanceof ANodeExpr))
                debugger;
        });
    }
    ANodeExprCall.prototype.toJs = function () {
        return this.name + '(' + this._arguments.map(function (argument) { return argument.toJs(); }).join(', ') + ')';
    };
    return ANodeExprCall;
})(ANodeExpr);
exports.ANodeExprCall = ANodeExprCall;
var ANodeStmIf = (function (_super) {
    __extends(ANodeStmIf, _super);
    function ANodeStmIf(cond, codeTrue, codeFalse) {
        _super.call(this);
        this.cond = cond;
        this.codeTrue = codeTrue;
        this.codeFalse = codeFalse;
    }
    ANodeStmIf.prototype.toJs = function () {
        var result = '';
        result += 'if (' + this.cond.toJs() + ')';
        result += ' { ' + this.codeTrue.toJs() + ' }';
        if (this.codeFalse)
            result += ' else { ' + this.codeFalse.toJs() + ' }';
        return result;
    };
    return ANodeStmIf;
})(ANodeStm);
exports.ANodeStmIf = ANodeStmIf;
var AstBuilder = (function () {
    function AstBuilder() {
    }
    AstBuilder.prototype.assign = function (ref, value) {
        return new ANodeExprAssign(ref, value);
    };
    AstBuilder.prototype._if = function (cond, codeTrue, codeFalse) {
        return new ANodeStmIf(cond, codeTrue, codeFalse);
    };
    AstBuilder.prototype.binop = function (left, op, right) {
        return new ANodeExprBinop(left, op, right);
    };
    AstBuilder.prototype.unop = function (op, right) {
        return new ANodeExprUnop(op, right);
    };
    AstBuilder.prototype.binop_i = function (left, op, right) {
        return this.binop(left, op, this.imm32(right));
    };
    AstBuilder.prototype.imm32 = function (value) {
        return new ANodeExprI32(value);
    };
    AstBuilder.prototype.imm_f = function (value) {
        return new ANodeExprFloat(value);
    };
    AstBuilder.prototype.u_imm32 = function (value) {
        return new ANodeExprU32(value);
    };
    AstBuilder.prototype.stm = function (expr) {
        return expr ? (new ANodeStmExpr(expr)) : new ANodeStm();
    };
    AstBuilder.prototype.stms = function (stms) {
        return new ANodeStmList(stms);
    };
    AstBuilder.prototype.array = function (exprList) {
        return new ANodeExprArray(exprList);
    };
    AstBuilder.prototype.arrayNumbers = function (values) {
        var _this = this;
        return this.array(values.map(function (value) { return _this.imm_f(value); }));
    };
    AstBuilder.prototype.call = function (name, exprList) {
        return new ANodeExprCall(name, exprList);
    };
    AstBuilder.prototype.jump = function (label) {
        return new ANodeStmJump(label);
    };
    AstBuilder.prototype._return = function () {
        return new ANodeStmReturn();
    };
    AstBuilder.prototype.raw_stm = function (content) {
        return new ANodeStmRaw(content);
    };
    AstBuilder.prototype.raw = function (content) {
        return new ANodeExprLValueVar(content);
    };
    AstBuilder.prototype.allocVar = function (name, initialValue) {
        return new ANodeAllocVarStm(name, initialValue);
    };
    return AstBuilder;
})();
exports.AstBuilder = AstBuilder;
var MipsAstBuilder = (function (_super) {
    __extends(MipsAstBuilder, _super);
    function MipsAstBuilder() {
        _super.apply(this, arguments);
    }
    MipsAstBuilder.prototype.debugger = function (comment) {
        if (comment === void 0) { comment = '-'; }
        return new ANodeStmRaw("debugger; // " + comment + "\n");
    };
    MipsAstBuilder.prototype.functionPrefix = function () {
        return this.stm();
    };
    MipsAstBuilder.prototype.gpr = function (index) {
        if (index === 0)
            return new ANodeExprLValueVar('0');
        return new ANodeExprLValueVar('state.gpr[' + index + ']');
    };
    MipsAstBuilder.prototype.gpr_f = function (index) {
        if (index === 0)
            return new ANodeExprLValueVar('0');
        return new ANodeExprLValueVar('state.gpr_f[' + index + ']');
    };
    MipsAstBuilder.prototype.tempr = function (index) {
        return new ANodeExprLValueVar('state.temp[' + index + ']');
    };
    MipsAstBuilder.prototype.vector_vs = function (index) {
        return new ANodeExprLValueVar('state.vector_vs[' + index + ']');
    };
    MipsAstBuilder.prototype.vector_vt = function (index) {
        return new ANodeExprLValueVar('state.vector_vt[' + index + ']');
    };
    MipsAstBuilder.prototype.vfpr = function (index) {
        return new ANodeExprLValueVar('state.vfpr[' + index + ']');
    };
    MipsAstBuilder.prototype.vfprc = function (index) {
        return new ANodeExprLValueVar('state.vfprc[' + index + ']');
    };
    MipsAstBuilder.prototype.vfpr_i = function (index) {
        return new ANodeExprLValueVar('state.vfpr_i[' + index + ']');
    };
    MipsAstBuilder.prototype.fpr = function (index) {
        return new ANodeExprLValueVar('state.fpr[' + index + ']');
    };
    MipsAstBuilder.prototype.fpr_i = function (index) {
        return new ANodeExprLValueVar('state.fpr_i[' + index + ']');
    };
    MipsAstBuilder.prototype.fcr31_cc = function () {
        return new ANodeExprLValueVar('state.fcr31_cc');
    };
    MipsAstBuilder.prototype.lo = function () {
        return new ANodeExprLValueVar('state.LO');
    };
    MipsAstBuilder.prototype.hi = function () {
        return new ANodeExprLValueVar('state.HI');
    };
    MipsAstBuilder.prototype.ic = function () {
        return new ANodeExprLValueVar('state.IC');
    };
    MipsAstBuilder.prototype.pc = function () {
        return new ANodeExprLValueVar('state.PC');
    };
    MipsAstBuilder.prototype.VCC = function (index) {
        return new ANodeExprLValueSetGet('state.setVfrCc($0, #)', 'state.getVfrCc($0)', [this.imm32(index)]);
    };
    MipsAstBuilder.prototype.ra = function () {
        return new ANodeExprLValueVar('state.gpr[31]');
    };
    MipsAstBuilder.prototype.branchflag = function () {
        return new ANodeExprLValueVar('state.BRANCHFLAG');
    };
    MipsAstBuilder.prototype.branchpc = function () {
        return new ANodeExprLValueVar('state.BRANCHPC');
    };
    MipsAstBuilder.prototype.assignGpr = function (index, expr) {
        if (index == 0)
            return this.stm();
        return this.stm(this.assign(this.gpr(index), expr));
    };
    MipsAstBuilder.prototype.assignIC = function (expr) {
        return this.stm(this.assign(this.ic(), expr));
    };
    MipsAstBuilder.prototype.assignFpr = function (index, expr) {
        return this.stm(this.assign(this.fpr(index), expr));
    };
    MipsAstBuilder.prototype.assignFpr_I = function (index, expr) {
        return this.stm(this.assign(this.fpr_i(index), expr));
    };
    return MipsAstBuilder;
})(AstBuilder);
exports.MipsAstBuilder = MipsAstBuilder;
//# sourceMappingURL=ast_builder.js.map