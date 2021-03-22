export class IndentStringGenerator {
	indentation: number = 0;
	output: string = '';
	newLine: boolean = true;

	indent(callback: () => void) {
		this.indentation++;
		try {
			callback();
		} finally {
			this.indentation--;
		}
	}

	write(text: string) {
        const chunks = text.split('\n');
        for (let n = 0; n < chunks.length; n++) {
			if (n != 0) this.writeBreakLine();
			this.writeInline(chunks[n]);
		}
	}

	private writeInline(text: string) {
		if (text == null || text.length == 0) return;

		if (this.newLine) {
			for (let n = 0; n < this.indentation; n++) this.output += '\t';
			this.newLine = false;
		}
		this.output += text;
	}

	private writeBreakLine() {
		this.output += '\n';
		this.newLine = true;
	}
}
