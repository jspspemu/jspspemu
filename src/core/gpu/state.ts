import _memory = require('../memory');
import _pixelformat = require('../pixelformat');

import Memory = _memory.Memory;
import PixelFormat = _pixelformat.PixelFormat;

export enum CullingDirection {
	CounterClockWise = 0,
	ClockWise = 1
}

export enum SyncType {
	ListDone = 0,
	ListQueued = 1,
	ListDrawingDone = 2,
	ListStallReached = 3,
	ListCancelDone = 4,
}

export class GpuFrameBufferState {
	lowAddress = 0;
	highAddress = 0;
	width = 0;
}

export enum IndexEnum {
	Void = 0,
	Byte = 1,
	Short = 2,
}

export enum NumericEnum {
	Void = 0,
	Byte = 1,
	Short = 2,
	Float = 3,
}

export enum ColorEnum {
	Void = 0,
	Invalid1 = 1,
	Invalid2 = 2,
	Invalid3 = 3,
	Color5650 = 4,
	Color5551 = 5,
	Color4444 = 6,
	Color8888 = 7,
}

export class Vertex {
	px = 0.0; py = 0.0; pz = 0.0;
	nx = 0.0; ny = 0.0; nz = 0.0;
	tx = 0.0; ty = 0.0; tz = 0.0;
	r = 0.0; g = 0.0; b = 0.0; a = 1.0;
	w0 = 0.0; w1 = 0.0; w2 = 0.0; w3 = 0.0;
	w4 = 0.0; w5 = 0.0; w6 = 0.0; w7 = 0.0;

	copyFrom(that: Vertex) {
		this.px = that.px; this.py = that.py; this.pz = that.pz;
		this.nx = that.nx; this.ny = that.ny; this.nz = that.nz;
		this.tx = that.tx; this.ty = that.ty; this.tz = that.tz;
		this.r = that.r; this.g = that.g; this.b = that.b; this.a = that.a;
		this.w0 = that.w0; this.w1 = that.w1; this.w2 = that.w2; this.w3 = that.w3;
		this.w4 = that.w4; this.w5 = that.w5; this.w6 = that.w6; this.w7 = that.w7;
	}

	clone() {
		var that = new Vertex();
		that.copyFrom(this);
		return that;
	}
}

export class VertexState {
	address = 0;
	private _value = 0;
	reversedNormal = false;
	textureComponentCount = 2;
	size: number;

	get value() { return this._value; }

	set value(value: number) {
		this._value = value;
		this.size = this.getVertexSize();
	}

	//getReader() { return VertexReaderFactory.get(this.size, this.texture, this.color, this.normal, this.position, this.weight, this.index, this.realWeightCount, this.realMorphingVertexCount, this.transform2D, this.textureComponentCount); }

	get hash() {
		return this.value + (this.textureComponentCount * Math.pow(2, 32));
	}

	toString() {
		return 'VertexState(' + JSON.stringify({
			address: this.address,
			texture: this.texture,
			color: this.color,
			normal: this.normal,
			position: this.position,
			weight: this.weight,
			index: this.index,
			weightCount: this.weightCount,
			morphingVertexCount: this.morphingVertexCount,
			transform2D: this.transform2D,
		}) + ')';
	}

	get hasTexture() { return this.texture != NumericEnum.Void; }
	get hasColor() { return this.color != ColorEnum.Void; }
	get hasNormal() { return this.normal != NumericEnum.Void; }
	get hasPosition() { return this.position != NumericEnum.Void; }
	get hasWeight() { return this.weight != NumericEnum.Void; }
	get hasIndex() { return this.index != IndexEnum.Void; }

	get texture() { return BitUtils.extractEnum<NumericEnum>(this.value, 0, 2); }
	get color() { return BitUtils.extractEnum<ColorEnum>(this.value, 2, 3); }
	get normal() { return BitUtils.extractEnum<NumericEnum>(this.value, 5, 2); }
	get position() { return BitUtils.extractEnum<NumericEnum>(this.value, 7, 2); }
	get weight() { return BitUtils.extractEnum<NumericEnum>(this.value, 9, 2); }
	get index() { return BitUtils.extractEnum<IndexEnum>(this.value, 11, 2); }
	get weightCount() { return BitUtils.extract(this.value, 14, 3); }
	get morphingVertexCount() { return BitUtils.extract(this.value, 18, 2); }
	get transform2D() { return BitUtils.extractEnum<boolean>(this.value, 23, 1); }

	get weightSize() { return this.NumericEnumGetSize(this.weight); }
	get colorSize() { return this.ColorEnumGetSize(this.color); }
	get textureSize() { return this.NumericEnumGetSize(this.texture); }
	get positionSize() { return this.NumericEnumGetSize(this.position); }
	get normalSize() { return this.NumericEnumGetSize(this.normal); }

	private IndexEnumGetSize(item: IndexEnum) {
		switch (item) {
			case IndexEnum.Void: return 0;
			case IndexEnum.Byte: return 1;
			case IndexEnum.Short: return 2;
			default: throw ("Invalid enum");
		}
	}

	private NumericEnumGetSize(item: NumericEnum) {
		switch (item) {
			case NumericEnum.Void: return 0;
			case NumericEnum.Byte: return 1;
			case NumericEnum.Short: return 2;
			case NumericEnum.Float: return 4;
			default: throw ("Invalid enum");
		}
	}

	private ColorEnumGetSize(item: ColorEnum) {
		switch (item) {
			case ColorEnum.Void: return 0;
			case ColorEnum.Color5650: return 2;
			case ColorEnum.Color5551: return 2;
			case ColorEnum.Color4444: return 2;
			case ColorEnum.Color8888: return 4;
			default: throw ("Invalid enum");
		}
	}


	private GetMaxAlignment() {
		return Math.max(this.weightSize, this.colorSize, this.textureSize, this.positionSize, this.normalSize);
	}

	get realWeightCount() {
		return this.weightCount + 1;
	}

	get realMorphingVertexCount() {
		return this.morphingVertexCount + 1;
	}

	private getVertexSize() {
		var size = 0;
		size = MathUtils.nextAligned(size, this.weightSize); size += this.realWeightCount * this.weightSize;
		size = MathUtils.nextAligned(size, this.textureSize); size += this.textureComponentCount * this.textureSize;
		size = MathUtils.nextAligned(size, this.colorSize); size += 1 * this.colorSize;
		size = MathUtils.nextAligned(size, this.normalSize); size += 3 * this.normalSize;
		size = MathUtils.nextAligned(size, this.positionSize); size += 3 * this.positionSize;

		var alignmentSize = this.GetMaxAlignment();
		size = MathUtils.nextAligned(size, alignmentSize);

		//Console.WriteLine("Size:" + Size);
		return size;
	}

	read(memory: Memory, count: number) {
		//console.log('read vertices ' + count);
		var vertices = [];
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
}

export class Matrix4x4 {
	index = 0;
	values = mat4.create();

	put(value: number) {
		this.values[this.index++] = value;
	}

	reset(startIndex: number) {
		this.index = startIndex;
	}
}

export class Matrix4x3 {
	index = 0;
	values = mat4.create();
	static indices = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14];

	put(value: number) {
		this.values[Matrix4x3.indices[this.index++]] = value;
	}

	reset(startIndex: number) {
		this.index = startIndex;
	}
}

export class ViewPort {
	x1 = 0;
	y1 = 0;
	x2 = 512;
	y2 = 272;

	get width() { return this.x2 - this.x1; }
	get height() { return this.y2 - this.y1; }
}

export class Light {
	enabled = false;
}

export class Lightning {
	enabled = false;
	lights = [new Light(), new Light(), new Light(), new Light()];
}

export class MipmapState {
	address = 0;
	bufferWidth = 0;
	textureWidth = 0;
	textureHeight = 0;
}

export class ColorState {
	r = 1;
	g = 1;
	b = 1;
	a = 1;
}

export class ClutState {
	info: number;
	adress = 0;
	numberOfColors = 0;
	pixelFormat = PixelFormat.RGBA_8888;
	shift = 0;
	mask = 0x00;
	start = 0;
}

export class TextureState {
	enabled = false;
	swizzled = false;
	mipmapShareClut = false;
	mipmapMaxLevel = 0;
	filterMinification = TextureFilter.Nearest;
	filterMagnification = TextureFilter.Nearest;
	wrapU = WrapMode.Repeat;
	offsetU = 0;
	offsetV = 0;
	scaleU = 1;
	scaleV = 1;
	wrapV = WrapMode.Repeat;
	effect = TextureEffect.Modulate;
	colorComponent = TextureColorComponent.Rgb;
	envColor = new ColorState();
	fragment2X = false;
	pixelFormat = PixelFormat.RGBA_8888;
	clut = new ClutState();
	mipmaps = [new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState()];
}

export class CullingState {
	enabled: boolean;
	direction: CullingDirection;
}

export class LightingState {
	ambientLightColor = new ColorState();
}

export enum TestFunctionEnum {
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
	func = TestFunctionEnum.Always;
	enabled = false;
}

export enum ShadingModelEnum {
	Flat = 0,
	Smooth = 1,
}

export enum GuBlendingFactor {
	GU_SRC_COLOR                     = 0,// = 0x0300,
	GU_ONE_MINUS_SRC_COLOR           = 1,// = 0x0301,
	GU_SRC_ALPHA                     = 2,// = 0x0302,
	GU_ONE_MINUS_SRC_ALPHA           = 3,// = 0x0303,
	GU_DST_ALPHA                     = 4,// = 0x0304,
	GU_ONE_MINUS_DST_ALPHA           = 5,// = 0x0305,
	GU_FIX = 10,
}
	
export enum GuBlendingEquation {
	Add = 0,
	Substract = 1,
	ReverseSubstract = 2,
	Min = 3,
	Max = 4,
	Abs = 5,
}

export class Blending {
	enabled = false;
	functionSource = GuBlendingFactor.GU_SRC_ALPHA;
	functionDestination = GuBlendingFactor.GU_ONE_MINUS_DST_ALPHA;
	equation = GuBlendingEquation.Add;
}

export class AlphaTest {
	enabled = false;
	value = 0;
	mask = 0xFF;
	func = TestFunctionEnum.Always;
}

export class GpuState {
	clearing = false;
	clearFlags = 0;
	baseAddress = 0;
	baseOffset = 0;
	indexAddress = 0;
	shadeModel = ShadingModelEnum.Flat;
	frameBuffer = new GpuFrameBufferState();
	vertex = new VertexState();
	projectionMatrix = new Matrix4x4();
	viewMatrix = new Matrix4x3();
	worldMatrix = new Matrix4x3();
	viewPort = new ViewPort();
	lightning = new Lightning();
	alphaTest = new AlphaTest();
	blending = new Blending();
	texture = new TextureState();
	ambientModelColor = new ColorState();
	lighting = new LightingState();
	diffuseModelColor = new ColorState();
	specularModelColor = new ColorState();
	culling = new CullingState();
	depthTest = new DepthTestState();
	drawPixelFormat = PixelFormat.RGBA_8888;
}

export enum WrapMode {
	Repeat = 0,
	Clamp = 1,
}

export enum TextureEffect {
	Modulate = 0,  // GU_TFX_MODULATE
	Decal = 1,     // GU_TFX_DECAL
	Blend = 2,     // GU_TFX_BLEND
	Replace = 3,   // GU_TFX_REPLACE
	Add = 4,	   // GU_TFX_ADD
}

export enum TextureFilter {
	Nearest = 0,
	Linear = 1,
	NearestMipmapNearest = 4,
	LinearMipmapNearest = 5,
	NearestMipmapLinear = 6,
	LinearMipmapLinear = 7,
}

export enum TextureColorComponent {
	Rgb = 0,    // GU_TCC_RGB
	Rgba = 1,   // GU_TCC_RGBA
}

export enum PrimitiveType {
	Points = 0,
	Lines = 1,
	LineStrip = 2,
	Triangles = 3,
	TriangleStrip = 4,
	TriangleFan = 5,
	Sprites = 6,
	ContinuePreviousPrim = 7,
}

