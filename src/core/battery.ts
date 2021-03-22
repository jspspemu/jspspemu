export class Battery {
	public charging: boolean;
	public level: number;
	public lifetime: number;
	
	get isLowBattery() {
		return this.level < 0.22;
	}
	
	get chargingType() {
		return <ChargingEnum>(+this.charging);
	}
	
	get iconStatus() {
        const level = this.level;
        if (level < 0.15) return BatteryStatusEnum.VeryLow;
		if (level < 0.30) return BatteryStatusEnum.Low;
		if (level < 0.80) return BatteryStatusEnum.PartiallyFilled;
		return BatteryStatusEnum.FullyFilled;
	}
}

export enum ChargingEnum {
	NotCharging = 0,
	Charging = 1,
}

export enum BatteryStatusEnum {
	VeryLow = 0,
	Low = 1,
	PartiallyFilled = 2,
	FullyFilled = 3,
}

export interface BatteryInfo {
	charging: boolean;
	level: number;
	lifetime: number;
}

