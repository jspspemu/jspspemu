class ANode {
    toJs() {
    }

    optimize() {
        return this;
    }
}

class ANodeStm extends ANode {
}

class ANodeStmList extends ANodeStm {
    constructor(public childs: ANodeStm[]) {
        super();
    }

    toJs() {
        return this.childs.map((item) => item.toJs()).join("\n");
    }
}

class ANodeStmRaw extends ANodeStm {
    constructor(public content: string) {
        super();
    }

    toJs() {
        return this.content;
    }
}

class ANodeStmExpr extends ANodeStm {
    constructor(public expr: ANodeExpr) {
        super();
    }

    toJs() {
        return this.expr.toJs() + ';';
    }
}

class ANodeExpr extends ANode {

}

class ANodeExprLValue extends ANodeExpr {
}

class ANodeExprLValueVar extends ANodeExprLValue {
    constructor(public name: string) {
        super();
    }

    toJs() {
        return this.name;
    }
}

class ANodeExprI32 extends ANodeExpr {
    constructor(public value: number) {
        super();
    }

    toJs() {
        return String(this.value);
    }
}

class ANodeExprU32 extends ANodeExpr {
    constructor(public value: number) {
        super();
    }

    toJs() {
        return sprintf('0x%08X', this.value);
    }
}

class ANodeExprBinop extends ANodeExpr {
    constructor(public left: ANodeExpr, public op: string, public right: ANodeExpr) {
        super();
    }

    toJs() {
        return '(' + this.left.toJs() + ' ' + this.op + ' ' + this.right.toJs() + ')';
    }
}

class ANodeExprUnop extends ANodeExpr {
    constructor(public op: string, public right: ANodeExpr) {
        super();
    }

    toJs() {
        return '(' + this.op + '(' + this.right.toJs() + '))';
    }
}

class ANodeExprAssign extends ANodeExpr {
    constructor(public left: ANodeExprLValue, public right: ANodeExpr) {
        super();
    }

    toJs() {
        return this.left.toJs() + ' = ' + this.right.toJs();
    }
}

class ANodeExprCall extends ANodeExpr {
    constructor(public name: string, public arguments: ANodeExpr[]) {
        super();
    }

    toJs() {
        return this.name + '(' + this.arguments.map((argument) => argument.toJs()).join(',') + ')';
    }
}

class ANodeStmIf extends ANodeStm {
    constructor(public cond: ANodeExpr, public codeTrue: ANodeStm, public codeFalse?: ANodeStm) {
        super();
    }

    toJs() {
        var result = '';
        result += 'if (' + this.cond.toJs() + ')';
        result += ' { ' + this.codeTrue.toJs() + ' }';
        if (this.codeFalse) result += ' else { ' + this.codeFalse.toJs() + ' }';
        return result;
    }
}

class AstBuilder {
    assign(ref: ANodeExprLValue, value: ANodeExpr) {
        return new ANodeExprAssign(ref, value);
    }

    _if(cond: ANodeExpr, codeTrue: ANodeStm, codeFalse?: ANodeStm) {
        return new ANodeStmIf(cond, codeTrue, codeFalse);
    }

    binop(left: ANodeExpr, op: string, right: ANodeExpr) {
        return new ANodeExprBinop(left, op, right);
    }

    unop(op: string, right: ANodeExpr) {
        return new ANodeExprUnop(op, right);
    }

    binop_i(left: ANodeExpr, op: string, right: number) {
        return this.binop(left, op, this.imm32(right));
    }

    imm32(value: number) {
        return new ANodeExprI32(value);
    }

    u_imm32(value: number) {
        //return new ANodeExprI32(value);
        return new ANodeExprU32(value);
    }

    stm(expr: ANodeExpr) {
        return new ANodeStmExpr(expr);
    }

    stmEmpty() {
        return new ANodeStm();
    }

    stms(stms: ANodeStm[]) {
        return new ANodeStmList(stms);
    }

    call(name: string, exprList: ANodeExpr[]) {
        return new ANodeExprCall(name, exprList);
    }
}

class MipsAstBuilder extends AstBuilder {
    functionPrefix() {
        //return new ANodeStmRaw('var gpr = state.gpr;');
        return this.stmEmpty();
    }

    gpr(index: number): ANodeExprLValueVar {
        if (index === 0) return new ANodeExprLValueVar('0');
		return new ANodeExprLValueVar('state.' + core.cpu.CpuState.getGprAccessName(index));
        
    }

    fpr(index: number): ANodeExprLValueVar {
		return new ANodeExprLValueVar('state.' + core.cpu.CpuState.getFprAccessName(index));
    }

    fpr_i(index: number): ANodeExprLValueVar {
        return this.call('MathFloat.reinterpretFloatAsInt', [this.fpr(index)]);
    }

    fcr31_cc() { return new ANodeExprLValueVar('state.fcr31_cc'); }
    lo() { return new ANodeExprLValueVar('state.LO'); }
    hi() { return new ANodeExprLValueVar('state.HI'); }
	ic() { return new ANodeExprLValueVar('state.IC'); }
    pc() { return new ANodeExprLValueVar('state.PC'); }
    branchflag() { return new ANodeExprLValueVar('state.BRANCHFLAG'); }
    branchpc() { return new ANodeExprLValueVar('state.BRANCHPC'); }

    assignGpr(index: number, expr: ANodeStm) {
        if (index == 0) return this.stmEmpty();
        //return this.stm(this.assign(this.gpr(index), this.binop(expr, '|', this.imm32(0))));
        return this.stm(this.assign(this.gpr(index), expr));
    }

	assignIC(expr: ANodeStm) {
		return this.stm(this.assign(this.ic(), expr));
	}

    assignFpr(index: number, expr: ANodeStm) {
        return this.stm(this.assign(this.fpr(index), expr));
    }

    assignFpr_I(index: number, expr: ANodeStm) {
        return this.stm(this.assign(this.fpr(index), this.call('MathFloat.reinterpretIntAsFloat', [expr])));
    }
}
