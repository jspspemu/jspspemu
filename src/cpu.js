var EmulatorContext = (function () {
    function EmulatorContext() {
    }
    EmulatorContext.prototype.init = function (display, controller, gpu, memoryManager, threadManager, audio, memory, instructionCache, fileManager) {
        this.display = display;
        this.controller = controller;
        this.gpu = gpu;
        this.memoryManager = memoryManager;
        this.threadManager = threadManager;
        this.audio = audio;
        this.memory = memory;
        this.instructionCache = instructionCache;
        this.fileManager = fileManager;
    };
    return EmulatorContext;
})();

var CpuBreakException = (function () {
    function CpuBreakException(name, message) {
        if (typeof name === "undefined") { name = 'CpuBreakException'; }
        if (typeof message === "undefined") { message = 'CpuBreakException'; }
        this.name = name;
        this.message = message;
    }
    return CpuBreakException;
})();

var FunctionGenerator = (function () {
    function FunctionGenerator(memory) {
        this.memory = memory;
        this.instructions = core.cpu.Instructions.instance;
        this.instructionAst = new core.cpu.ast.InstructionAst();
    }
    FunctionGenerator.prototype.decodeInstruction = function (address) {
        var instruction = core.cpu.Instruction.fromMemoryAndPC(this.memory, address);
        var instructionType = this.getInstructionType(instruction);
        return new core.cpu.DecodedInstruction(instruction, instructionType);
    };

    FunctionGenerator.prototype.getInstructionType = function (i) {
        return this.instructions.findByData(i.data, i.PC);
    };

    FunctionGenerator.prototype.generateInstructionAstNode = function (di) {
        var instruction = di.instruction;
        var instructionType = di.type;
        var func = this.instructionAst[instructionType.name];
        if (func === undefined)
            throw (sprintf("Not implemented '%s' at 0x%08X", instructionType, di.instruction.PC));
        return func.call(this.instructionAst, instruction);
    };

    FunctionGenerator.prototype.create = function (address) {
        var _this = this;
        if (address == 0x00000000) {
            throw (new Error("Trying to execute 0x00000000"));
        }

        var ast = new MipsAstBuilder();

        var PC = address;
        var stms = [ast.functionPrefix()];

        var emitInstruction = function () {
            var result = _this.generateInstructionAstNode(_this.decodeInstruction(PC));
            PC += 4;
            return result;
        };

        for (var n = 0; n < 100000; n++) {
            var di = this.decodeInstruction(PC + 0);

            //console.log(di);
            if (di.type.hasDelayedBranch) {
                var di2 = this.decodeInstruction(PC + 4);

                // @TODO: Likely
                stms.push(emitInstruction());

                var delayedSlotInstruction = emitInstruction();
                if (di2.type.isSyscall) {
                    stms.push(this.instructionAst._postBranch(PC));
                    stms.push(this.instructionAst._likely(di.type.isLikely, delayedSlotInstruction));
                } else {
                    stms.push(this.instructionAst._likely(di.type.isLikely, delayedSlotInstruction));
                    stms.push(this.instructionAst._postBranch(PC));
                }

                break;
            } else {
                if (di.type.isSyscall) {
                    stms.push(this.instructionAst._storePC(PC + 4));
                }
                stms.push(emitInstruction());
                if (di.type.isBreak) {
                    break;
                }
            }
        }

        //console.debug(sprintf("// function_%08X:\n%s", address, ast.stms(stms).toJs()));
        if (n >= 100000)
            throw (new Error(sprintf("Too large function PC=%08X", address)));

        return new Function('state', ast.stms(stms).toJs());
    };
    return FunctionGenerator;
})();

var CpuSpecialAddresses;
(function (CpuSpecialAddresses) {
    CpuSpecialAddresses[CpuSpecialAddresses["EXIT_THREAD"] = 0x0FFFFFFF] = "EXIT_THREAD";
})(CpuSpecialAddresses || (CpuSpecialAddresses = {}));

var InstructionCache = (function () {
    function InstructionCache(memory) {
        this.memory = memory;
        this.cache = {};
        this.functionGenerator = new FunctionGenerator(memory);
    }
    InstructionCache.prototype.invalidateRange = function (from, to) {
        for (var n = from; n < to; n += 4)
            delete this.cache[n];
    };

    InstructionCache.prototype.getFunction = function (address) {
        var item = this.cache[address];
        if (item)
            return item;

        switch (address) {
            case 268435455 /* EXIT_THREAD */:
                return this.cache[address] = function (state) {
                    console.log(state);
                    console.warn('Thread: CpuSpecialAddresses.EXIT_THREAD');
                    state.thread.stop();
                    throw (new CpuBreakException());
                };
                break;
            default:
                return this.cache[address] = this.functionGenerator.create(address);
        }
    };
    return InstructionCache;
})();

var ProgramExecutor = (function () {
    function ProgramExecutor(state, instructionCache) {
        this.state = state;
        this.instructionCache = instructionCache;
        this.lastPC = 0;
    }
    ProgramExecutor.prototype.executeStep = function () {
        if (this.state.PC == 0) {
            console.error(sprintf("Calling 0x%08X from 0x%08X", this.state.PC, this.lastPC));
        }
        this.lastPC = this.state.PC;
        var func = this.instructionCache.getFunction(this.state.PC);
        func(this.state);
    };

    ProgramExecutor.prototype.execute = function (maxIterations) {
        if (typeof maxIterations === "undefined") { maxIterations = -1; }
        try  {
            while (maxIterations != 0) {
                this.executeStep();
                if (maxIterations > 0)
                    maxIterations--;
            }
        } catch (e) {
            if (!(e instanceof CpuBreakException)) {
                console.log(this.state);
                throw (e);
            }
        }
    };
    return ProgramExecutor;
})();
//# sourceMappingURL=cpu.js.map
