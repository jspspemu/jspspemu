#include <pspatrac3.h>

extern "C" {
	typedef struct {
		u8 *writePos;
		u32 writableBytes;
		u32 minWriteBytes;
		u32 filePos;
	} AtracSingleResetBufferInfo;

	typedef struct {
		AtracSingleResetBufferInfo first;
		AtracSingleResetBufferInfo second;
	} AtracResetBufferInfo;

	// From PPSSPP.
	typedef struct {
		s32 unk0;
		s32 unk4;
		s32 err; // 8
		s32 edramAddr; // 12
		s32 neededMem; // 16
		s32 unk20;
		void *inBuf; // 24
		s32 unk28;
		void *outBuf; // 32
		s32 unk36;
		s8 unk40;
		s8 unk41;
		s8 unk42;
		s8 unk43;
		s8 unk44;
		s8 unk45;
		s8 unk46;
		s8 unk47;
		s32 unk48;
		s32 unk52;
		s32 unk56;
		s32 unk60;
		s32 unk64;
		s32 unk68;
		s32 unk72;
		s32 unk76;
		s32 unk80;
		s32 unk84;
		s32 unk88;
		s32 unk92;
		s32 unk96;
		s32 unk100;
		void *allocMem; // 104
		// make sure the size is 128
		u8 unk[20];
	} SceAudiocodecCodec;

	typedef struct {
		u32 decodePos; // 0
		u32 endSample; // 4
		u32 loopStart; // 8
		u32 loopEnd; // 12
		int samplesPerChan; // 16
		char numFrame; // 20
		// 2: all the stream data on the buffer
		// 6: looping -> second buffer needed
		char state; // 21
		char unk22;
		char numChan; // 23
		u16 sampleSize; // 24
		u16 codec; // 26
		u32 dataOff; // 28
		u32 curOff; // 32
		u32 dataEnd; // 36
		int loopNum; // 40
		u32 streamDataByte; // 44
		u32 unk48;
		u32 unk52;
		u8 *buffer; // 56
		u8 *secondBuffer; // 60
		u32 bufferByte; // 64
		u32 secondBufferByte; // 68
		// make sure the size is 128
		u8 unk[56];
	} SceAtracIdInfo;

	typedef struct {
		// size 128
		SceAudiocodecCodec codec;
		// size 128
		SceAtracIdInfo info;
	} SceAtracId;

	int sceAtracReinit(int at3origCount, int at3plusCount);
	int sceAtracResetPlayPosition(int atracID, u32 sampleCount, u32 bytesWrittenFirstBuf, u32 bytesWrittenSecondBuf);

	int sceAtracGetAtracID(uint codecType);
	int sceAtracSetData(int atracID, u8 *buf, u32 bufSize);
	int sceAtracSetHalfwayBufferAndGetID(u8 *buf, u32 bufSize, u32 readBytes);
	int sceAtracSetHalfwayBuffer(int atracID, u8 *buffer, u32 readSize, u32 bufferSize);
	int sceAtracSetMOutDataAndGetID(u8 *buffer, u32 bufferSize);
	int sceAtracSetMOutData(int atracID, u8 *buffer, u32 bufferSize);
	int sceAtracSetMOutHalfwayBufferAndGetID(u8 *buffer, u32 readSize, u32 bufferSize);
	int sceAtracSetMOutHalfwayBuffer(int atracID, u8 *buffer, u32 readSize, u32 bufferSize);
	int sceAtracSetAA3DataAndGetID(u8 *buffer, u32 bufferSize, u32 fileSize);
	int sceAtracSetAA3HalfwayBufferAndGetID(u8 *buffer, u32 readSize, u32 bufferSize, u32 fileSize);

	int sceAtracIsSecondBufferNeeded(int atracID);
	int sceAtracSetSecondBuffer(int atracID, u8 *secondBuffer, u32 secondBufferSize);
	int sceAtracGetSecondBufferInfo(int atracID, u32 *puiPosition, u32 *puiDataByte);

	int sceAtracGetNextDecodePosition(int atracID, u32 *puiSamplePosition);
	int sceAtracGetChannel(int atracID, u32 *channels);
	int sceAtracGetLoopStatus(int atracID, int *loopNum, u32 *loopStatus);
	int sceAtracGetInternalErrorInfo(int atracID, int *result);
	int sceAtracGetSoundSample(int atracID, int *endSample, int *loopStartSample, int *loopEndSample);
	int sceAtracGetBufferInfoForResetting(int atracID, int position, AtracResetBufferInfo *bufferInfo);
	int sceAtracGetOutputChannel(int atracID, u32 *outputChannels);

	SceAtracId *_sceAtracGetContextAddress(int atracID);
}
