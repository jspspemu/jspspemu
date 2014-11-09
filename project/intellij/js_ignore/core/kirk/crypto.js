///<reference path="../../global.d.ts" />
var jsaes2 = require('./jsaes2');
function cryptoToArray(info) {
    var words = info.words;
    var wordsLen = words.length;
    var data = new Uint8Array(wordsLen * 4);
    var m = 0;
    for (var n = 0; n < wordsLen; n++) {
        data[m++] = (words[n] >>> 24) & 0xFF;
        data[m++] = (words[n] >>> 16) & 0xFF;
        data[m++] = (words[n] >>> 8) & 0xFF;
        data[m++] = (words[n] >>> 0) & 0xFF;
    }
    return data;
}
function fromCryptoArray(uint8View) {
    return CryptoJS.lib.WordArray.create(uint8View);
}
function ab2str(buf) {
    return String.fromCharCode.apply(null, buf);
}
function ab2hex(buf) {
    var parts = [];
    for (var n = 0; n < buf.length; n++) {
        var chunk = buf[n].toString(16);
        while (chunk.length < 2)
            chunk = '0' + chunk;
        parts.push(chunk);
    }
    return parts.join('');
}
function str2ab(str) {
    var bufView = new Uint8Array(str.length);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return bufView;
}
function md5(data) {
    return cryptoToArray(CryptoJS.MD5(fromCryptoArray(data)));
}
exports.md5 = md5;
function sha1(data) {
    return cryptoToArray(CryptoJS.SHA1(fromCryptoArray(data)));
}
exports.sha1 = sha1;
function aes_encrypt(data, key, iv) {
    var info = { mode: CryptoJS.mode.CFB, padding: CryptoJS.pad.AnsiX923 };
    if (iv !== undefined)
        info['iv'] = fromCryptoArray(iv);
    return cryptoToArray(CryptoJS.AES.encrypt(fromCryptoArray(data), fromCryptoArray(key), info));
}
exports.aes_encrypt = aes_encrypt;
function uint8array_to_array32(data) {
    var data2 = new Uint32Array(data.buffer);
    var out = new Array(data2.length / 4);
    for (var n = 0; n < data2.length; n++) {
        out[n] = data2[n];
    }
    return out;
}
function uint8array_to_array8(data) {
    var out = new Array(data.length / 4);
    for (var n = 0; n < data.length; n++) {
        out[n] = data[n];
    }
    return out;
}
function array_to_uint8array(data) {
    var out = new Uint8Array(data.length);
    for (var n = 0; n < data.length; n++)
        out[n] = data[n];
    return out;
}
function pad_PKCS7(array, padding) {
    var left = (padding - (array.length % padding)) % padding;
    for (var n = 0; n < left; n++)
        array.push(left);
    return array;
}
function pad_Zero(array, padding) {
    var left = (padding - (array.length % padding)) % padding;
    for (var n = 0; n < left; n++)
        array.push(0);
    return array;
}
function cbc(data, iv) {
    for (var m = 0; m < 16; m++)
        data[m] ^= iv[m];
    for (var n = 16; n < data.length; n += 16) {
        for (var m = 0; m < 16; m++) {
            data[n + m] ^= data[n + m - 16];
        }
    }
}
function aes_decrypt(data, key, iv) {
    var keyLength = key.length;
    if (iv === undefined)
        iv = new Uint8Array(keyLength);
    //return jsaes.Decrypt_Blocks_CBC(data, key, iv);
    return jsaes2.decrypt_aes128_cbc(data, key);
}
exports.aes_decrypt = aes_decrypt;
//# sourceMappingURL=crypto.js.map