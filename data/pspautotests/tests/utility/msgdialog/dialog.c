#define sceUtilityMsgDialogShutdownStart sceUtilityMsgDialogShutdownStart_WRONG

#include <common.h>
#include <pspgu.h>
#include <pspdisplay.h>
#include <psputility.h>
#include <psputility_msgdialog.h>

#undef sceUtilityMsgDialogShutdownStart

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

int sceUtilityMsgDialogShutdownStart();

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

int getStatus(pspUtilityMsgDialogParamsV3 *dialog) {
	static int lastStatus = -1;
	static int c = 0;

	static int lastResult = -0x1337;

	int status = sceUtilityMsgDialogGetStatus();
	++c;
	if (status != lastStatus) {
		checkpoint("  GetStatus after %d: %08x", c, status);
		lastStatus = status;
		c = 0;
	}

	if (lastResult != dialog->result) {
		checkpoint("  Result -> %08x", dialog->result);
		lastResult = dialog->result;
	}

	return status;
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

void runDialog(const char *title, pspUtilityMsgDialogParamsV3 *dialog) {
	const int HOLD_FRAMES = 60;

	checkpointNext(title);

	checkpoint("  InitStart: %08x", sceUtilityMsgDialogInitStart((pspUtilityMsgDialogParams *) dialog));
	getStatus(dialog);

	int frame = 0;
	while ((u32)getStatus(dialog) < 3 && frame++ < 100000) {
		sceUtilityMsgDialogUpdate(1);
		sceDisplayWaitVblankStart();
		if (frame == HOLD_FRAMES) {
			checkpoint("  Abort: %08x", sceUtilityMsgDialogAbort());
		}
	}

	checkpoint("  ShutdownStart: %08x", sceUtilityMsgDialogShutdownStart());
	while (getStatus(dialog) == 3 && frame++ < 100000) {
		continue;
	}
	sceKernelDelayThread(500000);
	getStatus(dialog);
	getStatus(dialog);
}

int main(int argc, char *argv[]) {
	pspUtilityMsgDialogParamsV3 dialog;

	init();
	
	initDialog(&dialog, 1);
	runDialog("Normal - text v1", &dialog);
	
	initDialog(&dialog, 2);
	runDialog("Normal - text v2", &dialog);
	
	initDialog(&dialog, 3);
	runDialog("Normal - text v3", &dialog);
	
	initDialog(&dialog, 1);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_ERROR;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	runDialog("Normal - errorcode v1", &dialog);
	
	initDialog(&dialog, 2);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_ERROR;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	runDialog("Normal - errorcode v2", &dialog);
	
	initDialog(&dialog, 3);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_ERROR;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	runDialog("Normal - errorcode v3", &dialog);
	
	initDialog(&dialog, 1);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_TEXT;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	dialog.options |= PSP_UTILITY_MSGDIALOG_OPTION_TEXT | 0x200;
	runDialog("Normal - text v1 - bad options", &dialog);
	
	initDialog(&dialog, 2);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_TEXT;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	dialog.options |= PSP_UTILITY_MSGDIALOG_OPTION_TEXT | 0x200;
	runDialog("Normal - text v2 - bad options", &dialog);
	
	initDialog(&dialog, 3);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_TEXT;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	dialog.options |= PSP_UTILITY_MSGDIALOG_OPTION_TEXT | 0x200;
	runDialog("Normal - text v3 - bad options", &dialog);
	
	initDialog(&dialog, 1);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_ERROR;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	dialog.options |= PSP_UTILITY_MSGDIALOG_OPTION_TEXT | 0x200;
	runDialog("Normal - errorcode v1 - bad options", &dialog);
	
	initDialog(&dialog, 2);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_ERROR;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	dialog.options |= PSP_UTILITY_MSGDIALOG_OPTION_TEXT | 0x200;
	runDialog("Normal - errorcode v2 - bad options", &dialog);
	
	initDialog(&dialog, 3);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_ERROR;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	dialog.options |= PSP_UTILITY_MSGDIALOG_OPTION_TEXT | 0x200;
	runDialog("Normal - errorcode v3 - bad options", &dialog);

	initDialog(&dialog, 3);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_ERROR;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	strcpy(dialog.okayButton, "Hai");
	dialog.options |= PSP_UTILITY_MSGDIALOG_OPTION_TEXT | 0x20;
	runDialog("Normal - errorcode v3 - custom okay", &dialog);

	initDialog(&dialog, 3);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_TEXT;
	dialog.errorNum = SCE_KERNEL_ERROR_BADF;
	strcpy(dialog.cancelButton, "Iya");
	dialog.options |= PSP_UTILITY_MSGDIALOG_OPTION_TEXT | 0x20;
	runDialog("Normal - text v3 - custom cancel", &dialog);
	
	initDialog(&dialog, 1);
	dialog.mode = PSP_UTILITY_MSGDIALOG_MODE_ERROR;
	dialog.errorNum = 0;
	runDialog("Normal - invalid errorcode", &dialog);

	return 0;
}