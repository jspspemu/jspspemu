///<reference path="../global.d.ts" />
var _assembler = require('./cpu/assembler');
_assembler.MipsAssembler;
var _state = require('./cpu/state');
_state.CpuState;
var _executor = require('./cpu/executor');
_executor.ProgramExecutor;
var _icache = require('./cpu/icache');
_icache.InstructionCache;
var _syscall = require('./cpu/syscall');
_syscall.SyscallManager;
var _instructions = require('./cpu/instructions');
_instructions.Instructions;
exports.MipsAssembler = _assembler.MipsAssembler;
exports.MipsDisassembler = _assembler.MipsDisassembler;
exports.CpuState = _state.CpuState;
_state.CpuState;
exports.CpuSpecialAddresses = _state.CpuSpecialAddresses;
exports.ProgramExecutor = _executor.ProgramExecutor;
exports.InstructionCache = _icache.InstructionCache;
exports.SyscallManager = _syscall.SyscallManager;
exports.Instruction = _instructions.Instruction;
exports.Instructions = _instructions.Instructions;
exports.NativeFunction = _syscall.NativeFunction;
//# sourceMappingURL=cpu.js.map