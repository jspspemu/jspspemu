import _state = require('./state');
import _IndentStringGenerator = require('../../util/IndentStringGenerator');
import ColorEnum = _state.ColorEnum;

export class VertexBuffer {
	offset = 0;
	vertices: _state.Vertex[] = [];

	constructor() {
	}

	reset() {
		this.offset = 0;
	}

	take(count: number) {
		var result = this.offset;
		this.offset += count;
		return result;
	}

	private triangleStripOffset = 0;

	startDegenerateTriangleStrip() {
		this.triangleStripOffset = this.ensureAndTake(2);
	}

	endDegenerateTriangleStrip() {
		var offset = this.triangleStripOffset;
		this.vertices[offset + 0].copyFrom(this.vertices[offset - 1]);
		this.vertices[offset + 1].copyFrom(this.vertices[offset + 2]);
	}

	ensure(count: number) {
		count += this.offset;
		while (this.vertices.length < count) this.vertices.push(new _state.Vertex());
	}

	ensureAndTake(count: number) {
		this.ensure(count);
		return this.take(count);
	}
}

export class VertexReaderFactory {
	private static cache: NumberDictionary<VertexReader> = {};

	static get(vertexState: _state.VertexState): VertexReader {
		var cacheId = vertexState.hash;
		var vertexReader = this.cache[cacheId];
		if (vertexReader === undefined) vertexReader = this.cache[cacheId] = new VertexReader(vertexState.clone());
		return vertexReader;
	}
}

export class VertexReader {
	private readOneFunc: (output: _state.Vertex, inputOffset: number, f32: Float32Array, s8: Int8Array, s16: Int16Array, s32: Int32Array) => void;
	private readOffset: number = 0;
	public readCode: string;

	constructor(public vertexState: _state.VertexState) {
		this.readCode = this.createJs();
		this.readOneFunc = <any>(new Function('output', 'inputOffset', 'f32', 's8', 's16', 's32', this.readCode));
	}

	private oneOuput = [new _state.Vertex()];
	private oneIndices = [0];
	readOne(input: DataView, index: number) {
		this.oneIndices[0] = index;
		this.oneOuput[0] = new _state.Vertex();
		this.readCount(this.oneOuput, 0, input, this.oneIndices, 1, true);
		return this.oneOuput[0];
	}

	input2 = new Uint8Array(1 * 1024 * 1024);
	s8 = new Int8Array(this.input2.buffer);
	s16 = new Int16Array(this.input2.buffer);
	s32 = new Int32Array(this.input2.buffer);
	f32 = new Float32Array(this.input2.buffer);
	readCount(output: _state.Vertex[], verticesOffset: number, input: DataView, indices: number[], count: number, hasIndex: boolean) {
		if (hasIndex) {
			var maxDatacount = 0;
			for (var n = 0; n < count; n++) maxDatacount = Math.max(maxDatacount, indices[n] + 1);
		} else {
			maxDatacount = count;
		}
		maxDatacount *= this.vertexState.size;

		this.input2.set(new Uint8Array(input.buffer, input.byteOffset, maxDatacount));

		if (hasIndex) {
			for (var n = 0; n < count; n++) {
				var index = indices[n];
				this.readOneFunc(output[verticesOffset + n], index * this.vertexState.size, this.f32, this.s8, this.s16, this.s32);
			}
		} else {
			var inputOffset = 0;
			for (var n = 0; n < count; n++) {
				this.readOneFunc(output[verticesOffset + n], inputOffset, this.f32, this.s8, this.s16, this.s32);
				inputOffset += this.vertexState.size;
			}
		}
	}

	private createJs() {
		var indentStringGenerator = new _IndentStringGenerator();

		this.readOffset = 0;

		this.createNumberJs(indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.vertexState.realWeightCount), this.vertexState.weight, !this.vertexState.transform2D);
		this.createNumberJs(indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.vertexState.textureComponentCount), this.vertexState.texture, !this.vertexState.transform2D);
		this.createColorJs(indentStringGenerator, this.vertexState.color);
		this.createNumberJs(indentStringGenerator, ['nx', 'ny', 'nz'], this.vertexState.normal, !this.vertexState.transform2D);
		this.createNumberJs(indentStringGenerator, ['px', 'py', 'pz'], this.vertexState.position, !this.vertexState.transform2D);
		//if (this.vertexState.hasWeight) indentStringGenerator.write("debugger;\n");

		return indentStringGenerator.output;
	}

	private readInt8() { return '(s8[inputOffset + ' + this.getOffsetAlignAndIncrement(1) + '])'; }
	private readInt16() { return '(s16[(inputOffset + ' + this.getOffsetAlignAndIncrement(2) + ') >> 1])'; }
	private readInt32() { return '(s32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])'; }
	private readFloat32() { return '(f32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])'; }

	private readUInt8() { return '((' + this.readInt8() + ' & 0xFF) >>> 0)'; }
	private readUInt16() { return '((' + this.readInt16() + ' & 0xFFFF) >>> 0)'; }
	private readUInt32() { return '((' + this.readInt16() + ' & 0xFFFFFFFF) >>> 0)'; }

	private createColorJs(indentStringGenerator: _IndentStringGenerator, type: ColorEnum) {
		if (type == ColorEnum.Void) return;

		switch (type) {
			case ColorEnum.Color8888:
				this.align(4);
				indentStringGenerator.write('output.r = ((' + this.readUInt8() + ') / 255.0);\n');
				indentStringGenerator.write('output.g = ((' + this.readUInt8() + ') / 255.0);\n');
				indentStringGenerator.write('output.b = ((' + this.readUInt8() + ') / 255.0);\n');
				indentStringGenerator.write('output.a = ((' + this.readUInt8() + ') / 255.0);\n');
				break;
			case ColorEnum.Color5551:
				this.align(2);
				indentStringGenerator.write('var temp = (' + this.readUInt16() + ');\n');
				indentStringGenerator.write('output.r = BitUtils.extractScale1f(temp, 0, 5);\n');
				indentStringGenerator.write('output.g = BitUtils.extractScale1f(temp, 5, 5);\n');
				indentStringGenerator.write('output.b = BitUtils.extractScale1f(temp, 10, 5);\n');
				indentStringGenerator.write('output.a = BitUtils.extractScale1f(temp, 15, 1);\n');
				break;
			case ColorEnum.Color4444:
				this.align(2);
				indentStringGenerator.write('var temp = (' + this.readUInt16() + ');\n');
				indentStringGenerator.write('output.r = BitUtils.extractScale1f(temp, 0, 4);\n');
				indentStringGenerator.write('output.g = BitUtils.extractScale1f(temp, 4, 4);\n');
				indentStringGenerator.write('output.b = BitUtils.extractScale1f(temp, 8, 4);\n');
				indentStringGenerator.write('output.a = BitUtils.extractScale1f(temp, 12, 4);\n');
				break;
			case ColorEnum.Color5650:
				this.align(2);
				indentStringGenerator.write('var temp = (' + this.readUInt16() + ');\n');
				indentStringGenerator.write('output.r = BitUtils.extractScale1f(temp, 0, 5);\n');
				indentStringGenerator.write('output.g = BitUtils.extractScale1f(temp, 5, 6);\n');
				indentStringGenerator.write('output.b = BitUtils.extractScale1f(temp, 11, 5);\n');
				indentStringGenerator.write('output.a = 1.0;\n');
				break;
			default:
				throw (new Error("Not implemented color format '" + type + "'"));
		}
	}

	private align(count: number) {
		this.readOffset = MathUtils.nextAligned(this.readOffset, count);
	}

	private getOffsetAlignAndIncrement(size: number) {
		this.align(size);
		var offset = this.readOffset;
		this.readOffset += size;
		return offset;
	}

	private createNumberJs(indentStringGenerator: _IndentStringGenerator, components: string[], type: _state.NumericEnum, normalize: boolean) {
		if (type == _state.NumericEnum.Void) return;

		components.forEach((component) => {
			switch (type) {
				case _state.NumericEnum.Byte:
					indentStringGenerator.write('output.' + component + ' = ' + this.readInt8());
					if (normalize) indentStringGenerator.write(' / 127.0');
					//if (normalize) indentStringGenerator.write(' / 128.0');
					break;
				case _state.NumericEnum.Short:
					indentStringGenerator.write('output.' + component + ' = ' + this.readInt16());
					if (normalize) indentStringGenerator.write(' / 32767.0');
					//if (normalize) indentStringGenerator.write(' / 32768.0');
					break;
				case _state.NumericEnum.Float:
					indentStringGenerator.write('output.' + component + ' = ' + this.readFloat32());
					break;
			}
			indentStringGenerator.write(';\n');
		});
	}
}
