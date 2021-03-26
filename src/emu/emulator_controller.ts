import {EmulatorControllerNormal, IBaseEmulatorController} from './emulator_controller_normal';

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
