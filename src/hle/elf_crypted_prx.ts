﻿import {
    GetStruct,
    Struct,
    StructStructArray, StructStructStringz, StructUInt16,
    StructUInt32, StructUInt8,
    UInt16,
    UInt32,
    UInt8
} from "../global/struct";
import {Stream} from "../global/stream";
import {CommandEnum, hleUtilsBufferCopyWithRange, KIRK_AES128CBC_HEADER, KirkMode} from "../core/kirk/kirk";
import {g_tagInfo} from "./elf_crypted_prx_keys_144";
import {g_tagInfo2} from "./elf_crypted_prx_keys_16";

class Header extends Struct{
	@StructUInt32 magic: number = 0;
	@StructUInt16 modAttr: number = 0;
	@StructUInt16 compModAttr: number = 0;
	@StructUInt8 modVerLo: number = 0;
	@StructUInt8 modVerHi: number = 0;
	@StructStructStringz(28) moduleName: string = '';
	@StructUInt8 modVersion: number = 0;
	@StructUInt8 nsegments: number = 0;
	@StructUInt32 elfSize: number = 0;
	@StructUInt32 pspSize: number = 0;
	@StructUInt32 bootEntry: number = 0;
	@StructUInt32 modInfoOffset: number = 0;
	@StructUInt32 bssSize: number = 0;
	@StructStructArray(UInt16, 4) segAlign: number[] = [];
	@StructStructArray(UInt32, 4) segAddress: number[] = [];
	@StructStructArray(UInt32, 4) segSize: number[] = [];
	@StructStructArray(UInt32, 5) reserved: number[] = [];
	@StructUInt32 devkitVersion: number = 0;
	@StructUInt8 decMode: number = 0;
	@StructUInt8 pad: number = 0;
	@StructUInt16 overlapSize: number = 0;
	@StructStructArray(UInt8, 16) aesKey: number[] = [];
	@StructStructArray(UInt8, 16) cmacKey: number[] = [];
	@StructStructArray(UInt8, 16) cmacHeaderHash: number[] = [];
	@StructUInt32 compressedSize: number = 0;
	@StructUInt32 compressedOffset: number = 0;
	@StructUInt32 unk1: number = 0;
	@StructUInt32 unk2: number = 0;
	@StructStructArray(UInt8, 16) cmacDataHash: number[] = [];
	@StructUInt32 tag: number = 0;
	@StructStructArray(UInt8, 88) sigcheck: number[] = [];
	@StructStructArray(UInt8, 20) sha1Hash: number[] = [];
	@StructStructArray(UInt8, 16) keyData: number[] = [];

}

function getTagInfo(checkTag: number) {
	return g_tagInfo.first((item) => item.tag == checkTag);
}

function getTagInfo2(checkTag: number) {
	return g_tagInfo2.first((item) => item.tag == checkTag);
}

function copyFromTo(from: Uint8Array, fromOffset: number, to: Uint8Array, toOffset: number, count: number) {
	for (let n = 0; n < count; n++) {
		to[toOffset + n] = from[fromOffset + n];
	}
}

function memset(array: Uint8Array, offset: number, count: number, value: number) {
	for (let n = 0; n < count; n++) array[offset + n] = value;
}

function decrypt1(pbIn: Stream) {
    const cbTotal = pbIn.length;
    const _pbOut = new Uint8Array(cbTotal);
    const pbOut = Stream.fromUint8Array(_pbOut);
    pbOut.slice().writeStream(pbIn);

    const header = Header.struct.read(pbIn.slice());
    const pti = getTagInfo(header.tag);
    if (!pti) throw(new Error("Can't find tag " + header.tag));

	// build conversion into pbOut
	pbOut.slice().writeStream(pbIn);
	pbOut.slice().writeByteRepeated(0x00, 0x150);
	pbOut.slice().writeByteRepeated(0x55, 0x40);

	// step3 demangle in place
	//kirk.KIRK_AES128CBC_HEADER.struct.write();
    const h7_header = new (KIRK_AES128CBC_HEADER)();
    h7_header.mode = KirkMode.DecryptCbc;
	h7_header.unk_4 = 0;
	h7_header.unk_8 = 0;
	h7_header.keyseed = pti.code; // initial seed for PRX
	h7_header.data_size = 0x70; // size

	GetStruct(KIRK_AES128CBC_HEADER).write(pbOut.sliceFrom(0x2C), h7_header);

	// redo part of the SIG check (step2)
    const buffer1 = Stream.fromSize(0x150);
    buffer1.sliceWithLength(0x00).writeStream(pbIn.sliceWithLength(0xD0, 0x80));
	buffer1.sliceWithLength(0x80).writeStream(pbIn.sliceWithLength(0x80, 0x50));
	buffer1.sliceWithLength(0xD0).writeStream(pbIn.sliceWithLength(0x00, 0x80));

	//console.log('buffer1', buffer1.slice().readAllBytes());

	if (pti.codeExtra != 0) {
        const buffer2 = Stream.fromSize(20 + 0xA0);

        buffer2.slice()
			// KIRK_AES128CBC_HEADER
			.writeUInt32(5)
			.writeUInt32(0)
			.writeUInt32(0)
			.writeUInt32(pti.codeExtra)
			.writeUInt32(0xA0)

			.writeStream(buffer1.sliceWithLength(0x10, 0xA0))
		;

		hleUtilsBufferCopyWithRange(
			buffer2.sliceWithLength(0, 20 + 0xA0),
			buffer2.sliceWithLength(0, 20 + 0xA0),
			CommandEnum.DECRYPT_IV_0
        );

		// copy result back
		buffer1.slice().writeStream(buffer2.sliceWithLength(0, 0xA0));
	}

	pbOut.sliceFrom(0x40).writeStream(buffer1.sliceWithLength(0x40, 0x40));

	for (let iXOR = 0; iXOR < 0x70; iXOR++) pbOut.set(0x40 + iXOR, ((pbOut.get(0x40 + iXOR) ^ pti.key[0x14 + iXOR]) & 0xFF));

	hleUtilsBufferCopyWithRange(
		pbOut.sliceWithLength(0x2C, 20 + 0x70),
		pbOut.sliceWithLength(0x2C, 20 + 0x70),
		CommandEnum.DECRYPT_IV_0
    );

	for (let iXOR = 0x6F; iXOR >= 0; iXOR--) pbOut.set(0x40 + iXOR, ((pbOut.get(0x2C + iXOR) ^ pti.key[0x20 + iXOR]) & 0xFF));

	pbOut.sliceFrom(0x80).writeByteRepeated(0, 0x30);
	
	pbOut.set(0xA0, 1);
	// copy unscrambled parts from header
	pbOut.sliceFrom(0xB0).writeStream(pbIn.sliceWithLength(0xB0, 0x20)); // file size + lots of zeros
	pbOut.sliceFrom(0xD0).writeStream(pbIn.sliceWithLength(0x00, 0x80)); // ~PSP header

	// step4: do the actual decryption of code block
	//  point 0x40 bytes into the buffer to key info
	hleUtilsBufferCopyWithRange(
		pbOut.sliceWithLength(0x00, cbTotal),
		pbOut.sliceWithLength(0x40, cbTotal - 0x40),
		CommandEnum.DECRYPT_PRIVATE
	);

	//File.WriteAllBytes("../../../TestInput/temp.bin", _pbOut);

    const outputSize = pbIn.sliceFrom(0xB0).readUInt32();

    return pbOut.sliceWithLength(0, outputSize);
}

/*
function Scramble(buf: Stream, code: number) {
	buf[0] = 5;
	buf[1] = buf[2] = 0;
	buf[3] = (uint) code;
	buf[4] = (uint) size;

	if (Kirk.hleUtilsBufferCopyWithRange((byte*) buf, size + 0x14, (byte *) buf, size + 0x14, Kirk.CommandEnum.PSP_KIRK_CMD_DECRYPT) != Kirk.ResultEnum.OK) {
		return -1;
	}

	return 0;
}

function decrypt2(input: Stream) {
	const size = input.length;
	let _pbOut = new Uint8Array(size);
	_pbIn.CopyTo(_pbOut, 0);

	let _tmp1 = new Uint8Array(0x150);
	let _tmp2 = new Uint8Array(0x90 + 0x14);
	let _tmp3 = new Uint8Array(0x60 + 0x14);

	let HeaderPointer = (HeaderStruct*) inbuf;
	this.Header = * (HeaderStruct*) inbuf;
	let pti = GetTagInfo2(this.Header.Tag);
	Console.WriteLine("{0}", pti);

				int retsize = * (int *) & inbuf[0xB0];

	PointerUtils.Memset(_tmp1, 0, 0x150);
	PointerUtils.Memset(_tmp2, 0, 0x90 + 0x14);
	PointerUtils.Memset(_tmp3, 0, 0x60 + 0x14);

	PointerUtils.Memcpy(outbuf, inbuf, size);

	if (size < 0x160) {
		throw (new InvalidDataException("buffer not big enough, "));
	}

	if ((size - 0x150) < retsize) {
		throw (new InvalidDataException("not enough data, "));
	}

	PointerUtils.Memcpy(tmp1, outbuf, 0x150);

	for (let i = 0; i < 9; i++) {
		for (let j = 0; j < 0x10; j++) {
			_tmp2[0x14 + (i << 4) + j] = pti.key[j];
		}

		_tmp2[0x14 + (i << 4)] = (byte) i;
	}

	if (Scramble((uint *) tmp2, 0x90, pti.code) < 0) {
		throw (new InvalidDataException("error in Scramble#1, "));
	}

	PointerUtils.Memcpy(outbuf, tmp1 + 0xD0, 0x5C);
	PointerUtils.Memcpy(outbuf + 0x5C, tmp1 + 0x140, 0x10);
	PointerUtils.Memcpy(outbuf + 0x6C, tmp1 + 0x12C, 0x14);
	PointerUtils.Memcpy(outbuf + 0x80, tmp1 + 0x080, 0x30);
	PointerUtils.Memcpy(outbuf + 0xB0, tmp1 + 0x0C0, 0x10);
	PointerUtils.Memcpy(outbuf + 0xC0, tmp1 + 0x0B0, 0x10);
	PointerUtils.Memcpy(outbuf + 0xD0, tmp1 + 0x000, 0x80);

	PointerUtils.Memcpy(tmp3 + 0x14, outbuf + 0x5C, 0x60);

	if (Scramble((uint *) tmp3, 0x60, pti.code) < 0) {
		throw (new InvalidDataException("error in Scramble#2, "));
	}

	PointerUtils.Memcpy(outbuf + 0x5C, tmp3, 0x60);
	PointerUtils.Memcpy(tmp3, outbuf + 0x6C, 0x14);
	PointerUtils.Memcpy(outbuf + 0x70, outbuf + 0x5C, 0x10);
	PointerUtils.Memset(outbuf + 0x18, 0, 0x58);
	PointerUtils.Memcpy(outbuf + 0x04, outbuf, 0x04);

				*((uint *)outbuf) = 0x014C;
	PointerUtils.Memcpy(outbuf + 0x08, tmp2, 0x10);

	// sha-1
	if (Kirk.hleUtilsBufferCopyWithRange(outbuf, 3000000, outbuf, 3000000, Core.Crypto.Kirk.CommandEnum.PSP_KIRK_CMD_SHA1_HASH) != Core.Crypto.Kirk.ResultEnum.OK) {
		throw (new InvalidDataException("error in sceUtilsBufferCopyWithRange 0xB, "));
	}

	if (PointerUtils.Memcmp(outbuf, tmp3, 0x14) != 0) {
		throw (new InvalidDataException("WARNING (SHA-1 incorrect), "));
	}
	
	for (let iXOR = 0; iXOR < 0x40; iXOR++) {
		tmp3[iXOR + 0x14] = (byte)(outbuf[iXOR + 0x80] ^ _tmp2[iXOR + 0x10]);
	}

	if (Scramble((uint *) tmp3, 0x40, pti.code) != 0) {
		throw (new InvalidDataException("error in Scramble#3, "));
	}

	for (let iXOR = 0x3F; iXOR >= 0; iXOR--) {
		outbuf[iXOR + 0x40] = (byte)(_tmp3[iXOR] ^ _tmp2[iXOR + 0x50]); // uns 8
	}

	PointerUtils.Memset(outbuf + 0x80, 0, 0x30);
	*(uint *) & outbuf[0xA0] = 1;

	PointerUtils.Memcpy(outbuf + 0xB0, outbuf + 0xC0, 0x10);
	PointerUtils.Memset(outbuf + 0xC0, 0, 0x10);

	// the real decryption
	let ret = Kirk.hleUtilsBufferCopyWithRange(outbuf, size, outbuf + 0x40, size - 0x40, Core.Crypto.Kirk.CommandEnum.PSP_KIRK_CMD_DECRYPT_PRIVATE);
	if (ret != 0) {
		throw (new InvalidDataException(String.Format("error in sceUtilsBufferCopyWithRange 0x1 (0x{0:X}), ", ret)));
	}

	if (retsize < 0x150) {
		// Fill with 0
		PointerUtils.Memset(outbuf + retsize, 0, 0x150 - retsize);
	}

	return _pbOut.Slice(0, retsize).ToArray();
}
*/

export function decrypt(input: Stream) {
	return decrypt1(input.slice());
}
