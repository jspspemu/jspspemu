import "../../emu/global"

import { CpuState } from './cpu_core';
import {addressToHex, NumberDictionary} from "../../global/utils";
import {MathFloat} from "../../global/math";
import {relooperProcess} from "../../codegen/relooper";

export class ANode {
	index: number = 0
	toJs(): string { return ''; }
	optimize(): ANode { return this; }
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
            default: throw new Error(`Unexpected type ${this.type}`)
		}
	}
}

export class ANodeStmStaticJump extends ANodeStm {
	type = 'normal';
	constructor(public cond: ANodeExpr, public address: number, public branchCode?: ANodeStm) { super(); }
	
	get branchCodeJs() { return this.branchCode?.toJs() ?? ''; }

	toJs() {
		switch (this.type) {
			case 'normal': return `if (${this.cond.toJs()}) { ${this.branchCodeJs}; loop_state = ${addressToHex(this.address)}; continue loop; }`;
			case 'while': return `if (${this.cond.toJs()}) { ${this.branchCodeJs}; continue loop_${addressToHex(this.address)}; } else { break loop_${addressToHex(this.address)}; } }`;
            default: throw new Error(`Unexpected type ${this.type}`)
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

class ABlock {
	public code:string = '';
	public rblock:any = null;
	
	constructor(public index:number, public label:ANodeStmLabel|null = null, public jump:ANodeStmStaticJump|null = null) {
	}
	
	public add(node:ANodeStm) {
		this.code += node.toJs() + '\n';
	}
}


export class ANodeFunction extends ANodeStmList {
	constructor(public address:number, private prefix:ANodeStm, private sufix:ANodeStm, childs: ANodeStm[]) { super(childs); }
	
	toJs() {
		let block:ABlock = new ABlock(0, null);
		const blocksByLabel:NumberDictionary<ABlock> = {};
		const blocks = [block];
		for (let child of this.childs) {
			if (child instanceof ANodeStmLabel) {
				blocks.push(block = new ABlock(blocks.length, child, null));
				blocksByLabel[child.address] = block;
			} else if (child instanceof ANodeStmStaticJump) {
				blocks.push(block = new ABlock(blocks.length, null, child));
			} else {
				block.add(child);
			}
		}
		
        const text = relooperProcess(relooper => {
            //Relooper.setDebug(true);
            for (let block of blocks) block.rblock = relooper.addBlock(block.code);

            for (let n = 0; n < blocks.length; n++) {
                let block = blocks[n];
                let nblock = (n < blocks.length - 1) ? blocks[n + 1] : null;
                let jblock = block.jump ? blocksByLabel[block.jump.address] : null;
                if (nblock) relooper.addBranch(block.rblock, nblock.rblock);
                if (jblock) relooper.addBranch(block.rblock, jblock.rblock, block.jump!.cond.toJs(), block.jump!.branchCodeJs);
            }
        });

		//console.log(text);		

		return `${this.prefix.toJs()}\n${text}${this.sufix.toJs()}\n`;
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
	toJs() { return `var ${this.name} = ${this.initialValue.toJs()};`; }
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
				return right!.toJs();
			} else if (match.startsWith('$')) {
				return this.replacements[parseInt(match.substr(1))].toJs()!;
			} else {
			    return match
            }
		})
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
	toAssignJs(right: ANodeExpr) { return `${this.name} = ${right.toJs()}`; }
	toJs() { return this.name; }
}

export class ANodeExprI32 extends ANodeExpr {
	constructor(public value: number) { super(); }
	toJs() { return String(this.value); }
}

export class ANodeExprFloat extends ANodeExpr {
	constructor(public value: number) { super(); }
	toJs() {
        const rfloat = MathFloat.reinterpretFloatAsInt(this.value);
        if (rfloat & 0x80000000) {
			return `-${MathFloat.reinterpretIntAsFloat(rfloat & 0x7FFFFFFF)}`;
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
	toJs() { return `(${this.left.toJs()} ${this.op} ${this.right.toJs()})`; }
}

export class ANodeExprUnop extends ANodeExpr {
	constructor(public op: string, public right: ANodeExpr) { super(); }
	toJs() { return `(${this.op}(${this.right.toJs()}))`; }
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
	toJs() { return `[${this._items.map((item) => item.toJs()).join(', ')}]`; }
}

export class ANodeExprCall extends ANodeExpr {
	constructor(public name: string, public _arguments: ANodeExpr[]) {
		super();
		if (!_arguments) debugger;
		this._arguments.forEach(argument => {
			if (!argument || !(argument instanceof ANodeExpr)) debugger;
		});
	}
	toJs() { return `${this.name}(${this._arguments.map((argument) => argument.toJs()).join(', ')})`; }
}

export class ANodeStmIf extends ANodeStm {
	constructor(public cond: ANodeExpr, public codeTrue: ANodeStm, public codeFalse?: ANodeStm) { super(); }
	toJs() {
        let result = '';
        result += `if (${this.cond.toJs()})`;
		result += ` { ${this.codeTrue.toJs()} }`;
		if (this.codeFalse) result += ` else { ${this.codeFalse.toJs()} }`;
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
	func(address:number, prefix:ANodeStm, sufix:ANodeStm, stms: ANodeStm[]) { return new ANodeFunction(address, prefix, sufix, stms); }
	array(exprList: ANodeExpr[]) { return new ANodeExprArray(exprList); }
	arrayNumbers(values: number[]) { return this.array(values.map(value => this.imm_f(value))); }
	call(name: string, exprList: ANodeExpr[]) { return new ANodeExprCall(name, exprList); }
	label(address:number) { return new ANodeStmLabel(address); }
	//jump(label: ANodeStmLabel) { return new ANodeStmJump(label); }
	//djump(node: ANodeExpr) { return new ANodeStmDynamicJump(node); }
	sjump(cond:ANodeExpr, value: number, branchCode?:ANodeStm) { return new ANodeStmStaticJump(cond, value, branchCode); }
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
		if (CpuState.GPR_require_castToInt()) {
			return new ANodeExprLValueVar(CpuState.GPR_access('state', index));
		} else {
			// Fast access
			return new ANodeExprLValueVar(CpuState.GPR_access(null, index));
		}
	}

	gpr_f(index: number): ANodeExprLValueVar {
		if (index === 0) return new ANodeExprLValueVar('0');
		return new ANodeExprLValueVar(`gpr_f[${index}]`);
	}

	tempr(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar(`state.temp[${index}]`); }
	vector_vs(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar(`state.vector_vs[${index}]`); }
	vector_vt(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar(`state.vector_vt[${index}]`); }
	vfpr(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar(`state.vfpr[${index}]`); }
	vfprc(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar(`state.vfprc[${index}]`); }

	vfpr_i(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar(`state.vfpr_i[${index}]`); }
	fpr(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar(`state.fpr[${index}]`); }
	fpr_i(index: number): ANodeExprLValueVar { return new ANodeExprLValueVar(`state.fpr_i[${index}]`); }
	fcr31_cc() { return new ANodeExprLValueVar('state.fcr31_cc'); }
	lo() { return new ANodeExprLValueVar('state.LO'); }
	hi() { return new ANodeExprLValueVar('state.HI'); }
	ic() { return new ANodeExprLValueVar('state.IC'); }
	pc() { return new ANodeExprLValueVar('state.PC'); }
	VCC(index: number) {
		return new ANodeExprLValueSetGet('state.setVfrCc($0, #)', 'state.getVfrCc($0)', [this.imm32(index)]);
	}
	ra() { return new ANodeExprLValueVar(CpuState.GPR_access('state', 31)); }
	branchflag() { return new ANodeExprLValueVar('BRANCHFLAG'); }
	branchpc() { return new ANodeExprLValueVar('BRANCHPC'); }

	assignGpr(index: number, expr: ANodeStm) {
		if (index == 0) return this.stm();
		//return this.stm(this.assign(this.gpr(index), expr));
		if (CpuState.GPR_require_castToInt()) {
			return this.stm(this.assign(this.gpr(index), this.binop(expr, '|', this.imm32(0))));
		} else {
			return this.stm(this.assign(this.gpr(index), expr));
		}
	}

	assignIC(expr: ANodeStm) { return this.stm(this.assign(this.ic(), expr)); }
	assignFpr(index: number, expr: ANodeStm) { return this.stm(this.assign(this.fpr(index), expr)); }
	assignFpr_I(index: number, expr: ANodeStm) { return this.stm(this.assign(this.fpr_i(index), expr)); }
}
