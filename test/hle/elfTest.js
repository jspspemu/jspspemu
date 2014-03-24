describe('elf', function () {
    it('load', function () {
        //var stream = Stream.fromBase64(minifireElfBase64);
        var memory = new core.Memory();
        var memoryManager = new hle.MemoryManager();
        var display = new core.DummyPspDisplay();
        var syscallManager = new core.SyscallManager(context);
        var context = new EmulatorContext();
        var moduleManager = new hle.ModuleManager(context);
        var stream = Stream.fromBase64(counterElfBase64);

        context.init(display, null, null, memoryManager, null, null, memory, null, null);

        var elf = new hle.elf.PspElfLoader(memory, memoryManager, moduleManager, syscallManager);
        elf.load(stream);
        console.log(elf);
    });
});
//# sourceMappingURL=elfTest.js.map
