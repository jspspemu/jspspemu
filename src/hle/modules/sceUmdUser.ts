module hle.modules {
	export class sceUmdUser {
		constructor(private context: EmulatorContext) { }

		sceUmdRegisterUMDCallBack = createNativeFunction(0xAEE7404D, 150, 'uint', 'int', this, (callbackId:number) => {
			console.warn('Not implemented sceUmdRegisterUMDCallBack');
			return 0;
		});

		sceUmdCheckMedium = createNativeFunction(0x46EBB729, 150, 'uint', '', this, () => {
			console.warn('Not implemented sceUmdCheckMedium');
			return 0;
		});

		sceUmdWaitDriveStat = createNativeFunction(0x8EF08FCE, 150, 'uint', 'uint', this, (pspUmdState: number) => {
			console.warn('Not implemented sceUmdWaitDriveStat');
			return 0;
		});

		sceUmdWaitDriveStatCB = createNativeFunction(0x4A9E5E29, 150, 'uint', 'uint', this, (pspUmdState: number, timeout: number) => {
			console.warn('Not implemented sceUmdWaitDriveStatCB');
			return 0;
		});

		sceUmdActivate = createNativeFunction(0xC6183D47, 150, 'uint', 'int/string', this, (mode: number, drive: string) => {
			console.warn('Not implemented sceUmdActivate');
			return 0;
		});

		sceUmdGetDriveStat = createNativeFunction(0x6B4A146C, 150, 'uint', '', this, () => {
			return PspUmdState.PSP_UMD_PRESENT | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_READABLE;
		});
	}

	enum PspUmdState
	{
		PSP_UMD_INIT = 0x00,
		PSP_UMD_NOT_PRESENT = 0x01,
		PSP_UMD_PRESENT = 0x02,
		PSP_UMD_CHANGED = 0x04,
		PSP_UMD_NOT_READY = 0x08,
		PSP_UMD_READY = 0x10,
		PSP_UMD_READABLE = 0x20,
	}

}