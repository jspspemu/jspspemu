///<reference path="./global.d.ts" />

//declare function require(name: string): any;

export import promisetest = require('./promisetest');
export import memorytest = require('./memorytest');
export import reloopertest = require('./codegen/reloopertest');
import pspTest = require('./format/pspTest'); pspTest.ref();
import csoTest = require('./format/csoTest'); csoTest.ref();
import isoTest = require('./format/isoTest'); isoTest.ref();
import pbpTest = require('./format/pbpTest'); pbpTest.ref();
import psfTest = require('./format/psfTest'); psfTest.ref();
import zipTest = require('./format/zipTest'); zipTest.ref();
import vagTest = require('./format/vagTest'); vagTest.ref();
import memorymanagerTest = require('./hle/memorymanagerTest'); memorymanagerTest.ref();
import vfsTest = require('./hle/vfsTest'); vfsTest.ref();
import utilsTest = require('./util/utilsTest'); utilsTest.ref();
import testasm = require('./testasm'); testasm.ref();
import gpuTest = require('./gpuTest'); gpuTest.ref();
import instructionTest = require('./instructionTest'); instructionTest.ref();
import elfTest = require('./hle/elfTest'); elfTest.ref();
import pspautotests = require('./pspautotests'); pspautotests.ref();
