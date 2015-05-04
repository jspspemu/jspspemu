#include <pspkernel.h>
#include <pspdebug.h>
#include <pspctrl.h>
#include <pspdisplay.h>
#include <pspgu.h>
#include <pspgum.h>
#include <psppower.h>

#include <sys/stat.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
//#include "zlib/zlib.h"

PSP_MODULE_INFO("Compiler Performance Test", 0, 1, 0);
PSP_MAIN_THREAD_ATTR(THREAD_ATTR_USER | PSP_THREAD_ATTR_VFPU);

int done = 0;
int cpuFreq = 222;
int startSystemTime;

#define BUFFER_SIZE	(10 * 1024 * 1024)
char __attribute__((aligned(16))) buffer[BUFFER_SIZE];
int dummy;

#define eprintf(...) \
	{ \
		char s[1000] = {0}; \
		sprintf(s, __VA_ARGS__); \
		sceIoWrite(sceKernelStdout(), s, strlen(s)); \
		pspDebugScreenPrintf("%s", s); \
	}

void printResult(char *name, int durationMillis, float pspDurationMillis) {
	eprintf( "%-25s: %5d ms (%5.0f%%) @ %d MHz\n", name, durationMillis, pspDurationMillis / durationMillis * 100, scePowerGetCpuClockFrequencyInt());
}

int outResult = 0;
float outResultf = 0.0f;

void testEmptyLoop()
{
	int i;
	int j;
	for (j = 50; j > 0; j--)
	{
		for (i = 1000000; i > 0; i--)
		{
		}
	}
}

void testSimpleLoop()
{
	int i;
	int j;
	int sum = 0;
	for (j = 50; j > 0; j--)
	{
		for (i = 1000000; i > 0; i--)
		{
			sum += i;
		}
	}
	outResult = sum;
}


void testRead32()
{
	int i;
	int j;
	int sum = 0;
	for (j = 0; j < 10; j++)
	{
		int *address = (int *) buffer;
		for (i = BUFFER_SIZE / 4; i > 0; i--)
		{
			sum += *address++;
		}
	}
	outResult = sum;
}


void testRead16()
{
	int i;
	int j;
	int sum = 0;
	for (j = 0; j < 5; j++)
	{
		short *address = (short *) buffer;
		for (i = BUFFER_SIZE / 2; i > 0; i--)
		{
			sum += *address++;
		}
	}
	outResult = sum;
}


void runTest5()
{
	int i;
	int j;
	int sum = 0;
	for (j = 0; j < 3; j++)
	{
		char *address = (char *) buffer;
		for (i = BUFFER_SIZE; i > 0; i--)
		{
			sum += *address++;
		}
	}
	outResult = sum;
}


void runTest6()
{
	int i;
	int j;
	for (j = 0; j < 10; j++)
	{
		int *address = (int *) buffer;
		for (i = BUFFER_SIZE / 4; i > 0; i--)
		{
			*address++ = i;
		}
	}
}


void runTest7()
{
	int i;
	int j;
	for (j = 0; j < 5; j++)
	{
		short *address = (short *) buffer;
		for (i = BUFFER_SIZE / 2; i > 0; i--)
		{
			*address++ = (short) i;
		}
	}
}


void runTest8()
{
	int i;
	int j;
	for (j = 0; j < 3; j++)
	{
		char *address = (char *) buffer;
		for (i = BUFFER_SIZE; i > 0; i--)
		{
			*address++ = (char) i;
		}
	}
}

void runTest9c()
{
	dummy = 0;
}

void runTest9b()
{
	runTest9c();
	runTest9c();
	runTest9c();
	runTest9c();
	runTest9c();
	runTest9c();
	runTest9c();
	runTest9c();
	runTest9c();
	runTest9c();
}

void runTest9a()
{
	runTest9b();
	runTest9b();
	runTest9b();
	runTest9b();
	runTest9b();
	runTest9b();
	runTest9b();
	runTest9b();
	runTest9b();
	runTest9b();
	asm("dbreak\n");
}

void runTest9()
{
	int i;
	int j;
	for (j = 0; j < 30; j++)
	{
		for (i = 10000; i > 0; i--)
		{
			runTest9a();
		}
	}
}


int runTest10a(int a, int b, int c, int d)
{
	dummy = 0;
	return a;
}

void runTest10()
{
	int i;
	int j;
	for (j = 0; j < 20; j++)
	{
		for (i = 1000000; i > 0; i--)
		{
			runTest10a(1, 2, 3, 4);
		}
	}
}


void runTest11()
{
	int i;
	int j;
	float sum = 0;
	for (j = 0; j < 30; j++)
	{
		for (i = 1000000; i > 0; i--)
		{
			sum += 1;
		}
	}
	outResultf = sum;
}


void runTest12()
{
	int i;
	int j;
	float sum = 1;
	for (j = 0; j < 30; j++)
	{
		for (i = 1000000; i > 0; i--)
		{
			sum *= 0.999999f;
		}
	}
	outResultf = sum;
}


void runTest13()
{
	int i;
	int j;
	for (j = 0; j < 30; j++)
	{
		for (i = 1000000; i > 0; i--)
		{
			asm("vadd.s S000, S100, S200\n");
		}
	}
}


void runTest14()
{
	int i;
	int j;
	for (j = 0; j < 30; j++)
	{
		for (i = 1000000; i > 0; i--)
		{
			asm("vadd.p C000.p, C100.p, C200.p\n");
		}
	}
}


void runTest15()
{
	int i;
	int j;
	for (j = 0; j < 30; j++)
	{
		for (i = 1000000; i > 0; i--)
		{
			asm("vadd.t C000.t, C100.t, C200.t\n");
		}
	}
}


void runTest16()
{
	int i;
	int j;
	for (j = 0; j < 30; j++)
	{
		for (i = 1000000; i > 0; i--)
		{
			asm("vadd.q C000, C100, C200\n");
		}
	}
}


void runTest17()
{
	int i;
	int j;
	for (j = 0; j < 10; j++)
	{
		for (i = 1000000; i > 0; i--)
		{
			asm("vadd.q C000, C100, C200\n");
			asm("vadd.q C000, C100, C200\n");
			asm("vadd.q C000, C100, C200\n");
			asm("vadd.q C000, C100, C200\n");
			asm("vadd.q C000, C100, C200\n");
			asm("vadd.q C000, C100, C200\n");
			asm("vadd.q C000, C100, C200\n");
			asm("vadd.q C000, C100, C200\n");
			asm("vadd.q C000, C100, C200\n");
			asm("vadd.q C000, C100, C200\n");
		}
	}
}


void runTest18()
{
	memset(buffer, 0, BUFFER_SIZE);
	int i;
	int j;
	float sum = 0;
	for (j = 0; j < 10; j++)
	{
		float *address = (float *) buffer;
		for (i = BUFFER_SIZE / 4; i > 0; i--)
		{
			sum += *address++;
		}
	}
}


void runTest19()
{
	int i;
	int j;
	for (j = 0; j < 10; j++)
	{
		float *address = (float *) buffer;
		for (i = BUFFER_SIZE / 4; i > 0; i--)
		{
			*address++ = 1.f;
		}
	}
}


void runTest20()
{
	int i;
	int length = BUFFER_SIZE / 2;
	for (i = 0; i < 10; i++)
	{
		memcpy(buffer, buffer + length, length);
	}
}


void runTest21()
{
	int i;
	int length = BUFFER_SIZE;
	for (i = 0; i < 10; i++)
	{
		memset(buffer, 0, length);
	}
}


void runTest22()
{
	int i;
	int length = BUFFER_SIZE / 2 - 16;
	char *s = buffer + BUFFER_SIZE / 2;
	memset(s, 'a', length);
	s[length] = '\0';

	for (i = 0; i < 10; i++)
	{
		strcpy(buffer, s);
	}
}


void runTest23()
{
	int i;
	int j;
	int length = BUFFER_SIZE / 2;
	int sum = 0;
	for (i = 0; i < 3; i++)
	{
		for (j = length - 1; j >= 0; j--)
		{
			buffer[j] = buffer[j + length];
			// Fake sum to avoid a native code sequence
			sum += j;
		}
	}
	outResult = sum;
}


void runTest24()
{
	int i;
	int j;
	int length = BUFFER_SIZE;
	int sum = 0;
	for (i = 0; i < 2; i++)
	{
		for (j = length - 1; j >= 0; j--)
		{
			buffer[j] = '\0';
			// Fake sum to avoid a native code sequence
			sum += j;
		}
	}
	outResult = sum;
}


void runTest25()
{
	int i;
	int j;
	char c;
	int length = BUFFER_SIZE / 2 - 16;
	char *s = buffer + BUFFER_SIZE / 2;
	memset(s, 'a', length);
	s[length] = '\0';

	int sum = 0;
	for (i = 0; i < 3; i++)
	{
		for (j = 0; 1; j++)
		{
			c = s[j];
			buffer[j] = c;
			if (c == 0)
			{
				break;
			}
			// Fake sum to avoid a native code sequence
			sum += j;
		}
	}
	outResult = sum;
}


void runTest26()
{
	int i;
	int sum = 0;
	for (i = 200000; i > 0; i--)
	{
		sum += sceKernelGetSystemTimeLow();
	}
	outResult = sum;
}


void runTest27()
{
	int i;
	int sum = 0;
	SceKernelSysClock time;
	for (i = 200000; i > 0; i--)
	{
		sum += sceKernelGetSystemTime(&time);
	}
	outResult = sum;
}

void runTest28a()
{
}

void (*fn28)() = runTest28a;

void runTest28()
{
	int i;
	for (i = 5000000; i > 0; i--)
	{
		(*fn28)();
	}
}

unsigned char uncompressed_data[2 * 1024] = {0};
unsigned char compressed_data[2 * 1024 + 1024] = {0};

const char hello[] = "hello, hello!";

#define CHECK_ERR(err, msg) { \
    if (err != Z_OK) { \
        eprintf("%s error: %d\n", msg, err); \
        exit(1); \
    } \
}

/*
void test_deflate(compr, comprLen)
    Byte *compr;
    uLong comprLen;
{
    z_stream c_stream; // compression stream 
    int err;
    int len = strlen(hello)+1;

    c_stream.zalloc = (alloc_func)0;
    c_stream.zfree = (free_func)0;
    c_stream.opaque = (voidpf)0;

    err = deflateInit(&c_stream, Z_DEFAULT_COMPRESSION);
    CHECK_ERR(err, "deflateInit");

    c_stream.next_in  = (Bytef*)hello;
    c_stream.next_out = compr;

    while (c_stream.total_in != (uLong)len && c_stream.total_out < comprLen) {
        c_stream.avail_in = c_stream.avail_out = 1; // force small buffers
        err = deflate(&c_stream, Z_NO_FLUSH);
        CHECK_ERR(err, "deflate");
    }
    // Finish the stream, still forcing small buffers:
    for (;;) {
        c_stream.avail_out = 1;
        err = deflate(&c_stream, Z_FINISH);
        if (err == Z_STREAM_END) break;
        CHECK_ERR(err, "deflate");
    }

    err = deflateEnd(&c_stream);
    CHECK_ERR(err, "deflateEnd");
}

void runTest29()
{
	int n;
	unsigned long int uncompressed_size = sizeof(uncompressed_data);
	unsigned long int required_compressed_size = sizeof(compressed_data);

	for (n = 0; n < uncompressed_size; n++) uncompressed_data[n] = (unsigned char)(n * 999217);

	eprintf("%d,%d\n", uncompressed_size, required_compressed_size);
	for (n = 0; n < 10; n++) {
		unsigned long int compressed_size = required_compressed_size;
		//z_stream strm;
		//eprintf("ZLIB:%d\n", deflateInit(&strm, 9));
		test_deflate(uncompressed_data, uncompressed_size);

		//int result = compress(compressed_data, &compressed_size, uncompressed_data, uncompressed_size);
		//eprintf("ZLIB:%d\n", result);
	}
}
*/

typedef void (*TestHandler)();

int sumDurationMillis = 0;
int testCount = 0;

void _runTest(TestHandler handler, char* name) {
	int start, end, elapsed;
	start = sceKernelGetSystemTimeLow();
	handler();
	end = sceKernelGetSystemTimeLow();
	elapsed = (end - start) / 1000;
	sumDurationMillis += elapsed;
	testCount++;
	eprintf("%s: %d\n", name, elapsed);
}

void runTest()
{
	pspDebugScreenInit();
	
	sumDurationMillis = 0;
	testCount = 0;
	_runTest(testEmptyLoop, "Empty loop");
	_runTest(testSimpleLoop, "Simple loop");
	_runTest(testRead32, "read32");
	_runTest(testRead16, "read16");
	_runTest(runTest5, "read8");
	_runTest(runTest6, "write32");
	_runTest(runTest7, "write16");
	_runTest(runTest8, "write8");
	_runTest(runTest9, "Function call no params");
	_runTest(runTest10, "Function call with params");
	_runTest(runTest11, "FPU add.s");
	_runTest(runTest12, "FPU mul.s");

	_runTest(runTest13, "VFPU vadd.s");
	_runTest(runTest14, "VFPU vadd.p");
	_runTest(runTest15, "VFPU vadd.t");
	_runTest(runTest16, "VFPU vadd.q");

	_runTest(runTest17, "VFPU vadd.q sequence");

	_runTest(runTest18, "LWC1");
	_runTest(runTest19, "SWC1");

	_runTest(runTest20, "memcpy (native)");
	_runTest(runTest21, "memset (native)");
	_runTest(runTest22, "strcpy (native)");
	

	_runTest(runTest23, "memcpy (non-native)");
	_runTest(runTest24, "memset (non-native)");
	_runTest(runTest25, "strcpy (non-native)");
	
	_runTest(runTest26, "syscall, fast, no params");
	_runTest(runTest27, "syscall, fast, one param");
	_runTest(runTest28, "jalr");

	//_runTest(runTest29, "zlib", 9999);
	
	eprintf("score/total ms (the lower the better): %d\n", sumDurationMillis);
}


int main(int argc, char *argv[])
{
	runTest();

	sceKernelExitGame();
	return 0;
}
