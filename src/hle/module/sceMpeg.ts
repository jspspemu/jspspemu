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

	/*
	u32 sceMpegCreate(u32 mpegAddr, u32 dataPtr, u32 size, u32 ringbufferAddr, u32 frameWidth, u32 mode, u32 ddrTop)
	{
		// Generate, and write mpeg handle into mpeg data, for some reason
		int mpegHandle = dataPtr + 0x30;
		Memory::Write_U32(mpegHandle, mpegAddr);

		// Initialize fake mpeg struct.
		Memory::Memcpy(mpegHandle, "LIBMPEG\0", 8);
		Memory::Memcpy(mpegHandle + 8, "001\0", 4);
		Memory::Write_U32(-1, mpegHandle + 12);
		if (ringbuffer.IsValid()) {
			Memory::Write_U32(ringbufferAddr, mpegHandle + 16);
			Memory::Write_U32(ringbuffer- > dataUpperBound, mpegHandle + 20);
		}
		MpegContext * ctx = new MpegContext;
		if (mpegMap.find(mpegHandle) != mpegMap.end()) {
			WARN_LOG_REPORT(HLE, "Replacing existing mpeg context at %08x", mpegAddr);
			// Otherwise, it would leak.
			delete mpegMap[mpegHandle];
		}
		mpegMap[mpegHandle] = ctx;

		// Initialize mpeg values.
		ctx- > mpegRingbufferAddr = ringbufferAddr;
		ctx- > videoFrameCount = 0;
		ctx- > audioFrameCount = 0;
		ctx- > videoPixelMode = GE_CMODE_32BIT_ABGR8888; // TODO: What's the actual default?
		ctx- > avcRegistered = false;
		ctx- > atracRegistered = false;
		ctx- > pcmRegistered = false;
		ctx- > dataRegistered = false;
		ctx- > ignoreAtrac = false;
		ctx- > ignorePcm = false;
		ctx- > ignoreAvc = false;
		ctx- > defaultFrameWidth = frameWidth;
		for (int i = 0; i < MPEG_DATA_ES_BUFFERS; i++) {
			ctx- > esBuffers[i] = false;
		}

		// Detailed "analysis" is done later in Query* for some reason.
		ctx- > isAnalyzed = false;
		ctx- > mediaengine = new MediaEngine();

		INFO_LOG(ME, "%08x=sceMpegCreate(%08x, %08x, %i, %08x, %i, %i, %i)", mpegHandle, mpegAddr, dataPtr, size, ringbufferAddr, frameWidth, mode, ddrTop);
		return hleDelayResult(0, "mpeg create", 29000);
	}
*/

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
