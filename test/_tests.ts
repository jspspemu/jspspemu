///<reference path="./global.d.ts" />

//declare function require(name: string): any;
import '../src/global';

import {loggerPolicies} from "../src/global/utils";

loggerPolicies.disableAll = true

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
//import './pspautotests';
