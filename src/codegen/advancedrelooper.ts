// http://en.wikipedia.org/wiki/Basic_block
class SimpleBlockReference {
	// Must be created just one for SimpleBlock
	constructor(public block:SimpleBlock) { }
}

class SimpleBlock {
	public selfref:SimpleBlockReference;
	public selfrefs:SimpleBlockReference[] = [];
	public conditionalBranches:RelooperBranch[] = [];
	public next:SimpleBlockReference|null = null;
	public unconditionalReferences:SimpleBlockReference[] = [];
	public conditionalReferences:SimpleBlockReference[] = [];
	
	get hasConditionalBranches() { return this.conditionalBranches.length  >0; }
	hasJustThisUnconditionalReference(block:SimpleBlock) {
		if (this.conditionalReferences.length > 0) return false;
		if (this.unconditionalReferences.length != 1) return false;
		return this.unconditionalReferences[0].block == block;
	}
	
	constructor(public code:string, public index: number = -1) {
		this.selfref = new SimpleBlockReference(this);
		this.selfrefs.push(this.selfref);
	}
	
	replaceWith(other:SimpleBlock) {
		for (let sr of this.selfrefs) this.selfref.block = other;
		other.selfrefs = other.selfrefs.concat(other.selfrefs, this.selfrefs);
	}
	
	static combine(a:SimpleBlock, b:SimpleBlock) {
        const that = new SimpleBlock(a.code + b.code);
        that.conditionalBranches
		return that;
	}
}

class RelooperBranch {
	constructor(public to:SimpleBlockReference, public cond?:string, public onjumpCode?:string) {
	}
}

// block doesn't have conditional branches
// block next node just have a single unconditional reference, the block
function tryCombineBlockWithNext(block:SimpleBlock) {
	let next = block.next!.block;
	if (next && !block.hasConditionalBranches && next.hasJustThisUnconditionalReference(block)) {
        const created = SimpleBlock.combine(block, next);
        block.replaceWith(created);
		next.replaceWith(created);
		return created;
	} else {
		return block;
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
		const parts = chunk.split('\n').join();
		const jumpIndex = chunk.indexOf('\n');
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

export class SimpleRelooper {
	private lastId:number = 0;
	private first:SimpleBlock|null = null;
	private blocks:any[]
	
	static process(callback: (sr:SimpleRelooper) => void):string {
        const sr = new SimpleRelooper();
		sr.init();
		try {
			callback(sr);
			return sr.render(sr.first!);
		} finally {
			sr.cleanup();
		}
	}
	
	private init() {
		this.lastId = 0;
	}
	
	private cleanup() {
	}
	
	addBlock(code:string):SimpleBlock {
        const block = new SimpleBlock(code, this.lastId++);
        if (this.first == null) this.first = block;
		return block;
	}
	
	addBranch(from:SimpleBlock, to:SimpleBlock, cond?:string, onjumpcode?:string):void {
        const branch = new RelooperBranch(to.selfref, cond, onjumpcode);
        if (cond) {
			from.conditionalBranches.push(branch);
			to.conditionalReferences.push(from.selfref);
		} else {
			from.next = to.selfref;
		}
	}
	
	private render(first:SimpleBlock):string {
        const writer = new IndentWriter();

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
		
		return writer.output;
	}
}
