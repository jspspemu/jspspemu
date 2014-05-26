import _manager = require('./hle/manager');
import _display = require('./core/display');
import _controller = require('./core/controller');
import _gpu = require('./core/gpu');
import _rtc = require('./core/rtc');
import _cpu = require('./core/cpu');
import _audio = require('./core/audio');
import _memory = require('./core/memory');
import _interrupt = require('./core/interrupt');
import _config = require('./hle/config');

export interface ISymbol {
	address: number;
	size: number;
	name: string;
}

export interface ISymbolLookup {
	getSymbolAt(address: number): ISymbol;
}

export class EmulatorContext {
	display: _display.IPspDisplay;
	config: _config.Config;
	controller: _controller.IPspController;
	rtc: _rtc.PspRtc;
	gpu: _gpu.PspGpu;
	netManager: _manager.NetManager;
	memoryManager: _manager.MemoryManager;
	threadManager: _manager.ThreadManager;
	callbackManager: _manager.CallbackManager;
	moduleManager: _manager.ModuleManager;
	audio: _audio.PspAudio;
	memory: _memory.Memory;
	instructionCache: _cpu.InstructionCache;
	fileManager: _manager.FileManager;
	interruptManager: _interrupt.InterruptManager;
	symbolLookup: ISymbolLookup;
	interop: _manager.Interop;

	container: any = {};
	gameTitle = 'unknown';
	gameId = 'unknown';

	constructor() {
	}

	init(interruptManager: _interrupt.InterruptManager, display: _display.IPspDisplay, controller: _controller.IPspController, gpu: _gpu.PspGpu, memoryManager: _manager.MemoryManager, threadManager: _manager.ThreadManager, audio: _audio.PspAudio, memory: _memory.Memory, instructionCache: _cpu.InstructionCache, fileManager: _manager.FileManager, rtc: _rtc.PspRtc, callbackManager: _manager.CallbackManager, moduleManager: _manager.ModuleManager, config: _config.Config, interop: _manager.Interop, netManager: _manager.NetManager) {
		this.interruptManager = interruptManager;
		this.display = display;
		this.controller = controller;
		this.gpu = gpu;
		this.memoryManager = memoryManager;
		this.threadManager = threadManager;
		this.audio = audio;
		this.memory = memory;
		this.instructionCache = instructionCache;
		this.fileManager = fileManager;
		this.rtc = rtc;
		this.callbackManager = callbackManager;
		this.moduleManager = moduleManager;
		this.config = config;
		this.interop = interop;
		this.netManager = netManager;
	}
}
