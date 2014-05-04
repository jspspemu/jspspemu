set FILE=
set FILE=%FILE% MaiAT3PlusDecoder/src/base/Heap_Alloc0.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/MaiBitReader.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/MaiBufIO.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/MaiCriticalSection.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/MaiFile.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/MaiQueue0.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/MaiString.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/MaiThread.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/Mai_mem.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/Mai_Sleep.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/base/Unicode.cc
set FILE=%FILE% MaiAT3PlusDecoder/src/MaiAT3PlusCoreDecoder.cpp
set FILE=%FILE% MaiAT3PlusDecoder/src/MaiAT3PlusCoreDecoder_DecFunc.cpp
set FILE=%FILE% MaiAT3PlusDecoder/src/MaiAT3PlusCoreDecoder_StaticData.cpp
set FILE=%FILE% MaiAT3PlusDecoder/src/MaiAT3PlusCoreDecoder_SubFunc.cpp
set FILE=%FILE% MaiAT3PlusDecoder/src/MaiAT3PlusFrameDecoder.cpp

set FILE=%FILE% MaiAT3PlusDecoder/MiniPlayer/MiniPlayer.cpp
REM set FILE=%FILE% MaiAT3PlusDecoder/MiniPlayer/MaiWaveOut.cpp

REM em++ -s TOTAL_MEMORY=1677721 -O2 --closurecompiler 1 -I MaiAT3PlusDecoder/include -I MaiAT3PlusDecoder/MiniPlayer %FILE%
em++ -s TOTAL_MEMORY=4194304 -O2 -I MaiAT3PlusDecoder/include -I MaiAT3PlusDecoder/MiniPlayer %FILE% --embed-file bgm_004_64.at3 -s EXPORTED_FUNCTIONS="['_main','_mai_test']"