import kirk = require('../core/kirk');
import keys144 = require('./elf_crypted_prx_keys_144');
import keys16 = require('./elf_crypted_prx_keys_16');
import KIRK_AES128CBC_HEADER = kirk.KIRK_AES128CBC_HEADER;

class Header {
	static struct = StructClass.create<Header>(Header, [
		{ magic: UInt32 },
		{ modAttr: UInt16 },
		{ compModAttr: UInt16 },
		{ modVerLo: UInt8 },
		{ modVerHi: UInt8 },
		{ moduleName: Stringz(28) },
		{ modVersion: UInt8 },
		{ nsegments: UInt8 },
		{ elfSize: UInt32 },
		{ pspSize: UInt32 },
		{ bootEntry: UInt32 },
		{ modInfoOffset: UInt32 },
		{ bssSize: UInt32 },
		{ segAlign: StructArray(UInt16, 4) },
		{ segAddress: StructArray(UInt32, 4) },
		{ segSize: StructArray(UInt32, 5) },
		{ reserved: StructArray(UInt32, 5) },
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

function decrypt1(input: Uint8Array) {
	var stream = Stream.fromUint8Array(input);
	console.log(Header.struct.read(stream));
	//kirk.CMD7();
}

function decrypt2(input: Uint8Array) {
}

export function decrypt(input: Uint8Array) {
	return decrypt1(input);
}
