// Lookup tables
var SBOX = new Uint8Array(256);
var INV_SBOX = new Uint8Array(256);
var SUB_MIX_0 = new Uint32Array(256);
var SUB_MIX_1 = new Uint32Array(256);
var SUB_MIX_2 = new Uint32Array(256);
var SUB_MIX_3 = new Uint32Array(256);
var INV_SUB_MIX_0 = new Uint32Array(256);
var INV_SUB_MIX_1 = new Uint32Array(256);
var INV_SUB_MIX_2 = new Uint32Array(256);
var INV_SUB_MIX_3 = new Uint32Array(256);

// Compute lookup tables
(function () {
	// Compute double table
	var d = [];
	for (var i = 0; i < 256; i++) {
		if (i < 128) {
			d[i] = (i << 1);
		} else {
			d[i] = (i << 1) ^ 0x11b;
		}
	}

	// Walk GF(2^8)
	var x = 0;
	var xi = 0;
	for (var i = 0; i < 256; i++) {
		// Compute sbox
		var sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
		sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
		SBOX[x] = sx;
		INV_SBOX[sx] = x;

		// Compute multiplication
		var x2 = d[x];
		var x4 = d[x2];
		var x8 = d[x4];

		// Compute sub bytes, mix columns tables
		var t = (d[sx] * 0x101) ^ (sx * 0x1010100);
		SUB_MIX_0[x] = (t << 24) | (t >>> 8);
		SUB_MIX_1[x] = (t << 16) | (t >>> 16);
		SUB_MIX_2[x] = (t << 8) | (t >>> 24);
		SUB_MIX_3[x] = t;

		// Compute inv sub bytes, inv mix columns tables
		var t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
		INV_SUB_MIX_0[sx] = (t << 24) | (t >>> 8);
		INV_SUB_MIX_1[sx] = (t << 16) | (t >>> 16);
		INV_SUB_MIX_2[sx] = (t << 8) | (t >>> 24);
		INV_SUB_MIX_3[sx] = t;

		// Compute next counter
		if (!x) {
			x = xi = 1;
		} else {
			x = x2 ^ d[d[d[x8 ^ x2]]];
			xi ^= d[d[xi]];
		}
	}
} ());

// Precomputed Rcon lookup
var RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function swap32(v) {
	return ((v & 0xFF) << 24)
		| ((v & 0xFF00) << 8)
		| ((v >> 8) & 0xFF00)
		| ((v >> 24) & 0xFF);
}

function uint8array_to_words(key: Uint8Array) {
	var temp = new Uint32Array(key.buffer, key.byteOffset, key.length / 4);
	var words = new Uint32Array(key.length / 4);
	for (var n = 0; n < words.length; n++) words[n] = swap32(temp[n]);
	return words;
}

function words_to_uint8array(words: Uint32Array) {
	var out = new Uint8Array(words.length * 4);
	var out2 = new Uint32Array(out.buffer);
	for (var n = 0; n < words.length; n++) out2[n] = swap32(words[n]);
	return out;
}

/**
 * AES block cipher algorithm.
 */
export class AES {
	private _key = new Uint32Array([0, 0, 0, 0]);
	private _nRounds = -1;
	private _keySchedule = [];
	private _invKeySchedule = [];

	constructor(key: Uint8Array) {
		//this.keySize = key.length / 8;
		this._key = uint8array_to_words(key);
		this.reset();
	}

	reset() {
		// Shortcuts
		var key = this._key;
		var keyWords = key;
		var keySize = key.length; // number of words

		var nRounds = this._nRounds = keySize + 6; // Compute number of rounds
		var ksRows = (nRounds + 1) * 4; // Compute number of key schedule rows
		var keySchedule = this._keySchedule = []; // Compute key schedule

		for (var ksRow = 0; ksRow < ksRows; ksRow++) {
			if (ksRow < keySize) {
				keySchedule[ksRow] = keyWords[ksRow];
			} else {
				var t = keySchedule[ksRow - 1];

				if (!(ksRow % keySize)) {
					t = (t << 8) | (t >>> 24); // Rot word
					t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff]; // Sub word
					t ^= RCON[(ksRow / keySize) | 0] << 24; // Mix Rcon
				} else if (keySize > 6 && ksRow % keySize == 4) {
					t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff]; // Sub word
				}

				keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
			}
		}

		// Compute inv key schedule
		var invKeySchedule = this._invKeySchedule = [];
		for (var invKsRow = 0; invKsRow < ksRows; invKsRow++) {
			var ksRow = ksRows - invKsRow;

			if (invKsRow % 4) {
				var t = keySchedule[ksRow];
			} else {
				var t = keySchedule[ksRow - 4];
			}

			if (invKsRow < 4 || ksRow <= 4) {
				invKeySchedule[invKsRow] = t;
			} else {
				invKeySchedule[invKsRow] = INV_SUB_MIX_0[SBOX[t >>> 24]] ^ INV_SUB_MIX_1[SBOX[(t >>> 16) & 0xff]] ^
				INV_SUB_MIX_2[SBOX[(t >>> 8) & 0xff]] ^ INV_SUB_MIX_3[SBOX[t & 0xff]];
			}
		}
	}

	encryptBlock(M: Uint8Array, offset: number) {
		this._doCryptBlock(M, offset, this._keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX);
	}

	decryptBlock(M, offset: number) {
		// Swap 2nd and 4th rows
		var t = M[offset + 1];
		M[offset + 1] = M[offset + 3];
		M[offset + 3] = t;

		this._doCryptBlock(M, offset, this._invKeySchedule, INV_SUB_MIX_0, INV_SUB_MIX_1, INV_SUB_MIX_2, INV_SUB_MIX_3, INV_SBOX);

		// Inv swap 2nd and 4th rows
		var t = M[offset + 1];
		M[offset + 1] = M[offset + 3];
		M[offset + 3] = t;
	}

	private _doCryptBlock(M, offset, keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX) {
		var nRounds = this._nRounds;

		var s0 = M[offset + 0] ^ keySchedule[0];
		var s1 = M[offset + 1] ^ keySchedule[1];
		var s2 = M[offset + 2] ^ keySchedule[2];
		var s3 = M[offset + 3] ^ keySchedule[3];

		// Key schedule row counter
		var ksRow = 4;

		// Rounds
		for (var round = 1; round < nRounds; round++) {
			// Shift rows, sub bytes, mix columns, add round key
			var t0 = SUB_MIX_0[s0 >>> 24] ^ SUB_MIX_1[(s1 >>> 16) & 0xff] ^ SUB_MIX_2[(s2 >>> 8) & 0xff] ^ SUB_MIX_3[(s3 >>> 0) & 0xff] ^ keySchedule[ksRow++];
			var t1 = SUB_MIX_0[s1 >>> 24] ^ SUB_MIX_1[(s2 >>> 16) & 0xff] ^ SUB_MIX_2[(s3 >>> 8) & 0xff] ^ SUB_MIX_3[(s0 >>> 0) & 0xff] ^ keySchedule[ksRow++];
			var t2 = SUB_MIX_0[s2 >>> 24] ^ SUB_MIX_1[(s3 >>> 16) & 0xff] ^ SUB_MIX_2[(s0 >>> 8) & 0xff] ^ SUB_MIX_3[(s1 >>> 0) & 0xff] ^ keySchedule[ksRow++];
			var t3 = SUB_MIX_0[s3 >>> 24] ^ SUB_MIX_1[(s0 >>> 16) & 0xff] ^ SUB_MIX_2[(s1 >>> 8) & 0xff] ^ SUB_MIX_3[(s2 >>> 0) & 0xff] ^ keySchedule[ksRow++];

			// Update state
			s0 = t0;
			s1 = t1;
			s2 = t2;
			s3 = t3;
		}

		// Shift rows, sub bytes, add round key
		var t0 = ((SBOX[s0 >>> 24] << 24) | (SBOX[(s1 >>> 16) & 0xff] << 16) | (SBOX[(s2 >>> 8) & 0xff] << 8) | SBOX[(s3 >>> 0) & 0xff]) ^ keySchedule[ksRow++];
		var t1 = ((SBOX[s1 >>> 24] << 24) | (SBOX[(s2 >>> 16) & 0xff] << 16) | (SBOX[(s3 >>> 8) & 0xff] << 8) | SBOX[(s0 >>> 0) & 0xff]) ^ keySchedule[ksRow++];
		var t2 = ((SBOX[s2 >>> 24] << 24) | (SBOX[(s3 >>> 16) & 0xff] << 16) | (SBOX[(s0 >>> 8) & 0xff] << 8) | SBOX[(s1 >>> 0) & 0xff]) ^ keySchedule[ksRow++];
		var t3 = ((SBOX[s3 >>> 24] << 24) | (SBOX[(s0 >>> 16) & 0xff] << 16) | (SBOX[(s1 >>> 8) & 0xff] << 8) | SBOX[(s2 >>> 0) & 0xff]) ^ keySchedule[ksRow++];

		// Set output
		M[offset + 0] = t0;
		M[offset + 1] = t1;
		M[offset + 2] = t2;
		M[offset + 3] = t3;
	}
}

export function decrypt_aes128_cbc(data: Uint8Array, key: Uint8Array) {
	var aes = new AES(key);
	var words = uint8array_to_words(data);
	var wordsLength = words.length;

	var t0 = 0, t1 = 0, t2 = 0, t3 = 0;
	var s0 = 0, s1 = 0, s2 = 0, s3 = 0;

	for (var n = 0; n < wordsLength; n += 4) {
		t0 = words[n + 0];
		t1 = words[n + 1];
		t2 = words[n + 2];
		t3 = words[n + 3];

		aes.decryptBlock(words, n);

		words[n + 0] ^= s0;
		words[n + 1] ^= s1;
		words[n + 2] ^= s2;
		words[n + 3] ^= s3;

		s0 = t0;
		s1 = t1;
		s2 = t2;
		s3 = t3;
	}
	return words_to_uint8array(words);
}

/*
$key = implode('', array_map('chr', [12,253,103,154,249,180,114,79,215,141,214,233,150,66,40,139]));
$input = implode('', array_map('chr', [217,56,160,171,217,220,84,205,219,46,247,119,43,184,111,170]));
$expected = implode('', array_map('chr', [154,58,77,144,134,84,195,210,0,28,172,244,16,122,183,3]));

printf("%s\n", bin2hex($key));
printf("%s\n", bin2hex($input));

$td = mcrypt_module_open('rijndael-128', '', 'cbc', ''); 
mcrypt_generic_init($td, $key, "\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"); 

$encrypted_data = mdecrypt_generic($td, $input); 

echo "{$encrypted_data}\n";
echo "{$expected}\n";
*/

/*
var data = new Uint8Array([217, 56, 160, 171, 217, 220, 84, 205, 219, 46, 247, 119, 43, 184, 111, 170]);
var key = new Uint8Array([12, 253, 103, 154, 249, 180, 114, 79, 215, 141, 214, 233, 150, 66, 40, 139]);
var expected = new Uint8Array([154, 58, 77, 144, 134, 84, 195, 210, 0, 28, 172, 244, 16, 122, 183, 3]);
var aes = new AES(key);
var dataout = uint8array_to_words(data);
aes.decryptBlock(dataout, 0);
console.log(expected);
console.log(words_to_uint8array(dataout));
*/
