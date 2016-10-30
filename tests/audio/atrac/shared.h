#include <common.h>
#include "atrac.h"

inline void schedfSingleResetBuffer(AtracSingleResetBufferInfo &info, void *basePtr) {
	int diff = info.writePos - (u8 *)basePtr;
	if (diff < 0x10000 && diff >= 0) {
		schedf("write=p+0x%x, writable=%08x, min=%08x, file=%08x", diff, info.writableBytes, info.minWriteBytes, info.filePos);
	} else {
		schedf("write=%p, writable=%08x, min=%08x, file=%08x", info.writePos, info.writableBytes, info.minWriteBytes, info.filePos);
	}
}

inline void schedfResetBuffer(AtracResetBufferInfo &info, void *basePtr) {
	schedf("   #1: ");
	schedfSingleResetBuffer(info.first, basePtr);
	schedf("\n   #2: ");
	schedfSingleResetBuffer(info.second, basePtr);
	schedf("\n");
}

inline void schedfAtrac(int atracID) {
	SceAtracId *ctx = _sceAtracGetContextAddress(atracID);
	if (!ctx) {
		schedf("ATRAC: failed\n");
		return;
	}

	schedf("ATRAC: decodePos: %08x, endSample: %08x", ctx->info.decodePos, ctx->info.endSample);
	schedf(", loopStart: %08x, loopEnd: %08x, samplesPerChan: %08x\n", ctx->info.loopStart, ctx->info.loopEnd, ctx->info.samplesPerChan);
	schedf("numFrames: %02x, state: %02x, unk22: %02x", ctx->info.numFrame, ctx->info.state, ctx->info.unk22);
	schedf(", numChan: %02x, sampleSize: %04x, codec: %04x\n", ctx->info.numChan, ctx->info.sampleSize, ctx->info.codec);
	schedf("dataOff: %08x, curOff: %08x, dataEnd: %08x", ctx->info.dataOff, ctx->info.curOff, ctx->info.dataEnd);
	schedf(", loopNum: %d, streamDataByte: %08x, unk48: %08x, unk52: %08x\n", ctx->info.loopNum, ctx->info.streamDataByte, ctx->info.unk48, ctx->info.unk52);
	schedf("buffer: %d, secondBuffer: %d, bufferByte: %08x, secondBufferByte: %08x\n", ctx->info.buffer != 0, ctx->info.secondBuffer != 0, ctx->info.bufferByte, ctx->info.secondBufferByte);
	schedf("\n");
}

inline void forceAtracState(int atracID, int state) {
	SceAtracId *ctx = _sceAtracGetContextAddress(atracID);
	if (ctx) {
		ctx->info.state = state;
	}
}

void LoadAtrac();
void UnloadAtrac();

struct Atrac3File {
	Atrac3File(const char *filename);
	Atrac3File(size_t size) {
		data_ = new u8[size];
		size_ = size;
	}
	~Atrac3File();

	void Reload(const char *filename);
	void Require();

	void Reset(size_t size) {
		delete [] data_;
		data_ = new u8[size];
		size_ = size;
	}

	bool IsValid() {
		return data_ != NULL;
	}
	u8 *Data() {
		return data_;
	}
	size_t Size() {
		return size_;
	}

private:
	size_t size_;
	u8 *data_;
};

void CreateLoopedAtracFrom(Atrac3File &at3, Atrac3File &updated, u32 loopStart, u32 loopEnd);
