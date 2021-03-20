import "../../emu/global"
import {ArrayBufferUtils} from "../../global/utils";
import {MathUtils} from "../../global/math";
import {getMemoryInstance} from "../memory";
import {GpuState, NumericEnum, PrimitiveType, VertexInfo} from "./gpu_state";

var memory = getMemoryInstance();

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
	
	static forVertexInfo(vi: VertexInfo):SpriteExpanderFunc {
		var hash = vi.hash;
		if (!this.cache.has(hash)) {
			this.cache.set(hash, <SpriteExpanderFunc>new Function('input', 'output', 'count', this.readAllCode(vi)));
		}
		return this.cache.get(hash);
	}
	
	static readAllCode(vi: VertexInfo) {
		var code = `"use strict";`;

		code += `var i8  = new Uint8Array(input.buffer, input.byteOffset);\n`;
		code += `var i16 = new Uint16Array(input.buffer, input.byteOffset);\n`;
		code += `var i32 = new Uint32Array(input.buffer, input.byteOffset);\n`;
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
	
	private static readOneCode(vi: VertexInfo) {
		var code = '';
		var vsize = vi.size;
		
		var CONVV = [null, 'o8', 'o16', 'o32'];
		var CONVS = [0, 0, 1, 2];
		
		var COLV = [null, null, null, null, 'o16', 'o16', 'o16', 'o32']; // ColorEnum
		var COLS = [0, 0, 0, 0, 1, 1, 1, 2];
		
		function _get(vid:SpriteVID, type: NumericEnum, offset:number, component:number) {
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
		
		/*
		if ((vsize % 4) == 0) {
			for (var n = 0; n < (vsize / 4) * 2; n++) {
				code += `o32[(o >> 2) + ${n + vsize * 0}] = i32[(i >> 2) + ${n + (vsize * 0)}];\n`;
				code += `o32[(o >> 2) + ${n + vsize * 2}] = i32[(i >> 2) + ${n + (vsize * 1)}];\n`;
			}
		} else if ((vsize % 2) == 0) {
			for (var n = 0; n < (vsize / 2) * 2; n++) {
				code += `o16[(o >> 1) + ${n + vsize * 0}] = i16[(i >> 1) + ${n + (vsize * 0)}];\n`;
				code += `o16[(o >> 1) + ${n + vsize * 2}] = i16[(i >> 1) + ${n + (vsize * 1)}];\n`;
			}
		} else {
			for (var n = 0; n < vsize * 2; n++) {
				code += `o8[(o >> 0) + ${n + vsize * 0}] = i8[(i >> 0) + ${n + (vsize * 0)}];\n`;
				code += `o8[(o >> 0) + ${n + vsize * 2}] = i8[(i >> 0) + ${n + (vsize * 1)}];\n`;
			}
		}
		*/
		code += `o8.subarray(o + ${vsize * 0}, o + ${vsize * 2}).set(i8.subarray(i, i + ${vsize * 2}));\n`;
		code += `o8.subarray(o + ${vsize * 2}, o + ${vsize * 4}).set(i8.subarray(i, i + ${vsize * 2}));\n`;
	
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

export interface OptimizedDrawBufferDataTransfer {
	data: number;
	datasize: number;
	indices: number;
	indicesCount: number;
}

export interface OptimizedBatchTransfer {
	stateOffset: number;
	primType: PrimitiveType;
	dataLow: number, dataHigh: number,
	indexLow: number, indexHigh: number,
	indexCount: number,
	textureLow: number, textureHigh: number,
	clutLow: number, clutHigh: number
}

export interface BatchesTransfer {
	buffer: ArrayBuffer;
	data: OptimizedDrawBufferDataTransfer;
	batches: OptimizedBatchTransfer[];
}

export class OptimizedDrawBufferTransfer {
	static build(odb:OptimizedDrawBuffer, batches2:OptimizedBatch[]):BatchesTransfer {
		var chunks: { offset: number, size: number, data: ArrayBufferView }[] = [];
		var offset = 0;
		var batches:OptimizedBatchTransfer[] = [];
		
		function alloc(size: number) {
			var address = offset;
			offset += MathUtils.nextAligned(size, 16);
			return address;
		}
		
		function allocData(data: ArrayBufferView) {
			chunks.push({ offset: offset, size: data.byteLength, data: data });
			return alloc(data.byteLength);
		}
		
		var odbData = odb.getData();
		var odbIndices = odb.getIndices();
		var data:OptimizedDrawBufferDataTransfer = {
			data: allocData(odbData), datasize: odbData.length,
			indices: allocData(odbIndices), indicesCount: odbIndices.length,
		}
		
		var memorySegments = new Map<number, number>();
		function allocMemoryData(data: Uint8Array) {
			if (data == null) return 0;
			if (!memorySegments.has(data.byteOffset)) memorySegments.set(data.byteOffset, allocData(data));
			return memorySegments.get(data.byteOffset);
		}
		
		for (let batch of batches2) {
			let btl = allocMemoryData(batch.textureData);
			let bcl = allocMemoryData(batch.clutData);
			batches.push({
				stateOffset: allocData(batch.stateData),
				primType: batch.primType,
				dataLow: batch.dataLow,
				dataHigh: batch.dataHigh,
				indexLow: batch.indexLow,
				indexHigh: batch.indexHigh,
				indexCount: batch.indexCount,
				textureLow: btl,
				textureHigh: btl + (batch.textureData ? batch.textureData.length : 0),
				clutLow: bcl,
				clutHigh: bcl + (batch.clutData ? batch.clutData.length : 0),
			});
		}
		
		var buffer = new ArrayBuffer(offset);
		for (let chunk of chunks) {
			new Uint8Array(buffer, chunk.offset, chunk.size).set(
				new Uint8Array(chunk.data.buffer, chunk.data.byteOffset, chunk.size)
			);
		}
		
		return {
			buffer: buffer,
			data: data,
			batches: batches,
		}
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
	
	createBatch(state: GpuState, primType: PrimitiveType, vertexInfo: VertexInfo) {
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

	addVertices(vertices:Uint8Array, vertexCount:number, verticesSize:number) {
		this.addVerticesData(vertices,  verticesSize);
		this.addVerticesIndices(vertexCount);
	}

	addVerticesData(vertices:Uint8Array, verticesSize:number) {
		ArrayBufferUtils.copy(vertices, 0, this.data, this.dataOffset, verticesSize);
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
	
	addVerticesDataSprite(vertices:Uint8Array, verticesSize:number, count:number, vi: VertexInfo) {
		SpriteExpander.forVertexInfo(vi)(vertices, this.data.subarray(this.dataOffset), count / 2);
		this.dataOffset += verticesSize * 2;
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
	public clutData: Uint8Array = null;
	public indexCount: number;
	
	constructor(
		state: GpuState,
		public drawBuffer: OptimizedDrawBuffer,
		public primType: PrimitiveType, vertexInfo: VertexInfo,
		public dataLow: number, public dataHigh: number,
		public indexLow: number, public indexHigh: number
	) {
		this.stateData = state.readData();
		this.indexCount = this.indexHigh - this.indexLow;
		if (vertexInfo.hasTexture) {
			var mipmap = state.texture.mipmaps[0];
			this.textureData = memory.getPointerU8Array(mipmap.address, mipmap.sizeInBytes); 
			if (state.texture.hasClut) {
				var clut = state.texture.clut;
				this.clutData = memory.getPointerU8Array(clut.address, clut.sizeInBytes);
			}
		}
	}
	
	//getData() { return this.drawBuffer.data.subarray(this.dataLow, this.dataHigh); }
	//getIndices() { return this.drawBuffer.indices.subarray(this.indexLow, this.indexHigh); }
	
	//get indexCount() { return this.indexHigh - this.indexLow; }
}
