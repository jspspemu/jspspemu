///<reference path="global.d.ts" />

import _context = require('./context');
import _cpu = require('./core/cpu');
import _gpu = require('./core/gpu');
import _rtc = require('./core/rtc');
import _controller = require('./core/controller');
import _display = require('./core/display');
import _audio = require('./core/audio');
import _interrupt = require('./core/interrupt');
import _memory = require('./core/memory');
import _format = require('./format/format');
import _format_cso = require('./format/cso');
import _format_iso = require('./format/iso');
import _format_zip = require('./format/zip');
import _pbp = require('./format/pbp');
import _psf = require('./format/psf');
import _vfs = require('./hle/vfs');
import _config = require('./hle/config');
import _elf_psp = require('./hle/elf_psp');
import _elf_crypted_prx = require('./hle/elf_crypted_prx');

import _manager = require('./hle/manager');
import _pspmodules = require('./hle/pspmodules');

import PspRtc = _rtc.PspRtc;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;
import Vfs = _vfs.Vfs;
import VfsEntry = _vfs.VfsEntry;
import VfsStat = _vfs.VfsStat;
import MountableVfs = _vfs.MountableVfs;
import UriVfs = _vfs.UriVfs;
import IsoVfs = _vfs.IsoVfs;
import ZipVfs = _vfs.ZipVfs;
import StorageVfs = _vfs.StorageVfs;
import MemoryStickVfs = _vfs.MemoryStickVfs;
import EmulatorVfs = _vfs.EmulatorVfs; _vfs.EmulatorVfs;
import MemoryVfs = _vfs.MemoryVfs;
import DropboxVfs = _vfs.DropboxVfs;
import ProxyVfs = _vfs.ProxyVfs;

import Config = _config.Config;

import PspElfLoader = _elf_psp.PspElfLoader;

import Memory = _memory.Memory;
import EmulatorContext = _context.EmulatorContext;
import InterruptManager = _interrupt.InterruptManager;
import PspAudio = _audio.PspAudio;
import PspDisplay = _display.PspDisplay;
import PspGpu = _gpu.PspGpu;
import PspController = _controller.PspController;
import InstructionCache = _cpu.InstructionCache;
import SyscallManager = _cpu.SyscallManager;

import ThreadManager = _manager.ThreadManager;
import ModuleManager = _manager.ModuleManager;
import MemoryManager = _manager.MemoryManager;
import NetManager = _manager.NetManager;
import FileManager = _manager.FileManager;
import CallbackManager = _manager.CallbackManager;
import Interop = _manager.Interop;

var console = logger.named('emulator');

export class Emulator {
	public context: EmulatorContext;
	private memory: Memory;
	private memoryManager: MemoryManager;
	private rtc: PspRtc;
	private interruptManager: InterruptManager;
	fileManager: FileManager;
	private audio: PspAudio;
	private canvas: HTMLCanvasElement;
	private webgl_canvas: HTMLCanvasElement;
	private display: PspDisplay;
	private gpu: PspGpu;
	private controller: PspController;
	private instructionCache: InstructionCache;
	private syscallManager: SyscallManager;
	private threadManager: ThreadManager;
	private netManager: NetManager;
	private moduleManager: ModuleManager;
	private ms0Vfs: MountableVfs;
	private callbackManager: CallbackManager;
	private interop: Interop;
	private storageVfs: StorageVfs;
	private dropboxVfs: DropboxVfs;
	private config: Config;
	private usingDropbox: boolean = false;
	emulatorVfs: EmulatorVfs;

	constructor(memory?: Memory) {
		if (!memory) memory = Memory.instance;
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
			this.memoryManager = new MemoryManager();
			this.interruptManager = new InterruptManager();
			this.audio = new PspAudio();
			this.canvas = <HTMLCanvasElement>(document.getElementById('canvas'));
			this.webgl_canvas = <HTMLCanvasElement>(document.getElementById('webgl_canvas'));
			this.controller = new PspController();
			this.instructionCache = new InstructionCache(this.memory);
			this.syscallManager = new SyscallManager(this.context);
			this.fileManager = new FileManager();
			this.interop = new Interop();
			this.config = new Config();
			this.callbackManager = new CallbackManager(this.interop);
			this.rtc = new PspRtc();
			this.display = new PspDisplay(this.memory, this.interruptManager, this.canvas, this.webgl_canvas);
			this.gpu = new PspGpu(this.memory, this.display, this.webgl_canvas, this.interop);
			this.threadManager = new ThreadManager(this.memory, this.interruptManager, this.callbackManager, this.memoryManager, this.display, this.syscallManager, this.instructionCache);
			this.moduleManager = new ModuleManager(this.context);
			this.netManager = new NetManager();

			this.emulatorVfs = new EmulatorVfs();
			this.ms0Vfs = new MountableVfs();
			this.storageVfs = new StorageVfs('psp_storage');
			this.dropboxVfs = new DropboxVfs();
			this.dropboxVfs.enabled = this.usingDropbox;

			var msvfs = new MemoryStickVfs([this.dropboxVfs, this.storageVfs, this.ms0Vfs], this.callbackManager, this.memory);
			this.fileManager.mount('fatms0', msvfs);
			this.fileManager.mount('ms0', msvfs);
			this.fileManager.mount('mscmhc0', msvfs);

			this.fileManager.mount('host0', new MemoryVfs());
			this.fileManager.mount('flash0', new UriVfs('flash0'));
			this.fileManager.mount('emulator', this.emulatorVfs);
			this.fileManager.mount('kemulator', this.emulatorVfs);

			this.ms0Vfs.mountVfs('/', new MemoryVfs());

			_pspmodules.registerModulesAndSyscalls(this.syscallManager, this.moduleManager);

			this.context.init(this.interruptManager, this.display, this.controller, this.gpu, this.memoryManager, this.threadManager, this.audio, this.memory, this.instructionCache, this.fileManager, this.rtc, this.callbackManager, this.moduleManager, this.config, this.interop, this.netManager);

			return Promise.all([
				this.display.startAsync(),
				this.controller.startAsync(),
				this.gpu.startAsync(),
				this.audio.startAsync(),
				this.threadManager.startAsync(),
			]);
		});
	}

	private gameTitle: string = '';

	private processParamsPsf(psf: _psf.Psf) {
		this.gameTitle = psf.entriesByName['TITLE'];
		console.log(psf.entriesByName);
	}

	private changeFavicon(src) {
		var link = document.createElement('link'),
			oldLink = document.getElementById('dynamic-favicon');
		link.id = 'dynamic-favicon';
		link.rel = 'shortcut icon';
		link.href = src;
		if (oldLink) {
			document.head.removeChild(oldLink);
		}
		document.head.appendChild(link);
	}

	private loadIcon0(data: Stream) {
		//console.log('loadIcon0---------');
		//console.log(data);
		if (data.length == 0) {
			this.changeFavicon('icon.png');
		} else {
			this.changeFavicon(data.toImageUrl());
		}
		//var item = document.head.querySelector('link[rel="shortcut icon"]');
		//item['href'] = ;
	}

	private loadPic1(data: Stream) {
		//console.log('loadPic1---------');
		//console.log(data);
		document.body.style.backgroundRepeat = 'no-repeat';
		document.body.style.backgroundSize = 'cover';
		document.body.style.backgroundPosition = 'center center';
		document.body.style.backgroundImage = 'url("' + data.toImageUrl() + '")';
	}

	private _loadAndExecuteAsync(asyncStream: AsyncStream, pathToFile: string) {
		return _format.detectFormatAsync(asyncStream).then((fileFormat):any => {
			console.info(sprintf('File:: size: %d, format: "%s", name: "%s"', asyncStream.size, fileFormat, asyncStream.name));
			switch (fileFormat) {
				case 'ciso':
					return _format_cso.Cso.fromStreamAsync(asyncStream).then(asyncStream2 => this._loadAndExecuteAsync(asyncStream2, pathToFile));
				case 'pbp':
					return asyncStream.readChunkAsync(0, asyncStream.size).then(executableArrayBuffer => {
						var pbp = _pbp.Pbp.fromStream(Stream.fromArrayBuffer(executableArrayBuffer));
						var psf = _psf.Psf.fromStream(pbp.get(_pbp.Names.ParamSfo));
						this.processParamsPsf(psf);
						this.loadIcon0(pbp.get(_pbp.Names.Icon0Png));
						this.loadPic1(pbp.get(_pbp.Names.Pic1Png));

						return this._loadAndExecuteAsync(new MemoryAsyncStream(pbp.get(_pbp.Names.PspData).toArrayBuffer()), pathToFile);
					});
				case 'psp':
					return asyncStream.readChunkAsync(0, asyncStream.size).then(executableArrayBuffer => {
						return this._loadAndExecuteAsync(new MemoryAsyncStream(_elf_crypted_prx.decrypt(Stream.fromArrayBuffer(executableArrayBuffer)).slice().readAllBytes().buffer, pathToFile + ".CryptedPSP"), pathToFile);
					});
				case 'zip':
					return _format_zip.Zip.fromStreamAsync(asyncStream).then(zip => {
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
					return _format_iso.Iso.fromStreamAsync(asyncStream).then(iso => {
						var isoFs = new IsoVfs(iso);
						this.fileManager.mount('umd0', isoFs);
						this.fileManager.mount('umd1', isoFs);
						this.fileManager.mount('disc0', isoFs);
						this.fileManager.mount('disc1', isoFs);

						return isoFs.existsAsync('PSP_GAME/PARAM.SFO').then((exists) => {
							if (!exists) {
								var mountableVfs = this.ms0Vfs;
								mountableVfs.mountVfs('/PSP/GAME/virtual', new ProxyVfs([isoFs, this.storageVfs]));

								return isoFs.readAllAsync('EBOOT.PBP').then(bootBinData => {
									return this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(bootBinData), 'ms0:/PSP/GAME/virtual/EBOOT.PBP');
								});
							} else {
								return isoFs.readAllAsync('PSP_GAME/PARAM.SFO').then(paramSfoData => {
									var psf = _psf.Psf.fromStream(Stream.fromArrayBuffer(paramSfoData));
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
						if (this.gameTitle) {
							document.title = this.gameTitle + ' - jspspemu';
						} else {
							document.title = 'jspspemu';
						}

						var mountableVfs = this.ms0Vfs;
						mountableVfs.mountFileData('/PSP/GAME/virtual/EBOOT.ELF', executableArrayBuffer);

						var elfStream = Stream.fromArrayBuffer(executableArrayBuffer);

						this.fileManager.cwd = new _manager.Uri('ms0:/PSP/GAME/virtual');
						console.info('pathToFile:', pathToFile);
						var arguments = [pathToFile];
						var argumentsPartition = this.memoryManager.userPartition.allocateLow(0x4000);
						var argument = arguments.map(argument => argument + String.fromCharCode(0)).join('');
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
							thread.state.gpr[4] = argument.length;
							thread.state.gpr[5] = argumentsPartition.low;
							thread.start();
						});

				default:
					throw (new Error(sprintf("Unhandled format '%s'", fileFormat)));
			}
		});
	}

	toggleDropbox() {
		this.connectToDropbox(!(localStorage["dropbox"] == 'true'));
	}

	connectToDropbox(newValue: boolean) {
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

	checkPlugins() {
		this.connectToDropbox(localStorage["dropbox"] == 'true');
	}

	loadExecuteAndWaitAsync(asyncStream: AsyncStream, url: string, afterStartCallback: () => void) {
		this.gameTitle = '';
		return this.loadAndExecuteAsync(asyncStream, url).then(() => {
			afterStartCallback();

			//console.error('WAITING!');
			return this.threadManager.waitExitGameAsync().then(() => {
				//console.error('STOPPING!');
				return this.stopAsync();
			});
		}).catch(e => {
			console.error(e);
			console.error(e['stack']);
			throw(e);
		});
	}
	

	loadAndExecuteAsync(asyncStream: AsyncStream, url: string) {
		$('#game_menu').fadeOut(100);

		this.gameTitle = '';
		this.loadIcon0(Stream.fromArray([]));
		this.loadPic1(Stream.fromArray([]));
		return this.startAsync().then(() => {
			var parentUrl = url.replace(/\/[^//]+$/, '');
			console.info('parentUrl: ' + parentUrl);
			this.ms0Vfs.mountVfs('/PSP/GAME/virtual', new UriVfs(parentUrl));
			return this._loadAndExecuteAsync(asyncStream, "ms0:/PSP/GAME/virtual/EBOOT.PBP");
		}).catch(e => {
			console.error(e);
			console.error(e['stack']);
			throw (e);
		});
	}

	downloadAndExecuteAsync(url: string) {
		return UrlAsyncStream.fromUrlAsync(url).then(stream => {
			setImmediate(() => {
				// escape try/catch!
				this.loadAndExecuteAsync(stream, url);
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
