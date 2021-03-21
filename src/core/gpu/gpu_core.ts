import "../../emu/global"

import { GpuStats } from './gpu_stats';
import { Memory } from '../memory';
import { IPspDisplay } from '../display';
import { GpuOpCodes as Op } from './gpu_opcodes';
import { GpuState, VertexInfo, ColorEnum, PrimitiveType, IndexEnum, DisplayListStatus, SyncType } from './gpu_state';
import { OptimizedDrawBuffer, OptimizedBatch } from './gpu_vertex';
import {Stream} from "../../global/stream";
import {addressToHex, Microtask, PromiseFast, Signal2, UidCollection, WatchValue} from "../../global/utils";
import {MathFloat, MathUtils} from "../../global/math";
import {CpuState} from "../cpu/cpu_core";
import {EmulatorUI} from "../../ui/emulator_ui";
import {Component} from "../component";

export interface CpuExecutor {
	execute(state: CpuState, address: number, gprArray: number[]): void;
}

var optimizedDrawBuffer = new OptimizedDrawBuffer();
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

var dumpFrameCommands = false;
var dumpFrameCommandsList: string[] = [];

class PspGpuList {
    current4: number;
    stall4: number;
	callbackId: number;
	argsPtr: Stream;
    completed: boolean = false;
	status = DisplayListStatus.Paused;
	private promise: PromiseFast<any>;
	private promiseResolve: Function;
	private promiseReject: Function;
	errorCount: number = 0;

	constructor(public id: number, public stats: GpuStats, public memory: Memory, private runner: PspGpuListRunner, public gpu: PspGpu, public cpuExecutor: CpuExecutor, public state: GpuState) {
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
			this.gpu.queueBatch(batch);
			if (dumpFrameCommands) dumpFrameCommandsList.push(`<BATCH:${batch.indexCount}>`);
			this.primBatchPrimitiveType = -1;
			this.stats.batchCount++;
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
		let stats = this.stats;
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
					//stats.primCount++;
					break;
				}
				case Op.BEZIER:
					this.finishPrimBatch();
					this.bezier(param24(p));
					break;
				case Op.END:
					this.finishPrimBatch();
					this.gpu.end();
					this.complete();
					break loop;
				case Op.TFLUSH: this.gpu.textureFlush(state); this.finishPrimBatch(); break;
				case Op.TSYNC: this.gpu.textureSync(state); break;
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

		this.stats.totalStalls++;
		this.stats.primCount = localPrimCount;
		this.stats.totalCommands += totalCommandsLocal;
		this.status = (this.isStalled) ? DisplayListStatus.Stalling : DisplayListStatus.Completed;
	}

	vertexInfo = new VertexInfo();

	private prim(p: number):PrimAction {
        const vertexCount = param16(p, 0);
        const primitiveType = <PrimitiveType>param3(p, 16);
        if (vertexCount <= 0) return PrimAction.NOTHING

        const memory = this.memory;
        const state = this.state;
        const stats = this.stats;
        const vertexInfo = this.vertexInfo.setState(this.state);
        const vertexSize = vertexInfo.size;
        const vertexAddress = state.getAddressRelativeToBaseOffset(vertexInfo.address);
        const indicesAddress = state.getAddressRelativeToBaseOffset(state.indexAddress);
        const hasIndices = (vertexInfo.index != IndexEnum.Void);

        if (hasIndices) {
			stats.indexCount++;
		} else {
			stats.nonIndexCount++;
		}

		this.primBatchPrimitiveType = primitiveType;
		
		//if (vertexState.realWeightCount > 0) debugger;
		
		switch (primitiveType) {
			case PrimitiveType.Triangles: stats.trianglePrimCount++; break;
			case PrimitiveType.TriangleStrip: stats.triangleStripPrimCountalue++; break;
			case PrimitiveType.Sprites: stats.spritePrimCount++; break;
			default: stats.otherPrimCount++; break;
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

	private primOptimizedNoIndex(primitiveType: PrimitiveType, drawTypeDegenerated: boolean, vertexSize:number, vertexInfo:VertexInfo, vertexInput: Uint8Array) {
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

		this.stats.vertexCount += totalVertexCount;
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

	vertexInfo2: VertexInfo = new VertexInfo();
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

		this.promise = new PromiseFast((resolve, reject) => {
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
	private state = new GpuState();

	constructor(private memory: Memory, private stats: GpuStats, private gpu: PspGpu, private callbackManager: CpuExecutor) {
        for (var n = 0; n < 32; n++) {
			var list = new PspGpuList(n, stats, memory, this, gpu, callbackManager, this.state);
            this.lists.push(list);
            this.freeLists.push(list);
        }
    }
	
    allocate() {
        if (!this.freeLists.length) throw new Error('Out of gpu free lists');
        var list = this.freeLists.pop()!
        this.runningLists.push(list)
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
		return PromiseFast.all(this.runningLists.map(list => list.waitAsync())).then(() => DisplayListStatus.Completed);
    }
}

export class PspGpuCallback {
	constructor(public cpuState: CpuState, public signalFunction: number, public signalArgument: number, public finishFunction: number, public finishArgument: number) {
	}
}

export class PspGpu implements Component {
    //private gl: WebGLRenderingContext;
	private listRunner: PspGpuListRunner;
	callbacks = new UidCollection<PspGpuCallback>(1);

	constructor(private memory: Memory, private display: IPspDisplay, private cpuExecutor: CpuExecutor, public stats: GpuStats) {
		/*
		try {
			this.driver = new WebGlPspDrawDriver(memory, display, canvas);
		} catch (e) {
			this.driver = new _driver.BaseDrawDriver();
		}
		globalDriver = this.driver;
		*/
		//this.driver = new Context2dPspDrawDriver(memory, canvas);

		this.listRunner = new PspGpuListRunner(memory, this.stats, this, this.cpuExecutor);
    }
	
	dumpCommands() {
		dumpFrameCommands = true;
	}

	register() {
    }

    unregister() {
		this.onDrawBatches.clear();
    }

    startAsync() {
        this.register()
        return PromiseFast.resolve();
    }

    stopAsync() {
        this.unregister()
        return PromiseFast.resolve();
    }

	listEnqueue(start: number, stall: number, callbackId: number, argsPtr: Stream) {
        const list = this.listRunner.allocate();
        list.current4 = ((start >>> 2) & Memory.MASK);
        list.stall4 = stall;
		list.callbackId = callbackId;
		list.argsPtr = argsPtr;
        list.start();
        return list.id;
    }

    listSync(displayListId: number, syncType: SyncType) {
        //console.log('listSync');
		//overlay.update();
        return this.listRunner.getById(displayListId).waitAsync();
		//return 0;
    }

    updateStallAddr(displayListId: number, stall: number) {
        this.listRunner.getById(displayListId).updateStall(stall);
        return 0;
    }
	
	end() {
	}

	textureFlush(state:GpuState) {
	}
	
	textureSync(state:GpuState) {
	}
	
	private batches: OptimizedBatch[] = [];
	queueBatch(batch:OptimizedBatch) {
		this.batches.push(batch);
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
	
	public onDrawBatches = new Signal2<OptimizedDrawBuffer, OptimizedBatch[]>();
	
	private wv = new WatchValue(false);
	sync() {
		this.wv.value = true;
	}
	
	public freezing = new WatchValue(false);

	private lastTime = 0;
	drawSync(syncType: SyncType): any {
		//console.log('drawSync');
		//console.warn('Not implemented sceGe_user.sceGeDrawSync');
		return this.listRunner.waitAsync().then(() => {
			this.flushCommands()
			try {
				var end = performance.now();
				this.stats.timePerFrame = MathUtils.interpolate(this.stats.timePerFrame, end - this.lastTime, 0.5); 
				this.lastTime = end;
				//this.stats.batchCount = this.batches.length;
				this.stats.updateAndReset();
				//this.onDrawBatches.dispatch(optimizedDrawBuffer, this.batches.slice(0, overlayBatchSlider.ratio));
				//console.info('onDrawBatches:', this.batches.length);
				this.wv.value = false;
				this.onDrawBatches.dispatch(optimizedDrawBuffer, this.batches);
				//this.driver.drawBatches(optimizedDrawBuffer, );
				optimizedDrawBuffer.reset();
				this.batches = [];
				//return freezing.waitUntilValueAsync(false);
				return this.wv.waitUntilValueAsync(true).then(() => {
					return this.freezing.waitUntilValueAsync(false);
				});
				//return this.freezing.waitUntilValueAsync(false);
			} catch (e) {
                EmulatorUI.openMessageAsync(e.stack || e)
				throw e;
			}
		});

		//switch (syncType) {
		//	case _state.SyncType.Peek: return this.listRunner.peek();
		//	case _state.SyncType.WaitForCompletion: return this.listRunner.waitAsync();
		//	default: throw (new Error("Not implemented SyncType." + syncType));
		//}
    }
}

const enum PrimAction {
	NOTHING = 0,
	FLUSH_PRIM = 1,
}

//overlay.update();
