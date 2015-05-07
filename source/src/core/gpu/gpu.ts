///<reference path="../../global.d.ts" />

import _memory = require('../memory');
import _display = require('../display');
import _pixelformat = require('../pixelformat');
import _instructions = require('./instructions');
import _state = require('./state');
import _driver = require('./driver');
import _vertex = require('./vertex');
import _cpu = require('../cpu'); _cpu.CpuState;
import _IndentStringGenerator = require('../../util/IndentStringGenerator');

import DisplayListStatus = _state.DisplayListStatus;
import CpuState = _cpu.CpuState;
import PixelFormat = _pixelformat.PixelFormat;
import IPspDisplay = _display.IPspDisplay;
import Memory = _memory.Memory;
import IDrawDriver = _driver.IDrawDriver;
import ColorEnum = _state.ColorEnum;
import GpuOpCodes = _instructions.GpuOpCodes;
import WebGlPspDrawDriver = require('./webgl/driver');
import DummyDrawDriver = require('./webgl/driver_dummy');
import Op = _instructions.GpuOpCodes;

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

var vertexBuffer = new _vertex.VertexBuffer();
var optimizedDrawBuffer = new _vertex.OptimizedDrawBuffer();
var singleCallTest = false;

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

class OverlaySection<T> {
	public value: T;
	constructor(public name: string, private resetValue: T, private representer?: (v: T) => any) {
		this.reset();
	}
	get representedValue() {
		return this.representer ? this.representer(this.value) : this.value;
	}
	reset() {
		this.value = this.resetValue;
	}
}

class Overlay {
	private element: HTMLDivElement;
	private sections: OverlaySection<any>[] = [];

	constructor() {
		var element = this.element = (typeof document != 'undefined') ? document.createElement('div') : null;
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
			element.style.whiteSpace = 'pre';
			element.innerText = 'hello world!';
			document.body.appendChild(element);
		}
	}

	createSection<T>(name: string, resetValue: T, representer?: (v: T) => any): OverlaySection<T> {
		var section = new OverlaySection(name, resetValue, representer);
		this.sections.push(section);
		return section;
	}

	update() {
		if (this.element) this.element.innerText = this.sections.map(s => `${s.name}: ${s.representedValue}`).join('\n');
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
var overlayIndexCount = overlay.createSection('indexCount', 0);
var overlayNonIndexCount = overlay.createSection('nonIndexCount', 0);
var overlayVertexCount = overlay.createSection('vertexCount', 0);
var trianglePrimCount = overlay.createSection('trianglePrimCount', 0);
var triangleStripPrimCount = overlay.createSection('triangleStripPrimCount', 0);
var spritePrimCount = overlay.createSection('spritePrimCount', 0);
var otherPrimCount = overlay.createSection('otherPrimCount', 0);
var optimizedCount = overlay.createSection('optimizedCount', 0);
var nonOptimizedCount = overlay.createSection('nonOptimizedCount', 0);
var hashMemoryCount = overlay.createSection('hashMemoryCount', 0);
var totalCommands = overlay.createSection('totalCommands', 0);
var totalStalls = overlay.createSection('totalStalls', 0);
var batchCount = overlay.createSection('batchCount', 0);
var hashMemorySize = overlay.createSection('hashMemorySize', 0, numberToFileSize);
var timePerFrame = overlay.createSection('time', 0, (v) => `${v.toFixed(0) } ms`);

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
		if (optimizedDrawBuffer.dataOffset > 0) {
			this.batchPrimCount = 0;
			this.drawDriver.drawOptimized(this.state, optimizedDrawBuffer);
			optimizedDrawBuffer.reset();
			this.primBatchPrimitiveType = -1;
			batchCount.value++;
		}
		if (vertexBuffer.offsetLength > 0) {
			this.batchPrimCount = 0;
			this.drawDriver.drawElements(this.state, this.primBatchPrimitiveType, vertexBuffer.vertices, vertexBuffer.offsetLength, this.vertexInfo);
			vertexBuffer.reset();
			this.primBatchPrimitiveType = -1;
			batchCount.value++;
		}
	}

	batchPrimCount = 0;
	primCount = 0;
	//private showOpcodes = true;
	private showOpcodes = false;
	private opcodes: string[] = [];
	finish() {
		if (this.showOpcodes) {
			document.getElementById('output').innerText = 'finish:' + this.primCount + ';' + this.opcodes.join(",");
			if (this.opcodes.length) this.opcodes = [];
		}
		this.primCount = 0;
	}

	private get isStalled() {
		return ((this.stall4 != 0) && (this.current4 >= this.stall4));
	}


    private get hasMoreInstructions() {
		return !this.completed && !this.isStalled;
		//return !this.completed && ((this.stall == 0) || (this.current < this.stall));
	}

	private runUntilStallInner() {
		let memory = this.memory;
		//let showOpcodes = this.showOpcodes;
		let stall4 = this.stall4;
		let state = this.state;
		let totalCommandsLocal = 0;
		let current4 = this.current4;
		if (stall4 == 0) stall4 = 0x7FFFFFFF;
		
		loop: while (current4 < stall4) {
			totalCommandsLocal++;
			let instructionPC4 = current4++;
			let instruction = memory.lw_2(instructionPC4);
			let op = (instruction >> 24) & 0xFF;
			let p = instruction & 0xFFFFFF; 
			
			switch (op) {
				case Op.PRIM: {
					let primitiveType = <_state.PrimitiveType>param3(p, 16);
					if (this.primBatchPrimitiveType != primitiveType) this.finishPrimBatch();
					this.prim(param24(p));
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

				case Op.PROJMATRIXNUMBER: state.projectionMatrix.reset(param24(p)); this.finishPrimBatch(); break;
				case Op.PROJMATRIXDATA: state.projectionMatrix.put(float1(p)); break;
				
				case Op.VIEWMATRIXNUMBER: state.viewMatrix.reset(param24(p)); this.finishPrimBatch(); break;
				case Op.VIEWMATRIXDATA: state.viewMatrix.put(float1(p)); break;
				
				case Op.WORLDMATRIXNUMBER: state.worldMatrix.reset(param24(p)); this.finishPrimBatch(); break;
				case Op.WORLDMATRIXDATA: state.worldMatrix.put(float1(p)); break;
				
				case Op.BONEMATRIXNUMBER: state.skinning.setCurrentBoneIndex(param24(p)); this.finishPrimBatch(); break;
				case Op.BONEMATRIXDATA: state.skinning.write(float1(p)); break;
				
				case Op.TGENMATRIXNUMBER: state.texture.matrix.reset(param24(p)); this.finishPrimBatch(); break;
				case Op.TGENMATRIXDATA: state.texture.matrix.put(float1(p)); break;
				
				// No invalidate prim
				case Op.BASE:
				case Op.IADDR:
				case Op.VADDR:
				break;

				default: if (state.data[op] != p) this.finishPrimBatch(); break;
			}
			state.data[op] = p;
		}
		
		this.current4 = current4;
		totalStalls.value++;
		totalCommands.value += totalCommandsLocal;
		this.status = (this.isStalled) ? DisplayListStatus.Stalling : DisplayListStatus.Completed;
	}

	vertexInfo = new _state.VertexInfo();
	private prim(p: number) {
		let state = this.state;
		let vertexCount = param16(p, 0);
		let primitiveType = <_state.PrimitiveType>param3(p, 16);

		if (vertexCount <= 0) return;

		this.primBatchPrimitiveType = primitiveType;

		this.primCount++;

		var vertexInfo = this.vertexInfo.setState(this.state) 
		let vertexState = state.vertex;
		let vertexSize = vertexInfo.size;
		let vertexAddress = state.getAddressRelativeToBaseOffset(vertexInfo.address);
		let indicesAddress = state.getAddressRelativeToBaseOffset(state.indexAddress);

		let hasIndices = false;
		let indices: any = null;
		switch (vertexInfo.index) {
			case _state.IndexEnum.Void: hasIndices = false; break;
			case _state.IndexEnum.Byte: hasIndices = true; indices = this.memory.getPointerU8Array(indicesAddress, vertexCount); break;
			case _state.IndexEnum.Short: hasIndices = true; indices = this.memory.getPointerU16Array(indicesAddress, vertexCount * 2); break;
		}

		if (vertexInfo.index == _state.IndexEnum.Void) {
			overlayNonIndexCount.value += 1;
		} else {
			overlayIndexCount.value += 1;
		}

		overlayVertexCount.value += vertexCount;
		
		//if (vertexState.realWeightCount > 0) debugger;
		
		let vertexInput: Uint8Array = this.memory.getPointerU8Array(vertexAddress, hasIndices ? undefined : (vertexSize * vertexCount));
		if (vertexInfo.address && !vertexInfo.hasIndex) {
			vertexInfo.address += vertexInfo.size * vertexCount;
			this.state.vertex.address = vertexInfo.address;
		}

		let drawType = PrimDrawType.SINGLE_DRAW;

		switch (primitiveType) {
			case _state.PrimitiveType.Triangles: trianglePrimCount.value++; break;
			case _state.PrimitiveType.TriangleStrip: triangleStripPrimCount.value++; break;
			case _state.PrimitiveType.Sprites: spritePrimCount.value++; break;
			default: otherPrimCount.value++; break;
		}

		switch (primitiveType) {
			case _state.PrimitiveType.Lines:
			case _state.PrimitiveType.Points:
			case _state.PrimitiveType.Triangles:
			case _state.PrimitiveType.Sprites:
				drawType = PrimDrawType.BATCH_DRAW;
				break;
			case _state.PrimitiveType.TriangleStrip:
			case _state.PrimitiveType.LineStrip:
				drawType = PrimDrawType.BATCH_DRAW_DEGENERATE;
				break;
		}

		let optimized = false;
		if ((vertexInfo.index == _state.IndexEnum.Void) && (primitiveType != _state.PrimitiveType.Sprites) && (vertexInfo.realMorphingVertexCount == 1)) {
			optimized = true;
		}

		if (optimized) optimizedCount.value++; else nonOptimizedCount.value++;

		let mustDegenerate = (this.batchPrimCount > 0) && (drawType == PrimDrawType.BATCH_DRAW_DEGENERATE);

		if (optimized) {
			optimizedDrawBuffer.primType = primitiveType;
			optimizedDrawBuffer.vertexInfo = vertexInfo;
			if (mustDegenerate) optimizedDrawBuffer.join(vertexInfo.size);
			optimizedDrawBuffer.addVertices(vertexInput, vertexCount, vertexInfo.size);
		} else {
			if (mustDegenerate) vertexBuffer.startDegenerateTriangleStrip();
			let verticesOffset = vertexBuffer.ensureAndTake(vertexCount);
			let vertexReader = _vertex.VertexReaderFactory.get(vertexInfo);
			vertexReader.readCount(vertexBuffer.vertices, verticesOffset, vertexInput, <number[]><any>indices, vertexCount, vertexInfo.hasIndex);
			if (mustDegenerate) vertexBuffer.endDegenerateTriangleStrip();
		}

		if (drawType == PrimDrawType.SINGLE_DRAW) {
			this.finishPrimBatch();
		} else {
			this.batchPrimCount++;
		}
	}
	
	vertexInfo2:_state.VertexInfo = new _state.VertexInfo();
	private bezier(p:number) {
		let state = this.state;

		let ucount = param8(p, 0);
		let vcount = param8(p, 8);
		let divs = state.patch.divs;
		let divt = state.patch.divt;
		let vertexState = state.vertex;
		let vertexInfo2 = this.vertexInfo2.setState(state);
		let vertexReader = _vertex.VertexReaderFactory.get(vertexInfo2);
		let vertexAddress = state.getAddressRelativeToBaseOffset(state.vertex.address);
		let vertexInput = this.memory.getPointerU8Array(vertexAddress);

		vertexInfo2.texture = _state.NumericEnum.Float;

		let getBezierControlPoints = (ucount: number, vcount: number) => {
			let controlPoints = ArrayUtils.create2D<_state.Vertex>(ucount, vcount);

			let mipmap = state.texture.mipmaps[0];
			let scale = mipmap.textureWidth / mipmap.bufferWidth;
			for (let u = 0; u < ucount; u++) {
				for (let v = 0; v < vcount; v++) {
					let vertex = vertexReader.readOne(vertexInput, v * ucount + u);;
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

		this.drawDriver.drawElements(state, _state.PrimitiveType.Triangles, vertices2, vertices2.length, vertexInfo2);
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

enum PrimDrawType {
	SINGLE_DRAW = 0,
	BATCH_DRAW = 1,
	BATCH_DRAW_DEGENERATE = 2,
}

class PspGpuListRunner {
    private lists: PspGpuList[] = [];
    private freeLists: PspGpuList[] = [];
	private runningLists: PspGpuList[] = [];
	private state = new _state.GpuState()

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
			this.driver = new DummyDrawDriver();
		}
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

	private lastTime = 0;
	drawSync(syncType: _state.SyncType): any {
		//console.log('drawSync');
		//console.warn('Not implemented sceGe_user.sceGeDrawSync');
		return this.listRunner.waitAsync().then(() => {
			var end = performance.now();
			timePerFrame.value = MathUtils.interpolate(timePerFrame.value, end - this.lastTime, 0.5);
			MathUtils.prevAligned
			this.lastTime = end;
			overlay.updateAndReset();
		});

		switch (syncType) {
			case _state.SyncType.Peek: return this.listRunner.peek();
			case _state.SyncType.WaitForCompletion: return this.listRunner.waitAsync();
			default: throw (new Error("Not implemented SyncType." + syncType));
		}
    }
}

overlay.update();
