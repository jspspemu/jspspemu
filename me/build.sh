echo "Beginning Build:"

pushd ffmpeg

emconfigure ./configure --cc="emcc" --enable-cross-compile --target-os=none --arch=x86_32 --cpu=generic --disable-ffplay --disable-ffprobe --disable-ffserver --disable-asm --disable-doc --disable-devices --disable-pthreads --disable-w32threads --disable-network --disable-hwaccels --disable-parsers --disable-bsfs --disable-debug --disable-zlib --disable-protocols --disable-indevs --disable-outdevs --enable-protocol=file --enable-pic --enable-small
make clean
make
cp ffmpeg ffmpeg.bc
emcc -s VERBOSE=1 -s ASM_JS=0 -s TOTAL_MEMORY=33554432 -O2 -v ffmpeg.bc -o ../ffmpeg.js --pre-js ../ffmpeg_pre.js --post-js ../ffmpeg_post.js

popd

echo "Finished Build"