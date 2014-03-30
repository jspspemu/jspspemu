module hle.modules {
	export class InterruptManager {
		constructor(private context: EmulatorContext) { }

		sceKernelRegisterSubIntrHandler = createNativeFunction(0xCA04A2B9, 150, 'uint', 'int/int/uint/uint', this, (pspInterrupt: PspInterrupts, handlerIndex: number, callbackAddress: number, callbackArgument: number) => {
			console.warn('sceKernelRegisterSubIntrHandler');
		});

		sceKernelEnableSubIntr = createNativeFunction(0xFB8E22EC, 150, 'uint', 'int/int', this, (pspInterrupt: PspInterrupts, handlerIndex: number) => {
			console.warn('sceKernelEnableSubIntr');
		});

		sceKernelReleaseSubIntrHandler = createNativeFunction(0xD61E6961, 150, 'uint', 'int/int', this, (pspInterrupt: PspInterrupts, handlerIndex: number) => {
			console.warn('sceKernelReleaseSubIntrHandler');
		});
	}

	enum PspInterrupts {
		PSP_GPIO_INT = 4,
		PSP_ATA_INT = 5,
		PSP_UMD_INT = 6,
		PSP_MSCM0_INT = 7,
		PSP_WLAN_INT = 8,
		PSP_AUDIO_INT = 10,
		PSP_I2C_INT = 12,
		PSP_SIRCS_INT = 14,
		PSP_SYSTIMER0_INT = 15,
		PSP_SYSTIMER1_INT = 16,
		PSP_SYSTIMER2_INT = 17,
		PSP_SYSTIMER3_INT = 18,
		PSP_THREAD0_INT = 19,
		PSP_NAND_INT = 20,
		PSP_DMACPLUS_INT = 21,
		PSP_DMA0_INT = 22,
		PSP_DMA1_INT = 23,
		PSP_MEMLMD_INT = 24,
		PSP_GE_INT = 25,
		PSP_VBLANK_INT = 30,
		PSP_MECODEC_INT = 31,
		PSP_HPREMOTE_INT = 36,
		PSP_MSCM1_INT = 60,
		PSP_MSCM2_INT = 61,
		PSP_THREAD1_INT = 65,
		PSP_INTERRUPT_INT = 66,
		_MAX = 67,
	}
}

