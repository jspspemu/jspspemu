import {DebugOnce, delay, logger, PromiseFast, setToString, sprintf, UidCollection} from "../../../global/utils";
import {Stream} from "../../../global/stream";
import {Integer64} from "../../../global/int64";
import {SceKernelErrors} from "../../SceKernelErrors";
import {EmulatorContext} from "../../../emu/context";
import {BYTES, I32, I64, nativeFunctionEx, PTR, STRING, THREAD, U32} from "../../utils";
import {HleDirectory, HleFile} from "../../manager/file";
import {FileMode, FileOpenFlags, VfsStat} from "../../vfs/vfs";
import {Thread} from "../../manager/thread";
import {HleIoDirent, IOFileModes, SceIoStat, ScePspDateTime, SeekAnchor} from "../../structs";

//const console = logger.named('module.IoFileMgrForUser');
const log = logger.named('module.IoFileMgrForUser');

export class IoFileMgrForUser {
	constructor(private context: EmulatorContext) { }

	@nativeFunctionEx(0x54F5FB11, 150)
	@U32 sceIoDevctl(@STRING deviceName: string, @U32 command: number, @U32 inputPointer: number, @I32 inputLength: number, @U32 outputPointer: number, @I32 outputLength: number) {
        const input = this.context.memory.getPointerStream(inputPointer, inputLength)!
		const output = this.context.memory.getPointerStream(outputPointer, outputLength)!

		return this.context.fileManager.devctlAsync(deviceName, command, input, output);
	}


    static STDIN_ID = 0
    static STDOUT_ID = 1
    static STDERR_ID = 2
	fileUids = new UidCollection<HleFile>(3);

	directoryUids = new UidCollection<HleDirectory>(1);

	hasFileById(id:number):boolean { return this.fileUids.has(id); }
	getFileById(id:number):HleFile { return this.fileUids.get(id); }

	@nativeFunctionEx(0x109F50BC, 150)
	@I32 sceIoOpen(@STRING filename: string, @I32 flags: FileOpenFlags, @I32 mode: FileMode) {
		return this._sceIoOpenAsync(filename, flags, mode).thenFast(result => {
            const str = sprintf('IoFileMgrForUser.sceIoOpen("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode);
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
			.thenFast(file => {
				return this.fileUids.allocate(file);
			})
			.catch(e => {
				log.error('Not found', filename, e);
				return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
			})
		;
	}

	@nativeFunctionEx(0x89AA9906, 150)
	@I32 sceIoOpenAsync(@STRING filename: string, @I32 flags: FileOpenFlags, @I32 mode: FileMode) {
		log.info(sprintf('IoFileMgrForUser.sceIoOpenAsync("%s", %d(%s), 0%o)', filename, flags, setToString(FileOpenFlags, flags), mode));
		//if (filename == '') return PromiseFast.resolve(0);

		return this._sceIoOpenAsync(filename, flags, mode).thenFast(fileId => {
			if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
            const file = this.getFileById(fileId);
            file.setAsyncOperation(PromiseFast.resolve(Integer64.fromNumber(fileId)));
			log.info('-->', fileId);
			return fileId;
		})
	}

	@nativeFunctionEx(0xFF5940B6, 150)
	@I32 sceIoCloseAsync(@I32 fileId: number) {
        log.info(sprintf('IoFileMgrForUser.closeAsync(%d)', fileId));
		//if (filename == '') return PromiseFast.resolve(0);

		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
        const file = this.getFileById(fileId);
        if (file) file.close();

		//file.setAsyncOperation(PromiseFast.resolve(Integer64.fromInt(fileId)));
		//file.setAsyncOperation(PromiseFast.resolve(Integer64.fromInt(0)));

        (async () => {
            await delay(100)
            this.fileUids.remove(fileId);
        })()

        file.setAsyncOperation(Integer64.ZERO);

		return 0;
	}


	@nativeFunctionEx(0xB2A628C1, 150)
	@I32 sceIoAssign(@STRING device1: string, @STRING device2: string, @STRING device3: string, @I32 mode: number, @PTR unk1Ptr: Stream, @I64 unk2: Integer64) {
		// IoFileMgrForUser.sceIoAssign(Device1:'disc0:', Device2:'umd0:', Device3:'isofs0:', mode:1, unk1:0x00000000, unk2:0x0880001E)
		log.warn(sprintf("sceIoAssign not implemented! %s -> %s -> %s", device1, device2, device3));
		return 0;
	}

	@nativeFunctionEx(0x810C4BC3, 150)
	@I32 sceIoClose(@I32 fileId: number) {
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
        const file = this.getFileById(fileId);
        if (file) file.close();
		this.fileUids.remove(fileId);
		return 0;
	}

	@nativeFunctionEx(0x42EC03AC, 150)
	@I32 sceIoWrite(@I32 fileId: number, @BYTES input: Stream): any {
		if (fileId < 3) {
			// @TODO: Fixme! Create a proper file
            const str = input.readString(input.length);
            log.warn(`STD[${fileId}]`, str);
			this.context.onStdout.dispatch(str);
			//return immediateAsync().thenFast(() => 0);
			return 0;
		} else {
			if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
            const file = this.getFileById(fileId);

            return file.entry.writeChunkAsync(file.cursor, input.toArrayBuffer()).thenFast((writtenCount: number) => {
				log.info('sceIoWrite', 'file.cursor', file.cursor, 'input.length:', input.length, 'writtenCount:', writtenCount);
				file.cursor += writtenCount;
				return writtenCount;
			}).catch(e => {
				log.error(e);
				return SceKernelErrors.ERROR_ERROR;
			});
		}
	}

	@nativeFunctionEx(0x6A638D83, 150)
	@I32 sceIoRead(@I32 fileId: number, @U32 outputPointer: number, @I32 outputLength: number):number | PromiseFast<number> {
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
        const file = this.getFileById(fileId);

        return file.entry.readChunkAsync(file.cursor, outputLength).thenFast(readedData => {
			file.cursor += readedData.byteLength;
			//log.log(new Uint8Array(readedData));
			this.context.memory.writeBytes(outputPointer, readedData);
			//log.info(sprintf('IoFileMgrForUser.sceIoRead(%d, %08X: %d) : cursor:%d ->%d', fileId, outputPointer, outputLength, file.cursor, readedData.byteLength));
			return readedData.byteLength;
		});
	}

	@nativeFunctionEx(0xA0B5A7C2, 150)
	@I32 sceIoReadAsync(@THREAD thread:Thread, @I32 fileId: number, @U32 outputPointer: number, @I32 outputLength: number) {
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
        const file = this.getFileById(fileId);

        // SCE_KERNEL_ERROR_ASYNC_BUSY

		file.setAsyncOperation(file.entry.readChunkAsync(file.cursor, outputLength).thenFast(readedData => {
			//log.log('sceIoReadAsync', file, fileId, outputLength, readedData.byteLength, new Uint8Array(readedData));
			file.cursor += readedData.byteLength;
			//log.info(thread, 'readed', new Uint8Array(readedData));
			this.context.memory.writeBytes(outputPointer, readedData);
			return Integer64.fromNumber(readedData.byteLength);
		}));

		return 0;
	}

	_sceIoWaitAsyncCB(thread: Thread, fileId: number, resultPointer: Stream): number | PromiseFast<number> {
		thread.state.LO = fileId;

		if (!this.fileUids.has(fileId)) {
			if (DebugOnce('_sceIoWaitAsyncCB', 100)) log.info('_sceIoWaitAsyncCB', fileId, 'file not found');
			return PromiseFast.resolve(SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND);
		}

		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
        const file = this.getFileById(fileId);

        if (file.asyncOperation) {
			if (DebugOnce('_sceIoWaitAsyncCB', 100)) log.info(thread.name, ':_sceIoWaitAsyncCB', fileId, 'completed');
			return file.asyncOperation.thenFast(result => {
				//debugger;
				if (DebugOnce('_sceIoWaitAsyncCB', 100)) log.info(thread.name, ':_sceIoWaitAsyncCB', fileId, 'result: ', result.getNumber());
				resultPointer.writeInt64(result);
				return 0;
			});
		} else {
			if (DebugOnce('_sceIoWaitAsyncCB', 100)) log.info(thread.name, ':_sceIoWaitAsyncCB', fileId, 'incompleted');
			resultPointer.writeInt64(Integer64.fromNumber(0));
			return PromiseFast.resolve(1);
		}
	}


	@nativeFunctionEx(0xE23EEC33, 150)
	@I32 sceIoWaitAsync(@THREAD thread: Thread, @I32 fileId: number, @PTR resultPointer: Stream) {
		return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
	}

	@nativeFunctionEx(0x35DBD746, 150)
	@I32 sceIoWaitAsyncCB(@THREAD thread: Thread, @I32 fileId: number, @PTR resultPointer: Stream) {
		return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
	}

	@nativeFunctionEx(0x3251EA56, 150)
	@U32 sceIoPollAsync(@THREAD thread: Thread, @I32 fileId: number, @PTR resultPointer: Stream) {
		//log.info('sceIoPollAsync', fileId);
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
        const file = this.getFileById(fileId);

        if (file.asyncResult) {
			//return this._sceIoWaitAsyncCB(thread, fileId, resultPointer);
			//if (DebugOnce('sceIoPollAsync', 100)) log.log(thread.name, ':sceIoPollAsync', fileId, 'resolved -> ', file.asyncResult.number);
			resultPointer.writeInt64(file.asyncResult);
			return 0;
		} else {
			//if (DebugOnce('sceIoPollAsync', 100)) log.log(thread.name, ':sceIoPollAsync', fileId, 'not resolved');

			//log.log('not resolved');
			resultPointer.writeInt64(Integer64.fromInt(0));
			return 1;
		}
	}

	/*
	[HlePspFunction(NID = 0xA0B5A7C2, FirmwareVersion = 150)]
	public int sceIoReadAsync(SceUID FileId, byte * OutputPointer, int OutputSize)
	{
		const File = HleIoManager.HleIoDrvFileArgPool.Get(FileId);
		File.AsyncLastResult = sceIoRead(FileId, OutputPointer, OutputSize);

		_DelayIo(IoDelayType.Read, OutputSize);

		return 0;
	}
	*/

	_vfsStatToSceIoStat(stat: VfsStat) {
        const stat2 = new SceIoStat();
        //stat2.mode = <_structs.SceMode>parseInt('777', 8)
		stat2.mode = 0;
		stat2.size = stat.size;
		stat2.timeCreation = ScePspDateTime.fromDate(stat.timeCreation);
		stat2.timeLastAccess = ScePspDateTime.fromDate(stat.timeLastAccess);
		stat2.timeLastModification = ScePspDateTime.fromDate(stat.timeLastModification);
		stat2.deviceDependentData[0] = stat.dependentData0 || 0;
		stat2.deviceDependentData[1] = stat.dependentData1 || 0;

		stat2.attributes = 0;
		if (stat.isDirectory) {
			stat2.mode = 0x1000; // Directory
			stat2.attributes |= IOFileModes.Directory;
			stat2.attributes |= IOFileModes.CanRead;
		} else {
			stat2.mode = 0x2000; // File
			stat2.attributes |= IOFileModes.File;
			stat2.attributes |= IOFileModes.CanExecute;
			stat2.attributes |= IOFileModes.CanRead;
			stat2.attributes |= IOFileModes.CanWrite;
		}
		return stat2;
	}

	@nativeFunctionEx(0xACE946E8, 150)
	@I32 sceIoGetstat(@STRING fileName: string, @PTR sceIoStatPointer: Stream): any {
		if (sceIoStatPointer) {
			sceIoStatPointer.position = 0;
			SceIoStat.struct.write(sceIoStatPointer, new SceIoStat());
		}

		try {
			return this.context.fileManager.getStatAsync(fileName)
				.thenFast(stat => {
                    const stat2 = this._vfsStatToSceIoStat(stat);
                    log.info(sprintf('IoFileMgrForUser.sceIoGetstat("%s")', fileName), stat2);
					if (sceIoStatPointer) {
						sceIoStatPointer.position = 0;
						SceIoStat.struct.write(sceIoStatPointer, stat2);
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

	@nativeFunctionEx(0x55F4717D, 150)
	@I32 sceIoChdir(@STRING path: string) {
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
		const File = HleIoManager.HleIoDrvFileArgPool.Get(FileId);
		File.AsyncLastResult = sceIoLseek(FileId, Offset, Whence);
		_DelayIo(IoDelayType.Seek);
		return 0;
	}
	*/

	@nativeFunctionEx(0x71B19E77, 150)
	@I32 sceIoLseekAsync(@I32 fileId: number, @I64 offset: Integer64, @I32 whence: number) {
		//const file = this.getFileById(fileId);
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
        const file = this.getFileById(fileId);
        const result = this._seek(fileId, offset.getNumber(), whence);
        file.setAsyncOperationNow(Integer64.fromNumber(result));
		return 0;
	}

	@nativeFunctionEx(0x27EB27B8, 150)
	@I64 sceIoLseek(@I32 fileId: number, @I64 offset: Integer64, @I32 whence: number) {
        const result = this._seek(fileId, offset.getNumber(), whence);
        //log.info(sprintf('IoFileMgrForUser.sceIoLseek(%d, %d, %d): %d', fileId, offset, whence, result));
		return Integer64.fromNumber(result);
	}

	@nativeFunctionEx(0x68963324, 150)
	@I32 sceIoLseek32(@I32 fileId: number, @I32 offset: number, @I32 whence: number) {
        const result = this._seek(fileId, offset, whence);
        //log.info(sprintf('IoFileMgrForUser.sceIoLseek32(%d, %d, %d) : %d', fileId, offset, whence, result));
		return result;
	}

	@nativeFunctionEx(0x06A70004, 150)
	@U32 sceIoMkdir(@STRING path: string, @I32 accessMode: number) {
		log.warn(`Not implemented: sceIoMkdir("${path}", ${accessMode.toString(8)})`);
		return 0;
	}

	@nativeFunctionEx(0xB29DDF9C, 150)
	@U32 sceIoDopen(@STRING path: string) {
		log.log(`sceIoDopen("${path}")`);
		return this.context.fileManager.openDirectoryAsync(path).thenFast((directory) => {
			log.log(`opened directory "${path}"`);
			return this.directoryUids.allocate(directory);
		}).catch((error) => {
			log.error(error);
			return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
		});
	}

	@nativeFunctionEx(0xEB092469, 150)
	@U32 sceIoDclose(@I32 fileId: number) {
		if (!this.directoryUids.has(fileId)) return -1;
		this.directoryUids.get(fileId).close();
		this.directoryUids.remove(fileId);
		return 0;
	}

	@nativeFunctionEx(0xE3EB004C, 150)
	@I32 sceIoDread(@I32 fileId: number, @PTR hleIoDirentPtr: Stream) {
		if (!this.directoryUids.has(fileId)) return -1;
        const directory = this.directoryUids.get(fileId);
		if (directory.left > 0) {
            const stat = directory.read();
            const hleIoDirent = new HleIoDirent();
			hleIoDirent.name = stat.name ?? '';
			hleIoDirent.stat = this._vfsStatToSceIoStat(stat);
			hleIoDirent.privateData = 0;
			HleIoDirent.struct.write(hleIoDirentPtr, hleIoDirent);
		}
		return directory.left;
	}

	@nativeFunctionEx(0xB293727F, 150)
	@I32 sceIoChangeAsyncPriority(@I32 fileId: number, @I32 priority: number) {
		return 0;
	}

	_seek(fileId: number, offset: number, whence: number) {
		if (!this.hasFileById(fileId)) return SceKernelErrors.ERROR_ERRNO_FILE_NOT_FOUND;
        const file = this.getFileById(fileId);
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

