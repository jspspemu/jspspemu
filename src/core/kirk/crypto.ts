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

export function aes_decrypt(data: Uint8Array, key: Uint8Array, iv?: Uint8Array) {
	var info = { };
	if (iv !== undefined) info['iv'] = fromCryptoArray(iv);
	return cryptoToArray(CryptoJS.AES.decrypt(fromCryptoArray(data), fromCryptoArray(key), info));
}

console.log(ab2hex(md5(str2ab('hello'))));
console.log(ab2hex(sha1(str2ab('hello'))));
