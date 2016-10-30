///<reference path="../../global.d.ts" />

import _memory = require('../memory');
import _pixelformat = require('../pixelformat');
import _opcodes = require('./gpu_opcodes');

import Op = _opcodes.GpuOpCodes;

import Memory = _memory.Memory;
import PixelFormat = _pixelformat.PixelFormat;

function bool1(p: number) { return p != 0; }
function parambool(p: number, offset: number) { return ((p >> offset) & 0x1) != 0; }
function param1(p: number, offset: number) { return (p >> offset) & 0x1; }
function param2(p: number, offset: number) { return (p >> offset) & 0x3; }
function param3(p: number, offset: number) { return (p >> offset) & 0x7; }
function param4(p: number, offset: number) { return (p >> offset) & 0xF; }
function param5(p: number, offset: number) { return (p >> offset) & 0x1F; }
function param8(p: number, offset: number) { return (p >> offset) & 0xFF; }
function param10(p: number, offset: number) { return (p >> offset) & 0x3FF; }
function param16(p: number, offset: number) { return (p >> offset) & 0xFFFF; }
function param24(p: number) { return p & 0xFFFFFF; }
function float1(p: number) { return MathFloat.reinterpretIntAsFloat(p << 8); }

export const enum CullingDirection {
	CounterClockWise = 0,
	ClockWise = 1
}

export const enum SyncType {
	WaitForCompletion = 0,
	Peek = 1,
}

export const enum DisplayListStatus {
	Completed = 0, // The list has been completed (PSP_GE_LIST_COMPLETED)
	Queued = 1, // list is queued but not executed yet (PSP_GE_LIST_QUEUED)
	Drawing = 2, // The list is currently being executed (PSP_GE_LIST_DRAWING)
	Stalling = 3, // The list was stopped because it encountered stall address (PSP_GE_LIST_STALLING)
	Paused = 4, // The list is paused because of a signal or sceGeBreak (PSP_GE_LIST_PAUSED)
}

export class GpuFrameBufferState {
	constructor(private data:Uint32Array) { }
	
	get width() { return param16(this.data[Op.FRAMEBUFWIDTH], 0); }
	get highAddress() { return param8(this.data[Op.FRAMEBUFWIDTH], 16); } 
	get lowAddress() { return param24(this.data[Op.FRAMEBUFPTR]); }
}

export const enum IndexEnum {
	Void = 0,
	Byte = 1,
	Short = 2,
}

export const enum NumericEnum {
	Void = 0,
	Byte = 1,
	Short = 2,
	Float = 3,
}

export const enum ColorEnum {
	Void = 0,
	Invalid1 = 1,
	Invalid2 = 2,
	Invalid3 = 3,
	Color5650 = 4,
	Color5551 = 5,
	Color4444 = 6,
	Color8888 = 7,
}

export class VertexInfo {
	// Calculated
	weightOffset:number = 0;
	textureOffset:number = 0;
	colorOffset:number = 0;
	normalOffset:number = 0;
	positionOffset:number = 0;
	textureComponentsCount:number = 0;
	align: number;
	size: number;

	// Extra	
	value: number = -1;
	reversedNormal: boolean;
	address: number;
	
	// Attributes
	weight: NumericEnum;
	texture: NumericEnum;
	color: ColorEnum;
	normal: NumericEnum;
	position: NumericEnum;

	// Vertex Type
	index: IndexEnum;
	weightCount: number;
	morphingVertexCount: number;
	transform2D: boolean;
	weightSize:number;
	colorSize:number;
	textureSize:number;
	positionSize:number;
	normalSize:number;
	
	clone() {
		return new VertexInfo().copyFrom(this);
	}
	
	copyFrom(that:VertexInfo) {
		this.weightOffset = that.weightOffset;
		this.textureOffset = that.textureOffset;
		this.colorOffset = that.colorOffset;
		this.normalOffset = that.normalOffset; 
		this.positionOffset = that.positionOffset;
		this.textureComponentsCount = that.textureComponentsCount;
		this.value = that.value;
		this.size = that.size;
		this.reversedNormal = that.reversedNormal;
		this.address = that.address;
		this.texture = that.texture;
		this.color = that.color;
		this.normal = that.normal;
		this.position = that.position;
		this.weight = that.weight;
		this.index = that.index;
		this.weightCount = that.weightCount;
		this.morphingVertexCount = that.morphingVertexCount
		this.transform2D = that.transform2D;
		this.weightSize = that.weightSize;
		this.colorSize = that.colorSize;
		this.textureSize = that.textureSize
		this.positionSize = that.positionSize;
		this.normalSize = that.normalSize;
		this.align = that.align;
		return this;
	}

	setState(state:GpuState) {
		let vstate = state.vertex;
		this.address = vstate.address;
	
		if ((this.value != vstate.value) || (this.textureComponentsCount != state.texture.textureComponentsCount) || (this.reversedNormal != vstate.reversedNormal)) {
			this.textureComponentsCount = state.texture.textureComponentsCount;
			this.reversedNormal = vstate.reversedNormal;
			this.value = vstate.value;
			this.texture = vstate.texture;
			this.color = vstate.color;
			this.normal = vstate.normal;
			this.position = vstate.position;
			this.weight = vstate.weight;
			this.index = vstate.index;
			this.weightCount = vstate.weightCount;
			this.morphingVertexCount = vstate.morphingVertexCount;
			this.transform2D = vstate.transform2D;
		
			this.updateSizeAndPositions();	
		}

		return this;
	}
	
	updateSizeAndPositions() {
		this.weightSize = VertexInfo.NumericEnumSizes[this.weight];
		this.colorSize = VertexInfo.ColorEnumSizes[this.color];
		this.textureSize = VertexInfo.NumericEnumSizes[this.texture];
		this.positionSize = VertexInfo.NumericEnumSizes[this.position];
		this.normalSize = VertexInfo.NumericEnumSizes[this.normal];

		this.size = 0;
		this.size = MathUtils.nextAligned(this.size, this.weightSize);
		this.weightOffset = this.size;
		this.size += this.realWeightCount * this.weightSize;

		this.size = MathUtils.nextAligned(this.size, this.textureSize);
		this.textureOffset = this.size;
		this.size += this.textureComponentsCount * this.textureSize;

		this.size = MathUtils.nextAligned(this.size, this.colorSize);
		this.colorOffset = this.size;
		this.size += 1 * this.colorSize;
		
		this.size = MathUtils.nextAligned(this.size, this.normalSize);
		this.normalOffset = this.size;
		this.size += 3 * this.normalSize;
		
		this.size = MathUtils.nextAligned(this.size, this.positionSize);
		this.positionOffset = this.size;
		this.size += 3 * this.positionSize;

		this.align = Math.max(this.weightSize, this.colorSize, this.textureSize, this.positionSize, this.normalSize);
		this.size = MathUtils.nextAligned(this.size, this.align);
	}

	oneWeightOffset(n:number) {
		return this.weightOffset + this.weightSize * n; 
	}
	
	private static NumericEnumSizes = [0, 1, 2, 4];
	private static ColorEnumSizes = [0, 0, 0, 0, 2, 2, 2, 4];

	get realWeightCount() { return this.hasWeight ? (this.weightCount + 1) : 0; }
	get realMorphingVertexCount() { return this.morphingVertexCount + 1; }
	get hasTexture() { return this.texture != NumericEnum.Void; }
	get hasColor() { return this.color != ColorEnum.Void; }
	get hasNormal() { return this.normal != NumericEnum.Void; }
	get hasPosition() { return this.position != NumericEnum.Void; }
	get hasWeight() { return this.weight != NumericEnum.Void; }
	get hasIndex() { return this.index != IndexEnum.Void; }
	get positionComponents() { return 3; }
	get normalComponents() { return 3; }
	get colorComponents() { return 4; }
	get textureComponents() { return this.textureComponentsCount; }
	get hash() { return this.value + (this.textureComponentsCount * Math.pow(2, 24)); }

	read(memory: Memory, count: number) {
		//console.log('read vertices ' + count);
		var vertices:any[] = [];
		for (var n = 0; n < count; n++) vertices.push(this.readOne(memory));
		return vertices;
	}

	private readOne(memory: Memory) {
		var address = this.address;
		var vertex: any = {};

		//console.log(vertex);
		this.address += this.size;

		return vertex;
	}
	
	toString() {
		return 'VertexInfo(' + JSON.stringify({
			address: this.address,
			texture: this.texture,
			color: this.color,
			normal: this.normal,
			position: this.position,
			weight: this.weight,
			index: this.index,
			realWeightCount: this.realWeightCount,
			morphingVertexCount: this.morphingVertexCount,
			transform2D: this.transform2D,
		}) + ')';
	}

}

export class VertexState {
	constructor(private data:Uint32Array) { }
	
	get value() { return param24(this.data[Op.VERTEXTYPE]); }
	get reversedNormal() { return bool1(this.data[Op.REVERSENORMAL]); }
	get address() { return param24(this.data[Op.VADDR]); }
	set address(value:number) { this.data[Op.VADDR] = value | (Op.VADDR << 24); }
	
	get texture() { return param2(this.data[Op.VERTEXTYPE], 0); }
	get color() { return <ColorEnum>param3(this.data[Op.VERTEXTYPE], 2); }
	get normal() { return <NumericEnum>param2(this.data[Op.VERTEXTYPE], 5); }
	get position() { return <NumericEnum>param2(this.data[Op.VERTEXTYPE], 7); }
	get weight() { return <NumericEnum>param2(this.data[Op.VERTEXTYPE], 9); }
	get index() { return <IndexEnum>param2(this.data[Op.VERTEXTYPE], 11); }
	get weightCount() { return param3(this.data[Op.VERTEXTYPE], 14); }
	get morphingVertexCount() { return param2(this.data[Op.VERTEXTYPE], 18); }
	get transform2D() { return parambool(this.data[Op.VERTEXTYPE], 23); }
}

function createMatrix4x4(data:Uint32Array, offset:number) {
    return new Float32Array(data.buffer).subarray(offset, offset + 16);
}

function createMatrix4x3(data:Uint32Array, offset:number) {
    return new Float32Array(data.buffer).subarray(offset, offset + 12);
}

export class ViewPort {
	constructor(private data:Uint32Array) { }
	
	get x() { return float1(this.data[Op.VIEWPORTX2]); }
	get y() { return float1(this.data[Op.VIEWPORTY2]); }
	get z() { return float1(this.data[Op.VIEWPORTZ2]); }

	get width() { return float1(this.data[Op.VIEWPORTX1]); }
	get height() { return float1(this.data[Op.VIEWPORTY1]); }
	get depth() { return float1(this.data[Op.VIEWPORTZ1]); }
}

export class Region {
	constructor(private data:Uint32Array) { }
	
	get x1() { return param10(this.data[Op.REGION1], 0); }
	get y1() { return param10(this.data[Op.REGION1], 10); }

	get x2() { return param10(this.data[Op.REGION2], 0); }
	get y2() { return param10(this.data[Op.REGION2], 10); }
}

export class Light {
	private static REG_TYPES = [Op.LIGHTTYPE0, Op.LIGHTTYPE1, Op.LIGHTTYPE2, Op.LIGHTTYPE3];
	private static REG_LCA = [Op.LCA0, Op.LCA1, Op.LCA2, Op.LCA3];
	private static REG_LLA = [Op.LLA0, Op.LLA1, Op.LLA2, Op.LLA3];
	private static REG_LQA = [Op.LQA0, Op.LQA1, Op.LQA2, Op.LQA3];
	private static REG_SPOTEXP = [Op.SPOTEXP0, Op.SPOTEXP1, Op.SPOTEXP2, Op.SPOTEXP3];
	private static REG_SPOTCUT = [Op.SPOTCUT0, Op.SPOTCUT1, Op.SPOTCUT2, Op.SPOTCUT3];
	
	private static LXP = [Op.LXP0, Op.LXP1, Op.LXP2, Op.LXP3];
	private static LYP = [Op.LYP0, Op.LYP1, Op.LYP2, Op.LYP3];
	private static LZP = [Op.LZP0, Op.LZP1, Op.LZP2, Op.LZP3];

	private static LXD = [Op.LXD0, Op.LXD1, Op.LXD2, Op.LXD3];
	private static LYD = [Op.LYD0, Op.LYD1, Op.LYD2, Op.LYD3];
	private static LZD = [Op.LZD0, Op.LZD1, Op.LZD2, Op.LZD3];
	
	private static ALC = [Op.ALC0, Op.ALC1, Op.ALC2, Op.ALC3];
	private static DLC = [Op.DLC0, Op.DLC1, Op.DLC2, Op.DLC3];
	private static SLC = [Op.SLC0, Op.SLC1, Op.SLC2, Op.SLC3];
	
	constructor(private data:Uint32Array, public index:number) { }
	
	get enabled() { return bool1(this.data[Op.LIGHTENABLE0 + this.index]); }
	
	get kind() { return <LightModelEnum>param8(this.data[Light.REG_TYPES[this.index]], 0); }
	get type() { return <LightTypeEnum>param8(this.data[Light.REG_TYPES[this.index]], 8); }
	
	get pw() { return (this.type == LightTypeEnum.SpotLight) ? 1 : 0; }
	
	get px() { return float1(this.data[Light.LXP[this.index]]); }
	get py() { return float1(this.data[Light.LYP[this.index]]); }
	get pz() { return float1(this.data[Light.LZP[this.index]]); }

	get dx() { return float1(this.data[Light.LXD[this.index]]); }
	get dy() { return float1(this.data[Light.LYD[this.index]]); }
	get dz() { return float1(this.data[Light.LZD[this.index]]); }

	get spotExponent() { return float1(this.data[Light.REG_SPOTEXP[this.index]]); }
	get spotCutoff() { return float1(this.data[Light.REG_SPOTCUT[this.index]]); }
	get constantAttenuation() { return float1(this.data[Light.REG_LCA[this.index]]); }
	get linearAttenuation() { return float1(this.data[Light.REG_LLA[this.index]]); }
	get quadraticAttenuation() { return float1(this.data[Light.REG_LQA[this.index]]); }
	
	get ambientColor() { return new Color().setRGB(Light.ALC[this.index]); } 
	get diffuseColor() { return new Color().setRGB(Light.DLC[this.index]); }
	get specularColor() { return new Color().setRGB(Light.SLC[this.index]); }
}

export const enum LightTypeEnum { Directional = 0, PointLight = 1, SpotLight = 2 }
export const enum LightModelEnum { SingleColor = 0, SeparateSpecularColor = 1 }

export class Lightning {
	lights:Light[];

	constructor(private data:Uint32Array) {
		 this.lights = [
			 new Light(this.data, 0),
			 new Light(this.data, 1),
			 new Light(this.data, 2),
			 new Light(this.data, 3)
		];
	}
	
	get lightModel() { return <LightModelEnum>param8(this.data[Op.LIGHTMODE], 0); }
	
	get specularPower() { return float1(this.data[Op.MATERIALSPECULARCOEF]); }
	get ambientLightColor() { return new Color().setRGB_A(this.data[Op.AMBIENTCOLOR], this.data[Op.AMBIENTALPHA]); }
	
	get enabled() { return bool1(this.data[Op.LIGHTINGENABLE]); }
}

export class MipmapState {
	constructor(public texture:TextureState, private data:Uint32Array, public index:number) { }
	
	get bufferWidth() { return param16(this.data[Op.TEXBUFWIDTH0 + this.index], 0); }
	get address() { return param24(this.data[Op.TEXADDR0 + this.index]) | ((param8(this.data[Op.TEXBUFWIDTH0 + this.index], 16) << 24)) }
	get addressEnd() { return this.address + this.sizeInBytes; }
	get textureWidth() { return 1 << param4(this.data[Op.TSIZE0 + this.index], 0); } 
	get textureHeight() { return 1 << param4(this.data[Op.TSIZE0 + this.index], 8); }
	get size() { return this.bufferWidth * this.textureHeight; }
	get sizeInBytes() { return _pixelformat.PixelConverter.getSizeInBytes(this.texture.pixelFormat, this.size); }
}

export class ClutState {
	constructor(private data:Uint32Array) { }
	
	getHashFast() {
		return (this.data[Op.CMODE] << 0) + (this.data[Op.CLOAD] << 8) + (this.data[Op.CLUTADDR] << 16) + (this.data[Op.CLUTADDRUPPER] << 24);
	}
	get cmode() { return this.data[Op.CMODE]; }
	get cload() { return this.data[Op.CLOAD]; }

	get address() { return param24(this.data[Op.CLUTADDR]) | ((this.data[Op.CLUTADDRUPPER] << 8) & 0xFF000000); }
	get addressEnd() { return this.address + this.sizeInBytes; }
	get numberOfColors() { return this.data[Op.CLOAD] * 8; }
	get pixelFormat() { return <PixelFormat>param2(this.data[Op.CMODE], 0); }
	get shift() { return param5(this.data[Op.CMODE], 2); }
	get mask() { return param8(this.data[Op.CMODE], 8); }
	get start() { return param5(this.data[Op.CMODE], 16); }
	get sizeInBytes() { return _pixelformat.PixelConverter.getSizeInBytes(this.pixelFormat, this.numberOfColors); }
}

export const enum TextureProjectionMapMode {
	GU_POSITION = 0, // TMAP_TEXTURE_PROJECTION_MODE_POSITION - 3 texture components
	GU_UV = 1, // TMAP_TEXTURE_PROJECTION_MODE_TEXTURE_COORDINATES - 2 texture components
	GU_NORMALIZED_NORMAL = 2, // TMAP_TEXTURE_PROJECTION_MODE_NORMALIZED_NORMAL - 3 texture components
	GU_NORMAL = 3, // TMAP_TEXTURE_PROJECTION_MODE_NORMAL - 3 texture components
}

export const enum TextureMapMode {
	GU_TEXTURE_COORDS = 0,
	GU_TEXTURE_MATRIX = 1,
	GU_ENVIRONMENT_MAP = 2,
}

export const enum TextureLevelMode { Auto = 0, Const = 1, Slope = 2 }


export class TextureState {
	constructor(private data:Uint32Array) {
	}
	
	matrix = createMatrix4x4(this.data, Op.MAT_TEXTURE);

	clut = new ClutState(this.data);
	
	get hasClut() {
		return _pixelformat.PixelFormatUtils.hasClut(this.pixelFormat);
	}
	
	getHashSlow(textureData:Uint8Array, clutData:Uint8Array) {
		var hash: number[] = [];
		hash.push(ArrayBufferUtils.hashFast(textureData));
		hash.push(this.mipmap.address);
		hash.push(this.mipmap.textureWidth);
		hash.push(this.colorComponent);
		hash.push(this.mipmap.textureHeight);
		hash.push(+this.swizzled);
		hash.push(+this.pixelFormat);
		if (this.hasClut) {
			hash.push(this.clut.getHashFast());
			hash.push(ArrayBufferUtils.hashFast(clutData));
		}
		//value += this.clut.getHashFast();
		return hash.join('_');
	}
	
	get mipmap() { return this.mipmaps[0]; }
	
	mipmaps = [
		new MipmapState(this, this.data, 0),
		new MipmapState(this, this.data, 1),
		new MipmapState(this, this.data, 2),
		new MipmapState(this, this.data, 3),
		new MipmapState(this, this.data, 4),
		new MipmapState(this, this.data, 5),
		new MipmapState(this, this.data, 6),
		new MipmapState(this, this.data, 7)
	];

	get wrapU() { return <WrapMode>param8(this.data[Op.TWRAP], 0); }	
	get wrapV() { return <WrapMode>param8(this.data[Op.TWRAP], 8); }

	get levelMode() { return <TextureLevelMode>param8(this.data[Op.TBIAS], 0); }
	get mipmapBias() { return param8(this.data[Op.TBIAS], 16) / 16; }

	get offsetU() { return float1(this.data[Op.TEXOFFSETU]); }
	get offsetV() { return float1(this.data[Op.TEXOFFSETV]); }

	get scaleU() { return float1(this.data[Op.TEXSCALEU]); }
	get scaleV() { return float1(this.data[Op.TEXSCALEV]); }

	get shadeU() { return param2(this.data[Op.TEXTURE_ENV_MAP_MATRIX], 0); }
	get shadeV() { return param2(this.data[Op.TEXTURE_ENV_MAP_MATRIX], 8); }
				
	get effect() { return <TextureEffect>param8(this.data[Op.TFUNC], 0); }
	get hasAlpha() { return this.colorComponent == TextureColorComponent.Rgba; }
	get colorComponent() { return <TextureColorComponent>param8(this.data[Op.TFUNC], 8); }
	get fragment2X() { return param8(this.data[Op.TFUNC], 16) != 0; }
	get envColor() { return new Color().setRGB(param24(this.data[Op.TEC])); }
	
	get pixelFormat() { return <PixelFormat>param4(this.data[Op.TPSM], 0); }

	get slopeLevel() { return float1(this.data[Op.TSLOPE]); }
	
	get swizzled() { return param8(this.data[Op.TMODE], 0) != 0; }
	get mipmapShareClut() { return param8(this.data[Op.TMODE], 8) != 0; }
	get mipmapMaxLevel() { return param8(this.data[Op.TMODE], 16) != 0; }
	
	get filterMinification() { return <TextureFilter>param8(this.data[Op.TFLT], 0); }
	get filterMagnification() { return <TextureFilter>param8(this.data[Op.TFLT], 8); }
	get enabled() { return bool1(this.data[Op.TEXTUREMAPENABLE]); }
	
	get textureMapMode() { return <TextureMapMode>param8(this.data[Op.TMAP], 0); }
	get textureProjectionMapMode() { return <TextureProjectionMapMode>param8(this.data[Op.TMAP], 8); }

	get tmode() { return this.data[Op.TMODE]; }
	
	getPixelsSize(size:number) {
		return _pixelformat.PixelConverter.getSizeInBytes(this.pixelFormat, size);
	}

	get textureComponentsCount() {
		switch (this.textureMapMode) {
			default: throw(new Error("Invalid textureMapMode"));
			case TextureMapMode.GU_TEXTURE_COORDS: return 2;
			case TextureMapMode.GU_TEXTURE_MATRIX:
				switch (this.textureProjectionMapMode) {
					case TextureProjectionMapMode.GU_NORMAL: return 3;
					case TextureProjectionMapMode.GU_NORMALIZED_NORMAL: return 3;
					case TextureProjectionMapMode.GU_POSITION: return 3;
					case TextureProjectionMapMode.GU_UV: return 2; 
				}
				return 2;
			case TextureMapMode.GU_ENVIRONMENT_MAP: return 2;
		}
	}
}

export class CullingState {
	constructor(private data:Uint32Array) { }
	
	get enabled() { return bool1(this.data[Op.CULLFACEENABLE]); }
	get direction() { return <CullingDirection>param24(this.data[Op.CULL]); }
}

export const enum TestFunctionEnum {
	Never = 0,
	Always = 1,
	Equal = 2,
	NotEqual = 3,
	Less = 4,
	LessOrEqual = 5,
	Greater = 6,
	GreaterOrEqual = 7,
}

export class DepthTestState {
	constructor(private data:Uint32Array) {}
	
	get enabled() { return bool1(this.data[Op.ZTESTENABLE]); }
	get func() { return param8(this.data[Op.ZTST], 0); }
	get mask() { return param16(this.data[Op.ZMSK], 0); }
	
	get rangeNear() { return (this.data[Op.MAXZ] & 0xFFFF) / 65536; }
	get rangeFar() { return (this.data[Op.MINZ] & 0xFFFF) / 65536; }
}

export const enum ShadingModelEnum {
	Flat = 0,
	Smooth = 1,
}

export const enum GuBlendingFactor {
	GU_SRC_COLOR                     = 0,// = 0x0300,
	GU_ONE_MINUS_SRC_COLOR           = 1,// = 0x0301,
	GU_SRC_ALPHA                     = 2,// = 0x0302,
	GU_ONE_MINUS_SRC_ALPHA           = 3,// = 0x0303,
	GU_DST_ALPHA                     = 4,// = 0x0304,
	GU_ONE_MINUS_DST_ALPHA           = 5,// = 0x0305,
	GU_FIX = 10,
}
	
export const enum GuBlendingEquation {
	Add = 0,
	Substract = 1,
	ReverseSubstract = 2,
	Min = 3,
	Max = 4,
	Abs = 5,
}

export class Color {
	public constructor(public r = 0, public g = 0, public b = 0, public a = 1) {
	}

	setRGB(rgb: number) {
		this.r = BitUtils.extractScale1f(rgb, 0, 8);
		this.g = BitUtils.extractScale1f(rgb, 8, 8);
		this.b = BitUtils.extractScale1f(rgb, 16, 8);
		this.a = 1;
		return this;
	}
	
	setRGB_A(rgb:number, a:number) {
		this.setRGB(rgb);
		this.a = BitUtils.extractScale1f(rgb, 0, 8); 
		return this;
	}

	set(r: number, g: number, b: number, a: number = 1) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
		return this;
	}

	static add(a: Color, b: Color, dest: Color = null) {
		if (dest == null) dest = new Color();
		dest.r = a.r + b.r;
		dest.g = a.g + b.g;
		dest.b = a.b + b.b;
		dest.a = a.a * b.a;
		return dest;
	}

	equals(r:number, g:number, b:number, a:number) {
		return (this.r == r) && (this.g == g) && (this.b == b) && (this.a == a);
	}
}

export class Blending {
	constructor(private data:Uint32Array) { }
	
	get fixColorSource() { return new Color().setRGB(param24(this.data[Op.SFIX])); }
	get fixColorDestination() { return new Color().setRGB(param24(this.data[Op.DFIX])); }
	
	get enabled() { return bool1(this.data[Op.ALPHABLENDENABLE]); }
	
	get functionSource() { return <GuBlendingFactor>param4(this.data[Op.ALPHA], 0); }
	get functionDestination() { return <GuBlendingFactor>param4(this.data[Op.ALPHA], 4); }
	get equation() { return <GuBlendingEquation > param4(this.data[Op.ALPHA], 8); }
	
	get colorMask() {
		return new Color().setRGB_A(
			param24(this.data[Op.PMSKC]),
			param8(this.data[Op.PMSKA], 0)
		);
	}
}

export class AlphaTest {
	constructor(private data:Uint32Array) { }

	get enabled() { return bool1(this.data[Op.ALPHATESTENABLE]); }
	
	get func() { return <TestFunctionEnum>param8(this.data[Op.ATST], 0); }
	get value() { return param8(this.data[Op.ATST], 8); }	
	get mask() { return param8(this.data[Op.ATST], 16); }
}

export class Rectangle {
	constructor(public left:number, public top:number, public right:number, public bottom:number) {
	}

	get width() { return this.right - this.left; }
	get height() { return this.bottom - this.top; }
}

export class ClipPlane {
	constructor(private data:Uint32Array) { }
	
	get enabled() { return bool1(this.data[Op.CLIPENABLE]); }
	get scissor() { return new Rectangle(this.left, this.top, this.right, this.bottom); }
	get left() { return param10(this.data[Op.SCISSOR1], 0); }
	get top() { return param10(this.data[Op.SCISSOR1], 10); }
	get right() { return param10(this.data[Op.SCISSOR2], 0); }
	get bottom() { return param10(this.data[Op.SCISSOR2], 10); }
}

export class SkinningState {
	constructor(private data:Uint32Array) { }
	
	dataf = new Float32Array(this.data.buffer);

	boneMatrices = [
		createMatrix4x3(this.dataf, Op.MAT_BONES + 12 * 0),
		createMatrix4x3(this.dataf, Op.MAT_BONES + 12 * 1),
		createMatrix4x3(this.dataf, Op.MAT_BONES + 12 * 2),
		createMatrix4x3(this.dataf, Op.MAT_BONES + 12 * 3),
		createMatrix4x3(this.dataf, Op.MAT_BONES + 12 * 4),
		createMatrix4x3(this.dataf, Op.MAT_BONES + 12 * 5),
		createMatrix4x3(this.dataf, Op.MAT_BONES + 12 * 6),
		createMatrix4x3(this.dataf, Op.MAT_BONES + 12 * 7)
	];
}

export const enum StencilOperationEnum {
	Keep = 0,
	Zero = 1,
	Replace = 2,
	Invert = 3,
	Increment = 4,
	Decrement = 5,
}

export class StencilState {
	constructor(private data:Uint32Array) { }
	
	get enabled() { return bool1(this.data[Op.STENCILTESTENABLE]);  }
	
	get fail() { return <StencilOperationEnum>param8(this.data[Op.SOP], 0); }
	get zfail() { return <StencilOperationEnum>param8(this.data[Op.SOP], 8); }
	get zpass() { return <StencilOperationEnum>param8(this.data[Op.SOP], 16); }

	get func() { return <TestFunctionEnum>param8(this.data[Op.STST], 0); }
	get funcRef() { return param8(this.data[Op.STST], 8); }
	get funcMask() { return param8(this.data[Op.STST], 16); }
}

export class PatchState {
	constructor(private data:Uint32Array) { }
	get divs() { return param8(this.data[Op.PATCHDIVISION], 0); }
	get divt() { return param8(this.data[Op.PATCHDIVISION], 8); }
}

export class Fog {
	constructor(private data:Uint32Array) { }

	get color() { return new Color().setRGB(this.data[Op.FCOL]); }
	get far() { return float1(this.data[Op.FFAR]); }
	get dist() { return float1(this.data[Op.FDIST]); }
	get enabled() { return bool1(this.data[Op.FOGENABLE]); }
}

export class LogicOp {
	constructor(private data:Uint32Array) { }
	
	get enabled() { return this.data[Op.LOGICOPENABLE]; }
}

export class LineSmoothState {
	constructor(private data:Uint32Array) {}
	get enabled() { return bool1(this.data[Op.ANTIALIASENABLE]); }
}

export class PatchCullingState {
	constructor(private data:Uint32Array) {}
	get enabled() { return bool1(this.data[Op.PATCHCULLENABLE]); }
	get faceFlag() { return bool1(this.data[Op.PATCHFACING]); }
}

export class OffsetState {
	constructor(private data:Uint32Array) {}
	get x() { return param4(this.data[Op.OFFSETX], 0); }
	get y() { return param4(this.data[Op.OFFSETY], 0); }
}

export class GpuState {
	data = new Uint32Array(512);
	dataf = new Float32Array(this.data.buffer);
	copyFrom(that:GpuState) { return this.writeData(that.data); }
	writeData(data:Uint32Array) { this.data.set(data); return this; }
	readData():Uint32Array { return ArrayBufferUtils.cloneUint32Array(this.data); }
	
	frameBuffer = new GpuFrameBufferState(this.data);
	vertex = new VertexState(this.data);
	stencil = new StencilState(this.data);
	skinning = new SkinningState(this.data);
	
	projectionMatrix = createMatrix4x4(this.dataf, Op.MAT_PROJ);
	viewMatrix = createMatrix4x3(this.dataf, Op.MAT_VIEW);
	worldMatrix = createMatrix4x3(this.dataf, Op.MAT_WORLD);
	
	viewport = new ViewPort(this.data);
	region = new Region(this.data);
	offset = new OffsetState(this.data);
	fog = new Fog(this.data);
	clipPlane = new ClipPlane(this.data);
	logicOp = new LogicOp(this.data);
	lightning = new Lightning(this.data);
	alphaTest = new AlphaTest(this.data);
	blending = new Blending(this.data);
	patch = new PatchState(this.data);
	texture = new TextureState(this.data);
	lineSmoothState = new LineSmoothState(this.data);
	patchCullingState = new PatchCullingState(this.data);
	culling = new CullingState(this.data);
	dithering = new DitheringState(this.data);
	colorTest = new ColorTestState(this.data);
	depthTest = new DepthTestState(this.data);

	get clearing() { return param1(this.data[Op.CLEAR], 0) != 0; }
	get clearFlags() { return param8(this.data[Op.CLEAR], 8); }
	get baseAddress() { return ((param24(this.data[Op.BASE]) << 8) & 0xff000000); }
	set baseOffset(value: number) {
		this.data[Op.OFFSETADDR] &= ~0x00FFFFFF;
		this.data[Op.OFFSETADDR] |= (value >>> 8) & 0x00FFFFFF;
	}
	get baseOffset() { return param24(this.data[Op.OFFSETADDR]) << 8; }
	get indexAddress() { return param24(this.data[Op.IADDR]); }
	get shadeModel() { return <ShadingModelEnum>param16(this.data[Op.SHADEMODE], 0); }
	get ambientModelColor() { return new Color().setRGB_A(this.data[Op.MATERIALAMBIENT], this.data[Op.MATERIALALPHA]); }
	get diffuseModelColor() { return new Color().setRGB(this.data[Op.MATERIALDIFFUSE]); }
	get specularModelColor() { return new Color().setRGB(this.data[Op.MATERIALSPECULAR]); }
	get drawPixelFormat() { return <PixelFormat>param4(this.data[Op.PSM], 0); } 

	writeFloat(index:number, offset:number, data:number) {
		this.dataf[offset + this.data[index]++] = data;
	}

	getMorphWeight(index:number) { return float1(this.data[Op.MORPHWEIGHT0 + index]);  }
	getAddressRelativeToBase(relativeAddress: number) { return (this.baseAddress | relativeAddress); }
	getAddressRelativeToBaseOffset(relativeAddress: number) { return ((this.baseAddress | relativeAddress) + this.baseOffset); }
}

export class ColorTestState {
	constructor(private data:Uint32Array) { }
	get enabled() { return bool1(this.data[Op.COLORTESTENABLE]); }
}

export class DitheringState {
	constructor(private data:Uint32Array) { }
	get enabled() { return bool1(this.data[Op.DITHERENABLE]); }
}

export const enum WrapMode {
	Repeat = 0,
	Clamp = 1,
}

export const enum TextureEffect {
	Modulate = 0,  // GU_TFX_MODULATE
	Decal = 1,     // GU_TFX_DECAL
	Blend = 2,     // GU_TFX_BLEND
	Replace = 3,   // GU_TFX_REPLACE
	Add = 4,	   // GU_TFX_ADD
}

export const enum TextureFilter {
	Nearest = 0,
	Linear = 1,
	NearestMipmapNearest = 4,
	LinearMipmapNearest = 5,
	NearestMipmapLinear = 6,
	LinearMipmapLinear = 7,
}

export const enum TextureColorComponent {
	Rgb = 0,    // GU_TCC_RGB
	Rgba = 1,   // GU_TCC_RGBA
}

export const enum PrimitiveType {
	Points = 0,
	Lines = 1,
	LineStrip = 2,
	Triangles = 3,
	TriangleStrip = 4,
	TriangleFan = 5,
	Sprites = 6,
}

