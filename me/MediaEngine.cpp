#include "Mai_Base0.h"

#include "stdio.h"

//#include "MaiWaveOut.h"

#include "MaiAT3PlusFrameDecoder.h"

extern "C" {
	MaiAT3PlusFrameDecoder * atrac3_create_decoder() {
		return new MaiAT3PlusFrameDecoder();
	}

	void atrac3_delete_decoder(MaiAT3PlusFrameDecoder * decoder) {
		delete decoder;
	}

	int atrac3_get_channels(MaiAT3PlusFrameDecoder * decoder, Mai_I8 * input, int block_size) {
		int chns = -1;
		if (decoder->decodeFrame(input, block_size, &chns, NULL) != 0) return -1;
		return chns;
	}

	int atrac3_get_decoded_samples(MaiAT3PlusFrameDecoder * decoder, Mai_I8 * input, int block_size) {
		return 0x800 * atrac3_get_channels(decoder, input, block_size) * 2;
	}

	void* atrac3_decode(MaiAT3PlusFrameDecoder * decoder, Mai_I8 * input, int block_size) {
		Mai_I16 *p_buf = NULL;
		decoder->decodeFrame(input, block_size, NULL, &p_buf);
		return p_buf;
	}
}
