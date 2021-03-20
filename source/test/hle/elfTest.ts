///<reference path="../global.d.ts" />
import {downloadFileAsync} from "../../src/global/async";
import { DummyPspDisplay } from '../../src/core/display';
import { PspElfLoader } from '../../src/hle/elf_psp';
import { EmulatorContext } from '../../src/context';
import {Stream} from "../../src/global/stream";
import {getMemoryInstance} from "../../src/core/memory";
import {registerModulesAndSyscalls} from "../../src/hle/pspmodules";
import {MemoryManager} from "../../src/hle/manager/memory";
import {SyscallManager} from "../../src/core/cpu/cpu_core";
import {ModuleManager} from "../../src/hle/manager/module";

export function ref() { } // Workaround to allow typescript to include this module

describe('elf', () => {
	var stream: Stream;

	before(() => {
		return downloadFileAsync('data/samples/counter.elf').then((data) => {
			stream = Stream.fromArrayBuffer(data)
		});
	});

    it('load', () => {
        //var stream = Stream.fromBase64(minifireElfBase64);
		var memory = getMemoryInstance();
		var memoryManager = new MemoryManager();
        var display = new DummyPspDisplay();
        var syscallManager = new SyscallManager(context);
        var context = new EmulatorContext();
		var moduleManager = new ModuleManager(context);
		registerModulesAndSyscalls(syscallManager, moduleManager);

		context.init(null, display, null, null, memoryManager, null, null, memory, null, null, null, null, null, null, null, null);

        var elf = new PspElfLoader(memory, memoryManager, moduleManager, syscallManager);
        elf.load(stream);
    });
});
