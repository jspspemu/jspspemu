module hle.modules {
	export class IoFileMgrForUser {
		constructor(private context: EmulatorContext) { }

		sceIoDevctl = createNativeFunction(0x54F5FB11, 150, 'uint', 'string/uint/uint/int/uint/int', this, (deviceName: string, command: number, inputPointer: number, inputLength: number, outputPointer: number, outputLength: number) => {
			var input = this.context.memory.getPointerStream(inputPointer, inputLength);
			var output = this.context.memory.getPointerStream(outputPointer, outputLength);
			/*
			public enum EmulatorDevclEnum : int
			{
				GetHasDisplay = 0x00000001,
				SendOutput = 0x00000002,
				IsEmulator = 0x00000003,
				SendCtrlData = 0x00000010,
				EmitScreenshot = 0x00000020,
			}
			*/

			switch (deviceName) {
				case 'emulator:': case 'kemulator:':
					switch (command) {
						case 1:
							output.writeInt32(0);
							//output.writeInt32(1);
							return 0;
							break;
						case 2:
							var str = input.readString(input.length);
							this.context.output += str;
							$('#output').append(str);
							//console.info();
							return 0;
							break;
					}
					break;
			}

			console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoDevctl("%s", %d, %08X, %d, %08X, %d)', deviceName, command, inputPointer, inputLength, outputPointer, outputLength));
			return 0;
		});


		sceIoDopen = createNativeFunction(0xB29DDF9C, 150, 'uint', 'string', this, (directoryPath: string) => {
			console.warn('Not implemented IoFileMgrForUser.sceIoDopen("' + directoryPath + '")');
			return 0;
		});

		sceIoDclose = createNativeFunction(0xEB092469, 150, 'uint', 'int', this, (fileId: number) => {
			console.warn('Not implemented IoFileMgrForUser.sceIoDclose');
			return 0;
		});

		fileUids = new UidCollection<hle.HleFile>(1);

		sceIoOpen = createNativeFunction(0x109F50BC, 150, 'int', 'string/int/int', this, (filename: string, flags: hle.vfs.FileOpenFlags, mode: hle.vfs.FileMode) => {
			console.info(sprintf('IoFileMgrForUser.sceIoOpen("%s", %d(%s), 0%o)', filename, flags, setToString(hle.vfs.FileOpenFlags, flags), mode));

			return this._sceIoOpen(filename, flags, mode);
		});

		private _sceIoOpen(filename: string, flags: hle.vfs.FileOpenFlags, mode: hle.vfs.FileMode) {
			return this.context.fileManager.openAsync(filename, flags, mode)
				.then(file => this.fileUids.allocate(file))
				.catch(e => SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND)
				;
		}

		sceIoOpenAsync = createNativeFunction(0x89AA9906, 150, 'int', 'string/int/int', this, (filename: string, flags: hle.vfs.FileOpenFlags, mode: hle.vfs.FileMode) => {
			console.info(sprintf('IoFileMgrForUser.sceIoOpenAsync("%s", %d(%s), 0%o)', filename, flags, setToString(hle.vfs.FileOpenFlags, flags), mode));

			return this._sceIoOpen(filename, flags, mode);
		});

		sceIoClose = createNativeFunction(0x810C4BC3, 150, 'int', 'int', this, (fileId: number) => {
			var file = this.fileUids.get(fileId);
			file.close();

			this.fileUids.remove(fileId);

			return 0;
		});

		sceIoWrite = createNativeFunction(0x42EC03AC, 150, 'int', 'int/uint/int', this, (fileId: number, inputPointer: number, inputLength: number) => {
			var input = this.context.memory.getPointerStream(inputPointer, inputLength);
			console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoWrite("%s")', input.readString(input.length)));
			//console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoWrite(%d, 0x%08X, %d)', fileId, inputPointer, inputLength));
			return inputLength;
		});

		sceIoRead = createNativeFunction(0x6A638D83, 150, 'int', 'int/uint/int', this, (fileId: number, outputPointer: number, outputLength: number) => {
			var file = this.fileUids.get(fileId);

			return file.entry.readChunkAsync(file.cursor, outputLength).then((readedData) => {
				file.cursor += readedData.byteLength;
				//console.log(new Uint8Array(readedData));
				this.context.memory.writeBytes(outputPointer, readedData);
				//console.info(sprintf('IoFileMgrForUser.sceIoRead(%d, %08X: %d) : cursor:%d ->%d', fileId, outputPointer, outputLength, file.cursor, readedData.byteLength));
				return readedData.byteLength;
			});
		});

		sceIoGetstat = createNativeFunction(0xACE946E8, 150, 'int', 'string/void*', this, (fileName: string, sceIoStatPointer: Stream) => {
			SceIoStat.struct.write(sceIoStatPointer, new SceIoStat());
			return this.context.fileManager.getStatAsync(fileName)
				.then(stat => {
					var stat2 = new SceIoStat();
					stat2.mode = <SceMode>parseInt('777', 8)
					stat2.size = stat.size;
					stat2.timeCreation = ScePspDateTime.fromDate(stat.timeCreation);
					stat2.timeLastAccess = ScePspDateTime.fromDate(stat.timeLastAccess);
					stat2.timeLastModification = ScePspDateTime.fromDate(stat.timeLastModification);
					stat2.attributes = 0;
					stat2.attributes |= IOFileModes.CanExecute;
					stat2.attributes |= IOFileModes.CanRead;
					stat2.attributes |= IOFileModes.CanWrite;
					if (stat.isDirectory) {
						stat2.attributes |= IOFileModes.Directory;
					} else {
						stat2.attributes |= IOFileModes.File;
					}
					console.info(sprintf('IoFileMgrForUser.sceIoGetstat("%s")', fileName), stat2);
					SceIoStat.struct.write(sceIoStatPointer, stat2);
					return 0;
				})
				.catch(error => SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND)
			;
		});

		sceIoChdir = createNativeFunction(0x55F4717D, 150, 'int', 'string', this, (path: string) => {
			console.info(sprintf('IoFileMgrForUser.sceIoChdir("%s")', path));
			this.context.fileManager.chdir(path);
			return 0;
		});

		sceIoLseek = createNativeFunction(0x27EB27B8, 150, 'long', 'int/long/int', this, (fileId: number, offset: Integer64, whence: number) => {
			var result = this._seek(fileId, offset.number, whence);
			//console.info(sprintf('IoFileMgrForUser.sceIoLseek(%d, %d, %d): %d', fileId, offset, whence, result));
			return Integer64.fromNumber(result);
		});

		sceIoLseek32 = createNativeFunction(0x68963324, 150, 'int', 'int/int/int', this, (fileId: number, offset: number, whence: number) => {
			var result = this._seek(fileId, offset, whence);
			//console.info(sprintf('IoFileMgrForUser.sceIoLseek32(%d, %d, %d) : %d', fileId, offset, whence, result));
			return result;
		});

		_seek(fileId: number, offset: number, whence: number) {
			var file = this.fileUids.get(fileId);
			switch (whence) {
				case SeekAnchor.Set:
					file.cursor = 0 + offset;
					break;
				case SeekAnchor.Cursor:
					file.cursor = file.cursor + offset;
					break;
				case SeekAnchor.End:
					file.cursor = file.entry.size + offset;
					break;
			}
			return file.cursor;
		}
	}
}
