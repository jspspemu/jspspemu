import { SceKernelErrors } from '../SceKernelErrors';
import {AcceptCallbacks, PromiseFast, Signal1} from "../../global/utils";
import {EmulatorContext} from "../../emu/context";
import {I32, nativeFunction, STRING, U32} from "../utils";

export class sceUmdUser {
	constructor(private context: EmulatorContext) { }

	callbackIds = <number[]>[];
	signal = new Signal1<number>();

	@nativeFunction(0xAEE7404D, 150)
	@U32 sceUmdRegisterUMDCallBack(@I32 callbackId: number) {
		this.callbackIds.push(callbackId);
		return 0;
	}

	@nativeFunction(0xBD2BDE07, 150)
    @U32 sceUmdUnRegisterUMDCallBack(@I32 callbackId: number) {
		if (!this.callbackIds.contains(callbackId)) return SceKernelErrors.ERROR_ERRNO_INVALID_ARGUMENT;
		this.callbackIds.remove(callbackId);
		return 0;
	}

	@nativeFunction(0x46EBB729, 150)
    @U32 sceUmdCheckMedium() {
		return UmdCheckMedium.Inserted;
	}

	_sceUmdWaitDriveStat(pspUmdState: number, acceptCallbacks: AcceptCallbacks) {
		this.context.callbackManager.executePendingWithinThread(this.context.threadManager.current);
		return 0;
		/*
		return new WaitingThreadInfo('sceUmdWaitDriveStatCB', this, new PromiseFast((resolve, reject) => {
			const signalCallback = this.signal.add((result) => {
				this.signal.remove(signalCallback);
				resolve();
			});
		}), AcceptCallbacks.YES);
		*/
	}

	@nativeFunction(0x8EF08FCE, 150)
    @U32 sceUmdWaitDriveStat(@U32 pspUmdState: number) {
		return this._sceUmdWaitDriveStat(pspUmdState, AcceptCallbacks.NO);
	}

	@nativeFunction(0x4A9E5E29, 150)
    @U32 sceUmdWaitDriveStatCB(@U32 pspUmdState: number, @U32 timeout: number) {
		return this._sceUmdWaitDriveStat(pspUmdState, AcceptCallbacks.YES);
	}

	private _notify(data: number) {
		this.signal.dispatch(data);

		this.callbackIds.forEach(callbackId => {
			//const state = this.context.threadManager.current.state;
			this.context.callbackManager.notify(callbackId, data);
		});
	}

	@nativeFunction(0xC6183D47, 150)
    @U32 sceUmdActivate(@I32 mode: number, @STRING drive: string) {
		this._notify(PspUmdState.PSP_UMD_READABLE | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_PRESENT);
		return 0;
	}

	@nativeFunction(0xE83742BA, 150)
    @U32 sceUmdDeactivate(@I32 mode: number, @STRING drive: string) {
		this._notify(PspUmdState.PSP_UMD_READABLE | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_PRESENT);
		return 0;
	}

	@nativeFunction(0x6B4A146C, 150)
    @U32 sceUmdGetDriveStat() {
		return PspUmdState.PSP_UMD_PRESENT | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_READABLE;
	}

	@nativeFunction(0x56202973, 150)
    @U32 sceUmdWaitDriveStatWithTimer(@U32 state: number, @U32 timeout: number) {
		return PromiseFast.resolve(0);
	}

	@nativeFunction(0x20628E6F, 150)
    @U32 sceUmdGetErrorStat() {
		//console.warn('called sceUmdGetErrorStat!');
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
