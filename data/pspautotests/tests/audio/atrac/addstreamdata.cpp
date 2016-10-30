#include "shared.h"

void testAddStreamData(const char *title, int atracID, u32 bytes) {
	checkpoint("%s: %08x", title, sceAtracAddStreamData(atracID, bytes));
}

extern "C" int main(int argc, char *argv[]) {
	LoadAtrac();

	Atrac3File at3("sample.at3");
	at3.Require();

	int fullID = sceAtracSetDataAndGetID(at3.Data(), at3.Size());
	int halfID = sceAtracSetHalfwayBufferAndGetID(at3.Data(), at3.Size() / 2, at3.Size());
	int emptyID = sceAtracGetAtracID(0x1000);

	checkpointNext("Atrac IDs:");
	testAddStreamData("  Invalid", -1, 0x100);
	testAddStreamData("  Empty", emptyID, 0x100);
	testAddStreamData("  Fully buffered", fullID, 0x100);
	testAddStreamData("  Half buffered", halfID, 0x100);

	checkpointNext("Bytes:");
	testAddStreamData("  Zero", halfID, 0);
	testAddStreamData("  One", halfID, 1);
	testAddStreamData("  Size", halfID, at3.Size());
	testAddStreamData("  Remaining", halfID, at3.Size() / 2 - 0x101);
	testAddStreamData("  Zero after remaining", halfID, 0);

	sceAtracReleaseAtracID(emptyID);
	sceAtracReleaseAtracID(halfID);
	sceAtracReleaseAtracID(fullID);

	UnloadAtrac();
	return 0;
}