import { BatteryInfo } from '../core/battery';
import {PromiseFast} from "../global/utils";
import {waitAsync} from "../global/async";

export interface BatteryManager {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
    //onchargingchange: any;
    //onchargingtimechange: any;
    //ondischargingtimechange: any;
    //onlevelchange: any;
}

export class Html5Battery {
    static instance: Html5Battery = null as any;
    private static promise: Promise<Html5Battery> = null as any;

    constructor(private manager: BatteryManager) {
        Html5Battery.instance = this;
    }

    get lifetime() {
        // Up to 10 hours, to avoid too high/infinite values
        if (this.manager != null) return Math.min(10 * 3600, this.manager.dischargingTime);
        return 3 * 3600;
    }

    get charging() {
        if (this.manager != null) return this.manager.charging;
        return true;
    }

    get level(): number {
        if (this.manager != null) return this.manager.level;
        return 1.0;
    }

    static async getAsync(): Promise<Html5Battery> {
        if (this.instance) return Promise.resolve(this.instance);
        if (this.promise) return this.promise;
        if ((<any>navigator).battery) return Promise.resolve(new Html5Battery((<any>navigator).battery));
        if ((<any>navigator).getBattery) {
            return this.promise = (async () => {
                const v = await (<any>navigator).getBattery()
                return new Html5Battery(v);
            })()
        }
        return Promise.resolve(new Html5Battery(null as any));
    }

    static async registerAndSetCallback(callback: (bi: BatteryInfo) => void) {
        await waitAsync(0)
        const battery = await Html5Battery.getAsync()
        function sendData(): void {
            callback(<BatteryInfo>{
                charging: battery.charging,
                level: battery.level,
                lifetime: battery.lifetime,
            });
        }
        setInterval(() => {
            sendData();
        }, 300);
        sendData();
    }
}


		
