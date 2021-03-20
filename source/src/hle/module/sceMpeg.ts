import { nativeFunction } from '../utils';
import { EmulatorContext } from '../../context';
import { Memory } from '../../core/memory';
import { PixelFormat } from '../../core/pixelformat';
import { SceKernelErrors } from '../SceKernelErrors';
import {Stream} from "../../global/stream";
import {addressToHex} from "../../global/utils";
import {Int32, Int32_l, Int64, Stringn, StructClass, UInt32, UInt32_l} from "../../global/struct";
import {MeStream} from "../../global/me";
import {Integer64} from "../../global/int64";

var ENABLE = false;
//var ENABLE = true;

export class sceMpeg {
	constructor(private context: EmulatorContext) { }

	static RING_BUFFER_PACKET_SIZE = 0x800;
	static MPEG_MEMSIZE = 64 * 1024;

	@nativeFunction(0x682A619B, 150, 'uint', '')
	sceMpegInit() {
		return ENABLE ? 0 : -1;
	}
	
	@nativeFunction(0x874624D6, 150, 'uint', '')
	sceMpegFinish() {
		//this.getMpeg(sceMpegPointer).delete();
		return 0;
	}

	_sceMpegReadField(name: string, bufferAddr: number, output: Stream, readField: (p: PmfStruct) => number) {
		var buffer = this.context.memory.getPointerStream(bufferAddr);
		console.log(`${name}: ${addressToHex(bufferAddr)}`);
		var pmf = PmfStruct.struct.createProxy(buffer);
		if (pmf.magic != 'PSMF') { debugger; return SceKernelErrors.ERROR_MPEG_INVALID_VALUE; }
		var result = readField(pmf);
		output.writeInt32(result);
		console.log(`--> ${result}`);
		return 0;
	}

	@nativeFunction(0x21FF80E4, 150, 'uint', 'uint/uint/void*')
	sceMpegQueryStreamOffset(mpegAddr: number, bufferAddr: number, output: Stream) {
		if (!this.isValidMpeg(mpegAddr)) return -1;
		return this._sceMpegReadField('sceMpegQueryStreamOffset', bufferAddr, output, p => p.offset);
	}
	
	@nativeFunction(0x611E9E11, 150, 'uint', 'uint/void*')
	sceMpegQueryStreamSize(bufferAddr: number, output: Stream) {
		return this._sceMpegReadField('sceMpegQueryStreamSize', bufferAddr, output, p => p.size);
	}
	
	
	private mode: number;
	private pixelformat: PixelFormat = PixelFormat.RGBA_8888;
	
	@nativeFunction(0xA11C7026, 150, 'uint', 'uint/void*')
	sceMpegAvcDecodeMode(mpegAddr: number, modeAddr: Stream) {
		if (!this.isValidMpeg(mpegAddr)) return -1;
		var mode = SceMpegAvcMode.struct.createProxy(modeAddr);
		this.mode = mode.mode;
		if ((mode.pixelformat >= PixelFormat.RGBA_5650) && (mode.pixelformat <= PixelFormat.RGBA_8888)) {
			this.pixelformat = mode.pixelformat;
		} else {
			console.warn(`sceMpegAvcDecodeMode(${mode.mode}, ${mode.pixelformat}) invalid pixelformat`);
		}
		return 0;
	}
	
	@nativeFunction(0xA780CF7E, 150, 'uint', 'uint')
	sceMpegMallocAvcEsBuf(mpegAddr: number) {
		if (!this.isValidMpeg(mpegAddr)) return -1;
		var mpeg = this.mpegs.get(mpegAddr);
		return mpeg.allocAvcEsBuf();
	}
	
	@nativeFunction(0x167AFD9E, 150, 'uint', 'uint/uint/void*')
	sceMpegInitAu(mpegAddr: number, bufferAddr: number, auPointer: Stream) {
		var au = SceMpegAu.struct.createProxy(auPointer);
		au.esBuffer = bufferAddr;
		au.esSize = 2112;
		au.pts = Integer64.fromNumber(0);
		au.dts = Integer64.fromNumber(0);
		return 0;
	}

	@nativeFunction(0xF8DCB679, 150, 'uint', 'uint/void*/void*')
	sceMpegQueryAtracEsSize(mpegAddr: number, esSizeAddr: Stream, outSizeAddr: Stream) {
		esSizeAddr.writeInt32(2112);
		outSizeAddr.writeInt32(8192);
		return 0;
	}
	
	@nativeFunction(0x42560F23, 150, 'uint', 'uint/uint/uint')
	sceMpegRegistStream(mpegAddr: number, streamType: StreamType, streamNum: number) {
		if (!this.isValidMpeg(mpegAddr)) return -1;
		var mpeg = this.mpegs.get(mpegAddr);
		return mpeg.registerStream(streamType, streamNum);
	}
	
	@nativeFunction(0xC132E22F, 150, 'uint', 'int')
	sceMpegQueryMemSize(mode: number) {
		return sceMpeg.MPEG_MEMSIZE;
	}

	private isValidMpeg(mpegAddr: number) {
		return this.mpegs.has(mpegAddr);
	}
	
	private mpegs = new Map<number, Mpeg>();
	private mpeg: Mpeg;

	@nativeFunction(0xd8c5f121, 150, 'uint', 'uint/uint/uint/void*/uint/uint')
	sceMpegCreate(mpegAddr: number, dataPtr: number, size: number, ringbufferAddr: Stream, mode: number, ddrTop: number) {
		if (!this.context.memory.isValidAddress(mpegAddr)) return -1;
		if (size < sceMpeg.MPEG_MEMSIZE) return SceKernelErrors.ERROR_MPEG_NO_MEMORY;
		if (ringbufferAddr == Stream.INVALID) {
			var ringBuffer = RingBuffer.struct.createProxy(ringbufferAddr.clone());
			if (ringBuffer.packetSize == 0) {
				ringBuffer.packetsAvail = 0;
			} else {
				ringBuffer.packetsAvail = (ringBuffer.dataUpperBound - ringBuffer.data) / ringBuffer.packetSize;
			}
			ringBuffer.mpeg = mpegAddr;
		}
		var mpeg = this.context.memory.getPointerStream(mpegAddr);

		mpeg.writeInt32(dataPtr + 0x30);

		var mpegHandle = this.context.memory.getPointerStream(dataPtr + 0x30);
		mpegHandle.writeString("LIBMPEG\0" + "001\0")
		mpegHandle.writeInt32(-1);
		
		this.mpegs.set(mpegAddr, this.mpeg = new Mpeg());
		// @TODO: WIP
		//mpegHandle.writeInt32(mpegAddr);
		//mpegHandle.write
	}

	@nativeFunction(0x606A4649, 150, 'uint', 'int')
	sceMpegDelete(sceMpegPointer: number) {
		//this.getMpeg(sceMpegPointer).delete();

		return 0;
	}

	@nativeFunction(0xB5F6DC87, 150, 'uint', 'void*')
	sceMpegRingbufferAvailableSize(rinbuggerAddr: Stream) {
		var ringbuffer = RingBuffer.struct.createProxy(rinbuggerAddr);
		return ringbuffer.packets - ringbuffer.packetsAvail;
	}

	@nativeFunction(0xD7A29F46, 150, 'uint', 'int')
	sceMpegRingbufferQueryMemSize(numberOfPackets:number) {
		return (sceMpeg.RING_BUFFER_PACKET_SIZE + 0x68) * numberOfPackets;
	}
	
	@nativeFunction(0x37295ED8, 150, 'uint', 'void*/int/int/int/int/int')
	sceMpegRingbufferConstruct(ringbufferAddr: Stream, numPackets: number, data: number, size: number, callbackAddr: number, callbackArg: number) {
		if (ringbufferAddr == Stream.INVALID) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ADDR;
		if (size < 0) return SceKernelErrors.ERROR_MPEG_NO_MEMORY;
		if (this.__mpegRingbufferQueryMemSize(numPackets) > size) {
			if (numPackets < 0x00100000) {
				return SceKernelErrors.ERROR_MPEG_NO_MEMORY;
			} else {
				// The PSP's firmware allows some cases here, due to a bug in its validation.
			}
		}
		var buf = RingBuffer.struct.createProxy(ringbufferAddr);
		buf.packets = numPackets;
		buf.packetsRead = 0;
		buf.packetsWritten = 0;
		buf.packetsAvail = 0;
		buf.packetSize = 2048;
		buf.data = data;
		buf.callback_addr = callbackAddr;
		buf.callback_args = callbackArg;
		buf.dataUpperBound = data + numPackets * 2048;
		buf.semaID = 0;
		buf.mpeg = 0;
		// This isn't in ver 0104, but it is in 0105.
		//if (mpegLibVersion >= 0x0105) buf.gp = __KernelGetModuleGP(__KernelGetCurThreadModuleId());
	}
	
	@nativeFunction(0x13407F13, 150, 'uint', 'int')
	sceMpegRingbufferDestruct(ringBufferPointer: number) {
		//Ringbuffer- > PacketsAvailable = Ringbuffer- > PacketsTotal;
		//Ringbuffer- > PacketsRead = 0;
		//Ringbuffer- > PacketsWritten = 0;
		return 0;
	}
	
	private _mpegRingbufferRead() {
		
	}

	@nativeFunction(0xB240A59E, 150, 'uint', 'void*/uint/uint')
	sceMpegRingbufferPut(ringbufferAddr: Stream, numPackets: number, available: number) {
		var state = this.context.currentState;
		
		//console.log('sceMpegRingbufferPut');
		this._mpegRingbufferRead();
		numPackets = Math.min(numPackets, available);
		if (numPackets <= 0) {
			debugger;
			return 0;
		}
		
		var ringbuffer = RingBuffer.struct.createProxy(ringbufferAddr.clone());

		//console.log(this.context.memory.getPointerU8Array(ringbuffer.data, ringbuffer.packetSize));
		
		// Execute callback function as a direct MipsCall, no blocking here so no messing around with wait states etc
		if (ringbuffer.callback_addr != 0) {
			var packetsThisRound = Math.min(numPackets, ringbuffer.packets);
			this.context.interop.execute(state, ringbuffer.callback_addr, [
				ringbuffer.data, packetsThisRound, ringbuffer.callback_args
			]);
			console.log(state.V0);
		} else {
			console.warn("sceMpegRingbufferPut: callback_addr zero");
			debugger;
		}
		
		this.mpeg.addData(this.context.memory.getPointerU8Array(ringbuffer.data, ringbuffer.packetSize));
		
		return state.V0;
	}

	private __mpegRingbufferQueryMemSize(packets: number) {
		return packets * (104 + 2048);
	}
}

enum StreamType {
	Avc = 0,
	Atrac = 1,
	Pcm = 2,
	Data = 3,
	Audio = 15,
}

class Mpeg {
	private stream: MeStream;
	private streamIdGen: number = 1;
	private avcEsBuf: number = 1;
	
	constructor() {
		MeStream.openData(new Uint8Array(1024));
	}
	
	addData(data:Uint8Array) {
		
	}
	
	registerStream(type: StreamType, num: number) {
		return this.streamIdGen++;
	}
	
	allocAvcEsBuf() {
		return this.avcEsBuf++;
	}
}

class SceMpegAvcMode {
	mode: number;
	pixelformat: number;
	static struct = StructClass.create(SceMpegAvcMode, [
		// PSP info
		{ mode: Int32 },
		{ pixelformat: Int32 },
	]);
}

class SceMpegAu {
	pts: Integer64;  // presentation time stamp
	dts: Integer64;  // decode time stamp
	esBuffer: number;
	esSize: number;

	static struct = StructClass.create(SceMpegAu, [
		{ pts: Int64 },
		{ dts: Int64 },
		{ esBuffer: UInt32 },
		{ esSize: UInt32 },
	]);
}

class PmfStruct {
	magic: string; // PSMF
	version: number;
	offset: number;
	size: number;
	_dummy: number;
	firstTimestampOffset: number;
	lastTimestampOffset: number;
	static struct = StructClass.create(PmfStruct, [
		// PSP info
		{ magic: Stringn(4) },
		{ version: UInt32 },
		{ offset: UInt32 },
		{ size: UInt32 },
		{ _unknown: Stringn(0x44) },
		{ firstTimestampOffset: Stringn(6) },
		{ lastTimestampOffset: Stringn(6) },
	]);
}

class RingBuffer  {
	packets: number;
	packetsRead: number;
	packetsWritten: number;
	packetsAvail: number; // pspsdk: unk2, noxa: iUnk0
	packetSize: number; // 2048
	data: number; // address, ring buffer
	callback_addr: number; // see sceMpegRingbufferPut
	callback_args: number;
	dataUpperBound: number;
	semaID: number; // unused?
	mpeg: number; // pointer to mpeg struct, fixed up in sceMpegCreate
	// Note: not available in all versions.
	gp: number;
	static struct = StructClass.create(RingBuffer, [
		{ packets: Int32_l },
		{ packetsRead: Int32_l },
		{ packetsWritten: Int32_l },
		{ packetsAvail: Int32_l },
		{ packetSize: Int32_l },
		{ data: UInt32_l },
		{ callback_addr: UInt32_l },
		{ callback_args: Int32_l },
		{ dataUpperBound: Int32_l },
		{ semaID: Int32_l },
		{ mpeg: UInt32_l },
		{ gp: UInt32_l },
	]);
}

