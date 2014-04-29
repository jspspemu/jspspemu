export class PspRtc {
	getCurrentUnixSeconds() {
		return new Date().getTime() / 1000;
	}

	getCurrentUnixMicroseconds() {
		return new Date().getTime() * 1000;
	}

	getClockMicroseconds() {
		return (performance.now() * 1000) >>> 0;
	}

	getDayOfWeek(year: number, month: number, day: number) {
		return new Date(year, month - 1, day).getDay();
	}

	getDaysInMonth(year: number, month: number) {
		return new Date(year, month, 0).getDate();
	}
}
