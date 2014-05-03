import _elf = require('../../src/format/elf');
import _memory = require('../../src/core/memory');
import _cpu = require('../../src/core/cpu');
import _display = require('../../src/core/display');
import _manager = require('../../src/hle/manager');
import _elf_psp = require('../../src/hle/elf_psp');
import _context = require('../../src/context');
import pspmodules = require('../../src/hle/pspmodules');

import PspElfLoader = _elf_psp.PspElfLoader;
import MemoryManager = _manager.MemoryManager;
import ModuleManager = _manager.ModuleManager;
import SyscallManager = _cpu.SyscallManager;
import DummyPspDisplay = _display.DummyPspDisplay;
import EmulatorContext = _context.EmulatorContext;

describe('elf', () => {
	var stream:Stream;

	before(() => {
		return downloadFileAsync('samples/counter.elf').then((data) => {
			stream = Stream.fromArrayBuffer(data);
		});
	});

    it('load', () => {
        //var stream = Stream.fromBase64(minifireElfBase64);
		var memory = _memory.Memory.instance;
		var memoryManager = new _manager.MemoryManager();
        var display = new DummyPspDisplay();
        var syscallManager = new SyscallManager(context);
        var context = new EmulatorContext();
		var moduleManager = new ModuleManager(context);
		pspmodules.registerModulesAndSyscalls(syscallManager, moduleManager);

		context.init(null, display, null, null, memoryManager, null, null, memory, null, null, null, null);

        var elf = new PspElfLoader(memory, memoryManager, moduleManager, syscallManager);
        elf.load(stream);
        console.log(elf);
    });
});
