///<reference path="../../global.d.ts" />

export class ANode {
	index:number;
	toJs() { return ''; }
	optimize() { return this; }
}

export class ANodeStm extends ANode {
}

export class ANodeStmLabel extends ANodeStm {
	address:number = 0;
	references:ANodeStmStaticJump[] = [];
	type = 'normal';
	
	constructor(address:number) {
		super();
		this.address = address
	}
	
	toJs() {
		switch (this.type) {
			case 'none': return ``;
			case 'normal':
				if (this.references.length == 0) return ``;
				return `case ${addressToHex(this.address)}:`;
			case 'while': return `loop_${addressToHex(this.address)}: while (true) {`;
		}
		
	}
}

export class ANodeStmStaticJump extends ANodeStm {
	type = 'normal';
	constructor(public cond: ANodeExpr, public address: number) { super(); }

	toJs() {
		switch (this.type) {
			case 'normal': return `if (${this.cond.toJs()}) { loop_state = ${addressToHex(this.address)}; continue loop; }`;
			case 'while': return `if (${this.cond.toJs()}) { continue loop_${addressToHex(this.address)}; } else { break loop_${addressToHex(this.address)}; } }`;
		}
		
	}
}

export class ANodeStmReturn extends ANodeStm {
	toJs() { return 'return;'; }
}

export class ANodeStmList extends ANodeStm {
	constructor(public childs: ANodeStm[]) { super(); }

	add(node: ANodeStm) {
		this.childs.push(node);
	}

	toJs() {
		return this.childs.map(c => c.toJs()).join("\n");
	}
}

export class ANodeFunction extends ANodeStmList {
	constructor(public address:number, private prefix:ANodeStm, childs: ANodeStm[]) { super(childs); }
	
	toJs() {
		let lines:string[] = [];
		lines.push(this.prefix.toJs());
		lines.push('var loop_state = 0; loop: while (true) switch (loop_state) {');
		lines.push('case 0:');
		
		var labelsByAddress:NumberDictionary<ANodeStmLabel> = {};
		for (var n = 0; n < this.childs.length; n++) this.childs[n].index = n;
		for (let child of this.childs) if (child instanceof ANodeStmLabel) labelsByAddress[child.address] = child;
		for (let child of this.childs) {
			if (child instanceof ANodeStmStaticJump) {
				if (labelsByAddress[child.address]) labelsByAddress[child.address].references.push(child);
			}
		}

		//var debug = (this.address == 0x088042e4);
		var debug = false;
		
		var checkRangeHasJustInternalReferences = (min:number, max:number) => {
			for (var n = min; n <= max; n++) {
				var child = this.childs[n];
				if (child instanceof ANodeStmLabel) {
					if (child.references.length == 0) {
						child.type = 'none';
					}
					for (var ref of child.references) {
						if (ref.index < min || ref.index > max) return false;
					}
				}
			}
			return true;
		};
		
		var getInternalLabelCount = (min:number, max:number) => {
			var count = 0;
			for (var n = min; n <= max; n++) {
				var child = this.childs[n];
				if (child instanceof ANodeStmLabel) count++;
			}
			return count;
		};
		
		for (let child of this.childs) {
			if (child instanceof ANodeStmStaticJump) {
				var label = labelsByAddress[child.address];
				if (debug) {
					printf("Jump index:%d to label %08X", child.index, child.address);
					if (label) {
						printf("Lable index:%d, references %d", child.index, label.references.length);
					} else {
						printf("No label");
					}
				}
				if (label && label.index < child.index) {
					var rangeInternalReferences = checkRangeHasJustInternalReferences(label.index, child.index);
					var labelCount = getInternalLabelCount(label.index, child.index);
					if (debug) printf("Internal references: %d", rangeInternalReferences);
					if (rangeInternalReferences && label.references.length == 1 && labelCount == 1) {
						label.type = 'while';
						child.type = 'while';
						//console.log('optimizable range!');
					}
				}
			}
		}

		for (let child of this.childs) {
			lines.push(child.toJs());
		}
		lines.push('break loop;');
		lines.push('default: throw new Error("Invalid loop_state=" + loop_state);');
		lines.push('}');
		return lines.join('\n');
	}
}

export class ANodeStmRaw extends ANodeStm {
	constructor(public content: string) { super(); }
	toJs() { return this.content; }
}

export class ANodeStmExpr extends ANodeStm {
	constructor(public expr: ANodeExpr) { super(); }
	toJs() { return this.expr.toJs() + ';'; }
}

export class ANodeAllocVarStm extends ANodeStm {
	constructor(public name: string, public initialValue: ANodeExpr) { super(); }
	toJs() { return 'var ' + this.name + ' = ' + this.initialValue.toJs() + ';'; }
}

export class ANodeExpr extends ANode {

}

export class ANodeExprLValue extends ANodeExpr {
	toAssignJs(right: ANodeExpr) { return ''; }
}

export class ANodeExprLValueSetGet extends ANodeExpr {
	constructor(private setTemplate: string, private getTemplate: string, private replacements: ANodeExpr[]) {
		super();
	}

	private _toJs(template:string, right?: ANodeExpr) {
		return template.replace(/(\$\d|#)/g, (match) => {
			if (match == '#') {
				return right.toJs();
			} else if (match.startsWith('$')) {
				return this.replacements[parseInt(match.substr(1))].toJs();
			}
		});
	}

	toAssignJs(right: ANodeExpr) {
		return this._toJs(this.setTemplate, right);
	}

	toJs() {
		return this._toJs(this.getTemplate);
	}
}



export class ANodeExprLValueVar extends ANodeExprLValue {
	constructor(public name: string) { super(); }
	toAssignJs(right: ANodeExpr) { return this.name + ' = ' + right.toJs(); }
	toJs() { return this.name; }
}

export class ANodeExprI32 extends ANodeExpr {
	constructor(public value: number) { super(); }
	toJs() { return String(this.value); }
}

export class ANodeExprFloat extends ANodeExpr {
	constructor(public value: number) { super(); }
	toJs() {
		var rfloat = MathFloat.reinterpretFloatAsInt(this.value);
		if (rfloat & 0x80000000) {
			return '-' + MathFloat.reinterpretIntAsFloat(rfloat & 0x7FFFFFFF);
		} else {
			return String(this.value);
		}
	}
}

export class ANodeExprU32 extends ANodeExpr {
	constructor(public value: number) { super(); }
	toJs() {
		return addressToHex(this.value);
	}
}

export class ANodeExprBinop extends ANodeExpr {
	constructor(public left: ANodeExpr, public op: string, public right: ANodeExpr) {
		super();
		if (!this.left || !this.left.toJs) debugger;
		if (!this.right || !this.right.toJs) debugger;
	}
	toJs() { return '(' + this.left.toJs() + ' ' + this.op + ' ' + this.right.toJs() + ')'; }
}

export class ANodeExprUnop extends ANodeExpr {
	constructor(public op: string, public right: ANodeExpr) { super(); }
	toJs() { return '(' + this.op + '(' + this.right.toJs() + '))'; }
}

export class ANodeExprAssign extends ANodeExpr {
	constructor(public left: ANodeExprLValue, public right: ANodeExpr) {
		super();
		if (!this.left || !this.left.toAssignJs) debugger;
		if (!this.right) debugger;
	}
	toJs() { return this.left.toAssignJs(this.right); }
}

export class ANodeExprArray extends ANodeExpr {
	constructor(public _items: ANodeExpr[]) { super(); }
	toJs() { return '[' + this._items.map((item) => item.toJs()).join(', ') + ']'; }
}

export class ANodeExprCall extends ANodeExpr {
	constructor(public name: string, public _arguments: ANodeExpr[]) {
		super();
		if (!_arguments) debugger;
		this._arguments.forEach(argument => {
			if (!argument || !(argument instanceof ANodeExpr)) debugger;
		});
	}
	toJs() { return this.name + '(' + this._arguments.map((argument) => argument.toJs()).join(', ') + ')'; }
}

export class ANodeStmIf extends ANodeStm {
	constructor(public cond: ANodeExpr, public codeTrue: ANodeStm, public codeFalse?: ANodeStm) { super(); }
	toJs() {
		var result = '';
		result += 'if (' + this.cond.toJs() + ')';
		result += ' { ' + this.codeTrue.toJs() + ' }';
		if (this.codeFalse) result += ' else { ' + this.codeFalse.toJs() + ' }';
		return result;
	}
}

export class AstBuilder {
	assign(ref: ANodeExprLValue, value: ANodeExpr) { return new ANodeExprAssign(ref, value); }
	_if(cond: ANodeExpr, codeTrue: ANodeStm, codeFalse?: ANodeStm) { return new ANodeStmIf(cond, codeTrue, codeFalse); }
	binop(left: ANodeExpr, op: string, right: ANodeExpr) { return new ANodeExprBinop(left, op, right); }
	unop(op: string, right: ANodeExpr) { return new ANodeExprUnop(op, right); }
	binop_i(left: ANodeExpr, op: string, right: number) { return this.binop(left, op, this.imm32(right)); }
	imm32(value: number) { return new ANodeExprI32(value); }
	imm_f(value: number) { return new ANodeExprFloat(value); }
	u_imm32(value: number) { return new ANodeExprU32(value); }
	stm(expr?: ANodeExpr) { return expr ? (new ANodeStmExpr(expr)) : new ANodeStm(); }
	stms(stms: ANodeStm[]) { return new ANodeStmList(stms); }
	func(address:number, prefix:ANodeStm, stms: ANodeStm[]) { return new ANodeFunction(address, prefix, stms); }
	array(exprList: ANodeExpr[]) { return new ANodeExprArray(exprList); }
	arrayNumbers(values: number[]) { return this.array(values.map(value => this.imm_f(value))); }
	call(name: string, exprList: ANodeExpr[]) { return new ANodeExprCall(name, exprList); }
	label(address:number) { return new ANodeStmLabel(address); }
	//jump(label: ANodeStmLabel) { return new ANodeStmJump(label); }
	//djump(node: ANodeExpr) { return new ANodeStmDynamicJump(node); }
	sjump(cond:ANodeExpr, value: number) { return new ANodeStmStaticJump(cond, value); }
	_return() { return new ANodeStmReturn(); }
	raw_stm(content: string) { return new ANodeStmRaw(content); }
	raw(content: string) { return new ANodeExprLValueVar(content); }
	allocVar(name: string, initialValue: ANodeExpr) { return new ANodeAllocVarStm(name, initialValue); }
}

export class MipsAstBuilder extends AstBuilder {
	debugger(comment: string = '-'): ANodeStm {
		return new ANodeStmRaw("debugger; // " + comment + "\n");
	}

	gpr(index: number): ANodeExprLValueVar {
		if (index === 0) return new ANodeExprLValueVar('0');
		return new ANodeExprLValueVar('gpr[' + index + ']');
	}

	gpr_f(index: number): ANodeExprLValueVar {
		if (index === 0) return new ANodeExprLValueVar('0');
		return new ANodeExprLValueVar('gpr_f[' + index + ']');
	}

	tempr(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar('state.temp[' + index + ']'); }
	vector_vs(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar('state.vector_vs[' + index + ']'); }
	vector_vt(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar('state.vector_vt[' + index + ']'); }
	vfpr(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar('state.vfpr[' + index + ']'); }
	vfprc(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar('state.vfprc[' + index + ']'); }

	vfpr_i(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar('state.vfpr_i[' + index + ']'); }
	fpr(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar('state.fpr[' + index + ']'); }
	fpr_i(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar('state.fpr_i[' + index + ']'); }
	fcr31_cc() { return new ANodeExprLValueVar('state.fcr31_cc'); }
	lo() { return new ANodeExprLValueVar('state.LO'); }
	hi() { return new ANodeExprLValueVar('state.HI'); }
	ic() { return new ANodeExprLValueVar('state.IC'); }
	pc() { return new ANodeExprLValueVar('state.PC'); }
	VCC(index: number) {
		return new ANodeExprLValueSetGet('state.setVfrCc($0, #)', 'state.getVfrCc($0)', [this.imm32(index)]);
	}
	ra() { return new ANodeExprLValueVar('state.gpr[31]'); }
	branchflag() { return new ANodeExprLValueVar('BRANCHFLAG'); }
	branchpc() { return new ANodeExprLValueVar('BRANCHPC'); }

	assignGpr(index: number, expr: ANodeStm) {
		if (index == 0) return this.stm();
		return this.stm(this.assign(this.gpr(index), expr));
	}

	assignIC(expr: ANodeStm) { return this.stm(this.assign(this.ic(), expr)); }
	assignFpr(index: number, expr: ANodeStm) { return this.stm(this.assign(this.fpr(index), expr)); }
	assignFpr_I(index: number, expr: ANodeStm) { return this.stm(this.assign(this.fpr_i(index), expr)); }
}
