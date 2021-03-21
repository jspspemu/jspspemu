import { EmulatorControllerNormal } from './emulator_controller_normal';

interface IBaseEmulatorController {
	init(): void;
	executeUrl(url: string): void;
	executeFile(file: File): void;
}

let controller: IBaseEmulatorController = new EmulatorControllerNormal();

export class EmulatorController {
	static executeUrl(url: string) {
		controller.executeUrl(url);
	}

	static executeFile(file: File) {
		controller.executeFile(file);
	}
}

controller.init();
