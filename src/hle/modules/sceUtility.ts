module hle.modules {
	export class sceUtility {
		constructor(private context: EmulatorContext) { }

		private currentStep: DialogStepEnum = DialogStepEnum.NONE;

		sceUtilitySavedataInitStart = createNativeFunction(0x50C4CD57, 150, 'uint', 'void*', this, (paramsPtr: Stream) => {
			this.currentStep = DialogStepEnum.SUCCESS;
			return 0;
		});

		sceUtilitySavedataShutdownStart = createNativeFunction(0x9790B33C, 150, 'uint', '', this, () => {
			this.currentStep = DialogStepEnum.SHUTDOWN;
			return 0;
		});

		sceUtilitySavedataGetStatus = createNativeFunction(0x8874DBE0, 150, 'uint', '', this, () => {
			try {
				return this.currentStep;
			} finally {
				if (this.currentStep == DialogStepEnum.SHUTDOWN) this.currentStep = DialogStepEnum.NONE;
			}
		});
	}

	enum DialogStepEnum {
		NONE = 0,
		INIT = 1,
		PROCESSING = 2,
		SUCCESS = 3,
		SHUTDOWN = 4,
	}

}
