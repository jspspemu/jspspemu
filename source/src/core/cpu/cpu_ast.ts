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
	constructor(public cond: ANodeExpr, public address: number, public branchCode: ANodeStm) { super(); }
	
	get branchCodeJs() { return this.branchCode ? this.branchCode.toJs() : ''; }

	toJs() {
		switch (this.type) {
			case 'normal': return `if (${this.cond.toJs()}) { ${this.branchCodeJs}; loop_state = ${addressToHex(this.address)}; continue loop; }`;
			case 'while': return `if (${this.cond.toJs()}) { ${this.branchCodeJs}; continue loop_${addressToHex(this.address)}; } else { break loop_${addressToHex(this.address)}; } }`;
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


declare class Relooper {
	static init():void;
	static cleanup():void;
	static addBlock(text:string, branchVar?:string):number;
	static setBlockCode(block:number, text:string):void;
	static addBranch(from:number, to:number, condition?:string, code?:string):void;
	static render(entry:number):string;
	static setDebug(debug:boolean):void;
	static setAsmJSMode(on:boolean):void;
}

class ABlock {
	public code:string = '';
	public rblock:any = null;
	
	constructor(public index:number, public label:ANodeStmLabel = null, public jump:ANodeStmStaticJump = null) {
	}
	
	public add(node:ANodeStm) {
		this.code += node.toJs() + '\n';
	}
}

/*
class FullRelooper {
	init() {
		Relooper.init();
	}
	cleanup() {
		Relooper.cleanup();
	}
	addBlock(code:string) {
		return new RelooperBlock(Relooper.addBlock(code), code);
	}
	addBranch(from:RelooperBlock, to:RelooperBlock, cond:string = undefined) {
		Relooper.addBranch(from.index, to.index, cond);
	}
	render(first:RelooperBlock) {
		return Relooper.render(first.index);
	}
}
*/

class RelooperBlock {
	public conditionalBranches:RelooperBranch[] = [];
	public nextBlock:RelooperBlock = null;
	public conditionalReferences:RelooperBlock[] = [];
	constructor(public index:number, public code:string) { }
}

class RelooperBranch {
	constructor(public to:RelooperBlock, public cond:string, public onjumpCode:string) {
	}
}

class IndentWriter {
	public i:string = '';
	public startline:boolean = true;
	public chunks:string[] = [];
	
	write(chunk:string) {
		this.chunks.push(chunk);
		/*
		if (chunk == '') return;
		console.log(chunk);
		if (this.startline) {
			this.chunks.push(this.i);
			this.startline = false;
		}
		var parts = chunk.split('\n').join();
		var jumpIndex = chunk.indexOf('\n');
		if (jumpIndex >= 0) {
			this.chunks.push(chunk.substr(0, jumpIndex));
			this.chunks.push('\n');
			this.startline = true;
			this.write(chunk.substr(jumpIndex + 1));
		} else {
			this.chunks.push(chunk);
		}
		*/
	}
	indent() { this.i += '\t'; }
	unindent() { this.i = this.i.substr(0, -1); }
	get output() { return this.chunks.join(''); }
}

class SimpleRelooper {
	private blocks:RelooperBlock[] = [];
	private lastId:number = 0;
	init() {
		this.lastId = 0;
	}
	cleanup() {
	}
	addBlock(code:string) {
		var block = new RelooperBlock(this.lastId++, code);
		this.blocks.push(block);
		return block;
	}
	addBranch(from:RelooperBlock, to:RelooperBlock, cond?:string, onjumpcode?:string) {
		var branch = new RelooperBranch(to, cond, onjumpcode);
		if (cond) {
			from.conditionalBranches.push(branch);
			to.conditionalReferences.push(from);
		} else {
			from.nextBlock = to;
		}
	}
	
	render(first:RelooperBlock) {
		var writer = new IndentWriter();
		
		if (this.blocks.length <= 1) {
			if (this.blocks.length == 1) writer.write(this.blocks[0].code);
		} else {
			writer.write('label = 0; loop_label: while (true) switch (label) { case 0:\n');
			writer.indent();
			for (let block of this.blocks) {
				let nblock = this.blocks[block.index + 1];
				
				if (block.index != 0) {
					writer.write('case ' + block.index + ':\n');
					writer.indent();
				}
				
				if ((block.conditionalBranches.length == 0) && (block.conditionalReferences.length == 1) && (block.conditionalReferences[0] == nblock)) {
					let branch = nblock.conditionalBranches[0];
					writer.write(`while (true) {\n`);
					writer.indent();
					writer.write(block.code);
					writer.write(`if (!(${branch.cond})) break;\n`);
					writer.write(`${branch.onjumpCode};\n`);
					writer.unindent();
					writer.write(`}\n`);
					writer.write(nblock.code);
				} else {		
					for (let branch of block.conditionalBranches) {
						writer.write(`if (${branch.cond}) { ${branch.onjumpCode}; label = ${branch.to.index}; continue loop_label; }\n`);
					}
		
					writer.write(block.code);
				}
				
				if (block.nextBlock) {
					if (block.nextBlock != nblock) {
						writer.write(`label = ${block.nextBlock.index}; continue loop_label;\n`);
					}
				} else {
					writer.write('break loop_label;\n');
				}
				if (block.index != 0) writer.unindent();
			}
			writer.unindent();
			writer.write('}');
		}
		
		
		return writer.output;
	}
}

export class ANodeFunction extends ANodeStmList {
	constructor(public address:number, private prefix:ANodeStm, private sufix:ANodeStm, childs: ANodeStm[]) { super(childs); }
	
	toJs() {
		var block:ABlock = new ABlock(0, null);
		var blocksByLabel:NumberDictionary<ABlock> = {};
		var blocks = [block];
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
		
		var text:string = null;

		if (text === null) {
			var relooper = new SimpleRelooper();

			//Relooper.setDebug(true);
			for (let block of blocks) block.rblock = relooper.addBlock(block.code);
			
			for (let n = 0; n < blocks.length; n++) {
				let block = blocks[n];
				let nblock = (n < blocks.length - 1) ? blocks[n + 1] : null;
				let jblock = block.jump ? blocksByLabel[block.jump.address] : null;
				if (nblock) relooper.addBranch(block.rblock, nblock.rblock);
				if (jblock) relooper.addBranch(block.rblock, jblock.rblock, block.jump.cond.toJs(), block.jump.branchCodeJs);
			}
			text = relooper.render(blocks[0].rblock);
			relooper.cleanup();
		}

		//console.log(text);		

		return this.prefix.toJs() + '\n' + text + this.sufix.toJs() + '\n';
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
