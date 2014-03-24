module hle.modules {
    export class ModuleMgrForUser {
		constructor(private context: EmulatorContext) { }

		sceKernelSelfStopUnloadModule = createNativeFunction(0xD675EBB8, 150, 'uint', 'int/int/int', this, (unknown: number, argsize: number, argp: number) => {
			console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelSelfStopUnloadModule(%d, %d, %d)', unknown ,argsize, argp));
			return 0;
		});

		sceKernelLoadModule = createNativeFunction(0x977DE386, 150, 'uint', 'string/uint/void*', this, (path: string, flags: number, sceKernelLMOption: Stream) => {
			console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelLoadModule(%s, %d)', path, flags));
			return 0;
		});

		sceKernelStartModule = createNativeFunction(0x50F0C1EC, 150, 'uint', 'int/int/uint/void*/void*', this, (moduleId: number, argumentSize: number, argumentPointer: number, status:Stream, sceKernelSMOption:Stream) => {
			console.warn(sprintf('Not implemented ModuleMgrForUser.sceKernelStartModule(%d, %d, %d)', moduleId, argumentSize, argumentPointer));
			return 0;
		});
    }
}
