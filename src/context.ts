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

	constructor() {
	}

	init(display: core.IPspDisplay, controller: core.IPspController, gpu: core.gpu.IPspGpu, memoryManager: hle.MemoryManager, threadManager: hle.ThreadManager, audio: core.PspAudio, memory: core.Memory, instructionCache: InstructionCache, fileManager: hle.FileManager) {
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
