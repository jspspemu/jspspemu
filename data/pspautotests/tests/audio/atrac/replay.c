#include <common.h>

#include <pspsdk.h>
#include <pspkernel.h>
#include <pspatrac3.h>
#include <pspaudio.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <malloc.h>
#include <psputility.h>

int sceAtracGetSecondBufferInfo(int atracID, u32 *puiPosition, u32 *puiDataByte);
int sceAtracGetNextDecodePosition(int atracID, u32 *puiSamplePosition);

u32 min(u32 a, u32 b) {
	u32 ret = a > b ? b : a;
	return ret;
}

int main(int argc, char *argv[]) {
	char *at3_data;
	int file_size;
	int at3_size;
	int blk_size = 0x30000;
	int sampleCnt = 0;

	char *decode_data;
	int decode_size;
	int n;

	FILE *file;

	int atracID;
	int maxSamples = 0;
	int result;
	int channel;
	
	u32 puiPosition;
	u32 puiDataByte;

	u32 writePtr;
	u32 availableBytes;
	u32 readOffset;
	
	if ((file = fopen("sample.at3", "rb")) != NULL) {
		fseek(file, 0, SEEK_SET);
		u32 header[2];
		fread(&header, 4, 2, file);
		file_size = header[1];
		printf("filesize = 0x%08x\n", file_size);
		blk_size = file_size / 2;

		fseek(file, 0, SEEK_END);
		at3_size = ftell(file);
		printf("at3size = 0x%08x\n", at3_size);

		fseek(file, 0, SEEK_SET);
		at3_data = malloc(blk_size);
		decode_data = malloc(decode_size = 512 * 1024);
		memset(at3_data, 0, blk_size);
		memset(decode_data, 0, decode_size);
		
		fread(at3_data, blk_size, 1, file);
	}

	int id = sceUtilityLoadModule(PSP_MODULE_AV_AVCODEC);
	int id2 = sceUtilityLoadModule(PSP_MODULE_AV_ATRAC3PLUS);

	if ((id >= 0 || (u32) id == 0x80020139UL) && (id2 >= 0 || (u32) id2 == 0x80020139UL)) {
		printf("Audio modules: OK\n");
	} else {
		printf("Audio modules: Failed %08x %08x\n", id, id2);
	}

	printf("at3: %08X-%08X\n", (u32)at3_data, (u32)at3_data + at3_size);
	printf("Header: %s\n", (char *)at3_data);

		
	// set first block of data
	atracID = sceAtracSetDataAndGetID(at3_data, blk_size);
	if (atracID < 0) {
		printf("sceAtracSetDataAndGetID: Failed %08x\n", atracID);
		return 1;
	} else {
		printf("sceAtracSetDataAndGetID: OK, size=%08x\n", blk_size);
		at3_size -= blk_size;
	}

	u32 bitrate;
	result = sceAtracGetBitrate(atracID, &bitrate);
	printf("%i=sceAtracGetBitrate: %i\n", result, bitrate);

	u32 channelNum;
	result = sceAtracGetChannel(atracID, &channelNum);
	printf("%i=sceAtracGetChannel: %i\n", result, channelNum);

	result = sceAtracSetLoopNum(atracID, 0);
	printf("sceAtracSetLoopNum: %d\n", result);

	result = sceAtracGetMaxSample(atracID, &maxSamples);
	printf("sceAtracGetMaxSample: %08X, %d\n", result, maxSamples);
	
	channel = sceAudioChReserve(0, maxSamples, PSP_AUDIO_FORMAT_STEREO);
	printf("sceAudioChReserve: %08X\n", channel);
	
	result = sceAtracGetSecondBufferInfo(atracID, &puiPosition, &puiDataByte);
	printf("sceAtracGetSecondBufferInfo: %08X, %u, %u\n", result, (unsigned int)puiPosition, (unsigned int)puiDataByte);
	
	int end = 0;
	int steps = 0;
	int remainFrame = -1;
	int samples = 0;

	while (!end && steps < 65536) {
		// get stream data info
		result = sceAtracGetStreamDataInfo(atracID, (u8**)&writePtr, &availableBytes, &readOffset);
		printf("%i=sceAtracGetStreamDataInfo: %08x, %08x, %08x\n", result, writePtr, availableBytes, readOffset);

		u32 nextSample;
		sceAtracGetNextSample(atracID, &nextSample);
		sampleCnt += nextSample;

		// decode
		result = sceAtracDecodeData(atracID, (u16 *)decode_data, &samples, &end, &remainFrame);
		if (result) {
			printf("%i=sceAtracDecodeData error: samples: %08x, end: %08x, remainFrame: %d\n",
				result, samples, end, remainFrame);
			return -1;
		}
		printf("%i=sceAtracDecodeData: samples: %08x, end: %08x, remainFrame: %d\n",
			result, samples, end, remainFrame);

		// output sound
		sceAudioOutputBlocking(channel, 0x8000, decode_data);
		printf("sceAudioOutputBlocking\n\n");
		result = sceAtracGetRemainFrame(atracID, &remainFrame);

		// Here 170 is a guess frame threshold
		if (remainFrame < 170) {
			u32 addtoBytes = min(at3_size, min(0xffc0, availableBytes));
			if (availableBytes >= addtoBytes) {
				fread((u8*)writePtr, addtoBytes, 1, file);
				result = sceAtracAddStreamData(atracID, addtoBytes);
				if (result) {
					printf("%i=sceAtracAddStreamData error: %08x\n", result, addtoBytes);
					return 1;
				}
				printf("%i=sceAtracAddStreamData: %08x\n", result, addtoBytes);

				at3_size -= addtoBytes;
			}
		}

		steps++;
	}

	free(at3_data);
	fclose(file);

	result = sceAudioChRelease(channel);
	printf("sceAudioChRelease: %08X\n", result);
	result = sceAtracReleaseAtracID(atracID);
	printf("sceAtracReleaseAtracID: %08X\n\n", result);

	return 0;
}
