#include <common.h>
#include <pspgu.h>
#include <psprtc.h>
#include <pspmpegbase.h>
#include <pspmpeg.h>
#include <psputils.h>
#include <stdarg.h>
#include <pspdisplay.h>
#include <malloc.h>

#define BUF_WIDTH (512)
#define SCR_WIDTH (480)
#define SCR_HEIGHT (272)
#define PIXEL_SIZE (4) /* change this if you change to another screenmode */
#define FRAME_SIZE (BUF_WIDTH * SCR_HEIGHT * PIXEL_SIZE)
#define ZBUF_SIZE (BUF_WIDTH * SCR_HEIGHT * 2) /* zbuffer seems to be 16-bit? */

extern "C" {
	typedef struct PsmfPlayerData {
		u32 videoCodec;
		u32 videoStreamNum;
		u32 audioCodec;
		u32 audioStreamNum;
		u32 playMode;
		u32 playSpeed;
	} PsmfPlayerData;

	typedef struct PsmfPlayerCreateData {
		void *buffer;
		u32 bufferSize;
		int threadPriority;
	} PsmfPlayerCreateData;

	typedef struct PsmfVideoData {
		int frameWidth;
		void *displaybuf;
		u32 displaypts;
	} PsmfVideoData;

	typedef struct PsmfInfo {
		u32 lengthTS;
		int numVideoStreams;
		int numAudioStreams;
		int numPCMStreams;
		int playerVersion;
	} PsmfInfo;

	int scePsmfPlayerCreate(SceUID *psmf, PsmfPlayerCreateData *data);
	int scePsmfPlayerGetAudioOutSize(SceUID *psmf);
	int scePsmfPlayerSetPsmf(SceUID *psmf, const char *filename);
	int scePsmfPlayerSetPsmfCB(SceUID *psmf, const char *filename);
	int scePsmfPlayerSetPsmfOffset(SceUID *psmf, const char *filename, int offset);
	int scePsmfPlayerSetPsmfOffsetCB(SceUID *psmf, const char *filename, int offset);
	int scePsmfPlayerGetPsmfInfo(SceUID *psmf, PsmfInfo *info);
	int scePsmfPlayerStart(SceUID *psmf, PsmfPlayerData *data, int initPts);
	int scePsmfPlayerGetVideoData(SceUID *psmf, PsmfVideoData *videoData);
	int scePsmfPlayerGetCurrentStatus(SceUID *psmf);
	int scePsmfPlayerGetCurrentPts(SceUID *psmf, u64 *pts);
	int scePsmfPlayerGetAudioData(SceUID *psmf, void *audioData);
	int scePsmfPlayerUpdate(SceUID *psmf);
	int scePsmfPlayerSetTempBuf(SceUID *psmf, void *buffer, size_t size);
	int scePsmfPlayerStop(SceUID *psmf);
	int scePsmfPlayerReleasePsmf(SceUID *psmf);
	int scePsmfPlayerDelete(SceUID *psmf);
	int scePsmfPlayerBreak(SceUID *psmf);
	int scePsmfPlayerConfigPlayer(SceUID *psmf, int key, int val);
	int scePsmfPlayerGetCurrentAudioStream(SceUID *psmf, int *codec, int *streamNumber);
	int scePsmfPlayerGetCurrentVideoStream(SceUID *psmf, int *codec, int *streamNumber);
	int scePsmfPlayerSelectVideo(SceUID *psmf);
	int scePsmfPlayerSelectAudio(SceUID *psmf);
	int scePsmfPlayerSelectSpecificVideo(SceUID *psmf, int codec, int streamNumber);
	int scePsmfPlayerSelectSpecificAudio(SceUID *psmf, int codec, int streamNumber);
	int scePsmfPlayerGetCurrentPlayMode(SceUID *psmf, int *mode, int *speed);
	int scePsmfPlayerChangePlayMode(SceUID *psmf, int mode, int speed);

	int scePsmfQueryStreamOffset(void *buffer, u32 *offset);
	int scePsmfQueryStreamSize(void *buffer, u32 *size);
}

int initVideo();
int loadPsmfPlayer();
void unloadPsmfPlayer();

SceUID *createPsmfPlayerInitial(int prio = 0x17);
SceUID *createPsmfPlayerDeleted();
SceUID *createPsmfPlayerStandby(const char *filename = NULL, int prio = 0x17);
SceUID *createPsmfPlayerPlaying(const char *filename = NULL, int prio = 0x17);
SceUID *createPsmfPlayerFinished(const char *filename = NULL, int prio = 0x17);
void *getPsmfPlayerDisplayBuf();
void playPsmfPlayerUntilEnd(SceUID *player, int maxFrames);