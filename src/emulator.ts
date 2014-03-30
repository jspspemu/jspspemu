class Emulator {
	public context: EmulatorContext;
	private memory: core.Memory;
	private memoryManager: hle.MemoryManager;
	private fileManager: hle.FileManager;
	private audio: core.PspAudio;
	private canvas: HTMLCanvasElement;
	private webgl_canvas: HTMLCanvasElement;
	private display: core.PspDisplay;
	private gpu: core.gpu.PspGpu;
	private controller: core.PspController;
	private instructionCache: InstructionCache;
	private syscallManager: core.SyscallManager;
	private threadManager: hle.ThreadManager;
	private moduleManager: hle.ModuleManager;
	private ms0Vfs: hle.vfs.MountableVfs;

	constructor(memory?: core.Memory) {
		if (!memory) memory = core.Memory.instance;
		this.memory = memory;
	}

	stopAsync() {
		if (!this.display) return Promise.resolve();

		return Promise.all([
			this.display.stopAsync(),
			this.controller.stopAsync(),
			this.gpu.stopAsync(),
			this.audio.stopAsync(),
			this.threadManager.stopAsync(),
		]);
	}

	startAsync() {
		return this.stopAsync().then(() => {
			this.memory.reset();
			this.context = new EmulatorContext();
			this.memoryManager = new hle.MemoryManager();
			this.audio = new core.PspAudio();
			this.canvas = <HTMLCanvasElement>(document.getElementById('canvas'));
			this.webgl_canvas = <HTMLCanvasElement>(document.getElementById('webgl_canvas'));
			this.display = new core.PspDisplay(this.memory, this.canvas, this.webgl_canvas);
			this.gpu = new core.gpu.PspGpu(this.memory, this.display, this.webgl_canvas);
			this.controller = new core.PspController();
			this.instructionCache = new InstructionCache(this.memory);
			this.syscallManager = new core.SyscallManager(this.context);
			this.fileManager = new hle.FileManager();
			this.threadManager = new hle.ThreadManager(this.memory, this.memoryManager, this.display, this.syscallManager, this.instructionCache);
			this.moduleManager = new hle.ModuleManager(this.context);

			this.fileManager.mount('ms0', this.ms0Vfs = new hle.vfs.MountableVfs());
			this.fileManager.mount('host0', new hle.vfs.MemoryVfs());

			hle.ModuleManagerSyscalls.registerSyscalls(this.syscallManager, this.moduleManager);

			this.context.init(this.display, this.controller, this.gpu, this.memoryManager, this.threadManager, this.audio, this.memory, this.instructionCache, this.fileManager);

			return Promise.all([
				this.display.startAsync(),
				this.controller.startAsync(),
				this.gpu.startAsync(),
				this.audio.startAsync(),
				this.threadManager.startAsync(),
			]);
		});
	}

	private _loadAndExecuteAsync(asyncStream: AsyncStream, pathToFile: string) {
		return format.detectFormatAsync(asyncStream).then(fileFormat => {
			console.info(sprintf('File:: size: %d, format: "%s", name: "%s"', asyncStream.size, fileFormat, asyncStream.name));
			switch (fileFormat) {
				case 'ciso':
					return format.cso.Cso.fromStreamAsync(asyncStream).then(asyncStream2 => this._loadAndExecuteAsync(asyncStream2, pathToFile));
				case 'pbp':
					return asyncStream.readChunkAsync(0, asyncStream.size).then(executableArrayBuffer => {
						var pbp = format.pbp.Pbp.fromStream(Stream.fromArrayBuffer(executableArrayBuffer));
						return this._loadAndExecuteAsync(new MemoryAsyncStream(pbp.get('psp.data').toArrayBuffer()), pathToFile);
					});
				case 'iso':
					return format.iso.Iso.fromStreamAsync(asyncStream).then(iso => {
						var isoFs = new hle.vfs.IsoVfs(iso);
						this.fileManager.mount('umd0', isoFs);
						this.fileManager.mount('disc0', isoFs);
						
						return isoFs.openAsync('PSP_GAME/SYSDIR/BOOT.BIN', hle.vfs.FileOpenFlags.Read, parseInt('777', 8)).then(file => {
							return file.readAllAsync().then((data) => {
								return this._loadAndExecuteAsync(new MemoryAsyncStream(data), 'umd0:/PSP_GAME/SYSDIR/BOOT.BIN');
							});
						})
					});
				case 'elf':
					return asyncStream.readChunkAsync(0, asyncStream.size).then(executableArrayBuffer => {
						var mountableVfs = (<hle.vfs.MountableVfs>this.fileManager.getDevice('ms0').vfs);
						mountableVfs.mountFileData('/PSP/GAME/virtual/EBOOT.ELF', executableArrayBuffer);

						var elfStream = Stream.fromArrayBuffer(executableArrayBuffer);

						var arguments = [pathToFile];
						var argumentsPartition = this.memoryManager.userPartition.allocateLow(0x4000);
						var argument = arguments.map(argument => argument + String.fromCharCode(0)).join('');
						this.memory.getPointerStream(argumentsPartition.low).writeString(argument);

						//console.log(new Uint8Array(executableArrayBuffer));
						var pspElf = new hle.elf.PspElfLoader(this.memory, this.memoryManager, this.moduleManager, this.syscallManager);
						pspElf.load(elfStream);
						var moduleInfo = pspElf.moduleInfo;

						// "ms0:/PSP/GAME/virtual/EBOOT.PBP"
						var thread = this.threadManager.create('main', moduleInfo.pc, 10);
						thread.state.GP = moduleInfo.gp;
						thread.state.gpr[4] = argument.length;
						thread.state.gpr[5] = argumentsPartition.low;
						thread.start();
					});

				default:
					throw (new Error(sprintf("Unhandled format '%s'", fileFormat)));
			}
		});
	}

	loadExecuteAndWaitAsync(asyncStream: AsyncStream, url: string) {
		return this.loadAndExecuteAsync(asyncStream, url).then(() => {
			//console.error('WAITING!');
			return this.threadManager.waitExitGameAsync().then(() => {
				//console.error('STOPPING!');
				return this.stopAsync();
			});
		}).catch(e => {
			console.error(e);
			throw(e);
		});
	}
	

	loadAndExecuteAsync(asyncStream: AsyncStream, url: string) {
		return this.startAsync().then(() => {
			var parentUrl = url.replace(/\/[^//]+$/, '');
			console.info('parentUrl: ' + parentUrl);
			this.ms0Vfs.mountVfs('/PSP/GAME/virtual', new hle.vfs.UriVfs(parentUrl));
			return this._loadAndExecuteAsync(asyncStream, "ms0:/PSP/GAME/virtual/EBOOT.PBP");
		}).catch(e => {
				console.error(e);
				console.error(e['stack']);
				throw (e);
			});
	}

	downloadAndExecuteAsync(url: string) {
		return downloadFileAsync(url).then((data) => {
			setImmediate(() => {
				// escape try/catch!
				this.loadAndExecuteAsync(new MemoryAsyncStream(data, url), url);
			});
		});
	}

	executeFileAsync(file: File) {
		setImmediate(() => {
			// escape try/catch!
			this.loadAndExecuteAsync(new FileAsyncStream(file), '.');
		});
	}
}
