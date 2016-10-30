///<reference path="../global.d.ts" />
export function ref() { } // Workaround to allow typescript to include this module

import { SyscallManager } from '../../src/core/cpu';
import { DummyPspDisplay } from '../../src/core/display';
import { MemoryManager, ModuleManager } from '../../src/hle/manager';
import { PspElfLoader } from '../../src/hle/elf_psp';
import { EmulatorContext } from '../../src/context';

import _elf = require('../../src/format/elf');
import _memory = require('../../src/core/memory');
import pspmodules = require('../../src/hle/pspmodules');

describe('elf', () => {
	var stream:Stream;

	before(() => {
		return downloadFileAsync('data/samples/counter.elf').then((data) => {
			stream = Stream.fromArrayBuffer(data);
		});
	});

    it('load', () => {
        //var stream = Stream.fromBase64(minifireElfBase64);
		var memory = _memory.getInstance();
		var memoryManager = new MemoryManager();
        var display = new DummyPspDisplay();
        var syscallManager = new SyscallManager(context);
        var context = new EmulatorContext();
		var moduleManager = new ModuleManager(context);
		pspmodules.registerModulesAndSyscalls(syscallManager, moduleManager);

		context.init(null, display, null, null, memoryManager, null, null, memory, null, null, null, null, null, null, null, null);

        var elf = new PspElfLoader(memory, memoryManager, moduleManager, syscallManager);
        elf.load(stream);
    });
});
