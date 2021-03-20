import _cpu = require('../core/cpu');
import _module = require('./manager/module');

import ExceptionManagerForKernel = require('./module/ExceptionManagerForKernel')
import InterruptManager = require('./module/InterruptManager');
import KDebugForKernel = require('./module/KDebugForKernel');
import Kernel_Library = require('./module/Kernel_Library');
import LoadCoreForKernel = require('./module/LoadCoreForKernel');
import LoadExecForUser = require('./module/LoadExecForUser');
import ModuleMgrForUser = require('./module/ModuleMgrForUser');
import sceAtrac3plus = require('./module/sceAtrac3plus');
import sceAudio = require('./module/sceAudio');
import sceCtrl = require('./module/sceCtrl');
import sceDisplay = require('./module/sceDisplay');
import sceDmac = require('./module/sceDmac');
import sceGe_user = require('./module/sceGe_user');
import sceHprm = require('./module/sceHprm');
import sceHttp = require('./module/sceHttp');
import sceParseHttp = require('./module/sceParseHttp');
import sceParseUri = require('./module/sceParseUri');
import sceImpose = require('./module/sceImpose');
import sceLibFont = require('./module/sceLibFont');
import sceMp3 = require('./module/sceMp3');
import sceMpeg = require('./module/sceMpeg');
import sceNet = require('./module/sceNet');
import sceNetAdhoc = require('./module/sceNetAdhoc');
import sceNetAdhocctl = require('./module/sceNetAdhocctl');
import sceNetAdhocMatching = require('./module/sceNetAdhocMatching');
import sceNetApctl = require('./module/sceNetApctl');
import sceNetInet = require('./module/sceNetInet');
import sceNetResolver = require('./module/sceNetResolver');
import sceNp = require('./module/sceNp');
import sceNpAuth = require('./module/sceNpAuth');
import sceNpService = require('./module/sceNpService');
import sceOpenPSID = require('./module/sceOpenPSID');
import scePower = require('./module/scePower');
import scePspNpDrm_user = require('./module/scePspNpDrm_user');
import sceReg = require('./module/sceReg');
import sceRtc = require('./module/sceRtc');
import sceSasCore = require('./module/sceSasCore');
import sceSsl = require('./module/sceSsl');
import sceSuspendForUser = require('./module/sceSuspendForUser');
import sceUmdUser = require('./module/sceUmdUser');
import sceUtility = require('./module/sceUtility');
import sceVaudio = require('./module/sceVaudio');
import sceWlanDrv = require('./module/sceWlanDrv');
import StdioForUser = require('./module/StdioForUser');
import SysMemUserForUser = require('./module/SysMemUserForUser');
import UtilsForKernel = require('./module/UtilsForKernel');
import UtilsForUser = require('./module/UtilsForUser');

import IoFileMgrForUser = require('./module/iofilemgr/IoFileMgrForUser');
import ThreadManForUser = require('./module/threadman/ThreadManForUser');
import ThreadManForUser_callbacks = require('./module/threadman/ThreadManForUser_callbacks');
import ThreadManForUser_sema = require('./module/threadman/ThreadManForUser_sema');
import ThreadManForUser_eventflag = require('./module/threadman/ThreadManForUser_eventflag');
import ThreadManForUser_vpl = require('./module/threadman/ThreadManForUser_vpl');
import ThreadManForUser_mutex = require('./module/threadman/ThreadManForUser_mutex');

function _registerModules(manager: _module.ModuleManager) {
}

function _registerSyscall(syscallManager: _cpu.SyscallManager, moduleManager: _module.ModuleManager, id: number, moduleName: string, functionName: string) {
	syscallManager.registerWithId(id, moduleManager.getByName(moduleName).getByName(functionName));
}

function registerModules(manager: _module.ModuleManager) {
	manager.registerModule(ExceptionManagerForKernel);
	manager.registerModule(InterruptManager);
	manager.registerModule(KDebugForKernel);
	manager.registerModule(Kernel_Library);
	manager.registerModule(LoadCoreForKernel);
	manager.registerModule(LoadExecForUser);
	manager.registerModule(ModuleMgrForUser);
	manager.registerModule(sceAtrac3plus);
	manager.registerModule(sceAudio);
	manager.registerModule(sceCtrl);
	manager.registerModule(sceDisplay);
	manager.registerModule(sceDmac);
	manager.registerModule(sceGe_user);
	manager.registerModule(sceHprm);
	manager.registerModule(sceHttp);
	manager.registerModule(sceParseHttp);
	manager.registerModule(sceParseUri);
	manager.registerModule(sceImpose);
	manager.registerModule(sceLibFont);
	manager.registerModule(sceMp3);
	manager.registerModule(sceMpeg);
	manager.registerModule(sceNet);
	manager.registerModule(sceNetAdhoc);
	manager.registerModule(sceNetAdhocctl);
	manager.registerModule(sceNetAdhocMatching);
	manager.registerModule(sceNetApctl);
	manager.registerModule(sceNetInet);
	manager.registerModule(sceNetResolver);
	manager.registerModule(sceNp);
	manager.registerModule(sceNpAuth);
	manager.registerModule(sceNpService);
	manager.registerModule(sceOpenPSID);
	manager.registerModule(scePower);
	manager.registerModule(scePspNpDrm_user);
	manager.registerModule(sceReg);
	manager.registerModule(sceRtc);
	manager.registerModule(sceSasCore);
	manager.registerModule(sceSsl);
	manager.registerModule(sceSuspendForUser);
	manager.registerModule(sceUmdUser);
	manager.registerModule(sceUtility);
	manager.registerModule(sceVaudio);
	manager.registerModule(sceWlanDrv);
	manager.registerModule(StdioForUser);
	manager.registerModule(SysMemUserForUser);
	manager.registerModule(UtilsForKernel);
	manager.registerModule(UtilsForUser);
	manager.registerModule(IoFileMgrForUser);
	manager.registerModule(ThreadManForUser);
	manager.registerModule(ThreadManForUser_callbacks);
	manager.registerModule(ThreadManForUser_sema);
	manager.registerModule(ThreadManForUser_eventflag);
	manager.registerModule(ThreadManForUser_vpl);
	manager.registerModule(ThreadManForUser_mutex);
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
