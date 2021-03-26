import {I32, nativeFunctionEx, PTR, U32} from '../utils';
import { EmulatorContext } from '../../emu/context';
import { PixelFormat } from '../../core/pixelformat';
import { SceKernelErrors } from '../SceKernelErrors';
import {Stream} from "../../global/stream";
import {addressToHex, ProgramExitException} from "../../global/utils";
import {
    Int32,
    Int32_l,
    Int64,
    Stringn,
    Struct,
    StructClass,
    StructInt32, StructInt32_l, StructInt64, StructStructStringn,
    StructUInt32, StructUInt32_l,
    UInt32,
    UInt32_l
} from "../../global/struct";
import {Integer64} from "../../global/int64";

const ENABLE = false;
//const ENABLE = true;

export class sceMpeg {
	constructor(private context: EmulatorContext) { }

	static RING_BUFFER_PACKET_SIZE = 0x800;
	static MPEG_MEMSIZE = 64 * 1024;

	@nativeFunctionEx(0x682A619B, 150)
	@U32 sceMpegInit() {
		return ENABLE ? 0 : -1;
	}
	
	@nativeFunctionEx(0x874624D6, 150)
    @U32 sceMpegFinish() {
		//this.getMpeg(sceMpegPointer).delete();
		return 0;
	}

	_sceMpegReadField(name: string, bufferAddr: number, output: Stream, readField: (p: PmfStruct) => number) {
		const buffer = this.context.memory.getPointerStream(bufferAddr)!
		console.log(`${name}: ${addressToHex(bufferAddr)}`);
        const pmf = PmfStruct.struct.createProxy(buffer)
		if (pmf.magic != 'PSMF') { debugger; return SceKernelErrors.ERROR_MPEG_INVALID_VALUE; }
        const result = readField(pmf);
		output.writeInt32(result);
		console.log(`--> ${result}`);
		return 0;
	}

	@nativeFunctionEx(0x21FF80E4, 150)
    @U32 sceMpegQueryStreamOffset(@U32 mpegAddr: number, @U32 bufferAddr: number, @PTR output: Stream) {
		if (!this.isValidMpeg(mpegAddr)) return -1;
		return this._sceMpegReadField('sceMpegQueryStreamOffset', bufferAddr, output, p => p.offset);
	}
	
	@nativeFunctionEx(0x611E9E11, 150)
    @U32 sceMpegQueryStreamSize(@U32 bufferAddr: number, @PTR output: Stream) {
		return this._sceMpegReadField('sceMpegQueryStreamSize', bufferAddr, output, p => p.size);
	}
	
	
	private mode: number = 0
	private pixelformat: PixelFormat = PixelFormat.RGBA_8888;
	
	@nativeFunctionEx(0xA11C7026, 150)
    @U32 sceMpegAvcDecodeMode(@U32 mpegAddr: number, @PTR modeAddr: Stream) {
		if (!this.isValidMpeg(mpegAddr)) return -1;
        const mode = SceMpegAvcMode.struct.createProxy(modeAddr);
        this.mode = mode.mode;
		if ((mode.pixelformat >= PixelFormat.RGBA_5650) && (mode.pixelformat <= PixelFormat.RGBA_8888)) {
			this.pixelformat = mode.pixelformat;
		} else {
			console.warn(`sceMpegAvcDecodeMode(${mode.mode}, ${mode.pixelformat}) invalid pixelformat`);
		}
		return 0;
	}
	
	@nativeFunctionEx(0xA780CF7E, 150)
    @U32 sceMpegMallocAvcEsBuf(@U32 mpegAddr: number) {
		if (!this.isValidMpeg(mpegAddr)) return -1;
        const mpeg = this.mpegs.get(mpegAddr)!
		return mpeg.allocAvcEsBuf();
	}
	
	@nativeFunctionEx(0x167AFD9E, 150)
    @U32 sceMpegInitAu(@U32 mpegAddr: number, @U32 bufferAddr: number, @PTR auPointer: Stream) {
		const au = SceMpegAu.struct.createProxy(auPointer);
		au.esBuffer = bufferAddr;
		au.esSize = 2112;
		au.pts = Integer64.fromNumber(0);
		au.dts = Integer64.fromNumber(0);
		return 0;
	}

	@nativeFunctionEx(0xF8DCB679, 150)
    @U32 sceMpegQueryAtracEsSize(@U32 mpegAddr: number, @PTR esSizeAddr: Stream, @PTR outSizeAddr: Stream) {
		esSizeAddr.writeInt32(2112);
		outSizeAddr.writeInt32(8192);
		return 0;
	}
	
	@nativeFunctionEx(0x42560F23, 150)
    @U32 sceMpegRegistStream(@U32 mpegAddr: number, @U32 streamType: StreamType, @U32 streamNum: number) {
		if (!this.isValidMpeg(mpegAddr)) return -1;
        const mpeg = this.mpegs.get(mpegAddr)!;
        return mpeg.registerStream(streamType, streamNum);
	}
	
	@nativeFunctionEx(0xC132E22F, 150)
    @U32 sceMpegQueryMemSize(@I32 mode: number) {
		return sceMpeg.MPEG_MEMSIZE;
	}

	private isValidMpeg(mpegAddr: number) {
		return this.mpegs.has(mpegAddr);
	}
	
	private mpegs = new Map<number, Mpeg>();
	// @ts-ignore
    private mpeg: Mpeg;

	@nativeFunctionEx(0xd8c5f121, 150)
    @U32 sceMpegCreate(@U32 mpegAddr: number, @U32 dataPtr: number, @U32 size: number, @PTR ringbufferAddr: Stream, @U32 mode: number, @U32 ddrTop: number) {
		if (!this.context.memory.isValidAddress(mpegAddr)) return -1;
		if (size < sceMpeg.MPEG_MEMSIZE) return SceKernelErrors.ERROR_MPEG_NO_MEMORY;
		if (ringbufferAddr == Stream.INVALID) {
			const ringBuffer = RingBuffer.struct.createProxy(ringbufferAddr.clone());
			if (ringBuffer.packetSize == 0) {
				ringBuffer.packetsAvail = 0;
			} else {
				ringBuffer.packetsAvail = (ringBuffer.dataUpperBound - ringBuffer.data) / ringBuffer.packetSize;
			}
			ringBuffer.mpeg = mpegAddr;
		}
        const mpeg = this.context.memory.getPointerStream(mpegAddr)!

		mpeg.writeInt32(dataPtr + 0x30);

        const mpegHandle = this.context.memory.getPointerStream(dataPtr + 0x30)!
		mpegHandle.writeString("LIBMPEG\u0000001\u0000")
		mpegHandle.writeInt32(-1);
		
		this.mpegs.set(mpegAddr, this.mpeg = new Mpeg());
		// @TODO: WIP
		//mpegHandle.writeInt32(mpegAddr);
		//mpegHandle.write
	}

	@nativeFunctionEx(0x606A4649, 150)
    @U32 sceMpegDelete(@I32 sceMpegPointer: number) {
		//this.getMpeg(sceMpegPointer).delete();

		return 0;
	}

	@nativeFunctionEx(0xB5F6DC87, 150)
    @U32 sceMpegRingbufferAvailableSize(@PTR rinbuggerAddr: Stream) {
        const ringbuffer = RingBuffer.struct.createProxy(rinbuggerAddr);
        return ringbuffer.packets - ringbuffer.packetsAvail;
	}

	@nativeFunctionEx(0xD7A29F46, 150)
    @U32 sceMpegRingbufferQueryMemSize(@I32 numberOfPackets:number) {
		return (sceMpeg.RING_BUFFER_PACKET_SIZE + 0x68) * numberOfPackets;
	}
	
	@nativeFunctionEx(0x37295ED8, 150)
    @U32 sceMpegRingbufferConstruct(@PTR ringbufferAddr: Stream, @I32 numPackets: number, @I32 data: number, @I32 size: number, @I32 callbackAddr: number, @I32 callbackArg: number) {
		if (ringbufferAddr == Stream.INVALID) return SceKernelErrors.ERROR_KERNEL_ILLEGAL_ADDR;
		if (size < 0) return SceKernelErrors.ERROR_MPEG_NO_MEMORY;
		if (this.__mpegRingbufferQueryMemSize(numPackets) > size) {
			if (numPackets < 0x00100000) {
				return SceKernelErrors.ERROR_MPEG_NO_MEMORY;
			} else {
				// The PSP's firmware allows some cases here, due to a bug in its validation.
			}
		}
        const buf = RingBuffer.struct.createProxy(ringbufferAddr);
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
	
	@nativeFunctionEx(0x13407F13, 150)
    @U32 sceMpegRingbufferDestruct(@I32 ringBufferPointer: number) {
		//Ringbuffer- > PacketsAvailable = Ringbuffer- > PacketsTotal;
		//Ringbuffer- > PacketsRead = 0;
		//Ringbuffer- > PacketsWritten = 0;
		return 0;
	}
	
	private _mpegRingbufferRead() {
		
	}

	@nativeFunctionEx(0xB240A59E, 150)
    @U32 sceMpegRingbufferPut(@PTR ringbufferAddr: Stream, @U32 numPackets: number, @U32 available: number) {
        const state = this.context.currentState;

        //console.log('sceMpegRingbufferPut');
		this._mpegRingbufferRead();
		numPackets = Math.min(numPackets, available);
		if (numPackets <= 0) {
			debugger;
			return 0;
		}

        const ringbuffer = RingBuffer.struct.createProxy(ringbufferAddr.clone());

        //console.log(this.context.memory.getPointerU8Array(ringbuffer.data, ringbuffer.packetSize));
		
		// Execute callback function as a direct MipsCall, no blocking here so no messing around with wait states etc
		if (ringbuffer.callback_addr != 0) {
            const packetsThisRound = Math.min(numPackets, ringbuffer.packets);
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

class MeStream {
    static openData(data: Uint8Array): MeStream {
        throw new ProgramExitException("Unimplemented MeStream")
    }
}

class Mpeg {
	// @ts-ignore
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

class SceMpegAvcMode extends Struct {
	@StructInt32 mode: number = 0;
    @StructInt32 pixelformat: number = 0;
}

class SceMpegAu extends Struct {
	@StructInt64 pts: Integer64 = Integer64.ZERO  // presentation time stamp
    @StructInt64 dts: Integer64 = Integer64.ZERO  // decode time stamp
    @StructUInt32 esBuffer: number = 0
    @StructUInt32 esSize: number = 0
}

class PmfStruct extends Struct {
    // PSP info
	@StructStructStringn(4) magic: string = '' // PSMF
	@StructUInt32 version: number = 0
    @StructUInt32 offset: number = 0
    @StructUInt32 size: number = 0
    @StructStructStringn(0x44) _unknown: number = 0
    @StructStructStringn(6) firstTimestampOffset: string = ''
    @StructStructStringn(6) lastTimestampOffset: string = ''
}

class RingBuffer extends Struct {
	@StructInt32_l packets: number = 0
    @StructInt32_l packetsRead: number = 0
    @StructInt32_l packetsWritten: number = 0
    @StructInt32_l packetsAvail: number = 0 // pspsdk: unk2, noxa: iUnk0
    @StructInt32_l packetSize: number = 0 // 2048
    @StructUInt32_l data: number = 0 // address, ring buffer
    @StructUInt32_l callback_addr: number = 0 // see sceMpegRingbufferPut
    @StructInt32_l callback_args: number = 0
    @StructInt32_l dataUpperBound: number = 0
    @StructInt32_l semaID: number = 0 // unused?
    @StructInt32_l mpeg: number = 0 // pointer to mpeg struct, fixed up in sceMpegCreate
	// Note: not available in all versions.
    @StructInt32_l gp: number = 0
}

