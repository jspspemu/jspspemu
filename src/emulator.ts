import "./global"

import { GpuStats } from './core/gpu/gpu_stats';
import {DomHelp, logger, loggerPolicies, Microtask, PromiseFast, Signal1, Signal2} from "./global/utils";
import {EmulatorContext} from "./context";
import {getMemoryInstance, Memory} from "./core/memory";
import {PspRtc} from "./core/rtc";
import {InterruptManager} from "./core/interrupt";
import {PspAudio} from "./core/audio";
import {PspDisplay} from "./core/display";
import {Battery} from "./core/battery";
import {PspController} from "./core/controller";
import {Config} from "./hle/config";
import {registerModulesAndSyscalls} from "./hle/pspmodules";
import {Psf} from "./format/psf";
import {AsyncStream, FileAsyncStream, MemoryAsyncStream, Stream, UrlAsyncStream} from "./global/stream";
import {detectFormatAsync} from "./format/format";
import {Cso} from "./format/cso";
import {Pbp, PbpNames} from "./format/pbp";
import {decrypt} from "./hle/elf_crypted_prx";
import {Zip} from "./format/zip";
import {Iso} from "./format/iso";
import {PspElfLoader} from "./hle/elf_psp";
import {OptimizedBatch, OptimizedDrawBuffer} from "./core/gpu/gpu_vertex";
import {MemoryManager} from "./hle/manager/memory";
import {FileManager, Uri} from "./hle/manager/file";
import {PspGpu} from "./core/gpu/gpu_core";
import {SyscallManager} from "./core/cpu/cpu_core";
import {ThreadManager} from "./hle/manager/thread";
import {NetManager} from "./hle/manager/net";
import {ModuleManager} from "./hle/manager/module";
import {MountableVfs} from "./hle/vfs/vfs_mountable";
import {CallbackManager} from "./hle/manager/callback";
import {Interop} from "./hle/manager/interop";
import {StorageVfs} from "./hle/vfs/vfs_storage";
import {EmulatorVfs} from "./hle/vfs/vfs_emulator";
import {MemoryStickVfs} from "./hle/vfs/vfs_ms";
import {MemoryVfs} from "./hle/vfs/vfs_memory";
import {UriVfs} from "./hle/vfs/vfs_uri";
import {ZipVfs} from "./hle/vfs/vfs_zip";
import {FileOpenFlags, ProxyVfs} from "./hle/vfs/vfs";
import {IsoVfs} from "./hle/vfs/vfs_iso";

var console = logger.named('emulator');

export class Emulator {
	public context: EmulatorContext;
	public memory: Memory;
	private memoryManager: MemoryManager;
	private rtc: PspRtc;
	private interruptManager: InterruptManager;
	fileManager: FileManager;
	audio: PspAudio = new PspAudio();
	canvas: HTMLCanvasElement;
	webgl_canvas: HTMLCanvasElement;
	display: PspDisplay;
	public gpu: PspGpu;
	public gpuStats: GpuStats = new GpuStats();
	public battery = new Battery();
	public controller: PspController = new PspController();
	private syscallManager: SyscallManager;
	private threadManager: ThreadManager;
	private netManager: NetManager;
	private moduleManager: ModuleManager;
	private ms0Vfs: MountableVfs;
	private callbackManager: CallbackManager;
	private interop: Interop;
	private storageVfs: StorageVfs;
	//private dropboxVfs: DropboxVfs;
	public config: Config = new Config();
	//private usingDropbox: boolean = false;
	emulatorVfs: EmulatorVfs;

	constructor(memory?: Memory) {
		if (!memory) memory = getMemoryInstance();
		this.memory = memory;
	}

	stopAsync() {
		if (!this.display) return PromiseFast.resolve();

		return PromiseFast.all([
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
			this.memoryManager = new MemoryManager();
			this.interruptManager = new InterruptManager();
			this.syscallManager = new SyscallManager(this.context);
			this.fileManager = new FileManager();
			this.interop = new Interop();
			this.callbackManager = new CallbackManager(this.interop);
			this.rtc = new PspRtc();
			this.display = new PspDisplay(this.memory, this.interruptManager, this.canvas, this.webgl_canvas);
 			this.gpu = new PspGpu(this.memory, this.display, this.interop, this.gpuStats);
			/*
			this.gpu.onDrawBatches.add(() => {
				console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
			});
			*/
			this.gpu.onDrawBatches.pipeTo(this.onDrawBatches);
			this.threadManager = new ThreadManager(this.memory, this.interruptManager, this.callbackManager, this.memoryManager, this.display, this.syscallManager);
			this.moduleManager = new ModuleManager(this.context);
			this.netManager = new NetManager();

			this.emulatorVfs = new EmulatorVfs(this.context);
			this.ms0Vfs = new MountableVfs();
			this.storageVfs = new StorageVfs('psp_storage');
			//this.dropboxVfs = new DropboxVfs();
			//this.dropboxVfs.enabled = this.usingDropbox;

			//var msvfs = new MemoryStickVfs([this.dropboxVfs, this.storageVfs, this.ms0Vfs], this.callbackManager, this.memory);
			var msvfs = new MemoryStickVfs([this.storageVfs, this.ms0Vfs], this.callbackManager, this.memory);
			this.fileManager.mount('fatms0', msvfs);
			this.fileManager.mount('ms0', msvfs);
			this.fileManager.mount('mscmhc0', msvfs);

			this.fileManager.mount('host0', new MemoryVfs());
			this.fileManager.mount('flash0', new UriVfs('data/flash0'));
			this.fileManager.mount('emulator', this.emulatorVfs);
			this.fileManager.mount('kemulator', this.emulatorVfs);

			this.ms0Vfs.mountVfs('/', new MemoryVfs());

			registerModulesAndSyscalls(this.syscallManager, this.moduleManager);

			this.context.init(this.interruptManager, this.display, this.controller, this.gpu, this.memoryManager, this.threadManager, this.audio, this.memory, this.fileManager, this.rtc, this.callbackManager, this.moduleManager, this.config, this.interop, this.netManager, this.battery);
			
			return PromiseFast.all([
				this.display.startAsync().then(() => { console.info('display initialized'); }),
				this.controller.startAsync().then(() => { console.info('controller initialized'); }),
				this.gpu.startAsync().then(() => { console.info('gpu initialized'); }),
				this.audio.startAsync().then(() => { console.info('audio initialized'); }),
				this.threadManager.startAsync().then(() => { console.info('threadManager initialized'); }),
			]);
		});
	}

	private gameTitle: string = '';

	private processParamsPsf(psf: Psf) {
		this.gameTitle = psf.entriesByName['TITLE'];
		console.log(psf.entriesByName);
	}

	public onPic0 = new Signal1<Uint8Array>();
	public onPic1 = new Signal1<Uint8Array>();
	
	private loadIcon0(data: Stream) {
		this.onPic0.dispatch(data.toUInt8Array());
	}
	
	private loadPic1(data: Stream) {
		this.onPic1.dispatch(data.toUInt8Array());
	}

	private _loadAndExecuteAsync(asyncStream: AsyncStream, pathToFile: string):PromiseFast<any> {
		return detectFormatAsync(asyncStream).then((fileFormat):any => {
			console.info(`File:: size: ${asyncStream.size}, format: "${fileFormat}", name: "${asyncStream.name}"`);
			switch (fileFormat) {
				case 'ciso':
					return Cso.fromStreamAsync(asyncStream).then(asyncStream2 => this._loadAndExecuteAsync(asyncStream2, pathToFile));
				case 'pbp':
					return asyncStream.readChunkAsync(0, asyncStream.size).then(executableArrayBuffer => {
						var pbp = Pbp.fromStream(Stream.fromArrayBuffer(executableArrayBuffer));
						var psf = Psf.fromStream(pbp.get(PbpNames.ParamSfo));
						this.processParamsPsf(psf);
						this.loadIcon0(pbp.get(PbpNames.Icon0Png));
						this.loadPic1(pbp.get(PbpNames.Pic1Png));

						return this._loadAndExecuteAsync(new MemoryAsyncStream(pbp.get(PbpNames.PspData).toArrayBuffer()), pathToFile);
					});
				case 'psp':
					return asyncStream.readChunkAsync(0, asyncStream.size).then(executableArrayBuffer => {
						return this._loadAndExecuteAsync(new MemoryAsyncStream(decrypt(Stream.fromArrayBuffer(executableArrayBuffer)).slice().readAllBytes().buffer, pathToFile + ".CryptedPSP"), pathToFile);
					});
				case 'zip':
					return Zip.fromStreamAsync(asyncStream).then(zip => {
						var zipFs = new ZipVfs(zip, this.storageVfs);
						var mountableVfs = this.ms0Vfs;
						mountableVfs.mountVfs('/PSP/GAME/virtual', zipFs);

						var availableElf = ['/EBOOT.ELF', '/BOOT.ELF', '/EBOOT.PBP'].first(item => zip.has(item));

						console.log('elf: ' + availableElf);

						return zipFs.openAsync(availableElf, FileOpenFlags.Read, parseInt('0777', 8)).then((node) => {
							return node.readAllAsync().then((data) => {
								return this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(data), 'ms0:/PSP/GAME/virtual/EBOOT.ELF');
							});
						});
					});
				case 'iso':
					return Iso.fromStreamAsync(asyncStream).then(iso => {
						var isoFs = new IsoVfs(iso);
						this.fileManager.mount('umd0', isoFs);
						this.fileManager.mount('umd1', isoFs);
						this.fileManager.mount('disc0', isoFs);
						this.fileManager.mount('disc1', isoFs);

						return isoFs.existsAsync('PSP_GAME/PARAM.SFO').then((exists: boolean) => {
							if (!exists) {
								var mountableVfs = this.ms0Vfs;
								mountableVfs.mountVfs('/PSP/GAME/virtual', new ProxyVfs([isoFs, this.storageVfs]));

								return isoFs.readAllAsync('EBOOT.PBP').then(bootBinData => {
									return this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(bootBinData), 'ms0:/PSP/GAME/virtual/EBOOT.PBP');
								});
							} else {
								return isoFs.readAllAsync('PSP_GAME/PARAM.SFO').then(paramSfoData => {
									var psf = Psf.fromStream(Stream.fromArrayBuffer(paramSfoData));
									this.processParamsPsf(psf);

									var icon0Promise = isoFs.readAllAsync('PSP_GAME/ICON0.PNG').then(data => { this.loadIcon0(Stream.fromArrayBuffer(data)); }).catch(() => { });
									var pic1Promise = isoFs.readAllAsync('PSP_GAME/PIC1.PNG').then(data => { this.loadPic1(Stream.fromArrayBuffer(data)); }).catch(() => { });

									return isoFs.existsAsync('PSP_GAME/SYSDIR/BOOT.BIN').then((exists) => {
										var path = exists ? 'PSP_GAME/SYSDIR/BOOT.BIN' : 'PSP_GAME/SYSDIR/EBOOT.BIN';
										return isoFs.readAllAsync(path).then(bootBinData => {
											return this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(bootBinData), 'umd0:/' + path);
										});
									});
								});
							}
						});
					});
				case 'elf':
					return asyncStream.readChunkAsync(0, asyncStream.size).then(executableArrayBuffer => {
						if (typeof document != 'undefined') {
							if (this.gameTitle) {
								document.title = this.gameTitle + ' - jspspemu';
							} else {
								document.title = 'jspspemu';
							}
						}

						var mountableVfs = this.ms0Vfs;
						mountableVfs.mountFileData('/PSP/GAME/virtual/EBOOT.ELF', executableArrayBuffer);

						var elfStream = Stream.fromArrayBuffer(executableArrayBuffer);

						this.fileManager.cwd = new Uri('ms0:/PSP/GAME/virtual');
						console.info('pathToFile:', pathToFile);
						var args = [pathToFile];
						var argumentsPartition = this.memoryManager.userPartition.allocateLow(0x4000);
						var argument = args.map(argument => argument + String.fromCharCode(0)).join('');
						this.memory.getPointerStream(argumentsPartition.low).writeString(argument);

						//console.log(new Uint8Array(executableArrayBuffer));
						var pspElf = new PspElfLoader(this.memory, this.memoryManager, this.moduleManager, this.syscallManager);
						pspElf.load(elfStream);
						this.context.symbolLookup = pspElf;
						this.context.gameTitle = this.gameTitle;
						this.context.gameId = pspElf.moduleInfo.name;
						var moduleInfo = pspElf.moduleInfo;

						//this.memory.dump(); debugger;

						// "ms0:/PSP/GAME/virtual/EBOOT.PBP"
						var thread = this.threadManager.create('main', moduleInfo.pc, 10);
							thread.state.GP = moduleInfo.gp;
							thread.state.setGPR(4, argument.length);
							thread.state.setGPR(5, argumentsPartition.low);
							thread.start();
						});

				default:
					throw new Error(`"Unhandled format '${fileFormat}'`);
			}
		});
	}

	/*
	toggleDropbox() {
		this.connectToDropbox(!(localStorage["dropbox"] == 'true'));
	}

	connectToDropbox(newValue: boolean) {
		if (typeof $ == 'undefined') return;

		newValue = !!newValue;
		$('#dropbox').html(newValue ? '<span style="color:#3A3;">enabled</span>' : '<span style="color:#777;">disabled</span>');
		var oldValue = (localStorage["dropbox"] == 'true');

		console.log('dropbox: ', oldValue, '->', newValue);

		if (newValue) {
			localStorage["dropbox"] = 'true';

			DropboxVfs.tryLoginAsync().then(() => {
				$('#dropbox').html('<span style="color:#6A6;">connected</span>');
			}).catch((e) => {
				console.error(e);
				$('#dropbox').html('<span style="color:#F77;">error</span>');
			});
		} else {
			delete localStorage["dropbox"];
		}
		this.usingDropbox = newValue;
		if (this.dropboxVfs) {
			this.dropboxVfs.enabled = newValue;
		}
	}
	*/

	checkPlugins() {
		//this.connectToDropbox(localStorage["dropbox"] == 'true');
	}

	loadExecuteAndWaitAsync(asyncStream: AsyncStream, url: string, afterStartCallback: () => void) {
		this.gameTitle = '';
		return this.loadAndExecuteAsync(asyncStream, url).then(() => {
			if (afterStartCallback) afterStartCallback();

			//console.error('WAITING!');
			return this.threadManager.waitExitGameAsync().then(() => {
				//console.error('STOPPING!');
				return this.stopAsync().then(() => {
					return this.emulatorVfs.output;
				});
			});
		}).catch((e:any) => {
			console.error(e);
			console.error(e.stack);
			throw(e);
		});
	}

	static disableLog() {
		loggerPolicies.disableAll = true;
	}
	
	onDrawBatches = new Signal2<OptimizedDrawBuffer, OptimizedBatch[]>();

	loadAndExecuteAsync(asyncStream: AsyncStream, url: string) {
		if (typeof document != 'undefined') DomHelp.fromId('game_menu').hide();
		url = String(url);

		this.gameTitle = '';
		this.loadIcon0(Stream.fromArray([]));
		this.loadPic1(Stream.fromArray([]));
		return this.startAsync().then(() => {
			var parentUrl = url.replace(/\/[^//]+$/, '');
			console.info('parentUrl: ' + parentUrl);
			this.ms0Vfs.mountVfs('/PSP/GAME/virtual', new UriVfs(parentUrl));
			return this._loadAndExecuteAsync(asyncStream, "ms0:/PSP/GAME/virtual/EBOOT.PBP");
		}).catch((e:any) => {
			console.error(e);
			console.error(e.stack);
			throw (e);
		});
	}

	downloadAndExecuteAsync(url: string) {
		return UrlAsyncStream.fromUrlAsync(url).then(stream => {
			Microtask.queue(() => {
				// escape try/catch!
				this.loadAndExecuteAsync(stream, url);
			});
		});
	}

	executeFileAsync(file: File) {
		Microtask.queue(() => {
			// escape try/catch!
			this.loadAndExecuteAsync(new FileAsyncStream(file), '.');
		});
	}
}
