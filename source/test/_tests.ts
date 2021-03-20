///<reference path="./global.d.ts" />

//declare function require(name: string): any;

import * as promisetest from './promisetest';
import * as memorytest from './memorytest';
//import * as reloopertest from './codegen/reloopertest';
import * as pspTest  from './format/pspTest'; pspTest.ref();
import * as csoTest  from './format/csoTest'; csoTest.ref();
import * as isoTest  from './format/isoTest'; isoTest.ref();
import * as pbpTest  from './format/pbpTest'; pbpTest.ref();
import * as psfTest  from './format/psfTest'; psfTest.ref();
import * as zipTest  from './format/zipTest'; zipTest.ref();
import * as vagTest  from './format/vagTest'; vagTest.ref();
import * as memorymanagerTest  from './hle/memorymanagerTest'; memorymanagerTest.ref();
import * as vfsTest  from './hle/vfsTest'; vfsTest.ref();
import * as utilsTest  from './util/utilsTest'; utilsTest.ref();
import * as testasm  from './testasm'; testasm.ref();
import * as gpuTest  from './gpuTest'; gpuTest.ref();
import * as instructionTest  from './instructionTest'; instructionTest.ref();
import * as elfTest  from './hle/elfTest'; elfTest.ref();
import * as pspautotests  from './pspautotests'; pspautotests.ref();
