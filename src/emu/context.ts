﻿import {IPspDisplay} from "../core/display";
import {Config} from "../hle/config";
import {IPspController} from "../core/controller";
import {Battery} from "../core/battery";
import {PspRtc} from "../core/rtc";
import {PspAudio} from "../core/audio";
import {Memory} from "../core/memory";
import {InterruptManager} from "../core/interrupt";
import {Signal1} from "../global/utils";
import {PspGpu} from "../core/gpu/gpu_core";
import {NetManager} from "../hle/manager/net";
import {MemoryManager} from "../hle/manager/memory";
import {ThreadManager} from "../hle/manager/thread";
import {CallbackManager} from "../hle/manager/callback";
import {ModuleManager} from "../hle/manager/module";
import {FileManager} from "../hle/manager/file";
import {Interop} from "../hle/manager/interop";

export interface ISymbol {
	address: number;
	size: number;
	name: string;
}

export interface ISymbolLookup {
	getSymbolAt(address: number): ISymbol | null;
}

export class EmulatorContext {
    // @ts-ignore
    display: IPspDisplay;
    // @ts-ignore
    config: Config;
    // @ts-ignore
    controller: IPspController;
    // @ts-ignore
    rtc: PspRtc;
    // @ts-ignore
    gpu: PspGpu;
    // @ts-ignore
    netManager: NetManager;
    // @ts-ignore
    memoryManager: MemoryManager;
    // @ts-ignore
    threadManager: ThreadManager;
    // @ts-ignore
    callbackManager: CallbackManager;
    // @ts-ignore
    moduleManager: ModuleManager;
    // @ts-ignore
    audio: PspAudio;
    // @ts-ignore
    memory: Memory;
    // @ts-ignore
    fileManager: FileManager;
    // @ts-ignore
    interruptManager: InterruptManager;
    // @ts-ignore
    symbolLookup: ISymbolLookup;
    // @ts-ignore
    interop: Interop;
    // @ts-ignore
    battery: Battery;
	onStdout = new Signal1<string>();
	onStderr = new Signal1<string>();

	container: any = {};
	gameTitle = 'unknown';
	gameId = 'unknown';

	constructor() {
	}
	
	get currentThread() { return this.threadManager.current; }
	get currentState() { return this.currentThread.state; }
	get currentInstructionCache() { return this.currentState.icache; }

	init(interruptManager: InterruptManager, display: IPspDisplay, controller: IPspController, gpu: PspGpu, memoryManager: MemoryManager, threadManager: ThreadManager, audio: PspAudio, memory: Memory, fileManager: FileManager, rtc: PspRtc, callbackManager: CallbackManager, moduleManager: ModuleManager, config: Config, interop: Interop, netManager: NetManager, battery: Battery) {
		this.interruptManager = interruptManager;
		this.display = display;
		this.controller = controller;
		this.gpu = gpu;
		this.memoryManager = memoryManager;
		this.threadManager = threadManager;
		this.audio = audio;
		this.memory = memory;
		this.fileManager = fileManager;
		this.rtc = rtc;
		this.callbackManager = callbackManager;
		this.moduleManager = moduleManager;
		this.config = config;
		this.interop = interop;
		this.netManager = netManager;
		this.battery = battery;
	}
}
