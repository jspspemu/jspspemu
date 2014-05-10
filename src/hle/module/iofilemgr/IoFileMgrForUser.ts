import _utils = require('../../utils');
import _context = require('../../../context');
import createNativeFunction = _utils.createNativeFunction;
import _vfs = require('../../vfs');
import _structs = require('../../structs');
import SceKernelErrors = require('../../SceKernelErrors');

import _manager = require('../../manager'); _manager.Thread;
import Thread = _manager.Thread;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;
import VfsStat = _vfs.VfsStat;

export class IoFileMgrForUser {
	constructor(private context: _context.EmulatorContext) { }

	sceIoDevctl = createNativeFunction(0x54F5FB11, 150, 'uint', 'string/uint/uint/int/uint/int', this, (deviceName: string, command: number, inputPointer: number, inputLength: number, outputPointer: number, outputLength: number) => {
		var input = this.context.memory.getPointerStream(inputPointer, inputLength);
		var output = this.context.memory.getPointerStream(outputPointer, outputLength);

		return this.context.fileManager.devctlAsync(deviceName, command, input, output);
	});


	fileUids = new UidCollection<_manager.HleFile>(3);
	directoryUids = new UidCollection<_manager.HleDirectory>(1);

	getFileById(id) {
		if (!this.fileUids.has(id)) throw (new SceKernelException(SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND));
		return this.fileUids.get(id);
	}

	sceIoOpen = createNativeFunction(0x109F50BC, 150, 'int', 'string/int/int', this, (filename: string, flags: FileOpenFlags, mode: FileMode) => {
		return this._sceIoOpenAsync(filename, flags, mode).then(result => {
			var str = sprintf('IoFileMgrForUser.sceIoOpen("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode);
			if (result == SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND) {
				console.error(str, result);
			} else {
				console.info(str, result);
			}
			return result;
		});
	});

	private _sceIoOpenAsync(filename: string, flags: FileOpenFlags, mode: FileMode) {
		return this.context.fileManager.openAsync(filename, flags, mode)
			.then(file => {
				return this.fileUids.allocate(file);
			})
			.catch(e => {
				console.error('Not found', filename, e);
				return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
			})
		;
	}

	sceIoOpenAsync = createNativeFunction(0x89AA9906, 150, 'int', 'string/int/int', this, (filename: string, flags: FileOpenFlags, mode: FileMode) => {
		console.info(sprintf('IoFileMgrForUser.sceIoOpenAsync("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode));
		//if (filename == '') return Promise.resolve(0);

		return this._sceIoOpenAsync(filename, flags, mode).then(fileId => {
			var file = this.getFileById(fileId);
			file.setAsyncOperation(Promise.resolve(Integer64.fromNumber(fileId)));
			return fileId;
		});
	});

	sceIoCloseAsync = createNativeFunction(0xFF5940B6, 150, 'int', 'int', this, (fileId: number) => {
		console.warn(sprintf('Not implemented IoFileMgrForUser.sceIoCloseAsync(%d)', fileId));
		//if (filename == '') return Promise.resolve(0);

		var file = this.getFileById(fileId);
		if (file) file.close();

		//file.setAsyncOperation(Promise.resolve(Integer64.fromInt(fileId)));
		file.setAsyncOperation(Promise.resolve(Integer64.fromInt(0)));

		return 0;
	});


	sceIoAssign = createNativeFunction(0xB2A628C1, 150, 'int', 'string/string/string/int/void*/long', this, (device1: string, device2: string, device3: string, mode: number, unk1Ptr: Stream, unk2: Integer64) => {
		// IoFileMgrForUser.sceIoAssign(Device1:'disc0:', Device2:'umd0:', Device3:'isofs0:', mode:1, unk1:0x00000000, unk2:0x0880001E)
		console.warn(sprintf("sceIoAssign not implemented! %s -> %s -> %s", device1, device2, device3));
		return 0;
	});

	sceIoClose = createNativeFunction(0x810C4BC3, 150, 'int', 'int', this, (fileId: number) => {
		var file = this.getFileById(fileId);
		if (file) file.close();

		this.fileUids.remove(fileId);

		return 0;
	});

	sceIoWrite = createNativeFunction(0x42EC03AC, 150, 'int', 'int/byte[]', this, (fileId: number, input: Stream): any => {
		if (fileId < 3) {
			// @TODO: Fixme! Create a proper file
			console.log('STD[' + fileId + ']', input.readString(input.length));
			return 0;
		} else {
			var file = this.getFileById(fileId);

			console.warn('Not implemented sceIoWrite -> ' + fileId, file);
			return input.length;
			/*
			return file.entry.writeChunkAsync(file.cursor, input.toArrayBuffer()).then((readedCount: number) => {
				file.cursor += readedCount;
				return readedCount;
			});
			*/
		}
	});

	sceIoRead = createNativeFunction(0x6A638D83, 150, 'int', 'int/uint/int', this, (fileId: number, outputPointer: number, outputLength: number) => {
		var file = this.getFileById(fileId);

		return file.entry.readChunkAsync(file.cursor, outputLength).then((readedData) => {
			file.cursor += readedData.byteLength;
			//console.log(new Uint8Array(readedData));
			this.context.memory.writeBytes(outputPointer, readedData);
			//console.info(sprintf('IoFileMgrForUser.sceIoRead(%d, %08X: %d) : cursor:%d ->%d', fileId, outputPointer, outputLength, file.cursor, readedData.byteLength));
			return readedData.byteLength;
		});
	});

	sceIoReadAsync = createNativeFunction(0xA0B5A7C2, 150, 'int', 'int/uint/int', this, (fileId: number, outputPointer: number, outputLength: number) => {
		var file = this.getFileById(fileId);

		file.setAsyncOperation(file.entry.readChunkAsync(file.cursor, outputLength).then((readedData) => {
			//console.log(new Uint8Array(readedData));
			file.cursor += readedData.byteLength;
			this.context.memory.writeBytes(outputPointer, readedData);
			return Integer64.fromNumber(readedData.byteLength);
		}));

		return 0;
	});

	_sceIoWaitAsyncCB(thread: Thread, fileId: number, resultPointer: Stream) {
		thread.state.LO = fileId;

		if (this.fileUids.has(fileId)) return Promise.resolve(SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND);

		var file = this.getFileById(fileId);

		if (file.asyncOperation) {
			return file.asyncOperation.then((result) => {
				resultPointer.writeInt64(result);
				return 0;
			});
		} else {
			resultPointer.writeInt64(Integer64.fromNumber(0));
			return Promise.resolve(1);
		}
	}


	sceIoWaitAsync = createNativeFunction(0xE23EEC33, 150, 'int', 'Thread/int/void*', this, (thread: Thread, fileId: number, resultPointer: Stream) => {
		return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
	});

	sceIoWaitAsyncCB = createNativeFunction(0x35DBD746, 150, 'int', 'Thread/int/void*', this, (thread: Thread, fileId: number, resultPointer: Stream) => {
		return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
	});

	sceIoPollAsync = createNativeFunction(0x3251EA56, 150, 'uint', 'Thread/int/void*', this, (thread: Thread, fileId: number, resultPointer: Stream) => {
		var file = this.getFileById(fileId);

		if (file.asyncResult) {
			//return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
			//console.log('resolved -> ', file.asyncResult.number);
			resultPointer.writeInt64(file.asyncResult);
			return 0;
		} else {
			//console.log('not resolved');
			resultPointer.writeInt64(Integer64.fromInt(0));
			return 1;
		}
	});

	/*
	[HlePspFunction(NID = 0xA0B5A7C2, FirmwareVersion = 150)]
	public int sceIoReadAsync(SceUID FileId, byte * OutputPointer, int OutputSize)
	{
		var File = HleIoManager.HleIoDrvFileArgPool.Get(FileId);
		File.AsyncLastResult = sceIoRead(FileId, OutputPointer, OutputSize);

		_DelayIo(IoDelayType.Read, OutputSize);

		return 0;
	}
	*/

	_vfsStatToSceIoStat(stat: VfsStat) {
		var stat2 = new _structs.SceIoStat();
		//stat2.mode = <_structs.SceMode>parseInt('777', 8)
		stat2.mode = 0;
		stat2.size = stat.size;
		stat2.timeCreation = _structs.ScePspDateTime.fromDate(stat.timeCreation);
		stat2.timeLastAccess = _structs.ScePspDateTime.fromDate(stat.timeLastAccess);
		stat2.timeLastModification = _structs.ScePspDateTime.fromDate(stat.timeLastModification);
		stat2.deviceDependentData[0] = stat.dependentData0 || 0;
		stat2.deviceDependentData[1] = stat.dependentData1 || 0;

		stat2.attributes = 0;
		if (stat.isDirectory) {
			stat2.mode = 0x1000; // Directory
			stat2.attributes |= _structs.IOFileModes.Directory;
			stat2.attributes |= _structs.IOFileModes.CanRead;
		} else {
			stat2.mode = 0x2000; // File
			stat2.attributes |= _structs.IOFileModes.File;
			stat2.attributes |= _structs.IOFileModes.CanExecute;
			stat2.attributes |= _structs.IOFileModes.CanRead;
			stat2.attributes |= _structs.IOFileModes.CanWrite;
		}
		return stat2;
	}

	sceIoGetstat = createNativeFunction(0xACE946E8, 150, 'int', 'string/void*', this, (fileName: string, sceIoStatPointer: Stream): any => {
		if (sceIoStatPointer) {
			sceIoStatPointer.position = 0;
			_structs.SceIoStat.struct.write(sceIoStatPointer, new _structs.SceIoStat());
		}

		try {
			return this.context.fileManager.getStatAsync(fileName)
				.then(stat => {
					var stat2 = this._vfsStatToSceIoStat(stat);
					console.info(sprintf('IoFileMgrForUser.sceIoGetstat("%s")', fileName), stat2);
					if (sceIoStatPointer) {
						sceIoStatPointer.position = 0;
						_structs.SceIoStat.struct.write(sceIoStatPointer, stat2);
					}
					return 0;
				})
				.catch(error => SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND)
			;
		} catch (e) {
			console.error(e);
			return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		}
	});

	sceIoChdir = createNativeFunction(0x55F4717D, 150, 'int', 'string', this, (path: string) => {
		console.info(sprintf('IoFileMgrForUser.sceIoChdir("%s")', path));
		try {
			this.context.fileManager.chdir(path);
			return 0;
		} catch (e) {
			console.error(e);
			return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		}
	});

	sceIoLseek = createNativeFunction(0x27EB27B8, 150, 'long', 'int/long/int', this, (fileId: number, offset: Integer64, whence: number) => {
		var result = this._seek(fileId, offset.getNumber(), whence);
		//console.info(sprintf('IoFileMgrForUser.sceIoLseek(%d, %d, %d): %d', fileId, offset, whence, result));
		return Integer64.fromNumber(result);
	});

	sceIoLseek32 = createNativeFunction(0x68963324, 150, 'int', 'int/int/int', this, (fileId: number, offset: number, whence: number) => {
		var result = this._seek(fileId, offset, whence);
		//console.info(sprintf('IoFileMgrForUser.sceIoLseek32(%d, %d, %d) : %d', fileId, offset, whence, result));
		return result;
	});

	sceIoMkdir = createNativeFunction(0x06A70004, 150, 'uint', 'string/int', this, (path: string, accessMode: number) => {
		console.warn('Not implemented: sceIoMkdir("' + path + '", ' + accessMode.toString(8) + ')');
		return 0;
	});

	sceIoDopen = createNativeFunction(0xB29DDF9C, 150, 'uint', 'string', this, (path: string) => {
		console.log('sceIoDopen("' + path + '")');
		return this.context.fileManager.openDirectoryAsync(path).then((directory) => {
			console.log('opened directory "' + path + '"');
			return this.directoryUids.allocate(directory);
		}).catch((error) => {
			console.error(error);
			return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		});
	});

	sceIoDclose = createNativeFunction(0xEB092469, 150, 'uint', 'int', this, (fileId: number) => {
		if (!this.directoryUids.has(fileId)) return -1;
		this.directoryUids.get(fileId).close();
		this.directoryUids.remove(fileId);
		return 0;
	});

	sceIoDread = createNativeFunction(0xE3EB004C, 150, 'int', 'int/void*', this, (fileId: number, hleIoDirentPtr: Stream) => {
		if (!this.directoryUids.has(fileId)) return -1;
		var directory = this.directoryUids.get(fileId);
		if (directory.left > 0) {
			var stat = directory.read();
			var hleIoDirent = new _structs.HleIoDirent();
			hleIoDirent.name = stat.name;
			hleIoDirent.stat = this._vfsStatToSceIoStat(stat);
			hleIoDirent.privateData = 0;
			_structs.HleIoDirent.struct.write(hleIoDirentPtr, hleIoDirent);
		}
		return directory.left;
	});

	_seek(fileId: number, offset: number, whence: number) {
		var file = this.fileUids.get(fileId);
		switch (whence) {
			case _structs.SeekAnchor.Set:
				file.cursor = 0 + offset;
				break;
			case _structs.SeekAnchor.Cursor:
				file.cursor = file.cursor + offset;
				break;
			case _structs.SeekAnchor.End:
				file.cursor = file.entry.size + offset;
				break;
		}
		return file.cursor;
	}
}

