import {Stream} from "../../global/stream";
import {StructClass, UInt32} from "../../global/struct";
import {SceKernelErrors} from "../SceKernelErrors";
import {ProxyVfs, Vfs} from "./vfs";
import {CallbackManager} from "../manager/callback";
import {Memory} from "../../core/memory";

export class MemoryStickVfs extends ProxyVfs {
	constructor(parentVfsList: Vfs[], private callbackManager: CallbackManager, private memory: Memory) {
		super(parentVfsList);
	}

	devctlAsync(command: CommandType, input: Stream, output: Stream): any {
		switch (command) {
			case CommandType.CheckInserted:
				if (output == null || output.length < 4) return SceKernelErrors.ERROR_ERRNO_INVALID_ARGUMENT;
				// 0 - Device is not assigned (callback not registered).
				// 1 - Device is assigned (callback registered).
				output.writeInt32(1);
				return 0;
			case CommandType.MScmRegisterMSInsertEjectCallback:
				if (input == null || input.length < 4) return SceKernelErrors.ERROR_ERRNO_INVALID_ARGUMENT;
                const callbackId = input.readInt32();

                this.callbackManager.notify(callbackId, 1);

				return 0
			case CommandType.MScmUnregisterMSInsertEjectCallback:
				// Ignore.
				return 0
			case CommandType.GetMemoryStickCapacity:
				if (input == null || input.length < 4) return SceKernelErrors.ERROR_ERRNO_INVALID_ARGUMENT

                const structAddress = input.readInt32()
                const structStream = this.memory.getPointerStream(structAddress, SizeInfoStruct.struct.length)!

                const sizeInfo = new SizeInfoStruct();
                const memoryStickSectorSize = (32 * 1024);
				//const TotalSpaceInBytes = 2L * 1024 * 1024 * 1024;
				const freeSpaceInBytes = 1 * 1024 * 1024 * 1024;

				sizeInfo.sectorSize = 0x200;
				sizeInfo.sectorCount = (memoryStickSectorSize / sizeInfo.sectorSize);
				sizeInfo.maxClusters = (freeSpaceInBytes * 95 / 100) / (sizeInfo.sectorSize * sizeInfo.sectorCount);
				sizeInfo.freeClusters = sizeInfo.maxClusters;
				sizeInfo.maxSectors = sizeInfo.maxClusters;

				SizeInfoStruct.struct.write(structStream, sizeInfo);

				return 0;
			case CommandType.CheckMemoryStickIsInserted:
				output.writeInt32(1);
				return 0;
			case CommandType.CheckMemoryStickStatus:
				// 0 <- Busy
				// 1 <- Ready
				output.writeInt32(4);
				return 0;
			default:
				throw new Error(`Invalid MemoryStick command '${command}'`);
		}
	}
}

export const enum CommandType {
	CheckInserted = 0x02425823,
	MScmRegisterMSInsertEjectCallback = 0x02415821,
	MScmUnregisterMSInsertEjectCallback = 0x02415822,
	GetMemoryStickCapacity = 0x02425818,
	CheckMemoryStickIsInserted = 0x02025806,
	CheckMemoryStickStatus = 0x02025801,
}

class SizeInfoStruct {
	maxClusters: number;
	freeClusters: number;
	maxSectors: number;
	sectorSize: number;
	sectorCount: number;

	static struct = StructClass.create<SizeInfoStruct>(SizeInfoStruct, [
		{ maxClusters: UInt32 },
		{ freeClusters: UInt32 },
		{ maxSectors: UInt32 },
		{ sectorSize: UInt32 },
		{ sectorCount: UInt32 },
	]);
}
