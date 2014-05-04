var exp = require('../MediaEngine.js');
var fs = require('fs');

//var data = fs.readFileSync('bgm_004_64.at3');
var dataBuffer = fs.readFileSync('bgm01.at3');

var decoder = new exp.Atrac3Decoder();
var data = new Uint8Array(dataBuffer);

function dataSlice(n, length) {
	return data.subarray(n, n + length);
}

var headerStart = 0xA4;
var chunkSize = 744;
var chunkCount = Math.floor((data.length - headerStart) / chunkSize);

var binout = new Buffer(0x800 * 2 * chunkCount * 2);
var binout_offset = 0;

decoder.initWithHeader(dataSlice(headerStart, chunkSize));

var channels = decoder.channels;
var decodedSamples = decoder.decodedSamples;

console.log('channels', channels);
console.log('decodedSamples', decodedSamples);
for (var n = 1; n < chunkCount; n++) {
	var chunk = decoder.decode(dataSlice(headerStart + chunkSize * n, chunkSize));
	var chunkValues = [];
	for (var m = 0; m < decodedSamples; m++) {
		var value = chunk[m];
		binout.writeInt16LE(value, binout_offset); binout_offset += 2;
		chunkValues.push(value);
		//console.log(value);
	}
	console.log(chunkValues.join(','));
	//return;
}

fs.writeFileSync('out.raw', binout);
