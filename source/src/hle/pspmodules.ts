import * as _cpu from '../core/cpu';
import * as _module from './manager/module';

import ExceptionManagerForKernel = require('./module/ExceptionManagerForKernel')
import * as InterruptManager from './module/InterruptManager';
import * as KDebugForKernel from './module/KDebugForKernel';
import * as Kernel_Library from './module/Kernel_Library';
import * as LoadCoreForKernel from './module/LoadCoreForKernel';
import * as LoadExecForUser from './module/LoadExecForUser';
import * as ModuleMgrForUser from './module/ModuleMgrForUser';
import * as sceAtrac3plus from './module/sceAtrac3plus';
import * as sceAudio from './module/sceAudio';
import * as sceCtrl from './module/sceCtrl';
import * as sceDisplay from './module/sceDisplay';
import * as sceDmac from './module/sceDmac';
import * as sceGe_user from './module/sceGe_user';
import * as sceHprm from './module/sceHprm';
import * as sceHttp from './module/sceHttp';
import * as sceParseHttp from './module/sceParseHttp';
import * as sceParseUri from './module/sceParseUri';
import * as sceImpose from './module/sceImpose';
import * as sceLibFont from './module/sceLibFont';
import * as sceMp3 from './module/sceMp3';
import * as sceMpeg from './module/sceMpeg';
import * as sceNet from './module/sceNet';
import * as sceNetAdhoc from './module/sceNetAdhoc';
import * as sceNetAdhocctl from './module/sceNetAdhocctl';
import * as sceNetAdhocMatching from './module/sceNetAdhocMatching';
import * as sceNetApctl from './module/sceNetApctl';
import * as sceNetInet from './module/sceNetInet';
import * as sceNetResolver from './module/sceNetResolver';
import * as sceNp from './module/sceNp';
import * as sceNpAuth from './module/sceNpAuth';
import * as sceNpService from './module/sceNpService';
import * as sceOpenPSID from './module/sceOpenPSID';
import * as scePower from './module/scePower';
import * as scePspNpDrm_user from './module/scePspNpDrm_user';
import * as sceReg from './module/sceReg';
import * as sceRtc from './module/sceRtc';
import * as sceSasCore from './module/sceSasCore';
import * as sceSsl from './module/sceSsl';
import * as sceSuspendForUser from './module/sceSuspendForUser';
import * as sceUmdUser from './module/sceUmdUser';
import * as sceUtility from './module/sceUtility';
import * as sceVaudio from './module/sceVaudio';
import * as sceWlanDrv from './module/sceWlanDrv';
import * as StdioForUser from './module/StdioForUser';
import * as SysMemUserForUser from './module/SysMemUserForUser';
import * as UtilsForKernel from './module/UtilsForKernel';
import * as UtilsForUser from './module/UtilsForUser';

import * as IoFileMgrForUser from './module/iofilemgr/IoFileMgrForUser';
import * as ThreadManForUser from './module/threadman/ThreadManForUser';
import * as ThreadManForUser_callbacks from './module/threadman/ThreadManForUser_callbacks';
import * as ThreadManForUser_sema from './module/threadman/ThreadManForUser_sema';
import * as ThreadManForUser_eventflag from './module/threadman/ThreadManForUser_eventflag';
import * as ThreadManForUser_vpl from './module/threadman/ThreadManForUser_vpl';
import * as ThreadManForUser_mutex from './module/threadman/ThreadManForUser_mutex';

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
