///<reference path="../../global.d.ts" />

import _memory = require('../memory');
import _display = require('../display');
import _pixelformat = require('../pixelformat');
import _opcodes = require('./gpu_opcodes');
import _state = require('./gpu_state');
import _driver = require('./gpu_driver');
import _vertex = require('./gpu_vertex');
import _cpu = require('../cpu'); _cpu.CpuState;
import _IndentStringGenerator = require('../../util/IndentStringGenerator');

import DisplayListStatus = _state.DisplayListStatus;
import CpuState = _cpu.CpuState;
import PixelFormat = _pixelformat.PixelFormat;
import IPspDisplay = _display.IPspDisplay;
import Memory = _memory.Memory;
import IDrawDriver = _driver.BaseDrawDriver;
import ColorEnum = _state.ColorEnum;
import WebGlPspDrawDriver = require('./webgl/webgl_driver');
import Op = _opcodes.GpuOpCodes;
import PrimitiveType = _state.PrimitiveType;
import IndexEnum = _state.IndexEnum;

export interface CpuExecutor {
	execute(state: CpuState, address: number, gprArray: number[]): void;
}

export interface IPspGpu {
    startAsync(): Promise2<void>;
    stopAsync(): Promise2<void>;

    listEnqueue(start: number, stall: number, callbackId: number, argsPtr: Stream): void;
	listSync(displayListId: number, syncType: _state.SyncType): void;
    updateStallAddr(displayListId: number, stall: number): void;
	drawSync(syncType: _state.SyncType): void;
}

var optimizedDrawBuffer = new _vertex.OptimizedDrawBuffer();
var singleCallTest = false;

const enum PrimDrawType {
	SINGLE_DRAW = 0,
	BATCH_DRAW = 1,
	BATCH_DRAW_DEGENERATE = 2,
}

var DRAW_TYPE_CONV = [
	PrimDrawType.BATCH_DRAW, // Points = 0
	PrimDrawType.BATCH_DRAW, // Lines = 1,
	PrimDrawType.BATCH_DRAW_DEGENERATE, // LineStrip = 2,
	PrimDrawType.BATCH_DRAW, // Triangles = 3,
	PrimDrawType.BATCH_DRAW_DEGENERATE, // TriangleStrip = 4,
	PrimDrawType.SINGLE_DRAW, // TriangleFan = 5,
	PrimDrawType.BATCH_DRAW, // Sprites = 6,
];

function bool1(p: number) { return p != 0; }
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

var canDOMCreateElements = (typeof document != 'undefined');

interface OverlaySection {
	element:HTMLElement;
	update():void;
	reset():void;
}

class OverlayCounter<T> implements OverlaySection {
	public value: T;
	public element:HTMLElement;
	constructor(public name: string, private resetValue: T, private representer?: (v: T) => any) {
		this.reset();
		if (canDOMCreateElements) {
			this.element = document.createElement('div');
		}
	}
	update() {
		if (this.element) this.element.innerHTML = `${this.name}: ${this.representedValue}`;
	}
	get representedValue() {
		return this.representer ? this.representer(this.value) : this.value;
	}
	reset() {
		this.value = this.resetValue;
	}
}

class OverlayIntent implements OverlaySection {
	public element:HTMLButtonElement;
	constructor(text:string, action: () => void) {
		if (canDOMCreateElements) {
			this.element = document.createElement('button');
			this.element.innerHTML = text;
			this.element.onclick = e => action();
		}
	}
	update() {
	}
	reset() {
	}
}

class OverlaySlider implements OverlaySection {
	public element: HTMLInputElement;
	constructor(text:string, initialRatio:number, action: (value:number) => void) {
		if (canDOMCreateElements) {
			this.element = document.createElement('input');
			this.element.type = 'range';
			this.element.min =`0`;
			this.element.max = `1000`;
			this.element.value = `${initialRatio * 1000}`;
			//this.element.innerHTML = text;
			var lastReportedValue = NaN;
			var report = (e: any) => {
				if (this.ratio == lastReportedValue) return;
				lastReportedValue = this.ratio;
				action(this.ratio);
			};
			this.element.onmousemove = report;
			this.element.onchange = report;
		}
	}
	set ratio(value:number) {
		this.value = value * 1000;
	}
	get ratio() {
		return (this.value / 1000);
	}
	set value(v:number) {
		this.element.value = `${v}`;
	}
	get value() {
		return +this.element.value;
	}
	update() {
	}
	reset() {
	}
}

class Overlay {
	private element: HTMLDivElement;
	private sections: OverlaySection[] = [];

	constructor() {
		var element = this.element = canDOMCreateElements ? document.createElement('div') : null;
		if (element) {
			element.style.position = 'absolute';
			element.style.zIndex = '10000';
			element.style.top = '0';
			element.style.right = '0';
			element.style.background = 'rgba(0, 0, 0, 0.3)';
			element.style.font = '12px Arial';
			element.style.width = '200px';
			element.style.height = 'auto';
			element.style.padding = '4px';
			element.style.color = 'white';
			document.body.appendChild(element);
		}
	}
	
	private addElement<T extends OverlaySection>(element:T):T {
		this.sections.push(element);
		if (this.element) {
			this.element.appendChild(element.element);
		}
		return element;
	}

	createCounter<T>(name: string, resetValue: T, representer?: (v: T) => any): OverlayCounter<T> {
		return this.addElement(new OverlayCounter(name, resetValue, representer));
	}
	
	createIntent(text: string, action: () => void) {
		return this.addElement(new OverlayIntent(text, action));
	}

	createSlider(text: string, initialRatio:number, action: (value:number) => void) {
		return this.addElement(new OverlaySlider(text, initialRatio, action));
	}
	
	update() {
		for (let section of this.sections) section.update();
	}

	private reset() {
		for (let s of this.sections) s.reset();
	}

	updateAndReset() {
		this.update();
		this.reset();
	}
}

var overlay = new Overlay();
var overlayBatchSlider = overlay.createSlider('batch', 1.0, (ratio) => {
	//console.log(ratio);
});
var overlayIndexCount = overlay.createCounter('indexCount', 0, numberToSeparator);
var overlayNonIndexCount = overlay.createCounter('nonIndexCount', 0, numberToSeparator);
var overlayVertexCount = overlay.createCounter('vertexCount', 0, numberToSeparator);
var trianglePrimCount = overlay.createCounter('trianglePrimCount', 0, numberToSeparator);
var triangleStripPrimCount = overlay.createCounter('triangleStripPrimCount', 0, numberToSeparator);
var spritePrimCount = overlay.createCounter('spritePrimCount', 0, numberToSeparator);
var otherPrimCount = overlay.createCounter('otherPrimCount', 0, numberToSeparator);
var hashMemoryCount = overlay.createCounter('hashMemoryCount', 0, numberToSeparator);
var hashMemorySize = overlay.createCounter('hashMemorySize', 0, numberToFileSize);
var totalCommands = overlay.createCounter('totalCommands', 0, numberToSeparator);
var totalStalls = overlay.createCounter('totalStalls', 0, numberToSeparator);
var primCount = overlay.createCounter('primCount', 0, numberToSeparator);
var batchCount = overlay.createCounter('batchCount', 0, numberToSeparator);
var timePerFrame = overlay.createCounter('time', 0, (v) => `${v.toFixed(0) } ms`);

var globalDriver: IDrawDriver;
var freezing = new WatchValue(false);

overlay.createIntent('toggle colors', () => {
	if (globalDriver) globalDriver.enableColors = !globalDriver.enableColors; 
});

overlay.createIntent('toggle antialiasing', () => {
	if (globalDriver) globalDriver.antialiasing = !globalDriver.antialiasing; 
});

overlay.createIntent('toggle textures', () => {
	if (globalDriver) globalDriver.enableTextures = !globalDriver.enableTextures; 
});

overlay.createIntent('toggle skinning', () => {
	if (globalDriver) globalDriver.enableSkinning = !globalDriver.enableSkinning; 
});

overlay.createIntent('toggle bilinear', () => {
	if (globalDriver) globalDriver.enableBilinear = !globalDriver.enableBilinear; 
});

overlay.createIntent('freeze', () => {
	freezing.value = !freezing.value;
});

var dumpFrameCommands = false;
var dumpFrameCommandsList:string[] = [];
overlay.createIntent('dump frame commands', () => {
	dumpFrameCommands = true;
});

overlay.createIntent('x1', () => {
	if (globalDriver) globalDriver.setFramebufferSize(480 * 1, 272 * 1);
});

overlay.createIntent('x2', () => {
	if (globalDriver) globalDriver.setFramebufferSize(480 * 2, 272 * 2);
});

overlay.createIntent('x3', () => {
	if (globalDriver) globalDriver.setFramebufferSize(480 * 3, 272 * 3);
});

overlay.createIntent('x4', () => {
	if (globalDriver) globalDriver.setFramebufferSize(480 * 4, 272 * 4);
});

class PspGpuList {
    current4: number;
    stall4: number;
	callbackId: number;
	argsPtr: Stream;
    completed: boolean = false;
	status = DisplayListStatus.Paused;
	private promise: Promise2<any>;
	private promiseResolve: Function;
	private promiseReject: Function;
	errorCount: number = 0;

	constructor(public id: number, public memory: Memory, public drawDriver: IDrawDriver, private runner: PspGpuListRunner, public gpu: PspGpu, public cpuExecutor: CpuExecutor, public state: _state.GpuState) {
    }

    complete() {
        this.completed = true;
		this.runner.deallocate(this);
		this.promiseResolve(0);
    }

	callstack = new Int32Array(1024);
	callstackIndex = 0;

	primBatchPrimitiveType: number = -1;

	finishPrimBatch() {
		if (optimizedDrawBuffer.hasElements) {
			this.batchPrimCount = 0;
			var batch = optimizedDrawBuffer.createBatch(this.state, this.primBatchPrimitiveType, this.vertexInfo);
			this.drawDriver.queueBatch(batch);
			if (dumpFrameCommands) dumpFrameCommandsList.push(`<BATCH:${batch.indexCount}>`);
			this.primBatchPrimitiveType = -1;
			batchCount.value++;
		}
	}

	batchPrimCount = 0;
	//private showOpcodes = true;
	private showOpcodes = false;
	private opcodes: string[] = [];
	finish() {
	}

	private get isStalled() {
		return ((this.stall4 != 0) && (this.current4 >= this.stall4));
	}


    private get hasMoreInstructions() {
		return !this.completed && !this.isStalled;
		//return !this.completed && ((this.stall == 0) || (this.current < this.stall));
	}
	
	private gpuHang() {
		console.error('GPU hang!');
		debugger;
	}

	private runUntilStallInner() {
		let memory = this.memory;
		//let showOpcodes = this.showOpcodes;
		let stall4 = this.stall4;
		let state = this.state;
		let totalCommandsLocal = 0;
		let current4 = this.current4;
		let localPrimCount = 0;
		//let startTime = 0;
		if (stall4 == 0) stall4 = 0x7FFFFFFF;

		loop: while (current4 < stall4) {
			totalCommandsLocal++;
			let instructionPC4 = current4++;
			let instruction = memory.lw_2(instructionPC4);
			let op = (instruction >> 24) & 0xFF;
			let p = instruction & 0xFFFFFF;
			
			if (totalCommandsLocal >= 30000) {
				this.gpuHang();
				totalCommandsLocal = 0;
				break;
			}
			
			if (dumpFrameCommands) {
				dumpFrameCommandsList.push(`${Op[op]}:${addressToHex(p)}`);
			}

			switch (op) {
				case Op.PRIM: {
					var rprimCount = 0;

					this.current4 = current4;
					localPrimCount++;
					let primitiveType = <PrimitiveType>param3(p, 16);
					if (this.primBatchPrimitiveType != primitiveType) this.finishPrimBatch();
					if (this.prim(param24(p)) == PrimAction.FLUSH_PRIM) {
						this.finishPrimBatch();
					}
					current4 = this.current4;
					break;
				}
				case Op.BEZIER:
					this.finishPrimBatch();
					this.bezier(param24(p));
					break;
				case Op.END:
					this.finishPrimBatch();
					this.gpu.driver.end();
					this.complete();
					break loop;
				case Op.TFLUSH: this.drawDriver.textureFlush(state); this.finishPrimBatch(); break;
				case Op.TSYNC: this.drawDriver.textureSync(state); break;
				case Op.NOP: break;
				case Op.DUMMY: break;
				case Op.JUMP:
				case Op.CALL:
					if (op == Op.CALL) {
						this.callstack[this.callstackIndex++] = ((instructionPC4 << 2) + 4);
						this.callstack[this.callstackIndex++] = (((state.baseOffset >>> 2) & Memory.MASK));
					}
					current4 = (((this.state.baseAddress + (param24(p) & ~3))) >> 2) & Memory.MASK;
					break;
				case Op.RET:
					if (this.callstackIndex > 0 && this.callstackIndex < 1024) {
						state.baseOffset = this.callstack[--this.callstackIndex];
						current4 = ((this.callstack[--this.callstackIndex] >>> 2) & Memory.MASK);
					} else {
						console.info('gpu callstack empty or overflow');
					}
					break;
				case Op.FINISH: {
					this.finish();
					let callback = this.gpu.callbacks.get(this.callbackId);
					if (callback && callback.cpuState && callback.finishFunction) {
						this.cpuExecutor.execute(callback.cpuState, callback.finishFunction, [param24(p), callback.finishArgument]);
					}
					break;
				}
				case Op.SIGNAL: console.warn('Not implemented: GPU SIGNAL'); break;
				
				//case Op.PROJMATRIXNUMBER: console.log(state.projectionMatrix); break;
				case Op.PROJMATRIXDATA: state.writeFloat(Op.PROJMATRIXNUMBER, Op.MAT_PROJ, float1(p)); break;
				case Op.VIEWMATRIXDATA: state.writeFloat(Op.VIEWMATRIXNUMBER, Op.MAT_VIEW, float1(p)); break;
				case Op.WORLDMATRIXDATA: state.writeFloat(Op.WORLDMATRIXNUMBER, Op.MAT_WORLD, float1(p)); break;
				case Op.BONEMATRIXDATA: state.writeFloat(Op.BONEMATRIXNUMBER, Op.MAT_BONES, float1(p)); break;
				case Op.TGENMATRIXDATA: state.writeFloat(Op.TGENMATRIXNUMBER, Op.MAT_TEXTURE, float1(p)); break;
				
				// No invalidate prim
				case Op.BASE:
				case Op.IADDR:
				case Op.VADDR:
				case Op.OFFSETADDR:
					break;

				default: if (state.data[op] != p) this.finishPrimBatch(); break;
			}
			state.data[op] = p;
		}

		this.current4 = current4;
		totalStalls.value++;
		primCount.value += localPrimCount;
		totalCommands.value += totalCommandsLocal;
		this.status = (this.isStalled) ? DisplayListStatus.Stalling : DisplayListStatus.Completed;
	}

	vertexInfo = new _state.VertexInfo();

	private prim(p: number):PrimAction {
		var vertexCount = param16(p, 0);
		var primitiveType = <PrimitiveType>param3(p, 16);
		if (vertexCount <= 0) return;

		var memory = this.memory;
		var state = this.state;
		var vertexInfo = this.vertexInfo.setState(this.state)
		var vertexSize = vertexInfo.size;
		var vertexAddress = state.getAddressRelativeToBaseOffset(vertexInfo.address);
		var indicesAddress = state.getAddressRelativeToBaseOffset(state.indexAddress);
		var hasIndices = (vertexInfo.index != IndexEnum.Void);
		
		if (hasIndices) {
			overlayIndexCount.value++;
		} else {
			overlayNonIndexCount.value++;
		}

		this.primBatchPrimitiveType = primitiveType;
		
		//if (vertexState.realWeightCount > 0) debugger;
		
		switch (primitiveType) {
			case PrimitiveType.Triangles: trianglePrimCount.value++; break;
			case PrimitiveType.TriangleStrip: triangleStripPrimCount.value++; break;
			case PrimitiveType.Sprites: spritePrimCount.value++; break;
			default: otherPrimCount.value++; break;
		}

		var vertexInput: Uint8Array = this.memory.getPointerU8Array(vertexAddress);
		var drawType = DRAW_TYPE_CONV[primitiveType];
		var optimized = (vertexInfo.realMorphingVertexCount == 1);
		//var optimized = (vertexInfo.index == IndexEnum.Void) && (primitiveType != PrimitiveType.Sprites) && (vertexInfo.realMorphingVertexCount == 1);
		
		if (vertexInfo.realMorphingVertexCount != 1) {
			throw new Error('@TODO: Morphing not implemented!');
		}

		switch (vertexInfo.index) {
			case IndexEnum.Void:
				this.primOptimizedNoIndex(primitiveType, (drawType == PrimDrawType.BATCH_DRAW_DEGENERATE), vertexSize, vertexInfo, vertexInput);
			break;
			case IndexEnum.Byte:
			case IndexEnum.Short:
				if (primitiveType == PrimitiveType.Sprites) {
					throw new Error('@TODO: Sprites with indices not implemented!');
				}
				
				var totalVertices = 0; 
				if (vertexInfo.index == IndexEnum.Byte) {
					totalVertices = optimizedDrawBuffer.addVerticesIndicesList(this.memory.getPointerU8Array(indicesAddress, vertexCount));
				} else {
					totalVertices = optimizedDrawBuffer.addVerticesIndicesList(this.memory.getPointerU16Array(indicesAddress, vertexCount * 2));
				}
				optimizedDrawBuffer.addVerticesData(vertexInput, totalVertices * vertexSize);
				return PrimAction.FLUSH_PRIM;
		}

		return (drawType == PrimDrawType.SINGLE_DRAW) ? PrimAction.FLUSH_PRIM : PrimAction.NOTHING;
	}

	private primOptimizedNoIndex(primitiveType: PrimitiveType, drawTypeDegenerated: boolean, vertexSize:number, vertexInfo:_state.VertexInfo, vertexInput: Uint8Array) {
		var current4 = (this.current4 - 1) | 0; 
		var batchPrimCount = this.batchPrimCount | 0;
		var _optimizedDrawBuffer = optimizedDrawBuffer;
		var p2 = 0;
		var vertex2Count = 0;
		var memory = this.memory;
		var totalVertexCount = 0;
		var isSprite = (primitiveType == PrimitiveType.Sprites);
		primitiveType |= 0;
		vertexSize |= 0;
		while (true) {
			p2 = memory.lw_2(current4) | 0;
			if ((((p2 >> 24) & 0xFF) != Op.PRIM) || (param3(p2, 16) != primitiveType)) break;
			vertex2Count = param16(p2, 0) | 0;
			totalVertexCount += vertex2Count;
			if (isSprite) {
				_optimizedDrawBuffer.addVerticesIndicesSprite(vertex2Count);
			} else {
				if (drawTypeDegenerated && (batchPrimCount > 0)) _optimizedDrawBuffer.join(vertexSize);
				_optimizedDrawBuffer.addVerticesIndices(vertex2Count);
			}
			current4++;
			batchPrimCount++;
		}

		overlayVertexCount.value += totalVertexCount;
		let totalVerticesSize = totalVertexCount * vertexSize;
		if (isSprite) {
			_optimizedDrawBuffer.addVerticesDataSprite(vertexInput, totalVerticesSize, totalVertexCount, vertexInfo);
		} else {
			_optimizedDrawBuffer.addVerticesData(vertexInput, totalVerticesSize);
		}
		vertexInfo.address += totalVerticesSize;
		this.state.vertex.address = vertexInfo.address; 
		this.batchPrimCount = batchPrimCount;
		this.current4 = current4;
	}

	vertexInfo2: _state.VertexInfo = new _state.VertexInfo();
	private bezier(p: number) {
		/*
		let state = this.state;

		let ucount = param8(p, 0);
		let vcount = param8(p, 8);
		let divs = state.patch.divs;
		let divt = state.patch.divt;
		let vertexState = state.vertex;
		let vertexInfo2 = this.vertexInfo2.setState(state);
		let vertexAddress = state.getAddressRelativeToBaseOffset(state.vertex.address);
		let vertexInput8 = this.memory.getPointerU8Array(vertexAddress);

		vertexInfo2.texture = _state.NumericEnum.Float;

		let getBezierControlPoints = (ucount: number, vcount: number) => {
			let controlPoints = ArrayUtils.create2D<_state.Vertex>(ucount, vcount);

			let mipmap = state.texture.mipmaps[0];
			let scale = mipmap.textureWidth / mipmap.bufferWidth;
			for (let u = 0; u < ucount; u++) {
				for (let v = 0; v < vcount; v++) {
					let vertex = vertexReader.readOne(vertexInput8, null, v * ucount + u);;
					controlPoints[u][v] = vertex;
					vertex.tx = (u / (ucount - 1)) * scale;
					vertex.ty = (v / (vcount - 1));
					//Console.WriteLine("getControlPoints({0}, {1}) : {2}", u, v, controlPoints[u, v]);
				}
			}
			return controlPoints;
		};

		let controlPoints = getBezierControlPoints(ucount, vcount);
		let vertices2: _state.Vertex[] = [];
		vertices2.push(controlPoints[0][0]);
		vertices2.push(controlPoints[ucount - 1][0]);
		vertices2.push(controlPoints[0][vcount - 1]);

		vertices2.push(controlPoints[ucount - 1][0]);
		vertices2.push(controlPoints[ucount - 1][vcount - 1]);
		vertices2.push(controlPoints[0][vcount - 1]);

		this.drawDriver.queueBatch(new _vertex.UnoptimizedBatch(state, _state.PrimitiveType.Triangles, vertices2, vertexInfo2));
		*/
	}

	private runUntilStall() {
		this.status = DisplayListStatus.Drawing;
		while (this.hasMoreInstructions) {
			//try {
			this.runUntilStallInner();
			/*
		} catch (e) {
			console.log(e);
			console.log(e['stack']);
		}
		*/
		}
    }

    private enqueueRunUntilStall() {
        Microtask.queue(() => {
            this.runUntilStall();
        });
    }

    updateStall(stall: number) {
        this.stall4 = ((stall >>> 2) & Memory.MASK);
        this.enqueueRunUntilStall();
    }

	start() {
		this.status = DisplayListStatus.Queued;

		this.promise = new Promise2((resolve, reject) => {
			this.promiseResolve = resolve;
			this.promiseReject = reject;
		});
        this.completed = false;

        this.enqueueRunUntilStall();
    }

    waitAsync() {
        return this.promise;
    }
}

class PspGpuListRunner {
    private lists: PspGpuList[] = [];
    private freeLists: PspGpuList[] = [];
	private runningLists: PspGpuList[] = [];
	private state = new _state.GpuState();

	constructor(private memory: Memory, private drawDriver: IDrawDriver, private gpu: PspGpu, private callbackManager: CpuExecutor) {
        for (var n = 0; n < 32; n++) {
			var list = new PspGpuList(n, memory, drawDriver, this, gpu, callbackManager, this.state);
            this.lists.push(list);
            this.freeLists.push(list);
        }
    }

    allocate() {
        if (!this.freeLists.length) throw new Error('Out of gpu free lists');
        var list = this.freeLists.pop();
        this.runningLists.push(list);
        return list;
    }

    getById(id: number) {
        return this.lists[id];
    }

    deallocate(list: PspGpuList) {
        this.freeLists.push(list);
        this.runningLists.remove(list);
	}

	peek() {
		var _peek = (() => {
			for (var n = 0; n < this.runningLists.length; n++) {
				var list = this.runningLists[n];
				if (list.status != DisplayListStatus.Completed) return list.status;
			}
			return DisplayListStatus.Completed;
		});
		var result = _peek();
		//result = Math.floor(Math.random() * 4);
		console.warn('not implemented gpu list peeking -> ' + result);
		return result;
	}

	waitAsync() {
		return Promise2.all(this.runningLists.map(list => list.waitAsync())).then(() => _state.DisplayListStatus.Completed);
    }
}

export class PspGpuCallback {
	constructor(public cpuState: CpuState, public signalFunction: number, public signalArgument: number, public finishFunction: number, public finishArgument: number) {
	}
}

export class PspGpu implements IPspGpu {
    //private gl: WebGLRenderingContext;
	private listRunner: PspGpuListRunner;
	driver: IDrawDriver;
	callbacks = new UidCollection<PspGpuCallback>(1);

	constructor(private memory: Memory, private display: IPspDisplay, private canvas: HTMLCanvasElement, private cpuExecutor: CpuExecutor) {
		try {
			this.driver = new WebGlPspDrawDriver(memory, display, canvas);
		} catch (e) {
			this.driver = new _driver.BaseDrawDriver();
		}
		globalDriver = this.driver;
		this.driver.rehashSignal.add(size => {
			hashMemoryCount.value++;
			hashMemorySize.value += size;
		});
		//this.driver = new Context2dPspDrawDriver(memory, canvas);
		this.listRunner = new PspGpuListRunner(memory, this.driver, this, this.cpuExecutor);
    }

	startAsync() {
		return this.driver.initAsync();
    }

	stopAsync() {
		return Promise2.resolve();
    }

	listEnqueue(start: number, stall: number, callbackId: number, argsPtr: Stream) {
        var list = this.listRunner.allocate();
        list.current4 = ((start >>> 2) & Memory.MASK);
        list.stall4 = stall;
		list.callbackId = callbackId;
		list.argsPtr = argsPtr;
        list.start();
        return list.id;
    }

    listSync(displayListId: number, syncType: _state.SyncType) {
        //console.log('listSync');
		//overlay.update();
        return this.listRunner.getById(displayListId).waitAsync();
		//return 0;
    }

    updateStallAddr(displayListId: number, stall: number) {
        this.listRunner.getById(displayListId).updateStall(stall);
        return 0;
    }
	
	private flushCommands() {
		if (!dumpFrameCommands || dumpFrameCommandsList.length == 0) return;
		console.info('-----------------------------------------------');
		dumpFrameCommands = false;
		var list:string[] = [];
		function flushBuffer() {
			if (list.length == 0) return;
			console.log(list.join(', '));
			list.length = 0;
		}
		for (let item of dumpFrameCommandsList) {
			if (item.startsWith('<BATCH')) {
				flushBuffer();
				console.warn(item);
			} else {
				list.push(item);
				if (item.startsWith('PRIM')) flushBuffer();
			}
		}
		flushBuffer();
		dumpFrameCommandsList.length = 0;
	} 

	private lastTime = 0;
	drawSync(syncType: _state.SyncType): any {
		//console.log('drawSync');
		//console.warn('Not implemented sceGe_user.sceGeDrawSync');
		return this.listRunner.waitAsync().then(() => {
			this.flushCommands()
			try {
				var end = performance.now();
				timePerFrame.value = MathUtils.interpolate(timePerFrame.value, end - this.lastTime, 0.5);
				this.lastTime = end;
				overlay.updateAndReset();
				this.driver.drawAllQueuedBatches(optimizedDrawBuffer, overlayBatchSlider.ratio);
				return freezing.waitUntilValueAsync(false);
			} catch (e) {
				console.error(e);
				alert(e['stack'] || e);
				throw e;
			}
		});

		switch (syncType) {
			case _state.SyncType.Peek: return this.listRunner.peek();
			case _state.SyncType.WaitForCompletion: return this.listRunner.waitAsync();
			default: throw (new Error("Not implemented SyncType." + syncType));
		}
    }
}

const enum PrimAction {
	NOTHING = 0,
	FLUSH_PRIM = 1,
}

overlay.update();
