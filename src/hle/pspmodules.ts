import _cpu = require('../core/cpu'); 
import _module = require('./manager/module'); 

function _registerModules(manager: _module.ModuleManager) {
}

function _registerSyscall(syscallManager: _cpu.SyscallManager, moduleManager: _module.ModuleManager, id: number, moduleName: string, functionName: string) {
	syscallManager.registerWithId(id, moduleManager.getByName(moduleName).getByName(functionName));
}

function registerModules(manager: _module.ModuleManager) {
	manager.registerModule(require('./module/ExceptionManagerForKernel'));
	manager.registerModule(require('./module/InterruptManager'));
	manager.registerModule(require('./module/iofilemgr/IoFileMgrForUser'));
	manager.registerModule(require('./module/KDebugForKernel'));
	manager.registerModule(require('./module/Kernel_Library'));
	manager.registerModule(require('./module/LoadCoreForKernel'));
	manager.registerModule(require('./module/LoadExecForUser'));
	manager.registerModule(require('./module/ModuleMgrForUser'));
	manager.registerModule(require('./module/sceAtrac3plus'));
	manager.registerModule(require('./module/sceAudio'));
	manager.registerModule(require('./module/sceCtrl'));
	manager.registerModule(require('./module/sceDisplay'));
	manager.registerModule(require('./module/sceDmac'));
	manager.registerModule(require('./module/sceGe_user'));
	manager.registerModule(require('./module/sceHprm'));
	manager.registerModule(require('./module/sceHttp'));
	manager.registerModule(require('./module/sceParseHttp'));
	manager.registerModule(require('./module/sceParseUri'));
	manager.registerModule(require('./module/sceImpose'));
	manager.registerModule(require('./module/sceLibFont'));
	manager.registerModule(require('./module/sceMp3'));
	manager.registerModule(require('./module/sceMpeg'));
	manager.registerModule(require('./module/sceNet'));
	manager.registerModule(require('./module/sceNetAdhoc'));
	manager.registerModule(require('./module/sceNetAdhocctl'));
	manager.registerModule(require('./module/sceNetAdhocMatching'));
	manager.registerModule(require('./module/sceNetApctl'));
	manager.registerModule(require('./module/sceNetInet'));
	manager.registerModule(require('./module/sceNetResolver'));
	manager.registerModule(require('./module/sceNp'));
	manager.registerModule(require('./module/sceNpAuth'));
	manager.registerModule(require('./module/sceNpService'));
	manager.registerModule(require('./module/sceOpenPSID'));
	manager.registerModule(require('./module/scePower'));
	manager.registerModule(require('./module/scePspNpDrm_user'));
	manager.registerModule(require('./module/sceReg'));
	manager.registerModule(require('./module/sceRtc'));
	manager.registerModule(require('./module/sceSasCore'));
	manager.registerModule(require('./module/sceSsl'));
	manager.registerModule(require('./module/sceSuspendForUser'));
	manager.registerModule(require('./module/sceUmdUser'));
	manager.registerModule(require('./module/sceUtility'));
	manager.registerModule(require('./module/sceVaudio'));
	manager.registerModule(require('./module/sceWlanDrv'));
	manager.registerModule(require('./module/StdioForUser'));
	manager.registerModule(require('./module/SysMemUserForUser'));
	manager.registerModule(require('./module/threadman/ThreadManForUser'));
	manager.registerModule(require('./module/threadman/ThreadManForUser_callbacks'));
	manager.registerModule(require('./module/threadman/ThreadManForUser_sema'));
	manager.registerModule(require('./module/threadman/ThreadManForUser_eventflag'));
	manager.registerModule(require('./module/threadman/ThreadManForUser_vpl'));
	manager.registerModule(require('./module/threadman/ThreadManForUser_mutex'));
	manager.registerModule(require('./module/UtilsForKernel'));
	manager.registerModule(require('./module/UtilsForUser'));
}

function registerSyscalls(syscallManager: _cpu.SyscallManager, moduleManager: _module.ModuleManager) {
	_registerSyscall(syscallManager, moduleManager, 0x206D, "ThreadManForUser", "sceKernelCreateThread");
	_registerSyscall(syscallManager, moduleManager, 0x206F, "ThreadManForUser", "sceKernelStartThread");
	_registerSyscall(syscallManager, moduleManager, 0x2071, "ThreadManForUser", "sceKernelExitDeleteThread");
	
	_registerSyscall(syscallManager, moduleManager, 0x20BF, "UtilsForUser", "sceKernelUtilsMt19937Init");
	_registerSyscall(syscallManager, moduleManager, 0x20C0, "UtilsForUser", "sceKernelUtilsMt19937UInt");
	
	_registerSyscall(syscallManager, moduleManager, 0x213A, "sceDisplay", "sceDisplaySetMode");
	_registerSyscall(syscallManager, moduleManager, 0x2147, "sceDisplay", "sceDisplayWaitVblankStart");
	_registerSyscall(syscallManager, moduleManager, 0x213F, "sceDisplay", "sceDisplaySetFrameBuf");
	
	_registerSyscall(syscallManager, moduleManager, 0x20EB, "LoadExecForUser", "sceKernelExitGame");
	
	_registerSyscall(syscallManager, moduleManager, 0x2150, "sceCtrl", "sceCtrlPeekBufferPositive");
}

export function registerModulesAndSyscalls(syscallManager: _cpu.SyscallManager, moduleManager: _module.ModuleManager) {
	registerModules(moduleManager);
	registerSyscalls(syscallManager, moduleManager);
}
