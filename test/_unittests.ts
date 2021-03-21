///<reference path="./global.d.ts" />

import '../src/emu/global';
import {LoggerLevel, loggerPolicies} from "../src/global/utils";

loggerPolicies.minLogLevel = LoggerLevel.WARN

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
