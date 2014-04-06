module hle {
	export class Device {
		cwd: string = '';

		constructor(public name: string, public vfs: hle.vfs.Vfs) {
		}

		openAsync(uri: Uri, flags: hle.vfs.FileOpenFlags, mode: hle.vfs.FileMode) {
			return this.vfs.openAsync(uri.pathWithoutDevice, flags, mode);
		}

		getStatAsync(uri: Uri) {
			return this.vfs.getStatAsync(uri.pathWithoutDevice);
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

		openAsync(name: string, flags: hle.vfs.FileOpenFlags, mode: hle.vfs.FileMode) {
			var uri = this.cwd.append(new Uri(name));
			return this.getDevice(uri.device).openAsync(uri, flags, mode).then(entry => new HleFile(entry));
		}

		getStatAsync(name:string) {
			var uri = this.cwd.append(new Uri(name));
			return this.getDevice(uri.device).getStatAsync(uri);
		}

		mount(device: string, vfs: hle.vfs.Vfs) {
			this.devices[device] = new Device(device, vfs);
		}
	}
}
