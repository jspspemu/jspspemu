﻿import "../../global/utils"
import {Stream} from "../../global/stream";
import {PromiseFast, sprintf, StringDictionary} from "../../global/utils";
import {Integer64} from "../../global/int64";
import {FileMode, FileOpenFlags, Vfs, VfsEntry, VfsStat} from "../vfs/vfs";

export class Device {
	cwd: string = '';

	constructor(public name: string, public vfs: Vfs) {
	}

	devctlAsync(command: number, input: Stream, output: Stream) {
		return this.vfs.devctlAsync(command, input, output);
	}

	openAsync(uri: Uri, flags: FileOpenFlags, mode: FileMode) {
		return this.vfs.openAsync(uri.pathWithoutDevice, flags, mode);
	}

	openDirectoryAsync(uri: Uri) {
		return this.vfs.openDirectoryAsync(uri.pathWithoutDevice);
	}

	getStatAsync(uri: Uri) {
		return this.vfs.getStatAsync(uri.pathWithoutDevice);
	}

    getStatPromiseAsync(uri: Uri) {
        return this.vfs.getStatPromiseAsync(uri.pathWithoutDevice);
    }
}

export class HleFile {
	cursor = 0;

	private _asyncResult: Integer64|null = null;
	private _asyncPromise: PromiseFast<Integer64>|null = null;

	constructor(public entry: VfsEntry) {
	}

	get asyncResult() { return this._asyncResult; }

	get asyncOperation() {
		return this._asyncPromise;
	}

	startAsyncOperation() {
		this._asyncResult = null;
	}

	setAsyncOperation(operation: Integer64 | PromiseFast<Integer64> | Promise<Integer64>) {
		this._asyncResult = null;
		this._asyncPromise = PromiseFast.ensure(operation).thenFast((value) => {
			this._asyncResult = value;
			return value;
		});
	}

	setAsyncOperationNow(value: Integer64) {
		this._asyncResult = value;
		this._asyncPromise = PromiseFast.resolve(value);
	}

	close() {
		this.entry.close();
	}
}

export class HleDirectory {
	cursor = 0;

	constructor(public childs: VfsStat[]) {
	}

	read() {
		return this.childs[this.cursor++];
	}

	get left() {
		return this.childs.length - this.cursor;
	}

	close() {
	}
}

export class Uri {
	constructor(public path: string) {
	}

	get device() {
		return (this.path.split(':'))[0];
	}

	get pathWithoutDevice() {
		return (this.path.split(':'))[1];
	}

	get isAbsolute() {
		return this.path.indexOf(':') >= 0;
	}

	append(that: Uri) {
		if (that.isAbsolute) return that;
		return new Uri(`${this.path}/${that.path}`);
	}
}

export class FileManager {
	private devices: StringDictionary<Device> = {};
	cwd: Uri = new Uri('ms0:/');

	chdir(cwd:string) {
		this.cwd = new Uri(cwd);
	}

	getDevice(name: string) {
		name = name.replace(/:$/, '');
        const device = this.devices[name];
        if (!device) throw(new Error(sprintf("Can't find device '%s'", name)));
		return device;
	}

	openAsync(name: string, flags: FileOpenFlags, mode: FileMode) {
        const uri = this.cwd.append(new Uri(name));
        return this.getDevice(uri.device).openAsync(uri, flags, mode).thenFast(entry => new HleFile(entry));
	}

	devctlAsync(deviceName: string, command: number, input: Stream, output: Stream) {
		return this.getDevice(deviceName).devctlAsync(command, input, output);
	}

	openDirectoryAsync(name: string) {
        const uri = this.cwd.append(new Uri(name));
        return this.getDevice(uri.device).openDirectoryAsync(uri).thenFast(entry => {
			return entry.enumerateAsync().thenFast((items) => {
				entry.close();
				return new HleDirectory(items);
			});
		});
	}

	getStatAsync(name:string) {
        const uri = this.cwd.append(new Uri(name));
        return this.getDevice(uri.device).getStatAsync(uri);
	}

	mount(device: string, vfs: Vfs) {
		this.devices[device] = new Device(device, vfs);
		return this
	}
}
