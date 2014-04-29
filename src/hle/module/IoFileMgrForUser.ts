import _utils = require('../utils');
import _context = require('../../context');
import createNativeFunction = _utils.createNativeFunction;
import _vfs = require('../vfs');
import _structs = require('../structs');
import SceKernelErrors = require('../SceKernelErrors');

import _manager = require('../manager'); _manager.Thread;
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


	fileUids = new UidCollection<_manager.HleFile>(1);
	directoryUids = new UidCollection<_manager.HleDirectory>(1);

	sceIoOpen = createNativeFunction(0x109F50BC, 150, 'int', 'string/int/int', this, (filename: string, flags: FileOpenFlags, mode: FileMode) => {
		return this._sceIoOpenAsync(filename, flags, mode).then(result => {
			var str = sprintf('IoFileMgrForUser.sceIoOpen("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode);
			if (result == SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND) {
				console.error(str);
			} else {
				console.info(str);
			}
			return result;
		});
	});

	private _sceIoOpenAsync(filename: string, flags: FileOpenFlags, mode: FileMode) {
		return this.context.fileManager.openAsync(filename, flags, mode)
			.then(file => this.fileUids.allocate(file), e => SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND)
		;
	}

	sceIoOpenAsync = createNativeFunction(0x89AA9906, 150, 'int', 'string/int/int', this, (filename: string, flags: FileOpenFlags, mode: FileMode) => {
		console.info(sprintf('IoFileMgrForUser.sceIoOpenAsync("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode));
		//if (filename == '') return Promise.resolve(0);

		return this._sceIoOpenAsync(filename, flags, mode);
	});

	sceIoAssign = createNativeFunction(0xB2A628C1, 150, 'int', 'string/string/string/int/void*/long', this, (device1: string, device2: string, device3: string, mode: number, unk1Ptr: Stream, unk2: Integer64) => {
		// IoFileMgrForUser.sceIoAssign(Device1:'disc0:', Device2:'umd0:', Device3:'isofs0:', mode:1, unk1:0x00000000, unk2:0x0880001E)
		console.warn(sprintf("sceIoAssign not implemented! %s -> %s -> %s", device1, device2, device3));
		return 0;
	});

	sceIoClose = createNativeFunction(0x810C4BC3, 150, 'int', 'int', this, (fileId: number) => {
		var file = this.fileUids.get(fileId);
		if (file) file.close();

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

	sceIoReadAsync = createNativeFunction(0xA0B5A7C2, 150, 'int', 'int/uint/int', this, (fileId: number, outputPointer: number, outputLength: number) => {
		var file = this.fileUids.get(fileId);

		file.asyncOperation = file.entry.readChunkAsync(file.cursor, outputLength).then((readedData) => {
			file.cursor += readedData.byteLength;
			this.context.memory.writeBytes(outputPointer, readedData);
			return readedData.byteLength;
		});

		return 0;
	});

	_sceIoWaitAsyncCB(thread: Thread, fileId: number, resultPointer: Stream) {
		thread.state.LO = fileId;

		if (this.fileUids.has(fileId)) {
			return Promise.resolve(SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND);
		}

		var file = this.fileUids.get(fileId);

		if (!file.asyncOperation) file.asyncOperation = Promise.resolve(0);

		return file.asyncOperation.then((result) => {
			resultPointer.writeInt64(Integer64.fromNumber(result));
			return 0;
		});
	}


	sceIoWaitAsync = createNativeFunction(0xE23EEC33, 150, 'int', 'Thread/int/void*', this, (thread: Thread, fileId: number, resultPointer: Stream) => {
		return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
	});

	sceIoWaitAsyncCB = createNativeFunction(0x35DBD746, 150, 'int', 'Thread/int/void*', this, (thread: Thread, fileId: number, resultPointer: Stream) => {
		return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
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
		stat2.mode = <_structs.SceMode>parseInt('777', 8)
				stat2.size = stat.size;
		stat2.timeCreation = _structs.ScePspDateTime.fromDate(stat.timeCreation);
		stat2.timeLastAccess = _structs.ScePspDateTime.fromDate(stat.timeLastAccess);
		stat2.timeLastModification = _structs.ScePspDateTime.fromDate(stat.timeLastModification);
		stat2.deviceDependentData[0] = stat.dependentData0 || 0;
		stat2.deviceDependentData[1] = stat.dependentData1 || 0;

		stat2.attributes = 0;
		stat2.attributes |= _structs.IOFileModes.CanExecute;
		stat2.attributes |= _structs.IOFileModes.CanRead;
		stat2.attributes |= _structs.IOFileModes.CanWrite;
		if (stat.isDirectory) {
			stat2.attributes |= _structs.IOFileModes.Directory;
		} else {
			stat2.attributes |= _structs.IOFileModes.File;
		}
		return stat2;
	}

	sceIoGetstat = createNativeFunction(0xACE946E8, 150, 'int', 'string/void*', this, (fileName: string, sceIoStatPointer: Stream): any => {
		if (sceIoStatPointer) _structs.SceIoStat.struct.write(sceIoStatPointer, new _structs.SceIoStat());

		try {
			return this.context.fileManager.getStatAsync(fileName)
				.then(stat => {
					var stat2 = this._vfsStatToSceIoStat(stat);
					console.info(sprintf('IoFileMgrForUser.sceIoGetstat("%s")', fileName), stat2);
					if (sceIoStatPointer) _structs.SceIoStat.struct.write(sceIoStatPointer, stat2);
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
		console.warn('Not implemented IoFileMgrForUser.sceIoDclose');
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

