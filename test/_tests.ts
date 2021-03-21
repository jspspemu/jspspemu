///<reference path="./global.d.ts" />

//declare function require(name: string): any;
import '../src/emu/global';
import {loggerPolicies} from "../src/global/utils";

//loggerPolicies.disableAll = true
loggerPolicies.minLogLevel = 3
//loggerPolicies.canLog('display', 3)
//loggerPolicies.canLog('module.IoFileMgrForUser', 3)
//loggerPolicies.canLog('module.SysMemUserForUser', 3)
//loggerPolicies.canLog('module.ThreadManForUser', 3)
//loggerPolicies.canLog('vfs.storage', 3)


import './format/pspTest';
import './format/csoTest';
import './format/isoTest';
import './format/pbpTest';
import './format/psfTest';
import './format/zipTest';
import './format/vagTest';
import './hle/memorymanagerTest';
import './hle/vfsTest';
import './util/utilsTest';
import './testasm';
import './gpuTest';
import './instructionTest';
import './hle/elfTest';
import './promisetest';
import './cpu/cpu_interpreterTest';
//import './pspautotests';
