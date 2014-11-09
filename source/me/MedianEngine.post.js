	var Atrac3Decoder = (function () {
		function Atrac3Decoder() {
			this.decoder = _atrac3_create_decoder();
			this.channels = -1;
			this.decodedSamples = -1;
		};

		function allocAndWrite(data) {
			var ptr = _malloc(data.length);
			HEAPU8.set(data, ptr);
			return ptr;
		}

		function free(ptr) {
			_free(ptr);
		}

		Atrac3Decoder.prototype.destroy = function () {
			_atrac3_delete_decoder(this.decoder);
		};

		Atrac3Decoder.prototype.initWithHeader = function (buffer) {
			var ptr = allocAndWrite(buffer);
			var channels = _atrac3_get_channels(this.decoder, ptr, buffer.length);
			free(ptr);
			this.channels = channels;
			this.decodedSamples = 0x800 * this.channels;
		};

		Atrac3Decoder.prototype.decode = function (buffer) {
			var out = new Int16Array(this.decodedSamples);
			var ptrIn = allocAndWrite(buffer);
			var ptrOut = _atrac3_decode(this.decoder, ptrIn, buffer.length);
			out.set(HEAP16.subarray((ptrOut >> 1), (ptrOut >> 1) + out.length));
			free(ptrIn);
			return out;
		};

		return Atrac3Decoder;
	})();
	
	Module['Atrac3Decoder'] = Atrac3Decoder;

	return Module;
})(); // MediaEngine.post.js

var ENVIRONMENT_IS_WEB = typeof window === 'object';

if (ENVIRONMENT_IS_WEB) window['MediaEngine'] = MediaEngine;