///<reference path="../../global.d.ts" />

import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import SceKernelErrors = require('../SceKernelErrors');

export class sceUmdUser {
	constructor(private context: _context.EmulatorContext) { }

	callbackIds = <number[]>[];
	signal = new Signal<number>();

	sceUmdRegisterUMDCallBack = createNativeFunction(0xAEE7404D, 150, 'uint', 'int', this, (callbackId: number) => {
		this.callbackIds.push(callbackId);
		return 0;
	});

	sceUmdUnRegisterUMDCallBack = createNativeFunction(0xBD2BDE07, 150, 'uint', 'int', this, (callbackId: number) => {
		if (!this.callbackIds.contains(callbackId)) return SceKernelErrors.ERROR_ERRNO_INVALID_ARGUMENT;
		this.callbackIds.remove(callbackId);
		return 0;
	});

	sceUmdCheckMedium = createNativeFunction(0x46EBB729, 150, 'uint', '', this, () => {
		return UmdCheckMedium.Inserted;
	});

	_sceUmdWaitDriveStat(pspUmdState: number, acceptCallbacks: AcceptCallbacks) {
		this.context.callbackManager.executePendingWithinThread(this.context.threadManager.current);
		return 0;
		/*
		return new WaitingThreadInfo('sceUmdWaitDriveStatCB', this, new Promise2((resolve, reject) => {
			var signalCallback = this.signal.add((result) => {
				this.signal.remove(signalCallback);
				resolve();
			});
		}), AcceptCallbacks.YES);
		*/
	}

	sceUmdWaitDriveStat = createNativeFunction(0x8EF08FCE, 150, 'uint', 'uint', this, (pspUmdState: number) => {
		return this._sceUmdWaitDriveStat(pspUmdState, AcceptCallbacks.NO);
	});

	sceUmdWaitDriveStatCB = createNativeFunction(0x4A9E5E29, 150, 'uint', 'uint/uint', this, (pspUmdState: number, timeout: number) => {
		return this._sceUmdWaitDriveStat(pspUmdState, AcceptCallbacks.YES);
	});

	private _notify(data: number) {
		this.signal.dispatch(data);

		this.callbackIds.forEach(callbackId => {
			//var state = this.context.threadManager.current.state;
			this.context.callbackManager.notify(callbackId, data);
		});
	}

	sceUmdActivate = createNativeFunction(0xC6183D47, 150, 'uint', 'int/string', this, (mode: number, drive: string) => {
		this._notify(PspUmdState.PSP_UMD_READABLE | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_PRESENT);
		return 0;
	});

	sceUmdDeactivate = createNativeFunction(0xE83742BA, 150, 'uint', 'int/string', this, (mode: number, drive: string) => {
		this._notify(PspUmdState.PSP_UMD_READABLE | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_PRESENT);
		return 0;
	});

	sceUmdGetDriveStat = createNativeFunction(0x6B4A146C, 150, 'uint', '', this, () => {
		return PspUmdState.PSP_UMD_PRESENT | PspUmdState.PSP_UMD_READY | PspUmdState.PSP_UMD_READABLE;
	});

	sceUmdWaitDriveStatWithTimer = createNativeFunction(0x56202973, 150, 'uint', 'uint/uint', this, (state: number, timeout: number) => {
		return Promise2.resolve(0);
	});

	sceUmdGetErrorStat = createNativeFunction(0x20628E6F, 150, 'uint', '', this, () => {
		console.warn('called sceUmdGetErrorStat!');
		return Promise2.resolve(0);
	});
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
