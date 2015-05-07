///<reference path="../../global.d.ts" />

import _state = require('./state');
import _IndentStringGenerator = require('../../util/IndentStringGenerator');
import ColorEnum = _state.ColorEnum;

export class VertexBuffer {
	offsetLength = 0;
	vertices: _state.Vertex[] = [];

	constructor() {
	}

	reset() {
		this.offsetLength = 0;
	}

	take(count: number) {
		var result = this.offsetLength;
		this.offsetLength += count;
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
		count += this.offsetLength;
		while (this.vertices.length < count) this.vertices.push(new _state.Vertex());
	}

	ensureAndTake(count: number) {
		this.ensure(count);
		return this.take(count);
	}
}

export class VertexReaderFactory {
	private static cache: NumberDictionary<VertexReader> = {};

	static get(vertexInfo: _state.VertexInfo): VertexReader {
		var cacheId = vertexInfo.hash;
		var vertexReader = this.cache[cacheId];
		if (vertexReader === undefined) vertexReader = this.cache[cacheId] = new VertexReader(vertexInfo.clone());
		return vertexReader;
	}
}

export class VertexReader {
	private readOneFunc: (output: _state.Vertex, inputOffset: number, f32: Float32Array, s8: Int8Array, s16: Int16Array, s32: Int32Array) => void;
	private readSeveralIndex8Func: (output: _state.Vertex[], f32: Float32Array, s8: Int8Array, s16: Int16Array, s32: Int32Array, count: number, verticesOffset:number, indices: Uint8Array) => void;
	private readSeveralIndex16Func: (output: _state.Vertex[], f32: Float32Array, s8: Int8Array, s16: Int16Array, s32: Int32Array, count: number, verticesOffset:number, indices: Uint16Array) => void;
	private readSeveralFunc: (output: _state.Vertex[], f32: Float32Array, s8: Int8Array, s16: Int16Array, s32: Int32Array, count: number, verticesOffset:number) => void;
	private readOffset: number = 0;
	public readCode: string;

	constructor(public vertexInfo: _state.VertexInfo) {
		this.readCode = this.createJs();
		this.readOneFunc = <any>(new Function('output', 'inputOffset', 'f32', 's8', 's16', 's32', '"use strict";' + this.readCode));
		this.readSeveralIndex8Func = <any>(new Function('outputs', 'f32', 's8', 's16', 's32', 'count', 'verticesOffset', 'indices', `
			"use strict";
			for (var n = 0; n < count; n++) {
				var index = indices[n];
				var output = outputs[verticesOffset + n];
				var inputOffset = index * ${vertexInfo.size};
				${this.readCode}
			}
		`));
		this.readSeveralIndex16Func = <any>(new Function('outputs', 'f32', 's8', 's16', 's32', 'count', 'verticesOffset', 'indices', `
			"use strict";
			for (var n = 0; n < count; n++) {
				var index = indices[n];
				var output = outputs[verticesOffset + n];
				var inputOffset = index * ${vertexInfo.size};
				${this.readCode}
			}
		`));
		this.readSeveralFunc = <any>(new Function('outputs', 'f32', 's8', 's16', 's32', 'count', 'verticesOffset', `
			var inputOffset = 0;
			for (var n = 0; n < count; n++) {
				var output = outputs[verticesOffset + n];
				${this.readCode}
				inputOffset += this.vertexInfo.size;
			}
		`));
	}

	private oneOuput = [new _state.Vertex()];
	private oneIndices = new Uint8Array([0]);
	readOne(input8: Uint8Array, input16: Uint8Array, index: number) {
		this.oneIndices[0] = index;
		this.oneOuput[0] = new _state.Vertex();
		this.readCount(this.oneOuput, 0, input8, 0, this.oneIndices, null, 1, true);
		return this.oneOuput[0];
	}

	input2 = new Uint8Array(1 * 1024 * 1024);
	s8 = new Int8Array(this.input2.buffer);
	s16 = new Int16Array(this.input2.buffer);
	s32 = new Int32Array(this.input2.buffer);
	f32 = new Float32Array(this.input2.buffer);
	readCount(output: _state.Vertex[], verticesOffset: number, input: Uint8Array, inputOffset: number, indices8: Uint8Array, indices16: Uint16Array, count: number, hasIndex: boolean) {
		if (hasIndex) {
			var maxDatacount = 0;
			// http://jsperf.com/test-max-value-in-a-typed-array
			if (indices8) for (var n = 0; n < count; n++) maxDatacount = Math.max(maxDatacount, indices8[n] + 1);
			if (indices16) for (var n = 0; n < count; n++) maxDatacount = Math.max(maxDatacount, indices16[n] + 1);
		} else {
			maxDatacount = count;
		}
		maxDatacount *= this.vertexInfo.size;

		this.s8.subarray(0, maxDatacount).set(input.subarray(inputOffset, inputOffset + maxDatacount));

		if (hasIndex) {
			if (indices8) {
				this.readSeveralIndex8Func(output, this.f32, this.s8, this.s16, this.s32, count, verticesOffset, indices8);
			} else {
				this.readSeveralIndex16Func(output, this.f32, this.s8, this.s16, this.s32, count, verticesOffset, indices16);
			}
		} else {
			this.readSeveralFunc(output, this.f32, this.s8, this.s16, this.s32, count, verticesOffset);
		}
	}

	private createJs() {
		var indentStringGenerator = new _IndentStringGenerator();

		this.readOffset = 0;

		var normalize = !this.vertexInfo.transform2D;
		this.createNumberJs([1, 1, 1, 1], true, indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.vertexInfo.realWeightCount), this.vertexInfo.weight, normalize);
		this.createNumberJs([1, 1, 1, 1], false, indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.vertexInfo.textureComponentsCount), this.vertexInfo.texture, normalize);
		this.createColorJs(indentStringGenerator, this.vertexInfo.color);
		this.createNumberJs([1, 1, 1, 1], true, indentStringGenerator, ['nx', 'ny', 'nz'], this.vertexInfo.normal, normalize);
		this.createNumberJs([1, 1, 1, 1], true, indentStringGenerator, ['px', 'py', 'pz'], this.vertexInfo.position, normalize);
		/*
		this.createNumberJs([1, 0x80, 0x8000, 1], true, indentStringGenerator, ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'].slice(0, this.vertexInfo.realWeightCount), this.vertexInfo.weight, normalize);
		this.createNumberJs([1, 0x80, 0x8000, 1], false, indentStringGenerator, ['tx', 'ty', 'tx'].slice(0, this.vertexInfo.textureComponentCount), this.vertexInfo.texture, normalize);
		this.createColorJs(indentStringGenerator, this.vertexInfo.color);
		this.createNumberJs([1, 0x7F, 0x7FFF, 1], true, indentStringGenerator, ['nx', 'ny', 'nz'], this.vertexInfo.normal, normalize);
		this.createNumberJs([1, 0x7F, 0x7FFF, 1], true, indentStringGenerator, ['px', 'py', 'pz'], this.vertexInfo.position, normalize);
		*/
		//if (this.vertexInfo.hasWeight) indentStringGenerator.write("debugger;\n");

		return indentStringGenerator.output;
	}

	private readInt8() { return '(s8[inputOffset + ' + this.getOffsetAlignAndIncrement(1) + '])'; }
	private readInt16() { return '(s16[(inputOffset + ' + this.getOffsetAlignAndIncrement(2) + ') >> 1])'; }
	private readInt32() { return '(s32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])'; }
	private readFloat32() { return '(f32[(inputOffset + ' + this.getOffsetAlignAndIncrement(4) + ') >> 2])'; }

	private readUInt8() { return '((' + this.readInt8() + ' & 0xFF) >>> 0)'; }
	private readUInt16() { return '((' + this.readInt16() + ' & 0xFFFF) >>> 0)'; }
	private readUInt32() { return '((' + this.readInt32() + ' & 0xFFFFFFFF) >>> 0)'; }

	private createColorJs(indentStringGenerator: _IndentStringGenerator, type: ColorEnum) {
		if (type == ColorEnum.Void) return;

		var alignment = 4;
		var sizes = [8, 8, 8, 8];
		var components = ['r', 'g', 'b', 'a'];

		switch (type) {
			case ColorEnum.Color8888: alignment = 4; sizes = [8, 8, 8, 8]; break;
			case ColorEnum.Color5551: alignment = 2; sizes = [5, 5, 5, 1]; break;
			case ColorEnum.Color4444: alignment = 2; sizes = [4, 4, 4, 4]; break;
			case ColorEnum.Color5650: alignment = 2; sizes = [5, 6, 5, 0]; break;
			default: throw (new Error("Not implemented color format '" + type + "'"));
		}

		this.align(alignment);
		indentStringGenerator.write('var temp = (' + ((alignment == 2) ? this.readUInt16() : this.readUInt32()) + ');\n');
		var offset = 0;
		for (var n = 0; n < 4; n++) {
			var size = sizes[n], component = components[n];
			indentStringGenerator.write('output.' + component + ' = ');
			indentStringGenerator.write((size != 0) ? ('Math.fround(((temp >> ' + offset + ') & ' + BitUtils.mask(size) + ') / ' + BitUtils.mask(size) + ');') : 'Math.fround(1.0)');
			indentStringGenerator.write('\n');
			offset += size;
		}
		//indentStringGenerator.write('debugger;\n');
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

	private createNumberJs(scales: number[], signed:boolean, indentStringGenerator: _IndentStringGenerator, components: string[], type: _state.NumericEnum, normalize: boolean) {
		if (type == _state.NumericEnum.Void) return;

		components.forEach((component) => {
			switch (type) {
				case _state.NumericEnum.Byte: indentStringGenerator.write('output.' + component + ' = Math.fround(' + (signed ? this.readInt8() : this.readUInt8())); break;
				case _state.NumericEnum.Short: indentStringGenerator.write('output.' + component + ' = Math.fround(' + (signed ? this.readInt16() : this.readUInt16())); break;
				case _state.NumericEnum.Float: indentStringGenerator.write('output.' + component + ' = Math.fround(' + (this.readFloat32())); break;
			}
			if (normalize && (scales[type] != 1)) indentStringGenerator.write(' * ' + (1 / scales[type]));
			indentStringGenerator.write(');\n');
		});
	}
}

export class OptimizedDrawBuffer {
	data = new Uint8Array(512 * 1024);
	data32 = new Uint32Array(this.data.buffer);
	dataOffset = 0;
	indices = new Uint16Array(64 * 1024);
	indexOffset = 0;
	vertexIndex = 0;
	primType:_state.PrimitiveType;
	vertexInfo:_state.VertexInfo;
	
	reset() {
		this.dataOffset = 0;
		this.indexOffset = 0;
		this.vertexIndex = 0;
	}
	
	addDataWithIndices8(vertices:Uint8Array, vertexSize:number, indices:Uint8Array) {
		//for (var n = 0; n < )
	}

	addVertices(vertices:Uint8Array, inputOffset:number, vertexCount:number, verticesSize:number) {
		this.addVerticesData(vertices, inputOffset, verticesSize);
		this.addVerticesIndices(vertexCount);
	}

	addVerticesData(vertices:Uint8Array, inputOffset:number, verticesSize:number) {
		ArrayBufferUtils.copy(vertices, inputOffset, this.data, this.dataOffset, verticesSize);
		this.dataOffset += verticesSize;
	}

	addVerticesIndices(vertexCount:number) {
		for (var n = 0; n < vertexCount; n++) this.indices[this.indexOffset++] = this.vertexIndex++;
	}
	
	join(vertexSize:number) {
		this.indices[this.indexOffset++] = this.vertexIndex - 1;
		this.indices[this.indexOffset++] = this.vertexIndex;
	}

	/*
	startDegenerateTriangleStrip() {
		this.triangleStripOffset = this.ensureAndTake(2);
	}

	endDegenerateTriangleStrip() {
		var offset = this.triangleStripOffset;
		this.vertices[offset + 0].copyFrom(this.vertices[offset - 1]);
		this.vertices[offset + 1].copyFrom(this.vertices[offset + 2]);
	}
	*/

}
