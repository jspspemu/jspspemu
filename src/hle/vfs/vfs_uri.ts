module hle.vfs {
	export class UriVfs extends Vfs {
		constructor(public baseUri: string) {
			super();
		}

		openAsync(path: string, flags: FileOpenFlags, mode: FileMode): Promise<VfsEntry> {
			if (flags & FileOpenFlags.Write) {
				return Promise.resolve(new MemoryVfsEntry(new ArrayBuffer(0)));
			}

			return downloadFileAsync(this.baseUri + '/' + path).then((data) => new MemoryVfsEntry(data));
		}

		openDirectoryAsync(path: string) {
			return Promise.resolve(new MemoryVfsEntry(new ArrayBuffer(0)));
		}

		getStatAsync(path: string): Promise<VfsStat> {
			return statFileAsync(this.baseUri + '/' + path).then(() => {
				return {
					size: 0,
					isDirectory: false,
					timeCreation: new Date(),
					timeLastAccess: new Date(),
					timeLastModification: new Date(),
				};
			});
		}
	}
}