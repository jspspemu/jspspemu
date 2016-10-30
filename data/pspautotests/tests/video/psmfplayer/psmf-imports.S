.set noreorder

#include "pspimport.s"

# Not sure what the flags should be?
IMPORT_START "scePsmfPlayer",0x40090011

IMPORT_FUNC  "scePsmfPlayer",0x235d8787,scePsmfPlayerCreate
IMPORT_FUNC  "scePsmfPlayer",0x3ea82a4b,scePsmfPlayerGetAudioOutSize
IMPORT_FUNC  "scePsmfPlayer",0x3d6d25a9,scePsmfPlayerSetPsmf
IMPORT_FUNC  "scePsmfPlayer",0x58B83577,scePsmfPlayerSetPsmfCB
IMPORT_FUNC  "scePsmfPlayer",0x76C0F4AE,scePsmfPlayerSetPsmfOffset
IMPORT_FUNC  "scePsmfPlayer",0xA72DB4F9,scePsmfPlayerSetPsmfOffsetCB
IMPORT_FUNC  "scePsmfPlayer",0xdf089680,scePsmfPlayerGetPsmfInfo
IMPORT_FUNC  "scePsmfPlayer",0x95a84ee5,scePsmfPlayerStart
IMPORT_FUNC  "scePsmfPlayer",0x46f61f8b,scePsmfPlayerGetVideoData
IMPORT_FUNC  "scePsmfPlayer",0xf8ef08a6,scePsmfPlayerGetCurrentStatus
IMPORT_FUNC  "scePsmfPlayer",0x3ed62233,scePsmfPlayerGetCurrentPts
IMPORT_FUNC  "scePsmfPlayer",0xb9848a74,scePsmfPlayerGetAudioData
IMPORT_FUNC  "scePsmfPlayer",0xa0b8ca55,scePsmfPlayerUpdate
IMPORT_FUNC  "scePsmfPlayer",0x2D0E4E0A,scePsmfPlayerSetTempBuf
IMPORT_FUNC  "scePsmfPlayer",0x1078c008,scePsmfPlayerStop
IMPORT_FUNC  "scePsmfPlayer",0xe792cd94,scePsmfPlayerReleasePsmf
IMPORT_FUNC  "scePsmfPlayer",0x9b71a274,scePsmfPlayerDelete
IMPORT_FUNC  "scePsmfPlayer",0x2beb1569,scePsmfPlayerBreak
IMPORT_FUNC  "scePsmfPlayer",0x1e57a8e7,scePsmfPlayerConfigPlayer
IMPORT_FUNC  "scePsmfPlayer",0x68f07175,scePsmfPlayerGetCurrentAudioStream
IMPORT_FUNC  "scePsmfPlayer",0x9ff2b2e7,scePsmfPlayerGetCurrentVideoStream
IMPORT_FUNC  "scePsmfPlayer",0x75f03fa2,scePsmfPlayerSelectSpecificVideo
IMPORT_FUNC  "scePsmfPlayer",0x85461eff,scePsmfPlayerSelectSpecificAudio
IMPORT_FUNC  "scePsmfPlayer",0x8a9ebdcd,scePsmfPlayerSelectVideo
IMPORT_FUNC  "scePsmfPlayer",0xb8d10c56,scePsmfPlayerSelectAudio
IMPORT_FUNC  "scePsmfPlayer",0xa3d81169,scePsmfPlayerChangePlayMode
IMPORT_FUNC  "scePsmfPlayer",0xf3efaa91,scePsmfPlayerGetCurrentPlayMode


IMPORT_START "scePsmf",0x40090011
IMPORT_FUNC  "scePsmf",0xc22c8327,scePsmfSetPsmf
IMPORT_FUNC  "scePsmf",0x2673646B,scePsmfVerifyPsmf
IMPORT_FUNC  "scePsmf",0x5b70fcc1,scePsmfQueryStreamOffset
IMPORT_FUNC  "scePsmf",0x9553cc91,scePsmfQueryStreamSize
IMPORT_FUNC  "scePsmf",0xE1283895,scePsmfGetPsmfVersion
IMPORT_FUNC  "scePsmf",0xB78EB9E9,scePsmfGetHeaderSize
IMPORT_FUNC  "scePsmf",0xA5EBFE81,scePsmfGetStreamSize
IMPORT_FUNC  "scePsmf",0x76D3AEBA,scePsmfGetPresentationStartTime
IMPORT_FUNC  "scePsmf",0xBD8AE0D8,scePsmfGetPresentationEndTime
IMPORT_FUNC  "scePsmf",0x971A3A90,scePsmfCheckEPMap
IMPORT_FUNC  "scePsmf",0x4E624A34,scePsmfGetEPWithId
IMPORT_FUNC  "scePsmf",0x7C0E7AC3,scePsmfGetEPWithTimestamp
IMPORT_FUNC  "scePsmf",0x5F457515,scePsmfGetEPidWithTimestamp
