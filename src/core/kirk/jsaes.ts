var SBOX = new Uint8Array([
	99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171,
	118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253,
	147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154,
	7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227,
	47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170,
	251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245,
	188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61,
	100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224,
	50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213,
	78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221,
	116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29,
	158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161,
	137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22
]);

var SHIFT_ROW_TAB = new Uint8Array([0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2, 7, 12, 1, 6, 11]);

var INV_SBOX = new Uint8Array(256);
var AES_ShiftRowTab_Inv = new Uint8Array(16);
var XTIME = new Uint8Array(256);

// Init
for (var i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
for (var i = 0; i < 16; i++) AES_ShiftRowTab_Inv[SHIFT_ROW_TAB[i]] = i;
for (var i = 0; i < 128; i++) XTIME[i] = i << 1, XTIME[128 + i] = (i << 1) ^ 0x1b;

function ExpandKey(_key: number[]) {
	var key = _key.slice();
	var kl = key.length, ks, Rcon = 1;
	switch (kl) {
		case 16: ks = 16 * (10 + 1); break;
		case 24: ks = 16 * (12 + 1); break;
		case 32: ks = 16 * (14 + 1); break;
		default: throw(new Error("AES_ExpandKey: Only key lengths of 16, 24 or 32 bytes allowed!"));
	}

	for (var i = kl; i < ks; i += 4) {
		var temp = key.slice(i - 4, i);
		if (i % kl == 0) {
			temp = [SBOX[temp[1]] ^ Rcon, SBOX[temp[2]], SBOX[temp[3]], SBOX[temp[0]]];
			if ((Rcon <<= 1) >= 256) Rcon ^= 0x11b;
		} else if ((kl > 24) && (i % kl == 16)) {
			temp = [SBOX[temp[0]], SBOX[temp[1]], SBOX[temp[2]], SBOX[temp[3]]];
		}

		for (var j = 0; j < 4; j++) key[i + j] = key[i + j - kl] ^ temp[j];
	}
	return new Uint8Array(key);
}

var temp = new Uint8Array(16);

function SubBytes(state: Uint8Array, state_offset: number, sbox: Uint8Array) {
	for (var i = 0; i < 16; i++) temp[i] = state[i + state_offset];
	for (var i = 0; i < 16; i++) state[i + state_offset] = sbox[temp[i]];
}

function AddRoundKey(state: Uint8Array, state_offset:number, rkey: Uint8Array, rkey_offset: number) {
	for (var i = 0; i < 16; i++) state[i + state_offset] ^= rkey[i + rkey_offset];
}

function ShiftRows(state: Uint8Array, state_offset: number, shifttab: Uint8Array) {
	for (var i = 0; i < 16; i++) temp[i] = state[i + state_offset];
	for (var i = 0; i < 16; i++) state[i + state_offset] = temp[shifttab[i]];
}

function MixColumns(state: Uint8Array, block_offset: number) {
	var end = block_offset + 16;

	for (var i = block_offset; i < end; i += 4) {
		var s0 = state[i + 0], s1 = state[i + 1];
		var s2 = state[i + 2], s3 = state[i + 3];
		var h = s0 ^ s1 ^ s2 ^ s3;
		state[i + 0] ^= h ^ XTIME[s0 ^ s1];
		state[i + 1] ^= h ^ XTIME[s1 ^ s2];
		state[i + 2] ^= h ^ XTIME[s2 ^ s3];
		state[i + 3] ^= h ^ XTIME[s3 ^ s0];
	}
}

function MixColumns_Inv(state: Uint8Array, block_offset: number) {
	var end = block_offset + 16;
	for (var i = block_offset; i < end; i += 4) {
		var s0 = state[i + 0], s1 = state[i + 1], s2 = state[i + 2], s3 = state[i + 3];
		var h = s0 ^ s1 ^ s2 ^ s3;
		var xh = XTIME[h];
		var h1 = XTIME[XTIME[xh ^ s0 ^ s2]] ^ h;
		var h2 = XTIME[XTIME[xh ^ s1 ^ s3]] ^ h;
		state[i + 0] ^= h1 ^ XTIME[s0 ^ s1];
		state[i + 1] ^= h2 ^ XTIME[s1 ^ s2];
		state[i + 2] ^= h1 ^ XTIME[s2 ^ s3];
		state[i + 3] ^= h2 ^ XTIME[s3 ^ s0];
	}
}

export function Encrypt(block: Uint8Array, block_offset: number, key: Uint8Array) {
	var l = key.length;
	AddRoundKey(block, block_offset, key, 0);
	for (var i = 16; i < l - 16; i += 16) {
		SubBytes(block, block_offset, SBOX);
		ShiftRows(block, block_offset, SHIFT_ROW_TAB);
		MixColumns(block, block_offset);
		AddRoundKey(block, block_offset, key, i);
	}
	SubBytes(block, block_offset, SBOX);
	ShiftRows(block, block_offset, SHIFT_ROW_TAB);
	AddRoundKey(block, block_offset, key, i);
	return block;
}

export function Decrypt(block: Uint8Array, block_offset: number, expandedKey: Uint8Array) {
	var l = expandedKey.length;
	AddRoundKey(block, block_offset, expandedKey, l - 16);
	ShiftRows(block, block_offset, AES_ShiftRowTab_Inv);
	SubBytes(block, block_offset, INV_SBOX);
	for (var i = l - 32; i >= 16; i -= 16) {
		AddRoundKey(block, block_offset, expandedKey, i);
		MixColumns_Inv(block, block_offset);
		ShiftRows(block, block_offset, AES_ShiftRowTab_Inv);
		SubBytes(block, block_offset, INV_SBOX);
	}
	AddRoundKey(block, block_offset, expandedKey, 0);
	return block;
}

export function Decrypt_Blocks_CBC(blocks: Uint8Array, key: Uint8Array, iv: Uint8Array) {
	var keyLength = key.length;
	var expandedKey = ExpandKey(Array.apply(null, key));
	var out = new Uint8Array(blocks.length);

	var chunkUn = new Uint8Array(keyLength);
	var prevChunk = new Uint8Array(keyLength);

	//alert(prevChunk.length);
	for (var n = 0; n < blocks.length; n += keyLength) {
		for (var m = 0; m < keyLength; m++) chunkUn[m] = blocks[n + m];

		Decrypt(blocks, n, expandedKey);

		for (var m = 0; m < keyLength; m++) out[n + m] = blocks[n + m] ^ prevChunk[m];

		prevChunk.set(chunkUn);
	}
	return out;
}
