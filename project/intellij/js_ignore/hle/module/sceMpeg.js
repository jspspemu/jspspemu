///<reference path="../../global.d.ts" />
var _utils = require('../utils');
var _memory = require('../../core/memory');
var createNativeFunction = _utils.createNativeFunction;
var SceKernelErrors = require('../SceKernelErrors');
var sceMpeg = (function () {
    function sceMpeg(context) {
        var _this = this;
        this.context = context;
        this.sceMpegInit = createNativeFunction(0x682A619B, 150, 'uint', '', this, function () {
            return -1;
        });
        this.sceMpegRingbufferQueryMemSize = createNativeFunction(0xD7A29F46, 150, 'uint', 'int', this, function (numberOfPackets) {
            return (sceMpeg.RING_BUFFER_PACKET_SIZE + 0x68) * numberOfPackets;
        });
        this.sceMpegQueryMemSize = createNativeFunction(0xC132E22F, 150, 'uint', 'int', this, function (mode) {
            return sceMpeg.MPEG_MEMSIZE;
        });
        this.sceMpegRingbufferConstruct = createNativeFunction(0x37295ED8, 150, 'uint', 'void*/int/int/int/int/int', this, function (ringbufferAddr, numPackets, data, size, callbackAddr, callbackArg) {
            if (ringbufferAddr == Stream.INVALID)
                return 2147614931 /* ERROR_KERNEL_ILLEGAL_ADDR */;
            if (size < 0)
                return 2153840674 /* ERROR_MPEG_NO_MEMORY */;
            if (_this.__mpegRingbufferQueryMemSize(numPackets) > size) {
                if (numPackets < 0x00100000) {
                    return 2153840674 /* ERROR_MPEG_NO_MEMORY */;
                }
                else {
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
        this.sceMpegCreate = createNativeFunction(0xd8c5f121, 150, 'uint', 'uint/uint/uint/void*/uint/uint', this, function (mpegAddr, dataPtr, size, ringbufferAddr, mode, ddrTop) {
            if (!_this.context.memory.isValidAddress(mpegAddr))
                return -1;
            if (size < sceMpeg.MPEG_MEMSIZE)
                return 2153840674 /* ERROR_MPEG_NO_MEMORY */;
            if (ringbufferAddr == Stream.INVALID) {
                var ringBuffer = RingBuffer.struct.read(ringbufferAddr.clone());
                if (ringBuffer.packetSize == 0) {
                    ringBuffer.packetsFree = 0;
                }
                else {
                    ringBuffer.packetsFree = (ringBuffer.dataUpperBound - ringBuffer.data) / ringBuffer.packetSize;
                }
                ringBuffer.mpeg = mpegAddr;
            }
            var mpeg = _this.context.memory.getPointerStream(mpegAddr);
            mpeg.writeInt32(dataPtr + 0x30);
            var mpegHandle = _this.context.memory.getPointerStream(dataPtr + 0x30);
            mpegHandle.writeString("LIBMPEG\0" + "001\0");
            mpegHandle.writeInt32(-1);
            // @TODO: WIP
            //mpegHandle.writeInt32(mpegAddr);
            //mpegHandle.write
        });
        this.sceMpegDelete = createNativeFunction(0x606A4649, 150, 'uint', 'int', this, function (sceMpegPointer) {
            //this.getMpeg(sceMpegPointer).delete();
            return 0;
        });
        this.sceMpegFinish = createNativeFunction(0x874624D6, 150, 'uint', '', this, function () {
            //this.getMpeg(sceMpegPointer).delete();
            return 0;
        });
        this.sceMpegRingbufferDestruct = createNativeFunction(0x13407F13, 150, 'uint', 'int', this, function (ringBufferPointer) {
            //Ringbuffer- > PacketsAvailable = Ringbuffer- > PacketsTotal;
            //Ringbuffer- > PacketsRead = 0;
            //Ringbuffer- > PacketsWritten = 0;
            return 0;
        });
    }
    sceMpeg.prototype.__mpegRingbufferQueryMemSize = function (packets) {
        return packets * (104 + 2048);
    };
    sceMpeg.RING_BUFFER_PACKET_SIZE = 0x800;
    sceMpeg.MPEG_MEMSIZE = 64 * 1024;
    return sceMpeg;
})();
exports.sceMpeg = sceMpeg;
var RingBuffer = (function () {
    function RingBuffer() {
    }
    RingBuffer.struct = StructClass.create(RingBuffer, [
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
    return RingBuffer;
})();
//# sourceMappingURL=sceMpeg.js.map