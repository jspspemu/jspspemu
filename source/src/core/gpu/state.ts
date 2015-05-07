///<reference path="../../global.d.ts" />

import _memory = require('../memory');
import _pixelformat = require('../pixelformat');

import Memory = _memory.Memory;
import PixelFormat = _pixelformat.PixelFormat;

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
	_widthHighAddress = -1;

	lowAddress = 0;
	highAddress = 0;
	width = 0;
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

export class Vertex {
	px = 0.0; py = 0.0; pz = 0.0;
	nx = 0.0; ny = 0.0; nz = 0.0;
	tx = 0.0; ty = 0.0; tz = 0.0;
	r = 0.0; g = 0.0; b = 0.0; a = 1.0;
	w0 = 0.0; w1 = 0.0; w2 = 0.0; w3 = 0.0;
	w4 = 0.0; w5 = 0.0; w6 = 0.0; w7 = 0.0;

	copyFromBasic(that: Vertex) {
		this.px = that.px; this.py = that.py; this.pz = that.pz;
		this.tx = that.tx; this.ty = that.ty; this.tz = that.tz;
		this.r = that.r; this.g = that.g; this.b = that.b; this.a = that.a;
		return this;
	}

	copyFrom(that: Vertex) {
		this.copyFromBasic(that);
		this.nx = that.nx; this.ny = that.ny; this.nz = that.nz;
		this.w0 = that.w0; this.w1 = that.w1; this.w2 = that.w2; this.w3 = that.w3;
		this.w4 = that.w4; this.w5 = that.w5; this.w6 = that.w6; this.w7 = that.w7;
		return this;
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
	weightOffset:number = 0;
	textureOffset:number = 0;
	colorOffset:number = 0;
	normalOffset:number = 0;
	positionOffset:number = 0;
	
	oneWeightOffset(n:number) {
		return this.weightOffset + this.weightSize * n; 
	}

	clone() {
		var that = new VertexState();
		that.address = this.address;
		that._value = this._value;
		that.reversedNormal = this.reversedNormal;
		that.textureComponentCount = this.textureComponentCount;
		that.size = this.size;
		that.weightOffset = this.weightOffset;
		that.textureOffset = this.textureOffset;
		that.colorOffset = this.colorOffset;
		that.normalOffset = this.normalOffset;
		that.positionOffset = this.positionOffset;
		return that;
	}

	getValue() { return this._value; }

	setValue(value: number) {
		this._value = value;
		this.size = this.getVertexSize();
	}

	//getReader() { return VertexReaderFactory.get(this.size, this.texture, this.color, this.normal, this.position, this.weight, this.index, this.realWeightCount, this.realMorphingVertexCount, this.transform2D, this.textureComponentCount); }

	get hash() {
		return this._value + (this.textureComponentCount * Math.pow(2, 24));
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
			realWeightCount: this.realWeightCount,
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
	
	get positionComponents() { return 3; }
	get normalComponents() { return 3; }
	get textureComponents() { return 2; }
	get colorComponents() { return 4; }

	get texture() { return BitUtils.extractEnum<NumericEnum>(this._value, 0, 2); }
	get color() { return BitUtils.extractEnum<ColorEnum>(this._value, 2, 3); }
	get normal() { return BitUtils.extractEnum<NumericEnum>(this._value, 5, 2); }
	get position() { return BitUtils.extractEnum<NumericEnum>(this._value, 7, 2); }
	get weight() { return BitUtils.extractEnum<NumericEnum>(this._value, 9, 2); }
	get index() { return BitUtils.extractEnum<IndexEnum>(this._value, 11, 2); }
	get weightCount() { return BitUtils.extract(this._value, 14, 3); }
	get morphingVertexCount() { return BitUtils.extract(this._value, 18, 2); }
	get transform2D() { return BitUtils.extractBool(this._value, 23); }

	set texture(value: NumericEnum) { this._value = BitUtils.insert(this._value, 0, 2, value); }
	set color(value: ColorEnum) { this._value = BitUtils.insert(this._value, 2, 3, value); }
	set normal(value: NumericEnum) { this._value = BitUtils.insert(this._value, 5, 2, value); }
	set position(value: NumericEnum) { this._value = BitUtils.insert(this._value, 7, 2, value); }
	set weight(value: NumericEnum) { this._value = BitUtils.insert(this._value, 9, 2, value); }
	set index(value: IndexEnum) { this._value = BitUtils.insert(this._value, 11, 2, value); }
	set weightCount(value: number) { this._value = BitUtils.insert(this._value, 14, 3, value); }
	set morphingVertexCount(value: number) { this._value = BitUtils.insert(this._value, 18, 2, value); }
	set transform2D(value: boolean) { this._value = BitUtils.insert(this._value, 23, 1, value ? 1 : 0); }

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
		return this.hasWeight ? (this.weightCount + 1) : 0;
	}

	get realMorphingVertexCount() {
		return this.morphingVertexCount + 1;
	}

	private getVertexSize() {
		var size = 0;

		size = MathUtils.nextAligned(size, this.weightSize);
		this.weightOffset = size;
		size += this.realWeightCount * this.weightSize;

		size = MathUtils.nextAligned(size, this.textureSize);
		this.textureOffset = size;
		size += this.textureComponentCount * this.textureSize;

		size = MathUtils.nextAligned(size, this.colorSize);
		this.colorOffset = size;
		size += 1 * this.colorSize;
		
		size = MathUtils.nextAligned(size, this.normalSize);
		this.normalOffset = size;
		size += 3 * this.normalSize;
		
		size = MathUtils.nextAligned(size, this.positionSize);
		this.positionOffset = size;
		size += 3 * this.positionSize;

		var alignmentSize = this.GetMaxAlignment();
		size = MathUtils.nextAligned(size, alignmentSize);

		//Console.WriteLine("Size:" + Size);
		return size;
	}

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
}

export class Matrix4x4 {
	index = 0;
	values = mat4.create();

	constructor() {
		//for (var n = 0; n < 16; n++) this.values[n] = -1;
	}

	check(value: number) {
		var check = (this.values[this.index] == value);
		if (check) this.index++;
		return check;
	}

	put(value: number) {
		this.values[this.index++] = value;
	}

	getAt(index: number, value: number) {
		return this.values[index];
	}

	putAt(index:number, value: number) {
		this.values[index] = value;
	}

	reset(startIndex: number) {
		this.index = startIndex;
	}
}

export class Matrix4x3 {
	index = 0;
	values = mat4.create();
	static indices = new Int32Array([
		0, 1, 2,
		4, 5, 6,
		8, 9, 10,
		12, 13, 14
	]);

	check(value: number) {
		var check = (this.values[Matrix4x3.indices[this.index]] == value);
		if (check) this.index++;
		return check;
	}

	put(value: number) {
		this.putAt(this.index++, value);
	}

	getAt(index: number) {
		return this.values[Matrix4x3.indices[index]];
	}

	putAt(index: number, value: number) {
		this.values[Matrix4x3.indices[index]] = value;
	}

	reset(startIndex: number) {
		this.index = startIndex;
	}
}

export class ViewPort {
	x = 2048;
	y = 2048;
	z = 0;
	width = 256;
	height = 136;
	depth = 0;
}

export class Region {
	_xy1 = -1;
	_xy2 = -1;
	x1 = 0;
	y1 = 0;
	x2 = 512;
	y2 = 272;
}

export class Light {
	_type = -1;
	_specularColor = -1;
	_diffuseColor = -1;
	_ambientColor = -1;

	enabled = false;
	kind = LightModelEnum.SingleColor;
	type = LightTypeEnum.Directional;
	cutoff = 0;
	px = 0; py = 0; pz = 0; pw = 1;
	dx = 0; dy = 0; dz = 0; dw = 1;
	spotExponent = 0;
	spotCutoff = 0;
	constantAttenuation = 0;
	linearAttenuation = 0;
	quadraticAttenuation = 0;
	ambientColor = new Color();
	diffuseColor = new Color();
	specularColor = new Color();
}

export enum LightTypeEnum { Directional = 0, PointLight = 1, SpotLight = 2 }
export enum LightModelEnum { SingleColor = 0, SeparateSpecularColor = 1 }

export class Lightning {
	_ambientLightColor = -1;
	_ambientLightColorAlpha = -1;
	enabled = false;
	lights = [new Light(), new Light(), new Light(), new Light()];
	lightModel = LightModelEnum.SeparateSpecularColor;
	specularPower = 1;
	ambientLightColor = new ColorState();
}

export class MipmapState {
	tsizeValue = -1;
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
	address = 0;
	numberOfColors = 0;
	pixelFormat = PixelFormat.RGBA_8888;
	shift = 0;
	mask = 0x00;
	start = 0;
}

export enum TextureProjectionMapMode {
	GU_POSITION = 0, // TMAP_TEXTURE_PROJECTION_MODE_POSITION - 3 texture components
	GU_UV = 1, // TMAP_TEXTURE_PROJECTION_MODE_TEXTURE_COORDINATES - 2 texture components
	GU_NORMALIZED_NORMAL = 2, // TMAP_TEXTURE_PROJECTION_MODE_NORMALIZED_NORMAL - 3 texture components
	GU_NORMAL = 3, // TMAP_TEXTURE_PROJECTION_MODE_NORMAL - 3 texture components
}

export enum TextureMapMode {
	GU_TEXTURE_COORDS = 0,
	GU_TEXTURE_MATRIX = 1,
	GU_ENVIRONMENT_MAP = 2,
}

export enum TextureLevelMode { Auto = 0, Const = 1, Slope = 2 }


export class TextureState {
	tmode = -1;
	tflt = -1;
	twrap = -1;
	tmap = -1;
	_envColor = -1;
	_tfunc = -1;
	_shadeUV = -1;
	_tbias = -1;

	enabled = false;
	swizzled = false;
	matrix = new Matrix4x4();
	mipmapShareClut = false;
	mipmapMaxLevel = 0;
	filterMinification = TextureFilter.Nearest;
	filterMagnification = TextureFilter.Nearest;
	wrapU = WrapMode.Repeat;
	offsetU = 0;
	offsetV = 0;
	scaleU = 1;
	scaleV = 1;
	shadeU = 0;
	shadeV = 0;
	wrapV = WrapMode.Repeat;
	effect = TextureEffect.Modulate;
	colorComponent = TextureColorComponent.Rgb;
	envColor = new ColorState();
	fragment2X = false;
	pixelFormat = PixelFormat.RGBA_8888;
	clut = new ClutState();
	mipmaps = [new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState(), new MipmapState()];
	textureProjectionMapMode = TextureProjectionMapMode.GU_NORMAL;
	textureMapMode = TextureMapMode.GU_TEXTURE_COORDS;
	slopeLevel = 0;
	levelMode = TextureLevelMode.Auto;
	mipmapBias = 1.0;

	getTextureComponentsCount() {
		switch (this.textureMapMode) {
			default: throw(new Error("Invalid textureMapMode"));
			case TextureMapMode.GU_TEXTURE_COORDS: return 2;
			case TextureMapMode.GU_TEXTURE_MATRIX:
				switch (this.textureProjectionMapMode) {
					case TextureProjectionMapMode.GU_NORMAL: return 3;
					case TextureProjectionMapMode.GU_NORMALIZED_NORMAL: return 3;
					case TextureProjectionMapMode.GU_POSITION: return 3;
					case TextureProjectionMapMode.GU_UV: return 2;
					default: return 2;
				}
				break;
			case TextureMapMode.GU_ENVIRONMENT_MAP: return 2;
		}
	}
}

export class CullingState {
	enabled = false;
	direction = CullingDirection.ClockWise;
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
	updated = false;
	enabled = false;
	func = TestFunctionEnum.Always;
	mask = 0;
	rangeFar = 1;
	rangeNear = 0;
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

export class Color {
	public constructor(public r = 0, public g = 0, public b = 0, public a = 1) {
	}

	setRGB(rgb: number) {
		this.r = BitUtils.extractScale1f(rgb, 0, 8);
		this.g = BitUtils.extractScale1f(rgb, 8, 8);
		this.b = BitUtils.extractScale1f(rgb, 16, 8);
		this.a = 1;
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
	_alpha = -1;
	_colorMask = -1;
	_colorMaskA = -1;
	enabled = false;
	updated = false;
	functionSource = GuBlendingFactor.GU_SRC_ALPHA;
	functionDestination = GuBlendingFactor.GU_ONE_MINUS_DST_ALPHA;
	equation = GuBlendingEquation.Add;
	_fixColorSourceWord = -1;
	_fixColorDestinationWord = -1;
	fixColorSource: Color = new Color();
	fixColorDestination: Color = new Color();
	colorMask = { r: 0, g: 0, b: 0, a: 0 };
}

export class AlphaTest {
	_atst = -1;
	enabled = false;
	value = 0;
	mask = 0xFF;
	func = TestFunctionEnum.Always;
}

export class Rectangle {
	constructor(public top:number, public left:number, public right:number, public bottom:number) {
	}

	get width() { return this.right - this.left; }
	get height() { return this.bottom - this.top; }
}

export class ClipPlane {
	updated = false;
	enabled = true;
	scissor = new Rectangle(0, 0, 512, 272);
	_scissorLeftTop = -1;
	_scissorRightBottom = -1;
}

export class SkinningState {
	_currentBoneIndex = 0;
	boneMatrices = [new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3(), new Matrix4x3()];
	linear = new Float32Array(96);

	_currentBoneMatrix = 0;
	_currentBoneMatrixIndex = 0;

	setCurrentBoneIndex(index: number) {
		this._currentBoneIndex = index;
		this._currentBoneMatrix = ToInt32(this._currentBoneIndex / 12);
		this._currentBoneMatrixIndex = ToInt32(this._currentBoneIndex % 12);
	}

	_increment() {
		this._currentBoneMatrixIndex++;
		this._currentBoneIndex++;
		if (this._currentBoneMatrixIndex >= 12) {
			this._currentBoneMatrix++;
			this._currentBoneMatrixIndex = 0;
		}
	}

	check(value: number) {
		var check = (this.linear[this._currentBoneIndex] == value);
		if (check) this._increment();
		return check;
	}

	write(value: number) {
		this.linear[this._currentBoneIndex] = value;
		this.boneMatrices[this._currentBoneMatrix].putAt(this._currentBoneMatrixIndex, value);
		this._increment();
	}
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
	stst = -1;
	sop = -1;

	enabled = false;
	fail = StencilOperationEnum.Keep;
	zpass = StencilOperationEnum.Keep;
	zfail = StencilOperationEnum.Keep;
	func = TestFunctionEnum.Always;
	funcRef = 0;
	funcMask = 0;
}

export class PatchState {
	_divst = -1;
	divs = 0;
	divt = 0;
}

export class Fog {
	_color = -1;

	enabled = false;
	far = 0;
	dist = 1;
	color = new Color();
}

export class LogicOp {
	enabled = false;
}

export class LineSmoothState {
	enabled = false;
}

export class PatchCullingState {
	enabled = false;
	faceFlag = false;
}

export class GpuState {
	getAddressRelativeToBase(relativeAddress: number) { return (this.baseAddress | relativeAddress); }
	getAddressRelativeToBaseOffset(relativeAddress: number) { return ((this.baseAddress | relativeAddress) + this.baseOffset); }

	_clearingWord = -1;
	_ambientModelColor = -1;
	_ambientModelColorAlpha = -1;
	_ambientLightColorAlpha = -1;
	_diffuseModelColor = -1;
	_specularModelColor = -1;

	clearing = false;
	clearFlags = 0;
	baseAddress = 0;
	baseOffset = 0;
	indexAddress = 0;
	shadeModel = ShadingModelEnum.Flat;
	frameBuffer = new GpuFrameBufferState();
	vertex = new VertexState();
	stencil = new StencilState();
	skinning = new SkinningState();
	morphWeights = [1, 0, 0, 0, 0, 0, 0, 0];
	projectionMatrix = new Matrix4x4();
	viewMatrix = new Matrix4x3();
	worldMatrix = new Matrix4x3();
	viewport = new ViewPort();
	region = new Region();
	offset = { x: 0, y: 0 };
	fog = new Fog();
	clipPlane = new ClipPlane();
	logicOp = new LogicOp();
	lightning = new Lightning();
	alphaTest = new AlphaTest();
	blending = new Blending();
	patch = new PatchState();
	texture = new TextureState();
	lineSmoothState = new LineSmoothState();
	patchCullingState = new PatchCullingState();
	ambientModelColor = new ColorState();
	diffuseModelColor = new ColorState();
	specularModelColor = new ColorState();
	culling = new CullingState();
	dithering = new DitheringState();
	colorTest = new ColorTestState();
	depthTest = new DepthTestState();
	drawPixelFormat = PixelFormat.RGBA_8888;
}

export class ColorTestState {
	enabled = false;
}

export class DitheringState {
	enabled = false;
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

