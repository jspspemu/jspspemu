import { EmulatorControllerNormal } from './emulator_controller_normal';
import { EmulatorControllerWorker } from './emulator_controller_worker';

interface IBaseEmulatorController {
	init(): void;
	executeUrl(url: string): void;
	executeFile(file: File): void;
}

let ENABLE_WORKERS = false;
console.info('ENABLE_WORKERS', ENABLE_WORKERS);
let controller: IBaseEmulatorController = ENABLE_WORKERS ? new EmulatorControllerWorker() : new EmulatorControllerNormal();

export class EmulatorController {
	static executeUrl(url: string) {
		controller.executeUrl(url);
	}

	static executeFile(file: File) {
		controller.executeFile(file);
	}
}

controller.init();
