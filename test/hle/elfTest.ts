describe('elf', () => {
	var stream:Stream;

	before(() => {
		return downloadFileAsync('samples/counter.elf').then((data) => {
			stream = Stream.fromArrayBuffer(data);
		});
	});

    it('load', () => {
        //var stream = Stream.fromBase64(minifireElfBase64);
		var memory = core.Memory.instance;
        var memoryManager = new hle.MemoryManager();
        var display = new core.DummyPspDisplay();
        var syscallManager = new core.SyscallManager(context);
        var context = new EmulatorContext();
		var moduleManager = new hle.ModuleManager(context);

		context.init(display, null, null, memoryManager, null, null, memory, null, null);

        var elf = new hle.elf.PspElfLoader(memory, memoryManager, moduleManager, syscallManager);
        elf.load(stream);
        console.log(elf);
    });
});
