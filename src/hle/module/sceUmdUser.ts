import { SceKernelErrors } from '../SceKernelErrors';
import {AcceptCallbacks, PromiseFast, Signal1} from "../../global/utils";
import {EmulatorContext} from "../../emu/context";
import {nativeFunction} from "../utils";

export class sceUmdUser {
	constructor(private context: EmulatorContext) { }

	callbackIds = <number[]>[];
	signal = new Signal1<number>();

	@nativeFunction(0xAEE7404D, 150, 'uint', 'int')
	sceUmdRegisterUMDCallBack(callbackId: number) {
		this.callbackIds.push(callbackId);
		return 0;
	}

	@nativeFunction(0xBD2BDE07, 150, 'uint', 'int')
	sceUmdUnRegisterUMDCallBack(callbackId: number) {
		if (!this.callbackIds.contains(callbackId)) return SceKernelErrors.ERROR_ERRNO_INVALID_ARGUMENT;
		this.callbackIds.remove(callbackId);
		return 0;
	}

	@nativeFunction(0x46EBB729, 150, 'uint', '')
	sceUmdCheckMedium() {
		return UmdCheckMedium.Inserted;
	}

	_sceUmdWaitDriveStat(pspUmdState: number, acceptCallbacks: AcceptCallbacks) {
		this.context.callbackManager.executePendingWithinThread(this.context.threadManager.current);
		return 0;
		/*
		return new WaitingThreadInfo('sceUmdWaitDriveStatCB', this, new PromiseFast((resolve, reject) => {
			var signalCallback = this.signal.add((result) => {
				this.signal.remove(signalCallback);
				resolve();
			});
		}), AcceptCallbacks.YES);
		*/
	}

	@nativeFunction(0x8EF08FCE, 150, 'uint', 'uint')
	sceUmdWaitDriveStat(pspUmdState: number) {
		return this._sceUmdWaitDriveStat(pspUmdState, AcceptCallbacks.NO);
	}

	@nativeFunction(0x4A9E5E29, 150, 'uint', 'uint/uint')
	sceUmdWaitDriveStatCB(pspUmdState: number, timeout: number) {
		return this._sceUmdWaitDriveStat(pspUmdState, AcceptCallbacks.YES);
	}

	private _notify(data: number) {
		this.signal.dispatch(data);

		this.callbackIds.forEach(callbackId => {
			//var state = this.context.threadManager.current.state;
			this.context.callbackManager.notify(callbackId, data);
		});
	}

	@nativeFunction(0xC6183D47, 150, 'uint', 'int/string')
	sceUmdActivate(mode: number, drive: string) {
		this._notify(PspUmdState.PSP_UMD_READABLE | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_PRESENT);
		return 0;
	}

	@nativeFunction(0xE83742BA, 150, 'uint', 'int/string')
	sceUmdDeactivate(mode: number, drive: string) {
		this._notify(PspUmdState.PSP_UMD_READABLE | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_PRESENT);
		return 0;
	}

	@nativeFunction(0x6B4A146C, 150, 'uint', '')
	sceUmdGetDriveStat() {
		return PspUmdState.PSP_UMD_PRESENT | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_READABLE;
	}

	@nativeFunction(0x56202973, 150, 'uint', 'uint/uint')
	sceUmdWaitDriveStatWithTimer(state: number, timeout: number) {
		return PromiseFast.resolve(0);
	}

	@nativeFunction(0x20628E6F, 150, 'uint', '')
	sceUmdGetErrorStat() {
		console.warn('called sceUmdGetErrorStat!');
		return PromiseFast.resolve(0);
	}
}

enum UmdCheckMedium {
	NoDisc = 0,
	Inserted = 1,
}

enum PspUmdState {
	PSP_UMD_INIT = 0x00,
	PSP_UMD_NOT_PRESENT = 0x01,
	PSP_UMD_PRESENT = 0x02,
	PSP_UMD_CHANGED = 0x04,
	PSP_UMD_NOT_READY = 0x08,
	PSP_UMD_READY = 0x10,
	PSP_UMD_READABLE = 0x20,
}
