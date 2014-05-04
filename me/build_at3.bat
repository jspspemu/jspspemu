@ECHO OFF
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

set FILE=%FILE% MediaEngine.cpp

set EXPORTED_FUNCTIONS="['_atrac3_create_decoder','_atrac3_delete_decoder','_atrac3_get_channels','_atrac3_get_decoded_samples','_atrac3_decode']"

em++ -s TOTAL_MEMORY=16777216 -s ASM_JS=0 -O2 -I MaiAT3PlusDecoder/include %FILE% -s EXPORTED_FUNCTIONS=%EXPORTED_FUNCTIONS% --pre-js MedianEngine.pre.js --post-js MedianEngine.post.js -o ../MediaEngine.js
REM em++ -s TOTAL_MEMORY=16777216 -s ASM_JS=0 --closurecompiler 1 -O2 -I MaiAT3PlusDecoder/include %FILE% -s EXPORTED_FUNCTIONS=%EXPORTED_FUNCTIONS% --pre-js MedianEngine.pre.js --post-js MedianEngine.post.js -o MediaEngine.js
