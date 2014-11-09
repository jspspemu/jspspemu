/*
FPU Test. Originally from jpcsp project:
http://code.google.com/p/jpcsp/source/browse/trunk/demos/src/fputest/main.c
Modified to perform automated tests.
*/

#include <common.h>
#include <math.h>

#include <pspkernel.h>

float floatRelevantValues[] = {
	 -20000.5
};

int main(int argc, char *argv[]) {
	//asm volatile("dbreak\n" : : );
	//printf("FPU2 Test:\n");
	printf("%f\n", -20000.5);
	printf("%f\n", floatRelevantValues[0]);
	return 0;
}
