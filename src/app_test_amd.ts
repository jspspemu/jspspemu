import cpu = require('./core/cpu');
import _gpu = require('./core/gpu');
import _display = require('./core/display');
import _memory = require('./core/memory');
import Memory = _memory.Memory;
import CpuState = cpu.CpuState;
import MipsAssembler = cpu.MipsAssembler;
import ProgramExecutor = cpu.ProgramExecutor;
import SyscallManager = cpu.SyscallManager;
import InstructionCache = cpu.InstructionCache;
import PspGpu = _gpu.PspGpu;
import PspDisplay = _display.PspDisplay;

var memory = new Memory();
var syscallManager = new SyscallManager(null);
var instructionCache = new InstructionCache(memory);
var cpuState = new CpuState(memory, syscallManager);
var programExecutor = new ProgramExecutor(cpuState, instructionCache);
var assembler = new MipsAssembler();

var canvas2d = document.createElement('canvas');
var canvaswebgl = document.createElement('canvas');

var display = new PspDisplay(memory, canvas2d, canvaswebgl);
var gpu = new PspGpu(memory, display, canvaswebgl);

gpu.startAsync().then(() => {
	console.log('gpu.startAsync');
});

//console.log();

/*
assembler.assembleToMemory(memory, 4, [
	'li r1, 1000',
	'dbreak'
]);
*/

//cpuState.PC = 4;
//programExecutor.executeStep();
