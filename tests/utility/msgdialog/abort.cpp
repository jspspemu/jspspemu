#define sceUtilityMsgDialogShutdownStart sceUtilityMsgDialogShutdownStart_WRONG
#define sceUtilityMsgDialogUpdate sceUtilityMsgDialogUpdate_WRONG

#include <common.h>
#include <pspgu.h>
#include <pspdisplay.h>
#include <psputility.h>
#include <psputility_msgdialog.h>
#include <pspkernel.h>

#undef sceUtilityMsgDialogShutdownStart
#undef sceUtilityMsgDialogUpdate

#define SCE_UTILITY_MSGDIALOG_SIZE_V1					572
#define SCE_UTILITY_MSGDIALOG_SIZE_V2					580
#define SCE_UTILITY_MSGDIALOG_SIZE_V3					708

typedef struct {
	pspUtilityDialogCommon base;
	int result;
	int mode;
	int errorNum;
	char message[512];
	// End of request V1 (Size 572)
	u32 options;
	u32 buttonPressed;
	// End of request V2 (Size 580)
	char okayButton[64];
	char cancelButton[64];
	// End of request V3 (Size 708)
} pspUtilityMsgDialogParamsV3;

extern "C" {
	int sceUtilityMsgDialogUpdate(int n);
	int sceUtilityMsgDialogShutdownStart();
}

unsigned int __attribute__((aligned(16))) list[262144];

void init() {
	sceGuInit();
	sceGuStart(GU_DIRECT, list);
	sceGuDrawBuffer(GU_PSM_8888, 0, 512);
	sceGuDispBuffer(480, 272, 0, 512);
	sceGuScissor(0, 0, 480, 272);
	sceGuEnable(GU_SCISSOR_TEST);
	sceGuFinish();
	sceGuSync(0, 0);
 
	sceDisplaySetMode(0, 480, 272);
	sceDisplayWaitVblankStart();
	sceGuDisplay(1);
}

void initDialog(pspUtilityMsgDialogParamsV3 *dialog, int ver) {
	memset(dialog, 0, sizeof(pspUtilityMsgDialogParamsV3));
	if (ver == 1) {
		dialog->base.size = SCE_UTILITY_MSGDIALOG_SIZE_V1;
	} else if (ver == 2) {
		dialog->base.size = SCE_UTILITY_MSGDIALOG_SIZE_V2;
	} else {
		dialog->base.size = SCE_UTILITY_MSGDIALOG_SIZE_V3;
	}
	dialog->base.language = 1;
	dialog->base.buttonSwap = 1;
	dialog->base.soundThread = 0x23;
	dialog->base.graphicsThread = 0x24;
	dialog->base.accessThread = 0x25;
	dialog->base.fontThread = 0x26;
	dialog->mode = PSP_UTILITY_MSGDIALOG_MODE_TEXT;
	strcpy(dialog->message, "11111111111111111111111111111111111112111111111111111111111");

	dialog->result = 0x1337;
}

extern "C" int main(int argc, char *argv[]) {
	pspUtilityMsgDialogParamsV3 dialog;
	initDialog(&dialog, 3);

	checkpointNext("sceUtilityMsgDialogAbort:");
	checkpoint("  Before init: %08x", sceUtilityMsgDialogAbort());
	checkpoint("  InitStart: %08x", sceUtilityMsgDialogInitStart((pspUtilityMsgDialogParams *) &dialog));
	checkpoint("  During init: %08x", sceUtilityMsgDialogAbort());

	int frame = 0;
	while ((u32)sceUtilityMsgDialogGetStatus() < 3 && frame++ < 100000) {
		sceUtilityMsgDialogUpdate(1);
		sceDisplayWaitVblankStart();
		if (frame == 60) {
			checkpoint("  Abort: %08x", sceUtilityMsgDialogAbort());
			checkpoint("  Twice: %08x", sceUtilityMsgDialogAbort());
			checkpoint("  GetStatus: %08x", sceUtilityMsgDialogGetStatus());
			checkpoint("  Update: %08x", sceUtilityMsgDialogUpdate(1));
			checkpoint("  GetStatus: %08x", sceUtilityMsgDialogGetStatus());
			checkpoint("  Third abort: %08x", sceUtilityMsgDialogAbort());
		}
	}

	checkpoint("  ShutdownStart: %08x", sceUtilityMsgDialogShutdownStart());
	checkpoint("  During shutdown: %08x", sceUtilityMsgDialogAbort());
	while (sceUtilityMsgDialogGetStatus() == 3 && frame++ < 100000) {
		continue;
	}
	checkpoint("  After shutdown: %08x", sceUtilityMsgDialogAbort());
	sceKernelDelayThread(500000);
	checkpoint("  GetStatus: %08x", sceUtilityMsgDialogGetStatus());
	checkpoint("  After reset: %08x", sceUtilityMsgDialogAbort());

	return 0;
}