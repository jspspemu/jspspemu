///<reference path="../../global.d.ts" />

import _state = require('./gpu_state');
import _memory = require('../memory');
import _IndentStringGenerator = require('../../util/IndentStringGenerator');
import ColorEnum = _state.ColorEnum;

var memory = _memory.getInstance();

export class VertexBuffer {
	private batchOffsetLength = 0;
	private offsetLength = 0;
	vertices: _state.Vertex[] = [];
	private triangleStripOffset = 0;

	constructor() {
	}
	
	get hasElements() {
		return this.offsetLength > this.batchOffsetLength;
	}

	reset() {
		this.offsetLength = 0;
		this.batchOffsetLength = 0;
	}

	take(count: number) {
		var result = this.offsetLength;
		this.offsetLength += count;
		return result;
	}

	createBatch(state: _state.GpuState, primType:_state.PrimitiveType, vertexInfo:_state.VertexInfo) {
		var batch = new UnoptimizedBatch(
			state, primType,
			this.vertices.slice(this.batchOffsetLength, this.offsetLength),
			vertexInfo
		);
		this.batchOffsetLength = this.offsetLength;
		return batch;
	}

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

	private readInt8() { return '(s8[(inputOffset + ' + this.getOffsetAlignAndIncrement(1) + ') >> 0])'; }
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

const enum SpriteVID {
	TL = 0,
	BR = 1,
	TR = 2,
	BL = 3,
}

// 0 - 2
// | X |
// 3 - 1

type SpriteExpanderFunc = (input:Uint8Array, output:Uint8Array, count:number) => void;

class SpriteExpander {
	static cache = new Map<number, SpriteExpanderFunc>();
	
	static forVertexInfo(vi:_state.VertexInfo):SpriteExpanderFunc {
		var hash = vi.hash;
		if (!this.cache.has(hash)) {
			this.cache.set(hash, <SpriteExpanderFunc>new Function('input', 'output', 'count', this.readAllCode(vi)));
		}
		return this.cache.get(hash);
	}
	
	static readAllCode(vi:_state.VertexInfo) {
		var code = `"use strict";`;

		code += `var i8  = new Uint8Array(input.buffer, input.byteOffset);\n`;
		//code += `var i16 = new Uint16Array(input.buffer, input.byteOffset);\n`;
		//code += `var i32 = new Uint32Array(input.buffer, input.byteOffset);\n`;
		code += `var o8  = new Uint8Array(output.buffer, output.byteOffset);\n`;
		if (vi.align >= 2) {
			code += `var o16 = new Uint16Array(output.buffer, output.byteOffset);\n`;
			if (vi.align >= 4) {
				code += `var o32 = new Uint32Array(output.buffer, output.byteOffset);\n`;
			}
		}
		code += `var i = 0, o = 0;\n`;
		code += `for (var n = 0; n < count; n++) {\n`;
		code += this.readOneCode(vi);
		code += `}\n`;
		return code;
	}
	
	private static readOneCode(vi:_state.VertexInfo) {
		var code = '';
		var vsize = vi.size;
		
		var CONVV = [null, 'o8', 'o16', 'o32'];
		var CONVS = [0, 0, 1, 2];
		
		var COLV = [null, null, null, null, 'o16', 'o16', 'o16', 'o32']; // ColorEnum
		var COLS = [0, 0, 0, 0, 1, 1, 1, 2];
		
		function _get(vid:SpriteVID, type:_state.NumericEnum, offset:number, component:number) {
			return `${CONVV[type]}[((o + ${offset + vsize * +vid}) >> ${CONVS[type]}) + ${component}]`;
		}

		function getColor(vid:SpriteVID) { return `${COLV[vi.color]}[((o + ${vi.colorOffset + vsize * +vid}) >> ${COLS[vi.color]})]`; }
		function getP_(vid:SpriteVID, n:number) { return _get(vid, vi.position, vi.positionOffset, n); }
		function getN_(vid:SpriteVID, n:number) { return _get(vid, vi.normal, vi.normalOffset, n); }
		function getT_(vid:SpriteVID, n:number) { return _get(vid, vi.texture, vi.textureOffset, n); }

		function copy_(vidTo:SpriteVID, vidFrom:SpriteVID, n:number) {
			var out:string[] = [];
			if (vi.hasPosition) out.push(`${getP_(vidTo, n)} = ${getP_(vidFrom, n)};`);
			if (vi.hasNormal) out.push(`${getN_(vidTo, n)} = ${getN_(vidFrom, n)};`);
			if (vi.hasTexture) out.push(`${getT_(vidTo, n)} = ${getT_(vidFrom, n)};`);
			return out.join('\n');
		}
		
		function copyX(vidTo:SpriteVID, vidFrom:SpriteVID) { return copy_(vidTo, vidFrom, 0); }
		function copyY(vidTo:SpriteVID, vidFrom:SpriteVID) { return copy_(vidTo, vidFrom, 1); }
		function copyColor(vidTo:SpriteVID, vidFrom:SpriteVID) { return vi.hasColor ? `${getColor(vidTo)} = ${getColor(vidFrom)};\n` : ''; }
		
		/*if ((vsize % 4) == 0) {
			for (var n = 0; n < (vsize / 4) * 2; n++) {
				code += `o32[(o >> 2) + ${n + vsize * 0}] = i32[(i >> 2) + ${n + (vsize * 0) / 4}];\n`;
				code += `o32[(o >> 2) + ${n + vsize * 2}] = i32[(i >> 2) + ${n + (vsize * 1) / 4}];\n`;
			}
		} else if ((vsize % 2) == 0) {
			for (var n = 0; n < (vsize / 2) * 2; n++) {
				code += `o16[(o >> 1) + ${n + vsize * 0}] = i16[(i >> 1) + ${n + (vsize * 0) / 2}];\n`;
				code += `o16[(o >> 1) + ${n + vsize * 2}] = i16[(i >> 1) + ${n + (vsize * 1) / 2}];\n`;
			}
		} else {
		}*/
		/*
		*/
		for (var n = 0; n < vsize * 2; n++) {
			code += `o8[o + ${n + vsize * 0}] = i8[i + ${n + (vsize * 0)}];\n`;
			code += `o8[o + ${n + vsize * 2}] = i8[i + ${n + (vsize * 1)}];\n`;
		}
		//code += `o8.subarray(o + ${vsize * 0}, o + ${vsize * 2}).set(i8.subarray(i, i + ${vsize * 2}));\n`;
		//code += `o8.subarray(o + ${vsize * 2}, o + ${vsize * 4}).set(i8.subarray(i, i + ${vsize * 2}));\n`;
	
		var TL = SpriteVID.TL;
		var BR = SpriteVID.BR;

		code += copyX(SpriteVID.TR, BR);
		code += copyY(SpriteVID.TR, TL);
		code += copyX(SpriteVID.BL, TL);
		code += copyY(SpriteVID.BL, BR);	
		code += copyColor(SpriteVID.TL, BR);
		code += copyColor(SpriteVID.TR, BR);
		code += copyColor(SpriteVID.BL, BR);
		
		code += `i += ${vsize * 2};\n`;
		code += `o += ${vsize * 4};\n`;
		return code;
		//vertexInfo.size
	}
}

export class OptimizedDrawBuffer {
	data = new Uint8Array(2 * 1024 * 1024);
	private dataOffset = 0;
	indices = new Uint16Array(512 * 1024);
	private indexOffset = 0;
	private vertexIndex = 0;
	private batchDataOffset: number = 0;
	private batchIndexOffset: number = 0;
	
	reset() {
		this.dataOffset = 0;
		this.indexOffset = 0;
		this.vertexIndex = 0;
		this.batchDataOffset = 0;
		this.batchIndexOffset = 0;
	}
	
	getData() { return this.data.subarray(0, this.dataOffset); }
	getIndices() { return this.indices.subarray(0, this.indexOffset); }
	
	get hasElements() {
		return this.dataOffset > this.batchDataOffset;
	}
	
	createBatch(state: _state.GpuState, primType:_state.PrimitiveType, vertexInfo:_state.VertexInfo) {
		var data = new OptimizedBatch(
			state, this, primType, vertexInfo,
			this.batchDataOffset, this.dataOffset,
			this.batchIndexOffset, this.indexOffset
		);
		this.dataOffset = this.batchDataOffset = (this.dataOffset + 15) & ~0xF;
		this.batchIndexOffset = this.indexOffset;
		this.vertexIndex = 0;
		return data;
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

	addVerticesIndicesSprite(vertexCount:number) {
		for (var n = 0; n < vertexCount / 2; n++) {
			this.indices[this.indexOffset++] = this.vertexIndex + 3;
			this.indices[this.indexOffset++] = this.vertexIndex + 0;
			this.indices[this.indexOffset++] = this.vertexIndex + 2;
			this.indices[this.indexOffset++] = this.vertexIndex + 3;
			this.indices[this.indexOffset++] = this.vertexIndex + 2;
			this.indices[this.indexOffset++] = this.vertexIndex + 1;
			this.vertexIndex += 4;
		}
	}
	
	addVerticesDataSprite(vertices:Uint8Array, inputOffset:number, verticesSize:number, count:number, vi:_state.VertexInfo) {
		var i = vertices.subarray(inputOffset, inputOffset + verticesSize);
		var o = this.data.subarray(this.dataOffset, this.dataOffset + verticesSize * 2); 
		SpriteExpander.forVertexInfo(vi)(i, o, count);
		this.dataOffset += o.length;
	}
	
	addVerticesIndicesList(indices:Uint8Array | Uint16Array) {
		var max = 0;
		var ioffset = this.indexOffset;
		for (var n = 0; n < indices.length; n++) {
			var v = indices[n];
			this.indices[ioffset + n] = v;
			max = Math.max(max, v);
		}
		max++;
		this.vertexIndex = max;
		this.indexOffset += indices.length;
		return max;
	}
	
	join(vertexSize:number) {
		this.indices[this.indexOffset++] = this.vertexIndex - 1;
		this.indices[this.indexOffset++] = this.vertexIndex;
	}
}

export class OptimizedBatch {
	public stateData:Uint32Array;
	public textureData:Uint8Array = null;
	public clutData:Uint8Array = null;
	
	constructor(
		state: _state.GpuState,
		public drawBuffer: OptimizedDrawBuffer,
		public primType:_state.PrimitiveType, public vertexInfo:_state.VertexInfo,
		public dataLow: number, public dataHigh: number,
		public indexLow: number, public indexHigh: number
	) {
		this.stateData = state.readData();
		this.vertexInfo = this.vertexInfo.clone();
		if (vertexInfo.hasTexture) {
			var mipmap = state.texture.mipmaps[0];
			this.textureData = memory.getPointerU8Array(mipmap.address, mipmap.sizeInBytes); 
			if (state.texture.hasClut) {
				var clut = state.texture.clut;
				this.clutData = memory.getPointerU8Array(clut.address, clut.sizeInBytes);
			}
		}
	}
	
	getData() { return this.drawBuffer.data.subarray(this.dataLow, this.dataHigh); }
	getIndices() { return this.drawBuffer.indices.subarray(this.indexLow, this.indexHigh); }
	
	get indexCount() { return this.indexHigh - this.indexLow; }
}

export class UnoptimizedBatch {
	public stateData:Uint32Array;
	public textureData:Uint8Array = null;
	public clutData:Uint8Array = null;
	constructor(
		state: _state.GpuState,
		public primType:_state.PrimitiveType,
		public vertices:_state.Vertex[],
		public vertexInfo:_state.VertexInfo
	) {
		this.stateData = state.readData();
		this.vertices = this.vertices.slice();
		this.vertexInfo = this.vertexInfo.clone();
		if (vertexInfo.hasTexture) {
			var mipmap = state.texture.mipmaps[0];
			this.textureData = memory.getPointerU8Array(mipmap.address, mipmap.sizeInBytes); 
			if (state.texture.hasClut) {
				var clut = state.texture.clut;
				this.clutData = memory.getPointerU8Array(clut.address, clut.sizeInBytes);
			}
		}
	}
}
