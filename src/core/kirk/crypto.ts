import jsaes2 = require('./jsaes2');

declare var CryptoJS: any;

function cryptoToArray(info) {
	var words = info.words;
	var wordsLen = words.length;
	var data = new Uint8Array(wordsLen * 4);
	var m = 0;
	for (var n = 0; n < wordsLen; n++) {
		data[m++] = (words[n] >>> 24) & 0xFF;
		data[m++] = (words[n] >>> 16) & 0xFF;
		data[m++] = (words[n] >>>  8) & 0xFF;
		data[m++] = (words[n] >>>  0) & 0xFF;
	}
	return data;
}

function fromCryptoArray(uint8View: Uint8Array) {
	return CryptoJS.lib.WordArray.create(uint8View);
}

function ab2str(buf: Uint8Array) {
	return String.fromCharCode.apply(null, buf);
}

function ab2hex(buf: Uint8Array) {
	var parts = [];
	for (var n = 0; n < buf.length; n++) {
		var chunk = buf[n].toString(16);
		while (chunk.length < 2) chunk = '0' + chunk;
		parts.push(chunk);
	}
	return parts.join('')
}

function str2ab(str) {
	var bufView = new Uint8Array(str.length);
	for (var i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return bufView;
}

export function md5(data: Uint8Array) {
	return cryptoToArray(CryptoJS.MD5(fromCryptoArray(data)));
}

export function sha1(data: Uint8Array) {
	return cryptoToArray(CryptoJS.SHA1(fromCryptoArray(data)));
}

export function aes_encrypt(data: Uint8Array, key: Uint8Array, iv?: Uint8Array) {
	var info = { mode: CryptoJS.mode.CFB, padding: CryptoJS.pad.AnsiX923 };
	if (iv !== undefined) info['iv'] = fromCryptoArray(iv);
	return cryptoToArray(CryptoJS.AES.encrypt(fromCryptoArray(data), fromCryptoArray(key), info));
}

function uint8array_to_array32(data: Uint8Array) {
	var data2 = new Uint32Array(data.buffer);
	var out = new Array(data2.length / 4);
	for (var n = 0; n < data2.length; n++) {
		out[n] = data2[n];
		//if (out[n] & 0x80) out[n] |= ~0xFF;
	}
	return out;
}

function uint8array_to_array8(data: Uint8Array) {
	var out = new Array(data.length / 4);
	for (var n = 0; n < data.length; n++) {
		out[n] = data[n];
		//if (out[n] & 0x80) out[n] |= ~0xFF;
	}
	return out;
}

function array_to_uint8array(data: number[]) {
	var out = new Uint8Array(data.length);
	for (var n = 0; n < data.length; n++) out[n] = data[n];
	return out;
}


function pad_PKCS7(array: number[], padding: number) {
	var left = (padding - (array.length % padding)) % padding;
	for (var n = 0; n < left; n++) array.push(left);
	return array;
}

function pad_Zero(array: number[], padding: number) {
	var left = (padding - (array.length % padding)) % padding;
	for (var n = 0; n < left; n++) array.push(0);
	return array;
}

function cbc(data: Uint8Array, iv: Uint8Array) {
	for (var m = 0; m < 16; m++) data[m] ^= iv[m];
	for (var n = 16; n < data.length; n += 16) {
		for (var m = 0; m < 16; m++) {
			data[n + m] ^= data[n + m - 16];
		}
	}
}

export function aes_decrypt(data: Uint8Array, key: Uint8Array, iv?: Uint8Array) {
	var keyLength = key.length;

	if (iv === undefined) iv = new Uint8Array(keyLength);

	//return jsaes.Decrypt_Blocks_CBC(data, key, iv);
	return jsaes2.decrypt_aes128_cbc(data, key);
}
