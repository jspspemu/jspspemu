///<reference path="../../../global.d.ts" />

import _utils = require('../../utils');
import _context = require('../../../context');
import nativeFunction = _utils.nativeFunction;
import _vfs = require('../../vfs');
import _structs = require('../../structs');
import SceKernelErrors = require('../../SceKernelErrors');

import _manager = require('../../manager'); _manager.Thread;
import Thread = _manager.Thread;
import FileMode = _vfs.FileMode;
import FileOpenFlags = _vfs.FileOpenFlags;
import VfsStat = _vfs.VfsStat;

//var console = logger.named('module.IoFileMgrForUser');
var log = logger.named('module.IoFileMgrForUser');

export class IoFileMgrForUser {
	constructor(private context: _context.EmulatorContext) { }

	@nativeFunction(0x54F5FB11, 150, 'uint', 'string/uint/uint/int/uint/int')
	sceIoDevctl(deviceName: string, command: number, inputPointer: number, inputLength: number, outputPointer: number, outputLength: number) {
		var input = this.context.memory.getPointerStream(inputPointer, inputLength);
		var output = this.context.memory.getPointerStream(outputPointer, outputLength);

		return this.context.fileManager.devctlAsync(deviceName, command, input, output);
	}


	fileUids = new UidCollection<_manager.HleFile>(3);
	directoryUids = new UidCollection<_manager.HleDirectory>(1);

	hasFileById(id:number):boolean { return this.fileUids.has(id); }
	getFileById(id:number):_manager.HleFile { return this.fileUids.get(id); }

	@nativeFunction(0x109F50BC, 150, 'int', 'string/int/int')
	sceIoOpen(filename: string, flags: FileOpenFlags, mode: FileMode) {
		return this._sceIoOpenAsync(filename, flags, mode).then(result => {
			var str = sprintf('IoFileMgrForUser.sceIoOpen("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode);
			if (result == SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND) {
				log.error(str, result);
			} else {
				log.info(str, result);
			}
			return result;
		});
	}

	private _sceIoOpenAsync(filename: string, flags: FileOpenFlags, mode: FileMode) {
		return this.context.fileManager.openAsync(filename, flags, mode)
			.then(file => {
				return this.fileUids.allocate(file);
			})
			.catch(e => {
				log.error('Not found', filename, e);
				return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
			})
		;
	}

	@nativeFunction(0x89AA9906, 150, 'int', 'string/int/int')
	sceIoOpenAsync(filename: string, flags: FileOpenFlags, mode: FileMode) {
		log.info(sprintf('IoFileMgrForUser.sceIoOpenAsync("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode));
		//if (filename == '') return Promise2.resolve(0);

		return this._sceIoOpenAsync(filename, flags, mode).then(fileId => {
			if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
			var file = this.getFileById(fileId);
			file.setAsyncOperation(Promise2.resolve(Integer64.fromNumber(fileId)));
			log.info('-->', fileId);
			return fileId;
		});
	}

	@nativeFunction(0xFF5940B6, 150, 'int', 'int')
	sceIoCloseAsync(fileId: number) {
		log.warn(sprintf('Not implemented IoFileMgrForUser.sceIoCloseAsync(%d)', fileId));
		//if (filename == '') return Promise2.resolve(0);

		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		var file = this.getFileById(fileId);
		if (file) file.close();

		//file.setAsyncOperation(Promise2.resolve(Integer64.fromInt(fileId)));
		file.setAsyncOperation(Promise2.resolve(Integer64.fromInt(0)));

		return 0;
	}


	@nativeFunction(0xB2A628C1, 150, 'int', 'string/string/string/int/void*/long')
	sceIoAssign(device1: string, device2: string, device3: string, mode: number, unk1Ptr: Stream, unk2: Integer64) {
		// IoFileMgrForUser.sceIoAssign(Device1:'disc0:', Device2:'umd0:', Device3:'isofs0:', mode:1, unk1:0x00000000, unk2:0x0880001E)
		log.warn(sprintf("sceIoAssign not implemented! %s -> %s -> %s", device1, device2, device3));
		return 0;
	}

	@nativeFunction(0x810C4BC3, 150, 'int', 'int')
	sceIoClose(fileId: number) {
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		var file = this.getFileById(fileId);
		if (file) file.close();

		log.warn(sprintf('Not implemented IoFileMgrForUser.sceIoClose(%d)', fileId));

		this.fileUids.remove(fileId);

		return 0;
	}

	@nativeFunction(0x42EC03AC, 150, 'int', 'int/byte[]')
	sceIoWrite(fileId: number, input: Stream): any {
		if (fileId < 3) {
			// @TODO: Fixme! Create a proper file
			var str = input.readString(input.length);
			log.warn('STD[' + fileId + ']', str);
			this.context.onStdout.dispatch(str);
			//return immediateAsync().then(() => 0);
			return 0;
		} else {
			if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
			var file = this.getFileById(fileId);

			return file.entry.writeChunkAsync(file.cursor, input.toArrayBuffer()).then((writtenCount: number) => {
				log.info('sceIoWrite', 'file.cursor', file.cursor, 'input.length:', input.length, 'writtenCount:', writtenCount);
				file.cursor += writtenCount;
				return writtenCount;
			}).catch(e => {
				log.error(e);
				return SceKernelErrors.ERROR_ERROR;
			});
		}
	}

	@nativeFunction(0x6A638D83, 150, 'int', 'int/uint/int')
	sceIoRead(fileId: number, outputPointer: number, outputLength: number):number | Promise2<number> {
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		var file = this.getFileById(fileId);

		return file.entry.readChunkAsync(file.cursor, outputLength).then(readedData => {
			file.cursor += readedData.byteLength;
			//log.log(new Uint8Array(readedData));
			this.context.memory.writeBytes(outputPointer, readedData);
			//log.info(sprintf('IoFileMgrForUser.sceIoRead(%d, %08X: %d) : cursor:%d ->%d', fileId, outputPointer, outputLength, file.cursor, readedData.byteLength));
			return readedData.byteLength;
		});
	}

	@nativeFunction(0xA0B5A7C2, 150, 'int', 'Thread/int/uint/int')
	sceIoReadAsync(thread:Thread, fileId: number, outputPointer: number, outputLength: number) {
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		var file = this.getFileById(fileId);

		// SCE_KERNEL_ERROR_ASYNC_BUSY

		file.setAsyncOperation(file.entry.readChunkAsync(file.cursor, outputLength).then(readedData => {
			//log.log('sceIoReadAsync', file, fileId, outputLength, readedData.byteLength, new Uint8Array(readedData));
			file.cursor += readedData.byteLength;
			//log.info(thread, 'readed', new Uint8Array(readedData));
			this.context.memory.writeBytes(outputPointer, readedData);
			return Integer64.fromNumber(readedData.byteLength);
		}));

		return 0;
	}

	_sceIoWaitAsyncCB(thread: Thread, fileId: number, resultPointer: Stream): number | Promise2<number> {
		thread.state.LO = fileId;

		if (!this.fileUids.has(fileId)) {
			if (DebugOnce('_sceIoWaitAsyncCB', 100)) log.info('_sceIoWaitAsyncCB', fileId, 'file not found');
			return Promise2.resolve(SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND);
		}

		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		var file = this.getFileById(fileId);

		if (file.asyncOperation) {
			if (DebugOnce('_sceIoWaitAsyncCB', 100)) log.info(thread.name, ':_sceIoWaitAsyncCB', fileId, 'completed');
			return file.asyncOperation.then(result => {
				//debugger;
				if (DebugOnce('_sceIoWaitAsyncCB', 100)) log.info(thread.name, ':_sceIoWaitAsyncCB', fileId, 'result: ', result.getNumber());
				resultPointer.writeInt64(result);
				return 0;
			});
		} else {
			if (DebugOnce('_sceIoWaitAsyncCB', 100)) log.info(thread.name, ':_sceIoWaitAsyncCB', fileId, 'incompleted');
			resultPointer.writeInt64(Integer64.fromNumber(0));
			return Promise2.resolve(1);
		}
	}


	@nativeFunction(0xE23EEC33, 150, 'int', 'Thread/int/void*')
	sceIoWaitAsync(thread: Thread, fileId: number, resultPointer: Stream) {
		return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
	}

	@nativeFunction(0x35DBD746, 150, 'int', 'Thread/int/void*')
	sceIoWaitAsyncCB(thread: Thread, fileId: number, resultPointer: Stream) {
		return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
	}

	@nativeFunction(0x3251EA56, 150, 'uint', 'Thread/int/void*')
	sceIoPollAsync(thread: Thread, fileId: number, resultPointer: Stream) {
		//log.info('sceIoPollAsync', fileId);
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		var file = this.getFileById(fileId);

		if (file.asyncResult) {
			//return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
			if (DebugOnce('sceIoPollAsync', 100)) log.log(thread.name, ':sceIoPollAsync', fileId, 'resolved -> ', file.asyncResult.number);
			resultPointer.writeInt64(file.asyncResult);
			return 0;
		} else {
			if (DebugOnce('sceIoPollAsync', 100)) log.log(thread.name, ':sceIoPollAsync', fileId, 'not resolved');

			//log.log('not resolved');
			resultPointer.writeInt64(Integer64.fromInt(0));
			return 1;
		}
	}

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

	@nativeFunction(0xACE946E8, 150, 'int', 'string/void*')
	sceIoGetstat(fileName: string, sceIoStatPointer: Stream): any {
		if (sceIoStatPointer) {
			sceIoStatPointer.position = 0;
			_structs.SceIoStat.struct.write(sceIoStatPointer, new _structs.SceIoStat());
		}

		try {
			return this.context.fileManager.getStatAsync(fileName)
				.then(stat => {
					var stat2 = this._vfsStatToSceIoStat(stat);
					log.info(sprintf('IoFileMgrForUser.sceIoGetstat("%s")', fileName), stat2);
					if (sceIoStatPointer) {
						sceIoStatPointer.position = 0;
						_structs.SceIoStat.struct.write(sceIoStatPointer, stat2);
					}
					return 0;
				})
				.catch(error => SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND)
			;
		} catch (e) {
			log.error(e);
			return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		}
	}

	@nativeFunction(0x55F4717D, 150, 'int', 'string')
	sceIoChdir(path: string) {
		log.info(sprintf('IoFileMgrForUser.sceIoChdir("%s")', path));
		try {
			this.context.fileManager.chdir(path);
			return 0;
		} catch (e) {
			log.error(e);
			return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		}
	}

	/*
	[HlePspFunction(NID = 0x71B19E77, FirmwareVersion = 150)]
	public int sceIoLseekAsync(SceUID FileId, long Offset, SeekAnchor Whence)
	{
		var File = HleIoManager.HleIoDrvFileArgPool.Get(FileId);
		File.AsyncLastResult = sceIoLseek(FileId, Offset, Whence);
		_DelayIo(IoDelayType.Seek);
		return 0;
	}
	*/

	@nativeFunction(0x71B19E77, 150, 'int', 'int/long/int')
	sceIoLseekAsync(fileId: number, offset: Integer64, whence: number) {
		//var file = this.getFileById(fileId);
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		var file = this.getFileById(fileId);
		var result = this._seek(fileId, offset.getNumber(), whence);
		file.setAsyncOperationNow(Integer64.fromNumber(result));
		return 0;
	}

	@nativeFunction(0x27EB27B8, 150, 'long', 'int/long/int')
	sceIoLseek(fileId: number, offset: Integer64, whence: number) {
		var result = this._seek(fileId, offset.getNumber(), whence);
		//log.info(sprintf('IoFileMgrForUser.sceIoLseek(%d, %d, %d): %d', fileId, offset, whence, result));
		return Integer64.fromNumber(result);
	}

	@nativeFunction(0x68963324, 150, 'int', 'int/int/int')
	sceIoLseek32(fileId: number, offset: number, whence: number) {
		var result = this._seek(fileId, offset, whence);
		//log.info(sprintf('IoFileMgrForUser.sceIoLseek32(%d, %d, %d) : %d', fileId, offset, whence, result));
		return result;
	}

	@nativeFunction(0x06A70004, 150, 'uint', 'string/int')
	sceIoMkdir(path: string, accessMode: number) {
		log.warn('Not implemented: sceIoMkdir("' + path + '", ' + accessMode.toString(8) + ')');
		return 0;
	}

	@nativeFunction(0xB29DDF9C, 150, 'uint', 'string')
	sceIoDopen(path: string) {
		log.log('sceIoDopen("' + path + '")');
		return this.context.fileManager.openDirectoryAsync(path).then((directory) => {
			log.log('opened directory "' + path + '"');
			return this.directoryUids.allocate(directory);
		}).catch((error) => {
			log.error(error);
			return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		});
	}

	@nativeFunction(0xEB092469, 150, 'uint', 'int')
	sceIoDclose(fileId: number) {
		if (!this.directoryUids.has(fileId)) return -1;
		this.directoryUids.get(fileId).close();
		this.directoryUids.remove(fileId);
		return 0;
	}

	@nativeFunction(0xE3EB004C, 150, 'int', 'int/void*')
	sceIoDread(fileId: number, hleIoDirentPtr: Stream) {
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
	}

	@nativeFunction(0xB293727F, 150, 'int', 'int/int')
	sceIoChangeAsyncPriority(fileId: number, priority: number) {
		return 0;
	}

	_seek(fileId: number, offset: number, whence: number) {
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		var file = this.getFileById(fileId);
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

