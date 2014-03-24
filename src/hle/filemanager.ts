module hle {
	export class Device {
		cwd: string = '';

		constructor(public name: string, public vfs: hle.vfs.Vfs) {
		}

		open(uri: Uri, flags: number, mode: number) {
			var entry = this.vfs.open(uri.pathWithoutDevice);
			return entry;
		}
	}

	export class HleFile {
		cursor = 0;

		constructor(public entry: vfs.VfsEntry) {
		}

		close() {
			this.entry.close();
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
			return this.path.contains(':');
		}

		append(that: Uri) {
			if (that.isAbsolute) return that;
			return new Uri(this.path + '/' + that.path);
		}
	}

	export class FileManager {
		private devices: StringDictionary<Device> = {};
		cwd: Uri = new Uri('');

		chdir(cwd:string) {
			this.cwd = new Uri(cwd);
		}

		getDevice(name: string) {
			var device = this.devices[name];
			if (!device) throw(new Error(sprintf("Can't find device '%s'", name)));
			return device;
		}

		open(name: string, flags: number, mode: number) {
			var uri = this.cwd.append(new Uri(name));
			var entry = this.getDevice(uri.device).open(uri, flags, mode);
			return new HleFile(entry);
		}

		mount(device: string, vfs: hle.vfs.Vfs) {
			this.devices[device] = new Device(device, vfs);
		}
	}
}
