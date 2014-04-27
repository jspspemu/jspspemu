import _controller = require('./core/controller');
import _emulator = require('./emulator');

import PspCtrlButtons = _controller.PspCtrlButtons;
import Emulator = _emulator.Emulator;

function controllerRegister() {
	function createButton(query, button) {
		var jq = $(query);
		function down() { jq.addClass('pressed'); window['emulator'].controller.simulateButtonDown(button); }
		function up() { jq.removeClass('pressed'); window['emulator'].controller.simulateButtonUp(button); }

		jq
			.mousedown(down)
			.mouseup(up)
			.on('touchstart', down)
			.on('touchend', up)
		;
	}

	createButton('#button_left', PspCtrlButtons.left);
	createButton('#button_up', PspCtrlButtons.up);
	createButton('#button_down', PspCtrlButtons.down);
	createButton('#button_right', PspCtrlButtons.right);

	createButton('#button_up_left', PspCtrlButtons.up | PspCtrlButtons.left);
	createButton('#button_up_right', PspCtrlButtons.up | PspCtrlButtons.right);
	createButton('#button_down_left', PspCtrlButtons.down | PspCtrlButtons.left);
	createButton('#button_down_right', PspCtrlButtons.down | PspCtrlButtons.right);

	createButton('#button_cross', PspCtrlButtons.cross);
	createButton('#button_circle', PspCtrlButtons.circle);
	createButton('#button_triangle', PspCtrlButtons.triangle);
	createButton('#button_square', PspCtrlButtons.square);

	createButton('#button_l', PspCtrlButtons.leftTrigger);
	createButton('#button_r', PspCtrlButtons.rightTrigger);

	createButton('#button_start', PspCtrlButtons.start);
	createButton('#button_select', PspCtrlButtons.select);

	//document['ontouchmove'] = (e) => { e.preventDefault(); };

	//document.onselectstart = () => { return false; };
}

var emulator = new Emulator();
window['emulator'] = emulator;
var sampleDemo = '';

if (document.location.hash) {
	sampleDemo = document.location.hash.substr(1);
}

if (sampleDemo) {
	emulator.downloadAndExecuteAsync(sampleDemo);
}
controllerRegister();