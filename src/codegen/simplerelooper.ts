class RelooperBlock {
	public conditionalBranches:RelooperBranch[] = [];
	public nextBlock:RelooperBlock|null = null;
	public conditionalReferences:RelooperBlock[] = [];
	constructor(public index:number, public code:string) { }
}

class RelooperBranch {
	constructor(public to:RelooperBlock, public cond?:string, public onjumpCode?:string) {
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

export class SimpleRelooper {
	public blocks:RelooperBlock[] = [];
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
		const branch = new RelooperBranch(to, cond, onjumpcode);
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
