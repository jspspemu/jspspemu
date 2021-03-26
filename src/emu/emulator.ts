import "./global"

import { GpuStats } from '../core/gpu/gpu_stats';
import {DomHelp, logger, loggerPolicies, Microtask, PromiseFast, Signal1, Signal2} from "../global/utils";
import {EmulatorContext} from "./context";
import {getMemoryInstance, Memory} from "../core/memory";
import {PspRtc} from "../core/rtc";
import {InterruptManager} from "../core/interrupt";
import {PspAudio} from "../core/audio";
import {PspDisplay} from "../core/display";
import {Battery} from "../core/battery";
import {PspController} from "../core/controller";
import {Config} from "../hle/config";
import {registerModulesAndSyscalls} from "../hle/pspmodules";
import {Psf} from "../format/psf";
import {
    AsyncStream,
    BufferedAsyncStream,
    FileAsyncStream,
    MemoryAsyncStream,
    Stream,
    UrlAsyncStream
} from "../global/stream";
import {detectFormatAsync} from "../format/format";
import {Cso} from "../format/cso";
import {Pbp, PbpNames} from "../format/pbp";
import {decrypt} from "../hle/elf_crypted_prx";
import {Zip} from "../format/zip";
import {Iso} from "../format/iso";
import {PspElfLoader} from "../hle/elf_psp";
import {OptimizedBatch, OptimizedDrawBuffer} from "../core/gpu/gpu_vertex";
import {MemoryManager} from "../hle/manager/memory";
import {FileManager, Uri} from "../hle/manager/file";
import {PspGpu} from "../core/gpu/gpu_core";
import {CpuConfig, SyscallManager} from "../core/cpu/cpu_core";
import {ThreadManager} from "../hle/manager/thread";
import {NetManager} from "../hle/manager/net";
import {ModuleManager} from "../hle/manager/module";
import {MountableVfs} from "../hle/vfs/vfs_mountable";
import {CallbackManager} from "../hle/manager/callback";
import {Interop} from "../hle/manager/interop";
import {StorageVfs} from "../hle/vfs/vfs_storage";
import {EmulatorVfs} from "../hle/vfs/vfs_emulator";
import {MemoryStickVfs} from "../hle/vfs/vfs_ms";
import {MemoryVfs} from "../hle/vfs/vfs_memory";
import {UriVfs} from "../hle/vfs/vfs_uri";
import {ZipVfs} from "../hle/vfs/vfs_zip";
import {FileOpenFlags, ProxyVfs, Vfs} from "../hle/vfs/vfs";
import {IsoVfs} from "../hle/vfs/vfs_iso";
import {Html5Gamepad} from "../html5/Html5Gamepad";
import {Html5Keyboard} from "../html5/Html5Keyboard";
import {DropboxVfs, hasDropboxToken} from "../hle/vfs/vfs_dropbox";

const console = logger.named('emulator');

export class Emulator {
	// @ts-ignore
    public context: EmulatorContext;
	public memory: Memory;
    // @ts-ignore
	private memoryManager: MemoryManager;
    // @ts-ignore
	private rtc: PspRtc;
    // @ts-ignore
	private interruptManager: InterruptManager;
    // @ts-ignore
	fileManager: FileManager;
	audio: PspAudio = new PspAudio();
    // @ts-ignore
	canvas: HTMLCanvasElement;
    // @ts-ignore
	webgl_canvas: HTMLCanvasElement;
    // @ts-ignore
	display: PspDisplay;
    // @ts-ignore
	public gpu: PspGpu;
	public gpuStats: GpuStats = new GpuStats();
	public battery = new Battery();
    // @ts-ignore
	public controller: PspController;
    // @ts-ignore
	private syscallManager: SyscallManager;
    // @ts-ignore
	private threadManager: ThreadManager;
    // @ts-ignore
	private netManager: NetManager;
    // @ts-ignore
	private moduleManager: ModuleManager;
    // @ts-ignore
	private ms0Vfs: MountableVfs;
    // @ts-ignore
	private callbackManager: CallbackManager;
    // @ts-ignore
	private interop: Interop;
    // @ts-ignore
	private storageVfs: StorageVfs;
	//private dropboxVfs: DropboxVfs;
	public config: Config = new Config();
	public cpuConfig = new CpuConfig()
	//private usingDropbox: boolean = false;
    // @ts-ignore
	emulatorVfs: EmulatorVfs;

	// Interpreted
	get interpreted() { return this.cpuConfig.interpreted }
    set interpreted(value: boolean) { this.cpuConfig.interpreted = value }

	constructor(memory?: Memory) {
		if (!memory) memory = getMemoryInstance();
		this.memory = memory;
	}

    stop() {
        this.doFrameRunning = false
		if (!this.display) return
        this.controller?.unregister()
        this.display.unregister()
        this.gpu.unregister()
        this.audio.unregister()
        this.threadManager.unregister()
	}

	private doFrameRunning = false
    private doFrame = () => {
        if (this.doFrameRunning) requestAnimationFrame(this.doFrame)
        this.display.frame()
        this.controller.frame()
        this.audio.frame()
        this.threadManager.frame()
    }

    start() {
        this.stop()
        this.memory.reset()
        this.controller = new PspController()
        this.controller.addContributor(new Html5Gamepad())
        this.controller.addContributor(new Html5Keyboard())
        this.controller.register()
        this.context = new EmulatorContext()
        this.memoryManager = new MemoryManager()
        this.interruptManager = new InterruptManager()
        this.syscallManager = new SyscallManager(this.context)
        this.fileManager = new FileManager()
        this.interop = new Interop()
        this.callbackManager = new CallbackManager(this.interop)
        this.rtc = new PspRtc()
        this.display = new PspDisplay(this.memory, this.interruptManager, this.canvas, this.webgl_canvas)
        this.gpu = new PspGpu(this.memory, this.display, this.interop, this.gpuStats)
        this.gpu.onDrawBatches.pipeTo(this.onDrawBatches)
        this.threadManager = new ThreadManager(this.memory, this.interruptManager, this.callbackManager, this.memoryManager, this.display, this.syscallManager, this.cpuConfig)
        this.moduleManager = new ModuleManager(this.context)
        this.netManager = new NetManager()

        this.emulatorVfs = new EmulatorVfs(this.context)
        this.ms0Vfs = new MountableVfs()
            .mountVfs('/', new MemoryVfs())
        this.storageVfs = new StorageVfs('psp_storage')

        const memStickVfsList: Vfs[] = [this.storageVfs, this.ms0Vfs]

        if (hasDropboxToken()) {
            //memStickVfsList.unshift(new DropboxVfs())
            memStickVfsList.push(new DropboxVfs())
        }

        const msvfs = new MemoryStickVfs(memStickVfsList, this.callbackManager, this.memory)
        this.fileManager
            .mount('fatms0', msvfs)
            .mount('ms0', msvfs)
            .mount('mscmhc0', msvfs)
            .mount('host0', new MemoryVfs())
            .mount('flash0', new UriVfs('data/flash0'))
            .mount('emulator', this.emulatorVfs)
            .mount('kemulator', this.emulatorVfs)

        registerModulesAndSyscalls(this.syscallManager, this.moduleManager)

        this.context.init(this.interruptManager, this.display, this.controller, this.gpu, this.memoryManager, this.threadManager, this.audio, this.memory, this.fileManager, this.rtc, this.callbackManager, this.moduleManager, this.config, this.interop, this.netManager, this.battery)

        this.display.register()
        this.gpu.register()
        this.audio.register()
        this.threadManager.register()

        this.doFrameRunning = true
        this.doFrame()
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

    private async _loadAndExecuteAsync(asyncStream: AsyncStream, pathToFile: string): Promise<any> {
        const fileFormat = await detectFormatAsync(asyncStream)
        console.info(`File:: size: ${asyncStream.size}, format: "${fileFormat}", name: "${asyncStream.name}", pathToFile: "${pathToFile}"`);
        switch (fileFormat) {
            case 'ciso': {
                const asyncStream2 = await Cso.fromStreamAsync(asyncStream)
                return await this._loadAndExecuteAsync(asyncStream2, pathToFile);
            }
            case 'pbp': {
                const executableArrayBuffer = await asyncStream.readChunkAsync(0, asyncStream.size)
                const pbp = Pbp.fromStream(Stream.fromArrayBuffer(executableArrayBuffer));
                const psf = Psf.fromStream(pbp.get(PbpNames.ParamSfo));
                this.processParamsPsf(psf);
                this.loadIcon0(pbp.get(PbpNames.Icon0Png));
                this.loadPic1(pbp.get(PbpNames.Pic1Png));
                return await this._loadAndExecuteAsync(new MemoryAsyncStream(pbp.get(PbpNames.PspData).toArrayBuffer()), pathToFile);
            }
            case 'psp': {
                const executableArrayBuffer = await asyncStream.readChunkAsync(0, asyncStream.size)
                return await this._loadAndExecuteAsync(new MemoryAsyncStream(decrypt(Stream.fromArrayBuffer(executableArrayBuffer)).slice().readAllBytes().buffer, pathToFile + ".CryptedPSP"), pathToFile);
            }
            case 'zip': {
                const zip = await Zip.fromStreamAsync(asyncStream)
                const zipFs = new ZipVfs(zip, this.storageVfs);
                const mountableVfs = this.ms0Vfs;
                mountableVfs.mountVfs('/PSP/GAME/virtual', zipFs);
                const availableElf = ['/EBOOT.ELF', '/BOOT.ELF', '/EBOOT.PBP'].first(item => zip.has(item))!;
                console.log(`elf: ${availableElf}`);
                const node = await zipFs.openAsync(availableElf, FileOpenFlags.Read, parseInt('0777', 8))
                const data = await node.readAllAsync()
                return await this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(data), 'ms0:/PSP/GAME/virtual/EBOOT.ELF');
            }
            case 'iso': {
                const iso = await Iso.fromStreamAsync(asyncStream);
                const isoFs = new IsoVfs(iso);
                this.fileManager.mount('umd0', isoFs);
                this.fileManager.mount('umd1', isoFs);
                this.fileManager.mount('disc0', isoFs);
                this.fileManager.mount('disc1', isoFs);

                const exists = await isoFs.existsAsync('PSP_GAME/PARAM.SFO');

                if (!exists) {
                    const mountableVfs = this.ms0Vfs;
                    mountableVfs.mountVfs('/PSP/GAME/virtual', new ProxyVfs([isoFs, this.storageVfs]));

                    const bootBinData = await isoFs.readAllAsync('EBOOT.PBP')
                    return await this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(bootBinData), 'ms0:/PSP/GAME/virtual/EBOOT.PBP')
                } else {
                    const paramSfoData = await isoFs.readAllAsync('PSP_GAME/PARAM.SFO')
                    const psf = Psf.fromStream(Stream.fromArrayBuffer(paramSfoData))
                    this.processParamsPsf(psf);

                    try {
                        this.loadIcon0(Stream.fromArrayBuffer(await isoFs.readAllAsync('PSP_GAME/ICON0.PNG')))
                        this.loadPic1(Stream.fromArrayBuffer(await isoFs.readAllAsync('PSP_GAME/PIC1.PNG')))
                    } catch (e) {
                        console.error(e)
                    }

                    //const exists = await isoFs.existsAsync('PSP_GAME/SYSDIR/EBOOT.BIN');
                    //const path = exists ? 'PSP_GAME/SYSDIR/EBOOT.BIN' : 'PSP_GAME/SYSDIR/BOOT.BIN';
                    const exists = await isoFs.existsAsync('PSP_GAME/SYSDIR/BOOT.BIN');
                    const path = exists ? 'PSP_GAME/SYSDIR/BOOT.BIN' : 'PSP_GAME/SYSDIR/EBOOT.BIN';
                    const bootBinData = await isoFs.readAllAsync(path)
                    return await this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(bootBinData), `umd0:/${path}`);
                }
            }
            case 'elf': {
                const executableArrayBuffer = await asyncStream.readChunkAsync(0, asyncStream.size)

                if (typeof document != 'undefined') {
                    document.title = this.gameTitle ? `${this.gameTitle} - jspspemu` : 'jspspemu';
                }

                const mountableVfs = this.ms0Vfs
                mountableVfs.mountFileData('/PSP/GAME/virtual/EBOOT.ELF', executableArrayBuffer)
                const elfStream = Stream.fromArrayBuffer(executableArrayBuffer)

                this.fileManager.cwd = new Uri('ms0:/PSP/GAME/virtual')
                const args = [pathToFile]
                const argumentsPartition = this.memoryManager.userPartition.allocateLow(0x4000)
                const argument = args.map(argument => argument + String.fromCharCode(0)).join('')
                this.memory.getPointerStream(argumentsPartition.low)!.writeString(argument)

                const pspElf = new PspElfLoader(this.memory, this.memoryManager, this.moduleManager, this.syscallManager)
                pspElf.load(elfStream)
                this.context.symbolLookup = pspElf
                this.context.gameTitle = this.gameTitle
                this.context.gameId = pspElf.moduleInfo.name
                const moduleInfo = pspElf.moduleInfo

                //this.memory.dump(); debugger;

                // "ms0:/PSP/GAME/virtual/EBOOT.PBP"
                const thread = this.threadManager!.create('main', moduleInfo.pc, 10)
                thread.state.GP = moduleInfo.gp
                thread.state.setGPR(4, argument.length)
                thread.state.setGPR(5, argumentsPartition.low)
                thread.start();
                return;
            }
            default:
                throw new Error(`"Unhandled format '${fileFormat}'`)
        }
    }

	async loadExecuteAndWaitAsync(asyncStream: AsyncStream, url: string, afterStartCallback: () => void) {
		this.gameTitle = '';
        await this.loadAndExecuteAsync(asyncStream, url)
        try {
            if (afterStartCallback) afterStartCallback();

            //console.error('WAITING!');
            await this.threadManager.waitExitGameAsync()
            this.stop()
            return this.emulatorVfs.output;
        } catch (e) {
            console.error(e);
            console.error(e.stack);
            throw(e);
        }
	}

	static disableLog() {
		loggerPolicies.disableAll = true;
	}
	
	onDrawBatches = new Signal2<OptimizedDrawBuffer, OptimizedBatch[]>();

	async loadAndExecuteAsync(asyncStream: AsyncStream, url: string) {
		if (typeof document != 'undefined') DomHelp.fromId('game_menu').hide();
		url = String(url);

		this.gameTitle = '';
		this.loadIcon0(Stream.fromArray([]));
		this.loadPic1(Stream.fromArray([]));
		try {
            this.start()
            const parentUrl = url.replace(/\/[^//]+$/, '');
            console.info(`parentUrl: ${parentUrl}`);
            this.ms0Vfs.mountVfs('/PSP/GAME/virtual', new UriVfs(parentUrl));
            return await this._loadAndExecuteAsync(asyncStream, "ms0:/PSP/GAME/virtual/EBOOT.PBP");
        } catch (e) {
			console.error(e);
			console.error(e.stack);
			throw (e);
		}
	}

	async downloadAndExecuteAsync(url: string) {
	    const stream = await UrlAsyncStream.fromUrlAsync(url)
        await this.loadAndExecuteAsync(stream, url);
	}

    async downloadAndExecuteAndWaitAsync(url: string, afterStartCallback: () => void) {
	    const stream = await UrlAsyncStream.fromUrlAsync(url)
        return await this.loadExecuteAndWaitAsync(stream, url, afterStartCallback);
    }

    async executeFileAsync(file: File) {
        await this.loadAndExecuteAsync(new BufferedAsyncStream(new FileAsyncStream(file)), '.');
	}
}
