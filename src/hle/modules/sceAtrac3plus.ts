module hle.modules {
	export class sceAtrac3plus {
		constructor(private context: EmulatorContext) { }

		sceAtracSetDataAndGetID = createNativeFunction(0x7A20E7AF, 150, 'uint', 'void*/int', this, (dataPointer: Stream, dataLength: number) => {
			return 0;
		});

		sceAtracGetSecondBufferInfo = createNativeFunction(0x83E85EA0, 150, 'uint', 'int/void*/void*', this, (id: number, puiPosition: Stream, puiDataByte: Stream) => {
			puiPosition.writeInt32(0);
			puiDataByte.writeInt32(0);
			return 0;
		});

		sceAtracSetSecondBuffer = createNativeFunction(0x83BF7AFD, 150, 'uint', 'int/void*/uint', this, (id: number, pucSecondBufferAddr: Stream, uiSecondBufferByte: number) => {
			return 0;
		});
	}
}
