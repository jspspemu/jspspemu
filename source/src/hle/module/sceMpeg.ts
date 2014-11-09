///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import _memory = require('../../core/memory');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');
import Memory = _memory.Memory;

export class sceMpeg {
	constructor(private context: _context.EmulatorContext) { }

	static RING_BUFFER_PACKET_SIZE = 0x800;
	static MPEG_MEMSIZE = 64 * 1024;

	sceMpegInit = createNativeFunction(0x682A619B, 150, 'uint', '', this, () => {
		return -1;
	});

	sceMpegRingbufferQueryMemSize = createNativeFunction(0xD7A29F46, 150, 'uint', 'int', this, (numberOfPackets:number) => {
		return (sceMpeg.RING_BUFFER_PACKET_SIZE + 0x68) * numberOfPackets;
	});

	sceMpegQueryMemSize = createNativeFunction(0xC132E22F, 150, 'uint', 'int', this, (mode: number) => {
		return sceMpeg.MPEG_MEMSIZE;
	});

	sceMpegRingbufferConstruct = createNativeFunction(0x37295ED8, 150, 'uint', 'void*/int/int/int/int/int', this, (ringbufferAddr: Stream, numPackets: number, data: number, size: number, callbackAddr: number, callbackArg: number) => {
		if (ringbufferAddr == Stream.INVALID) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ADDR;
		if (size < 0) return SceKernelErrors.ERROR_MPEG_NO_MEMORY;
		if (this.__mpegRingbufferQueryMemSize(numPackets) > size) {
			if (numPackets < 0x00100000) {
				return SceKernelErrors.ERROR_MPEG_NO_MEMORY;
			} else {
				// The PSP's firmware allows some cases here, due to a bug in its validation.
			}
		}
		var buf = new RingBuffer();
		buf.packets = numPackets;
		buf.packetsRead = 0;
		buf.packetsWritten = 0;
		buf.packetsFree = 0;
		buf.packetSize = 2048;
		buf.data = data;
		buf.callback_addr = callbackAddr;
		buf.callback_args = callbackArg;
		buf.dataUpperBound = data + numPackets * 2048;
		buf.semaID = 0;
		buf.mpeg = 0;
		// This isn't in ver 0104, but it is in 0105.
		//if (mpegLibVersion >= 0x0105) buf.gp = __KernelGetModuleGP(__KernelGetCurThreadModuleId());
		RingBuffer.struct.write(ringbufferAddr, buf);
	});

	sceMpegCreate = createNativeFunction(0xd8c5f121, 150, 'uint', 'uint/uint/uint/void*/uint/uint', this, (mpegAddr: number, dataPtr: number, size: number, ringbufferAddr: Stream, mode: number, ddrTop: number) => {
		if (!this.context.memory.isValidAddress(mpegAddr)) return -1;
		if (size < sceMpeg.MPEG_MEMSIZE) return SceKernelErrors.ERROR_MPEG_NO_MEMORY;
		if (ringbufferAddr == Stream.INVALID) {
			var ringBuffer = RingBuffer.struct.read(ringbufferAddr.clone());
			if (ringBuffer.packetSize == 0) {
				ringBuffer.packetsFree = 0;
			} else {
				ringBuffer.packetsFree = (ringBuffer.dataUpperBound - ringBuffer.data) / ringBuffer.packetSize;
			}
			ringBuffer.mpeg = mpegAddr;
		}
		var mpeg = this.context.memory.getPointerStream(mpegAddr);

		mpeg.writeInt32(dataPtr + 0x30);

		var mpegHandle = this.context.memory.getPointerStream(dataPtr + 0x30);
		mpegHandle.writeString("LIBMPEG\0" + "001\0")
		mpegHandle.writeInt32(-1);
		// @TODO: WIP
		//mpegHandle.writeInt32(mpegAddr);
		//mpegHandle.write
	});

	sceMpegDelete = createNativeFunction(0x606A4649, 150, 'uint', 'int', this, (sceMpegPointer: number) => {
		//this.getMpeg(sceMpegPointer).delete();

		return 0;
	});

	sceMpegFinish = createNativeFunction(0x874624D6, 150, 'uint', '', this, () => {
		//this.getMpeg(sceMpegPointer).delete();
		return 0;
	});

	sceMpegRingbufferDestruct = createNativeFunction(0x13407F13, 150, 'uint', 'int', this, (ringBufferPointer: number) => {
		//Ringbuffer- > PacketsAvailable = Ringbuffer- > PacketsTotal;
		//Ringbuffer- > PacketsRead = 0;
		//Ringbuffer- > PacketsWritten = 0;
		return 0;
	});

	private __mpegRingbufferQueryMemSize(packets: number) {
		return packets * (104 + 2048);
	}
}

class RingBuffer {
	// PSP info
	packets: number;
	packetsRead: number;
	packetsWritten: number;
	packetsFree: number; // pspsdk: unk2, noxa: iUnk0
	packetSize: number; // 2048
	data: number; // address, ring buffer
	callback_addr: number; // see sceMpegRingbufferPut
	callback_args: number;
	dataUpperBound: number;
	semaID: number; // unused?
	mpeg: number; // pointer to mpeg struct, fixed up in sceMpegCreate
	gp: number; // Note: not available in all versions.

	static struct = StructClass.create<RingBuffer>(RingBuffer, [
		// PSP info
		{ packets: Int32 },
		{ packetsRead: Int32 },
		{ packetsWritten: Int32 },
		{ packetsFree: Int32 },
		{ packetSize: Int32 },
		{ data: UInt32 },
		{ callback_addr: UInt32 },
		{ callback_args: Int32 },
		{ dataUpperBound: Int32 },
		{ semaID: Int32 },
		{ mpeg: UInt32 },
		{ gp: UInt32 },
	]);
}
