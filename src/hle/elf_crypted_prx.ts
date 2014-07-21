import kirk = require('../core/kirk');
import keys144 = require('./elf_crypted_prx_keys_144');
import keys16 = require('./elf_crypted_prx_keys_16');
import KIRK_AES128CBC_HEADER = kirk.KIRK_AES128CBC_HEADER;

class Header {
	magic: number;
	modAttr: number;
	compModAttr: number;
	modVerLo: number;
	modVerHi: number;
	moduleName: string;
	modVersion: number;
	nsegments: number;
	elfSize: number;
	pspSize: number;
	bootEntry: number;
	modInfoOffset: number;
	bssSize: number;
	segAlign: number[];
	segAddress: number[];
	segSize: number[];
	reserved: number[];
	devkitVersion: number;
	decMode: number;
	pad: number;
	overlapSize: number;
	aesKey: number[];
	cmacKey: number[];
	cmacHeaderHash: number[];
	compressedSize: number;
	compressedOffset: number;
	unk1: number;
	unk2: number;
	cmacDataHash: number[];
	tag: number;
	sigcheck: number[];
	sha1Hash: number[];
	keyData: number[];

	static struct = StructClass.create<Header>(Header, [
		{ magic: UInt32 },                        // 0000
		{ modAttr: UInt16 },                      // 0004
		{ compModAttr: UInt16 },                  // 0006
		{ modVerLo: UInt8 },                      // 0008
		{ modVerHi: UInt8 },                      // 0009
		{ moduleName: Stringz(28) },              // 000A
		{ modVersion: UInt8 },                    // 0026
		{ nsegments: UInt8 },                     // 0027
		{ elfSize: UInt32 },                      // 0028
		{ pspSize: UInt32 },                      // 002C
		{ bootEntry: UInt32 },                    // 0030
		{ modInfoOffset: UInt32 },                // 0034
		{ bssSize: UInt32 },                      // 0038
		{ segAlign: StructArray(UInt16, 4) },     // 003C
		{ segAddress: StructArray(UInt32, 4) },   // 0044
		{ segSize: StructArray(UInt32, 4) },      // 0054
		{ reserved: StructArray(UInt32, 5) },     // 0064
		{ devkitVersion: UInt32 },
		{ decMode: UInt8 },
		{ pad: UInt8 },
		{ overlapSize: UInt16 },
		{ aesKey: StructArray(UInt8, 16) },
		{ cmacKey: StructArray(UInt8, 16) },
		{ cmacHeaderHash: StructArray(UInt8, 16) },
		{ compressedSize: UInt32 },
		{ compressedOffset: UInt32 },
		{ unk1: UInt32 },
		{ unk2: UInt32 },
		{ cmacDataHash: StructArray(UInt8, 16) },
		{ tag: UInt32 },
		{ sigcheck: StructArray(UInt8, 88) },
		{ sha1Hash: StructArray(UInt8, 20) },
		{ keyData: StructArray(UInt8, 16) },
	]);
}

function getTagInfo(checkTag: number) {
	return keys144.g_tagInfo.first((item) => item.tag == checkTag);
}

function getTagInfo2(checkTag: number) {
	return keys16.g_tagInfo2.first((item) => item.tag == checkTag);
}

function copyFromTo(from: Uint8Array, fromOffset: number, to: Uint8Array, toOffset: number, count: number) {
	for (var n = 0; n < count; n++) {
		to[toOffset + n] = from[fromOffset + n];
	}
}

function memset(array: Uint8Array, offset: number, count: number, value: number) {
	for (var n = 0; n < count; n++) array[offset + n] = value;
}

function decrypt1(pbIn: Stream) {
	var cbTotal = pbIn.length;
	var _pbOut = new Uint8Array(cbTotal);
	var pbOut = Stream.fromUint8Array(_pbOut);
	pbOut.slice().writeStream(pbIn);

	var header = Header.struct.read(pbIn.slice());
	var pti = getTagInfo(header.tag);
	if (!pti) throw(new Error("Can't find tag " + header.tag));

	// build conversion into pbOut
	pbOut.slice().writeStream(pbIn);
	pbOut.slice().writeByteRepeated(0x00, 0x150);
	pbOut.slice().writeByteRepeated(0x55, 0x40);

	// step3 demangle in place
	//kirk.KIRK_AES128CBC_HEADER.struct.write();
	var h7_header = new (kirk.KIRK_AES128CBC_HEADER)();
	h7_header.mode = kirk.KirkMode.DecryptCbc;
	h7_header.unk_4 = 0;
	h7_header.unk_8 = 0;
	h7_header.keyseed = pti.code; // initial seed for PRX
	h7_header.data_size = 0x70; // size

	kirk.KIRK_AES128CBC_HEADER.struct.write(pbOut.sliceFrom(0x2C), h7_header);

	// redo part of the SIG check (step2)
	var buffer1 = Stream.fromSize(0x150);
	buffer1.sliceWithLength(0x00).writeStream(pbIn.sliceWithLength(0xD0, 0x80));
	buffer1.sliceWithLength(0x80).writeStream(pbIn.sliceWithLength(0x80, 0x50));
	buffer1.sliceWithLength(0xD0).writeStream(pbIn.sliceWithLength(0x00, 0x80));

	//console.log('buffer1', buffer1.slice().readAllBytes());

	if (pti.codeExtra != 0) {
		var buffer2 = Stream.fromSize(20 + 0xA0);

		buffer2.slice()
			// KIRK_AES128CBC_HEADER
			.writeUInt32(5)
			.writeUInt32(0)
			.writeUInt32(0)
			.writeUInt32(pti.codeExtra)
			.writeUInt32(0xA0)

			.writeStream(buffer1.sliceWithLength(0x10, 0xA0))
		;

		kirk.hleUtilsBufferCopyWithRange(
			buffer2.sliceWithLength(0, 20 + 0xA0),
			buffer2.sliceWithLength(0, 20 + 0xA0),
			kirk.CommandEnum.DECRYPT_IV_0
			);

		// copy result back
		buffer1.slice().writeStream(buffer2.sliceWithLength(0, 0xA0));
	}

	pbOut.sliceFrom(0x40).writeStream(buffer1.sliceWithLength(0x40, 0x40));

	for (var iXOR = 0; iXOR < 0x70; iXOR++) pbOut.set(0x40 + iXOR, ((pbOut.get(0x40 + iXOR) ^ pti.key[0x14 + iXOR]) & 0xFF));

	kirk.hleUtilsBufferCopyWithRange(
		pbOut.sliceWithLength(0x2C, 20 + 0x70),
		pbOut.sliceWithLength(0x2C, 20 + 0x70),
		kirk.CommandEnum.DECRYPT_IV_0
		);

	for (var iXOR = 0x6F; iXOR >= 0; iXOR--) pbOut.set(0x40 + iXOR, ((pbOut.get(0x2C + iXOR) ^ pti.key[0x20 + iXOR]) & 0xFF));

	pbOut.sliceFrom(0x80).writeByteRepeated(0, 0x30);
	
	pbOut.set(0xA0, 1);
	// copy unscrambled parts from header
	pbOut.sliceFrom(0xB0).writeStream(pbIn.sliceWithLength(0xB0, 0x20)); // file size + lots of zeros
	pbOut.sliceFrom(0xD0).writeStream(pbIn.sliceWithLength(0x00, 0x80)); // ~PSP header

	// step4: do the actual decryption of code block
	//  point 0x40 bytes into the buffer to key info
	kirk.hleUtilsBufferCopyWithRange(
		pbOut.sliceWithLength(0x00, cbTotal),
		pbOut.sliceWithLength(0x40, cbTotal - 0x40),
		kirk.CommandEnum.DECRYPT_PRIVATE
	);

	//File.WriteAllBytes("../../../TestInput/temp.bin", _pbOut);

	var outputSize = pbIn.sliceFrom(0xB0).readUInt32();

	return pbOut.sliceWithLength(0, outputSize);
}

function decrypt2(input: Uint8Array) {
}

export function decrypt(input: Stream) {
	return decrypt1(input.slice());
}
