module hle.modules {
	export class sceHprm {
		constructor(private context: EmulatorContext) { }

		sceHprmPeekCurrentKey = createNativeFunction(0x1910B327, 150, 'uint', 'void*', this, (PspHprmKeysEnumKeyPtr: Stream) => {
			PspHprmKeysEnumKeyPtr.writeInt32(0);
			return 0;
		});
	}
}
