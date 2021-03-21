///<reference path="../global.d.ts" />
import {assert} from "chai"
import {downloadFileAsync} from "../../src/global/async";
import { DummyPspDisplay } from '../../src/core/display';
import { PspElfLoader } from '../../src/hle/elf_psp';
import { EmulatorContext } from '../../src/emu/context';
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
        const memory = getMemoryInstance();
        const memoryManager = new MemoryManager();
        const display = new DummyPspDisplay();
        const context = new EmulatorContext();
        const syscallManager = new SyscallManager(context);
        const moduleManager = new ModuleManager(context);
        registerModulesAndSyscalls(syscallManager, moduleManager);

		context.init(null as any, display, null as any, null as any, memoryManager, null as any, null as any, memory, null as any, null as any, null as any, null as any, null as any, null as any, null as any, null as any);

        var elf = new PspElfLoader(memory, memoryManager, moduleManager, syscallManager);
        elf.load(stream);
    });
});
