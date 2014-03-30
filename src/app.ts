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

	createButton('#button_left', core.PspCtrlButtons.left);
	createButton('#button_up', core.PspCtrlButtons.up);
	createButton('#button_down', core.PspCtrlButtons.down);
	createButton('#button_right', core.PspCtrlButtons.right);

	createButton('#button_up_left', core.PspCtrlButtons.up | core.PspCtrlButtons.left);
	createButton('#button_up_right', core.PspCtrlButtons.up | core.PspCtrlButtons.right);
	createButton('#button_down_left', core.PspCtrlButtons.down | core.PspCtrlButtons.left);
	createButton('#button_down_right', core.PspCtrlButtons.down | core.PspCtrlButtons.right);

	createButton('#button_cross', core.PspCtrlButtons.cross);
	createButton('#button_circle', core.PspCtrlButtons.circle);
	createButton('#button_triangle', core.PspCtrlButtons.triangle);
	createButton('#button_square', core.PspCtrlButtons.square);

	createButton('#button_l', core.PspCtrlButtons.leftTrigger);
	createButton('#button_r', core.PspCtrlButtons.rightTrigger);

	createButton('#button_start', core.PspCtrlButtons.start);
	createButton('#button_select', core.PspCtrlButtons.select);

	//document['ontouchmove'] = (e) => { e.preventDefault(); };

	//document.onselectstart = () => { return false; };
}

function main() {
	var emulator = new Emulator();
	window['emulator'] = emulator;
	var sampleDemo = '';

	if (document.location.hash) {
		sampleDemo = document.location.hash.substr(1);
	}

	if (sampleDemo) {
		emulator.downloadAndExecuteAsync(sampleDemo);
	}
}
