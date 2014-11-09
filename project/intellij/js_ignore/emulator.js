///<reference path="global.d.ts" />
var _context = require('./context');
var _cpu = require('./core/cpu');
var _gpu = require('./core/gpu');
var _rtc = require('./core/rtc');
var _controller = require('./core/controller');
var _display = require('./core/display');
var _audio = require('./core/audio');
var _interrupt = require('./core/interrupt');
var _memory = require('./core/memory');
var _format = require('./format/format');
var _format_cso = require('./format/cso');
var _format_iso = require('./format/iso');
var _format_zip = require('./format/zip');
var _pbp = require('./format/pbp');
var _psf = require('./format/psf');
var _vfs = require('./hle/vfs');
var _config = require('./hle/config');
var _elf_psp = require('./hle/elf_psp');
var _elf_crypted_prx = require('./hle/elf_crypted_prx');
var _manager = require('./hle/manager');
var _pspmodules = require('./hle/pspmodules');
var PspRtc = _rtc.PspRtc;
var FileOpenFlags = _vfs.FileOpenFlags;
var MountableVfs = _vfs.MountableVfs;
var UriVfs = _vfs.UriVfs;
var IsoVfs = _vfs.IsoVfs;
var ZipVfs = _vfs.ZipVfs;
var StorageVfs = _vfs.StorageVfs;
var MemoryStickVfs = _vfs.MemoryStickVfs;
var EmulatorVfs = _vfs.EmulatorVfs;
_vfs.EmulatorVfs;
var MemoryVfs = _vfs.MemoryVfs;
var DropboxVfs = _vfs.DropboxVfs;
var ProxyVfs = _vfs.ProxyVfs;
var Config = _config.Config;
var PspElfLoader = _elf_psp.PspElfLoader;
var Memory = _memory.Memory;
var EmulatorContext = _context.EmulatorContext;
var InterruptManager = _interrupt.InterruptManager;
var PspAudio = _audio.PspAudio;
var PspDisplay = _display.PspDisplay;
var PspGpu = _gpu.PspGpu;
var PspController = _controller.PspController;
var InstructionCache = _cpu.InstructionCache;
var SyscallManager = _cpu.SyscallManager;
var ThreadManager = _manager.ThreadManager;
var ModuleManager = _manager.ModuleManager;
var MemoryManager = _manager.MemoryManager;
var NetManager = _manager.NetManager;
var FileManager = _manager.FileManager;
var CallbackManager = _manager.CallbackManager;
var Interop = _manager.Interop;
var console = logger.named('emulator');
var Emulator = (function () {
    function Emulator(memory) {
        this.usingDropbox = false;
        this.gameTitle = '';
        if (!memory)
            memory = Memory.instance;
        this.memory = memory;
    }
    Emulator.prototype.stopAsync = function () {
        if (!this.display)
            return Promise.resolve();
        return Promise.all([
            this.display.stopAsync(),
            this.controller.stopAsync(),
            this.gpu.stopAsync(),
            this.audio.stopAsync(),
            this.threadManager.stopAsync(),
        ]);
    };
    Emulator.prototype.startAsync = function () {
        var _this = this;
        return this.stopAsync().then(function () {
            _this.memory.reset();
            _this.context = new EmulatorContext();
            _this.memoryManager = new MemoryManager();
            _this.interruptManager = new InterruptManager();
            _this.audio = new PspAudio();
            _this.canvas = (document.getElementById('canvas'));
            _this.webgl_canvas = (document.getElementById('webgl_canvas'));
            _this.controller = new PspController();
            _this.instructionCache = new InstructionCache(_this.memory);
            _this.syscallManager = new SyscallManager(_this.context);
            _this.fileManager = new FileManager();
            _this.interop = new Interop();
            _this.config = new Config();
            _this.callbackManager = new CallbackManager(_this.interop);
            _this.rtc = new PspRtc();
            _this.display = new PspDisplay(_this.memory, _this.interruptManager, _this.canvas, _this.webgl_canvas);
            _this.gpu = new PspGpu(_this.memory, _this.display, _this.webgl_canvas, _this.interop);
            _this.threadManager = new ThreadManager(_this.memory, _this.interruptManager, _this.callbackManager, _this.memoryManager, _this.display, _this.syscallManager, _this.instructionCache);
            _this.moduleManager = new ModuleManager(_this.context);
            _this.netManager = new NetManager();
            _this.emulatorVfs = new EmulatorVfs();
            _this.ms0Vfs = new MountableVfs();
            _this.storageVfs = new StorageVfs('psp_storage');
            _this.dropboxVfs = new DropboxVfs();
            _this.dropboxVfs.enabled = _this.usingDropbox;
            var msvfs = new MemoryStickVfs([_this.dropboxVfs, _this.storageVfs, _this.ms0Vfs], _this.callbackManager, _this.memory);
            _this.fileManager.mount('fatms0', msvfs);
            _this.fileManager.mount('ms0', msvfs);
            _this.fileManager.mount('mscmhc0', msvfs);
            _this.fileManager.mount('host0', new MemoryVfs());
            _this.fileManager.mount('flash0', new UriVfs('data/flash0'));
            _this.fileManager.mount('emulator', _this.emulatorVfs);
            _this.fileManager.mount('kemulator', _this.emulatorVfs);
            _this.ms0Vfs.mountVfs('/', new MemoryVfs());
            _pspmodules.registerModulesAndSyscalls(_this.syscallManager, _this.moduleManager);
            _this.context.init(_this.interruptManager, _this.display, _this.controller, _this.gpu, _this.memoryManager, _this.threadManager, _this.audio, _this.memory, _this.instructionCache, _this.fileManager, _this.rtc, _this.callbackManager, _this.moduleManager, _this.config, _this.interop, _this.netManager);
            return Promise.all([
                _this.display.startAsync(),
                _this.controller.startAsync(),
                _this.gpu.startAsync(),
                _this.audio.startAsync(),
                _this.threadManager.startAsync(),
            ]);
        });
    };
    Emulator.prototype.processParamsPsf = function (psf) {
        this.gameTitle = psf.entriesByName['TITLE'];
        console.log(psf.entriesByName);
    };
    Emulator.prototype.changeFavicon = function (src) {
        var link = document.createElement('link'), oldLink = document.getElementById('dynamic-favicon');
        link.id = 'dynamic-favicon';
        link.rel = 'shortcut icon';
        link.href = src;
        if (oldLink) {
            document.head.removeChild(oldLink);
        }
        document.head.appendChild(link);
    };
    Emulator.prototype.loadIcon0 = function (data) {
        //console.log('loadIcon0---------');
        //console.log(data);
        if (data.length == 0) {
            this.changeFavicon('icon.png');
        }
        else {
            this.changeFavicon(data.toImageUrl());
        }
        //var item = document.head.querySelector('link[rel="shortcut icon"]');
        //item['href'] = ;
    };
    Emulator.prototype.loadPic1 = function (data) {
        //console.log('loadPic1---------');
        //console.log(data);
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center center';
        document.body.style.backgroundImage = 'url("' + data.toImageUrl() + '")';
    };
    Emulator.prototype._loadAndExecuteAsync = function (asyncStream, pathToFile) {
        var _this = this;
        return _format.detectFormatAsync(asyncStream).then(function (fileFormat) {
            console.info(sprintf('File:: size: %d, format: "%s", name: "%s"', asyncStream.size, fileFormat, asyncStream.name));
            switch (fileFormat) {
                case 'ciso':
                    return _format_cso.Cso.fromStreamAsync(asyncStream).then(function (asyncStream2) { return _this._loadAndExecuteAsync(asyncStream2, pathToFile); });
                case 'pbp':
                    return asyncStream.readChunkAsync(0, asyncStream.size).then(function (executableArrayBuffer) {
                        var pbp = _pbp.Pbp.fromStream(Stream.fromArrayBuffer(executableArrayBuffer));
                        var psf = _psf.Psf.fromStream(pbp.get(_pbp.Names.ParamSfo));
                        _this.processParamsPsf(psf);
                        _this.loadIcon0(pbp.get(_pbp.Names.Icon0Png));
                        _this.loadPic1(pbp.get(_pbp.Names.Pic1Png));
                        return _this._loadAndExecuteAsync(new MemoryAsyncStream(pbp.get(_pbp.Names.PspData).toArrayBuffer()), pathToFile);
                    });
                case 'psp':
                    return asyncStream.readChunkAsync(0, asyncStream.size).then(function (executableArrayBuffer) {
                        return _this._loadAndExecuteAsync(new MemoryAsyncStream(_elf_crypted_prx.decrypt(Stream.fromArrayBuffer(executableArrayBuffer)).slice().readAllBytes().buffer, pathToFile + ".CryptedPSP"), pathToFile);
                    });
                case 'zip':
                    return _format_zip.Zip.fromStreamAsync(asyncStream).then(function (zip) {
                        var zipFs = new ZipVfs(zip, _this.storageVfs);
                        var mountableVfs = _this.ms0Vfs;
                        mountableVfs.mountVfs('/PSP/GAME/virtual', zipFs);
                        var availableElf = ['/EBOOT.ELF', '/BOOT.ELF', '/EBOOT.PBP'].first(function (item) { return zip.has(item); });
                        console.log('elf: ' + availableElf);
                        return zipFs.openAsync(availableElf, 1 /* Read */, parseInt('0777', 8)).then(function (node) {
                            return node.readAllAsync().then(function (data) {
                                return _this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(data), 'ms0:/PSP/GAME/virtual/EBOOT.ELF');
                            });
                        });
                    });
                case 'iso':
                    return _format_iso.Iso.fromStreamAsync(asyncStream).then(function (iso) {
                        var isoFs = new IsoVfs(iso);
                        _this.fileManager.mount('umd0', isoFs);
                        _this.fileManager.mount('umd1', isoFs);
                        _this.fileManager.mount('disc0', isoFs);
                        _this.fileManager.mount('disc1', isoFs);
                        return isoFs.existsAsync('PSP_GAME/PARAM.SFO').then(function (exists) {
                            if (!exists) {
                                var mountableVfs = _this.ms0Vfs;
                                mountableVfs.mountVfs('/PSP/GAME/virtual', new ProxyVfs([isoFs, _this.storageVfs]));
                                return isoFs.readAllAsync('EBOOT.PBP').then(function (bootBinData) {
                                    return _this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(bootBinData), 'ms0:/PSP/GAME/virtual/EBOOT.PBP');
                                });
                            }
                            else {
                                return isoFs.readAllAsync('PSP_GAME/PARAM.SFO').then(function (paramSfoData) {
                                    var psf = _psf.Psf.fromStream(Stream.fromArrayBuffer(paramSfoData));
                                    _this.processParamsPsf(psf);
                                    var icon0Promise = isoFs.readAllAsync('PSP_GAME/ICON0.PNG').then(function (data) {
                                        _this.loadIcon0(Stream.fromArrayBuffer(data));
                                    }).catch(function () {
                                    });
                                    var pic1Promise = isoFs.readAllAsync('PSP_GAME/PIC1.PNG').then(function (data) {
                                        _this.loadPic1(Stream.fromArrayBuffer(data));
                                    }).catch(function () {
                                    });
                                    return isoFs.existsAsync('PSP_GAME/SYSDIR/BOOT.BIN').then(function (exists) {
                                        var path = exists ? 'PSP_GAME/SYSDIR/BOOT.BIN' : 'PSP_GAME/SYSDIR/EBOOT.BIN';
                                        return isoFs.readAllAsync(path).then(function (bootBinData) {
                                            return _this._loadAndExecuteAsync(MemoryAsyncStream.fromArrayBuffer(bootBinData), 'umd0:/' + path);
                                        });
                                    });
                                });
                            }
                        });
                    });
                case 'elf':
                    return asyncStream.readChunkAsync(0, asyncStream.size).then(function (executableArrayBuffer) {
                        if (_this.gameTitle) {
                            document.title = _this.gameTitle + ' - jspspemu';
                        }
                        else {
                            document.title = 'jspspemu';
                        }
                        var mountableVfs = _this.ms0Vfs;
                        mountableVfs.mountFileData('/PSP/GAME/virtual/EBOOT.ELF', executableArrayBuffer);
                        var elfStream = Stream.fromArrayBuffer(executableArrayBuffer);
                        _this.fileManager.cwd = new _manager.Uri('ms0:/PSP/GAME/virtual');
                        console.info('pathToFile:', pathToFile);
                        var arguments = [pathToFile];
                        var argumentsPartition = _this.memoryManager.userPartition.allocateLow(0x4000);
                        var argument = arguments.map(function (argument) { return argument + String.fromCharCode(0); }).join('');
                        _this.memory.getPointerStream(argumentsPartition.low).writeString(argument);
                        //console.log(new Uint8Array(executableArrayBuffer));
                        var pspElf = new PspElfLoader(_this.memory, _this.memoryManager, _this.moduleManager, _this.syscallManager);
                        pspElf.load(elfStream);
                        _this.context.symbolLookup = pspElf;
                        _this.context.gameTitle = _this.gameTitle;
                        _this.context.gameId = pspElf.moduleInfo.name;
                        var moduleInfo = pspElf.moduleInfo;
                        //this.memory.dump(); debugger;
                        // "ms0:/PSP/GAME/virtual/EBOOT.PBP"
                        var thread = _this.threadManager.create('main', moduleInfo.pc, 10);
                        thread.state.GP = moduleInfo.gp;
                        thread.state.gpr[4] = argument.length;
                        thread.state.gpr[5] = argumentsPartition.low;
                        thread.start();
                    });
                default:
                    throw (new Error(sprintf("Unhandled format '%s'", fileFormat)));
            }
        });
    };
    Emulator.prototype.toggleDropbox = function () {
        this.connectToDropbox(!(localStorage["dropbox"] == 'true'));
    };
    Emulator.prototype.connectToDropbox = function (newValue) {
        newValue = !!newValue;
        $('#dropbox').html(newValue ? '<span style="color:#3A3;">enabled</span>' : '<span style="color:#777;">disabled</span>');
        var oldValue = (localStorage["dropbox"] == 'true');
        console.log('dropbox: ', oldValue, '->', newValue);
        if (newValue) {
            localStorage["dropbox"] = 'true';
            DropboxVfs.tryLoginAsync().then(function () {
                $('#dropbox').html('<span style="color:#6A6;">connected</span>');
            }).catch(function (e) {
                console.error(e);
                $('#dropbox').html('<span style="color:#F77;">error</span>');
            });
        }
        else {
            delete localStorage["dropbox"];
        }
        this.usingDropbox = newValue;
        if (this.dropboxVfs) {
            this.dropboxVfs.enabled = newValue;
        }
    };
    Emulator.prototype.checkPlugins = function () {
        this.connectToDropbox(localStorage["dropbox"] == 'true');
    };
    Emulator.prototype.loadExecuteAndWaitAsync = function (asyncStream, url, afterStartCallback) {
        var _this = this;
        this.gameTitle = '';
        return this.loadAndExecuteAsync(asyncStream, url).then(function () {
            afterStartCallback();
            //console.error('WAITING!');
            return _this.threadManager.waitExitGameAsync().then(function () {
                //console.error('STOPPING!');
                return _this.stopAsync();
            });
        }).catch(function (e) {
            console.error(e);
            console.error(e['stack']);
            throw (e);
        });
    };
    Emulator.prototype.loadAndExecuteAsync = function (asyncStream, url) {
        var _this = this;
        $('#game_menu').fadeOut(100);
        this.gameTitle = '';
        this.loadIcon0(Stream.fromArray([]));
        this.loadPic1(Stream.fromArray([]));
        return this.startAsync().then(function () {
            var parentUrl = url.replace(/\/[^//]+$/, '');
            console.info('parentUrl: ' + parentUrl);
            _this.ms0Vfs.mountVfs('/PSP/GAME/virtual', new UriVfs(parentUrl));
            return _this._loadAndExecuteAsync(asyncStream, "ms0:/PSP/GAME/virtual/EBOOT.PBP");
        }).catch(function (e) {
            console.error(e);
            console.error(e['stack']);
            throw (e);
        });
    };
    Emulator.prototype.downloadAndExecuteAsync = function (url) {
        var _this = this;
        return UrlAsyncStream.fromUrlAsync(url).then(function (stream) {
            setImmediate(function () {
                // escape try/catch!
                _this.loadAndExecuteAsync(stream, url);
            });
        });
    };
    Emulator.prototype.executeFileAsync = function (file) {
        var _this = this;
        setImmediate(function () {
            // escape try/catch!
            _this.loadAndExecuteAsync(new FileAsyncStream(file), '.');
        });
    };
    return Emulator;
})();
exports.Emulator = Emulator;
//# sourceMappingURL=emulator.js.map