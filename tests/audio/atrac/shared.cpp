#include "shared.h"
#include <stdio.h>
#include <malloc.h>
#include <psputility.h>

void LoadAtrac() {
	int success = 0;
	success |= sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	success |= sceUtilityLoadModule(PSP_MODULE_AV_ATRAC3PLUS);
	if (success != 0) {
		printf("TEST FAILURE: unable to load sceAtrac.\n");
		exit(1);
	}
}

void UnloadAtrac() {
	sceUtilityUnloadModule(PSP_MODULE_AV_ATRAC3PLUS);
	sceUtilityUnloadModule(PSP_MODULE_AV_AVCODEC);
}

Atrac3File::Atrac3File(const char *filename) : data_(NULL) {
	Reload(filename);
}

Atrac3File::~Atrac3File() {
	delete [] data_;
	data_ = NULL;
}

void Atrac3File::Reload(const char *filename) {
	delete [] data_;
	data_ = NULL;

	FILE *file = fopen(filename, "rb");
	if (file != NULL) {
		fseek(file, 0, SEEK_END);
		size_ = ftell(file);
		data_ = new u8[size_];
		memset(data_, 0, size_);

		fseek(file, 0, SEEK_SET);
		fread(data_, size_, 1, file);

		fclose(file);
	}
}

void Atrac3File::Require() {
	if (!IsValid()) {
		printf("TEST FAILURE: unable to read sample.at3\n");
		exit(1);
	}
}

void CreateLoopedAtracFrom(Atrac3File &at3, Atrac3File &updated, u32 loopStart, u32 loopEnd) {
	// We need a bit of extra space to fake loop information.
	const u32 extraLoopInfoSize = 44 + 24;
	updated.Reset(at3.Size() + extraLoopInfoSize);
	u32 *data32 = (u32 *)updated.Data();

	// Tricksy stuff happening here.  Adding loop information.
	const u32 initialDataStart = 88;
	const u32 MAGIC_LOWER_SMPL = 0x6C706D73;
	memcpy(updated.Data(), at3.Data(), initialDataStart);
	// We need to add a sample chunk, and it's this long.
	data32[1] += 44 + 24;
	// Skip to where the sample chunk is going.
	data32 = (u32 *)(updated.Data() + initialDataStart);
	// Loop header.
	*data32++ = MAGIC_LOWER_SMPL;
	*data32++ = 36 + 24;
	*data32++ = 0; // manufacturer
	*data32++ = 0; // product
	*data32++ = 22676; // sample period
	*data32++ = 60; // midi unity note
	*data32++ = 0; // midi semi tone
	*data32++ = 0; // SMPTE offset format
	*data32++ = 0; // SMPTE offset
	*data32++ = 1; // num loops
	*data32++ = 0x18; // extra smpl bytes at end (seems incorrect, but found in data.)
					  // Loop info itself.
	*data32++ = 0; // ident
	*data32++ = 0; // loop type
				   // Note: This can be zero, but it won't loop.  Interesting.
	*data32++ = loopStart; // start
	*data32++ = loopEnd; // end
	*data32++ = 0; // fraction tuning
	*data32++ = 0; // num loops - ignored?

	memcpy(updated.Data() + initialDataStart + extraLoopInfoSize, at3.Data() + initialDataStart, at3.Size() - initialDataStart);
}
