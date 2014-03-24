var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ANode = (function () {
    function ANode() {
    }
    ANode.prototype.toJs = function () {
    };

    ANode.prototype.optimize = function () {
        return this;
    };
    return ANode;
})();

var ANodeStm = (function (_super) {
    __extends(ANodeStm, _super);
    function ANodeStm() {
        _super.apply(this, arguments);
    }
    return ANodeStm;
})(ANode);

var ANodeStmList = (function (_super) {
    __extends(ANodeStmList, _super);
    function ANodeStmList(childs) {
        _super.call(this);
        this.childs = childs;
    }
    ANodeStmList.prototype.toJs = function () {
        return this.childs.map(function (item) {
            return item.toJs();
        }).join("\n");
    };
    return ANodeStmList;
})(ANodeStm);

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

var ANodeExpr = (function (_super) {
    __extends(ANodeExpr, _super);
    function ANodeExpr() {
        _super.apply(this, arguments);
    }
    return ANodeExpr;
})(ANode);

var ANodeExprLValue = (function (_super) {
    __extends(ANodeExprLValue, _super);
    function ANodeExprLValue() {
        _super.apply(this, arguments);
    }
    return ANodeExprLValue;
})(ANodeExpr);

var ANodeExprLValueVar = (function (_super) {
    __extends(ANodeExprLValueVar, _super);
    function ANodeExprLValueVar(name) {
        _super.call(this);
        this.name = name;
    }
    ANodeExprLValueVar.prototype.toJs = function () {
        return this.name;
    };
    return ANodeExprLValueVar;
})(ANodeExprLValue);

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

var ANodeExprU32 = (function (_super) {
    __extends(ANodeExprU32, _super);
    function ANodeExprU32(value) {
        _super.call(this);
        this.value = value;
    }
    ANodeExprU32.prototype.toJs = function () {
        return sprintf('0x%08X', this.value);
    };
    return ANodeExprU32;
})(ANodeExpr);

var ANodeExprBinop = (function (_super) {
    __extends(ANodeExprBinop, _super);
    function ANodeExprBinop(left, op, right) {
        _super.call(this);
        this.left = left;
        this.op = op;
        this.right = right;
    }
    ANodeExprBinop.prototype.toJs = function () {
        return '(' + this.left.toJs() + ' ' + this.op + ' ' + this.right.toJs() + ')';
    };
    return ANodeExprBinop;
})(ANodeExpr);

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

var ANodeExprAssign = (function (_super) {
    __extends(ANodeExprAssign, _super);
    function ANodeExprAssign(left, right) {
        _super.call(this);
        this.left = left;
        this.right = right;
    }
    ANodeExprAssign.prototype.toJs = function () {
        return this.left.toJs() + ' = ' + this.right.toJs();
    };
    return ANodeExprAssign;
})(ANodeExpr);

var ANodeExprCall = (function (_super) {
    __extends(ANodeExprCall, _super);
    function ANodeExprCall(name, arguments) {
        _super.call(this);
        this.name = name;
        this.arguments = arguments;
    }
    ANodeExprCall.prototype.toJs = function () {
        return this.name + '(' + this.arguments.map(function (argument) {
            return argument.toJs();
        }).join(',') + ')';
    };
    return ANodeExprCall;
})(ANodeExpr);

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

    AstBuilder.prototype.u_imm32 = function (value) {
        //return new ANodeExprI32(value);
        return new ANodeExprU32(value);
    };

    AstBuilder.prototype.stm = function (expr) {
        return new ANodeStmExpr(expr);
    };

    AstBuilder.prototype.stmEmpty = function () {
        return new ANodeStm();
    };

    AstBuilder.prototype.stms = function (stms) {
        return new ANodeStmList(stms);
    };

    AstBuilder.prototype.call = function (name, exprList) {
        return new ANodeExprCall(name, exprList);
    };
    return AstBuilder;
})();

var MipsAstBuilder = (function (_super) {
    __extends(MipsAstBuilder, _super);
    function MipsAstBuilder() {
        _super.apply(this, arguments);
    }
    MipsAstBuilder.prototype.functionPrefix = function () {
        //return new ANodeStmRaw('var gpr = state.gpr;');
        return this.stmEmpty();
    };

    MipsAstBuilder.prototype.gpr = function (index) {
        if (index === 0)
            return new ANodeExprLValueVar('0');
        return new ANodeExprLValueVar('state.' + core.cpu.CpuState.getGprAccessName(index));
    };

    MipsAstBuilder.prototype.fpr = function (index) {
        return new ANodeExprLValueVar('state.' + core.cpu.CpuState.getFprAccessName(index));
    };

    MipsAstBuilder.prototype.fpr_i = function (index) {
        return this.call('MathFloat.reinterpretFloatAsInt', [this.fpr(index)]);
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
    MipsAstBuilder.prototype.branchflag = function () {
        return new ANodeExprLValueVar('state.BRANCHFLAG');
    };
    MipsAstBuilder.prototype.branchpc = function () {
        return new ANodeExprLValueVar('state.BRANCHPC');
    };

    MipsAstBuilder.prototype.assignGpr = function (index, expr) {
        if (index == 0)
            return this.stmEmpty();

        //return this.stm(this.assign(this.gpr(index), this.binop(expr, '|', this.imm32(0))));
        return this.stm(this.assign(this.gpr(index), expr));
    };

    MipsAstBuilder.prototype.assignIC = function (expr) {
        return this.stm(this.assign(this.ic(), expr));
    };

    MipsAstBuilder.prototype.assignFpr = function (index, expr) {
        return this.stm(this.assign(this.fpr(index), expr));
    };

    MipsAstBuilder.prototype.assignFpr_I = function (index, expr) {
        return this.stm(this.assign(this.fpr(index), this.call('MathFloat.reinterpretIntAsFloat', [expr])));
    };
    return MipsAstBuilder;
})(AstBuilder);
//# sourceMappingURL=ast.js.map
