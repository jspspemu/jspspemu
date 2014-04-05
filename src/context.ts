///<reference path="core/display.ts" />
///<reference path="core/controller.ts" />
///<reference path="core/gpu.ts" />
///<reference path="cpu.ts" />
///<reference path="core/audio.ts" />
///<reference path="core/memory.ts" />
///<reference path="hle/memorymanager.ts" />
///<reference path="hle/threadmanager.ts" />
///<reference path="util/utils.ts" />

interface ISymbol {
	address: number;
	size: number;
	name: string;
}

interface ISymbolLookup {
	getSymbolAt(address: number): ISymbol;
}

class EmulatorContext {
	display: core.IPspDisplay;
	controller: core.IPspController;
	gpu: core.gpu.IPspGpu;
	memoryManager: hle.MemoryManager;
	threadManager: hle.ThreadManager;
	audio: core.PspAudio;
	memory: core.Memory;
	instructionCache: InstructionCache;
	fileManager: hle.FileManager;
	output: string = '';
	interruptManager: core.InterruptManager;
	symbolLookup: ISymbolLookup;

	constructor() {
	}

	init(interruptManager: core.InterruptManager, display: core.IPspDisplay, controller: core.IPspController, gpu: core.gpu.IPspGpu, memoryManager: hle.MemoryManager, threadManager: hle.ThreadManager, audio: core.PspAudio, memory: core.Memory, instructionCache: InstructionCache, fileManager: hle.FileManager) {
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
		this.output = '';
	}
}
