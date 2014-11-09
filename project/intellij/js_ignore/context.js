///<reference path="global.d.ts" />
var EmulatorContext = (function () {
    function EmulatorContext() {
        this.container = {};
        this.gameTitle = 'unknown';
        this.gameId = 'unknown';
    }
    EmulatorContext.prototype.init = function (interruptManager, display, controller, gpu, memoryManager, threadManager, audio, memory, instructionCache, fileManager, rtc, callbackManager, moduleManager, config, interop, netManager) {
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
    };
    return EmulatorContext;
})();
exports.EmulatorContext = EmulatorContext;
//# sourceMappingURL=context.js.map