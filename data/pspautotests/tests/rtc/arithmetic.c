#include <common.h>
#include "rtc_common.h"

void checkRtcCompareTick() {
	printf("Checking sceRtcCompareTick\n");

	u64 tickbig1 = 62135596800000000ULL;
	u64 tickbig2 = 62135596800000000ULL;
	u64 ticksmall1 = 500;
	u64 ticksmall2 = 500;

	printf("big small :%d\n",sceRtcCompareTick(&tickbig1, &ticksmall1));
	printf("big big :%d\n",sceRtcCompareTick(&tickbig1, &tickbig2));
	printf("small big :%d\n",sceRtcCompareTick(&ticksmall1, &tickbig2));
	printf("small small :%d\n",sceRtcCompareTick(&ticksmall1, &ticksmall2));
}

void checkRtcTickAddTicks() {
	printf("Checking sceRtcTickAddTicks\n");

	u64 sourceTick = 62135596800000445ULL;
	u64 destTick = 0;
	pspTime pt;

	printf("62135596800000445 adding -62135596800000445 ticks:%d\n", sceRtcTickAddTicks(&destTick, &sourceTick,(u64)-62135596800000445ULL));
	printf("source tick %llu\n", sourceTick);
	sceRtcSetTick(&pt, &sourceTick);
	DumpPSPTime("",&pt);

	printf("dest tick %llu\n", destTick);
	sceRtcSetTick(&pt, &destTick);
	DumpPSPTime("",&pt);

	sourceTick = 62135596800000445ULL;
	destTick = 0;

	printf("62135596800000445 adding +62135596800000445 ticks: %d\n", sceRtcTickAddTicks(&destTick, &sourceTick, sourceTick));
	sceRtcSetTick(&pt, &sourceTick);
	printf("source tick %llu\n", sourceTick);
	DumpPSPTime("",&pt);

	printf("dest tick%llu\n", destTick);
	sceRtcSetTick(&pt, &destTick);
	DumpPSPTime("",&pt);

	sourceTick = 62135596800000445ULL;
	destTick = 0;

	printf("62135596800000445 adding +621355968000 ticks: %d\n", sceRtcTickAddTicks(&destTick, &sourceTick, 621355968000ULL));
	printf("source tick %llu\n", sourceTick);
	sceRtcSetTick(&pt, &sourceTick);
	DumpPSPTime("",&pt);

	printf("dest tick %llu\n", destTick);
	sceRtcSetTick(&pt, &destTick);
	DumpPSPTime("",&pt);

}

typedef enum {
	RTC_ADD_YEARS,
	RTC_ADD_MONTHS,
	RTC_ADD_DAYS,
	RTC_ADD_HOURS,
	RTC_ADD_MINUTES,
	RTC_ADD_SECONDS,
	RTC_ADD_MICROS,
	RTC_ADD_WEEKS,
} RtcAddType;

void checkAddDateValue(int year, int month, int day, int hour, int min, int sec, int micro, RtcAddType type, long long value_add) {
	pspTime pt;
	u64 sourceTick = 0x1337;

	FillPSPTime(&pt,year, month, day, hour, min, sec, micro);
	sceRtcGetTick(&pt, &sourceTick);
	u64 destTick = 0x1337;
	int result = -1;

	switch (type) {
	case RTC_ADD_YEARS:
		printf("Add %lld years: ", value_add);
		DumpPSPTimeOnly(&pt);
		result = sceRtcTickAddYears(&destTick, &sourceTick, value_add);
		break;
	case RTC_ADD_MONTHS:
		printf("Add %lld months: ", value_add);
		DumpPSPTimeOnly(&pt);
		result = sceRtcTickAddMonths(&destTick, &sourceTick, value_add);
		break;
	case RTC_ADD_DAYS:
		printf("Add %lld days: ", value_add);
		DumpPSPTimeOnly(&pt);
		result = sceRtcTickAddDays(&destTick, &sourceTick, value_add);
		break;
	case RTC_ADD_HOURS:
		printf("Add %lld hours: ", value_add);
		DumpPSPTimeOnly(&pt);
		result = sceRtcTickAddHours(&destTick, &sourceTick, value_add);
		break;
	case RTC_ADD_MINUTES:
		printf("Add %lld minutes: ", value_add);
		DumpPSPTimeOnly(&pt);
		result = sceRtcTickAddMinutes(&destTick, &sourceTick, value_add);
		break;
	case RTC_ADD_SECONDS:
		printf("Add %lld seconds: ", value_add);
		DumpPSPTimeOnly(&pt);
		result = sceRtcTickAddSeconds(&destTick, &sourceTick, value_add);
		break;
	case RTC_ADD_MICROS:
		printf("Add %lld microseconds: ", value_add);
		DumpPSPTimeOnly(&pt);
		result = sceRtcTickAddMicroseconds(&destTick, &sourceTick, value_add);
		break;
	case RTC_ADD_WEEKS:
		printf("Add %lld weeks: ", value_add);
		DumpPSPTimeOnly(&pt);
		result = sceRtcTickAddWeeks(&destTick, &sourceTick, value_add);
		break;
	default:
		break;
	}

	if (result != 0) {
		printf(" -> ERROR %08x\n", result);
	} else {
		printf(" -> ");
		sceRtcSetTick(&pt, &destTick);
		DumpPSPTimeOnly(&pt);
		printf("\n");
	}
}

void checkRtcTickAddMicroseconds() {
	printf("Checking sceRtcTickAddMicroseconds\n");

	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MICROS, -2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MICROS, 2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MICROS, -62135596800000445LL);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MICROS, 62135596800000445LL);
	checkAddDateValue(1, 1, 1, 0, 0, 0, 10, RTC_ADD_MICROS, -10);
	checkAddDateValue(1, 1, 1, 0, 0, 0, 10, RTC_ADD_MICROS, -11);
	checkAddDateValue(9999, 12, 31, 23, 59, 59, 99999998, RTC_ADD_MICROS, 1);
	checkAddDateValue(9999, 12, 31, 23, 59, 59, 99999998, RTC_ADD_MICROS, 2);
}

void checkRtcTickAddSeconds() {
	printf("Checking sceRtcTickAddSeconds\n");

	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_SECONDS, -2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_SECONDS, 2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_SECONDS, -62135596800000445LL);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_SECONDS, 62135596800000445LL);
	checkAddDateValue(1, 1, 1, 0, 0, 10, 0, RTC_ADD_SECONDS, -10);
	checkAddDateValue(1, 1, 1, 0, 0, 10, 0, RTC_ADD_SECONDS, -11);
	checkAddDateValue(9999, 12, 31, 23, 59, 50, 0, RTC_ADD_SECONDS, 9);
	checkAddDateValue(9999, 12, 31, 23, 59, 50, 0, RTC_ADD_SECONDS, 10);

	int i;
	for (i = 0; i < 70; i++) {
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_SECONDS, -i);
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_SECONDS, +i);
	}
}

void checkRtcTickAddMinutes() {
	printf("Checking sceRtcTickAddMinutes\n");

	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MINUTES, -2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MINUTES, 2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MINUTES, -62135596800000445LL);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MINUTES, 62135596800000445LL);
	checkAddDateValue(1, 1, 1, 0, 10, 0, 0, RTC_ADD_MINUTES, -10);
	checkAddDateValue(1, 1, 1, 0, 10, 0, 0, RTC_ADD_MINUTES, -11);
	checkAddDateValue(9999, 12, 31, 23, 50, 0, 0, RTC_ADD_MINUTES, 9);
	checkAddDateValue(9999, 12, 31, 23, 50, 0, 0, RTC_ADD_MINUTES, 10);

	int i;
	for (i = 0; i < 70; i++) {
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MINUTES, -i);
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MINUTES, +i);
	}
}

void checkRtcTickAddHours() {
	printf("Checking sceRtcTickAddHours\n");

	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_HOURS, -2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_HOURS, 2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_HOURS, -62135596800000445LL);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_HOURS, 62135596800000445LL);
	checkAddDateValue(1, 1, 1, 10, 0, 0, 0, RTC_ADD_HOURS, -10);
	checkAddDateValue(1, 1, 1, 10, 0, 0, 0, RTC_ADD_HOURS, -11);
	checkAddDateValue(9999, 12, 31, 20, 0, 0, 0, RTC_ADD_HOURS, 3);
	checkAddDateValue(9999, 12, 31, 20, 0, 0, 0, RTC_ADD_HOURS, 4);
	
	int i;
	for (i = 0; i < 30; i++) {
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_HOURS, -i);
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_HOURS, +i);
	}
}

void checkRtcTickAddDays() {
	printf("Checking sceRtcTickAddDays\n");

	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_DAYS, -2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_DAYS, 2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_DAYS, -62135596800000445LL);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_DAYS, 62135596800000445LL);
	checkAddDateValue(1, 1, 10, 0, 0, 0, 0, RTC_ADD_DAYS, -9);
	checkAddDateValue(1, 1, 10, 0, 0, 0, 0, RTC_ADD_DAYS, -10);
	checkAddDateValue(9999, 12, 20, 0, 0, 0, 0, RTC_ADD_DAYS, 11);
	checkAddDateValue(9999, 12, 20, 0, 0, 0, 0, RTC_ADD_DAYS, 12);
	
	int i;
	for (i = 0; i < 35; i++) {
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_DAYS, -i);
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_DAYS, +i);
	}
}

void checkRtcTickAddWeeks() {
	printf("Checking sceRtcTickAddWeeks\n");

	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_WEEKS, -2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_WEEKS, 2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_WEEKS, -62135596800000445LL);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_WEEKS, 62135596800000445LL);
	checkAddDateValue(1, 1, 8, 0, 0, 0, 0, RTC_ADD_WEEKS, -1);
	checkAddDateValue(1, 1, 8, 0, 0, 0, 0, RTC_ADD_WEEKS, -2);
	checkAddDateValue(9999, 12, 20, 0, 0, 0, 0, RTC_ADD_WEEKS, 1);
	checkAddDateValue(9999, 12, 20, 0, 0, 0, 0, RTC_ADD_WEEKS, 2);
	
	int i;
	for (i = 0; i < 55; i++) {
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_WEEKS, -i);
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_WEEKS, +i);
	}
}

void checkRtcTickAddMonths() {
	printf("Checking sceRtcTickAddMonths\n");

	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MONTHS, -2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MONTHS, 2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MONTHS, -62135596800000445LL);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MONTHS, 62135596800000445LL);
	checkAddDateValue(1, 2, 1, 0, 0, 0, 0, RTC_ADD_MONTHS, -1);
	checkAddDateValue(1, 2, 1, 0, 0, 0, 0, RTC_ADD_MONTHS, -2);
	checkAddDateValue(9999, 11, 1, 0, 0, 0, 0, RTC_ADD_MONTHS, 1);
	checkAddDateValue(9999, 11, 1, 0, 0, 0, 0, RTC_ADD_MONTHS, 2);

	int i;
	for (i = 0; i < 15; i++) {
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MONTHS, -i);
		checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_MONTHS, +i);
	}
}

void checkRtcTickAddYears() {
	printf("Checking checkRtcTickAddYears\n");

	// Leap days.
	checkAddDateValue(2012, 2, 29, 0, 0, 0, 445, RTC_ADD_YEARS, 1);
	checkAddDateValue(2012, 2, 29, 0, 0, 0, 445, RTC_ADD_YEARS, 4);

	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_YEARS, -2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_YEARS, -1969);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_YEARS, -1968);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_YEARS, 2000);
	checkAddDateValue(1970, 1, 1, 0, 0, 0, 445, RTC_ADD_YEARS, -20);
	checkAddDateValue(10, 1, 1, 0, 0, 0, 0, RTC_ADD_YEARS, -8);		// Check limit down
	checkAddDateValue(10, 1, 1, 0, 0, 0, 0, RTC_ADD_YEARS, -9);
	checkAddDateValue(10, 1, 1, 0, 0, 0, 0, RTC_ADD_YEARS, -10);
	checkAddDateValue(9998, 1, 1, 0, 0, 0, 0, RTC_ADD_YEARS, 1);	// Check limit up
	checkAddDateValue(9998, 1, 1, 0, 0, 0, 0, RTC_ADD_YEARS, 2);
	
	// Check year range.
	int y;
	for (y = 1850; y <= 2300; y += 50) {
		checkAddDateValue(y, 1, 1, 0, 0, 0, 0, RTC_ADD_YEARS, 1);
	}
}


int main(int argc, char **argv) {
	checkRtcCompareTick();
	printf("\n");
	checkRtcTickAddTicks();
	printf("\n");
	checkRtcTickAddMicroseconds();
	printf("\n");
	checkRtcTickAddSeconds();
	printf("\n");
	checkRtcTickAddMinutes();
	printf("\n");
	checkRtcTickAddHours();
	printf("\n");
	checkRtcTickAddWeeks();
	printf("\n");
	checkRtcTickAddDays();
	printf("\n");
	checkRtcTickAddMonths();
	printf("\n");
	checkRtcTickAddYears();
	return 0;
}