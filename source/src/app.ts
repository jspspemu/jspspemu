///<reference path="global.d.ts" />

import _controller = require('./core/controller');
import _emulator = require('./emulator');

import PspCtrlButtons = _controller.PspCtrlButtons;
import Emulator = _emulator.Emulator;

interface Touch {
	identifier: number;
	clientX: number;
	clientY: number;
}

interface TouchEvent extends Event {
	touches: Touch[];
}

interface Rect {
	left: number;
	right: number;
	top: number;
	bottom: number;
	name: string;
	button: number;
}

declare var emulator:Emulator;

function controllerRegister() {
	var rects:Rect[] = [];

	var generateRects = (() => {
		var overlay_query = $('#touch_overlay');
		var overlay_pos = overlay_query.offset();
		var overlay_width = overlay_query.width(), overlay_height = overlay_query.height();
		[
			{ query: '#button_menu', button: 0 },
			{ query: '#button_select', button: PspCtrlButtons.select },
			{ query: '#button_start', button: PspCtrlButtons.start },
			{ query: '#button_up', button: PspCtrlButtons.up },
			{ query: '#button_left', button: PspCtrlButtons.left },
			{ query: '#button_down', button: PspCtrlButtons.down },
			{ query: '#button_right', button: PspCtrlButtons.right },
			{ query: '#button_l', button: PspCtrlButtons.leftTrigger },
			{ query: '#button_r', button: PspCtrlButtons.rightTrigger },
			{ query: '#button_cross', button: PspCtrlButtons.cross },
			{ query: '#button_circle', button: PspCtrlButtons.circle },
			{ query: '#button_square', button: PspCtrlButtons.square },
			{ query: '#button_triangle', button: PspCtrlButtons.triangle },
		].forEach(button => {
			var query = $(button.query);
			var item_pos = query.offset();
			var query_width = query.width(), query_height = query.height();

			var item_left = (item_pos.left - overlay_pos.left) / overlay_width;
			var item_right = (item_pos.left - overlay_pos.left + query_width) / overlay_width;
			var item_top = (item_pos.top - overlay_pos.top) / overlay_height;
			var item_bottom = (item_pos.top - overlay_pos.top + query_height) / overlay_height;

			rects.push({
				left: item_left,
				right: item_right,
				top: item_top,
				bottom: item_bottom,
				name: button.query,
				button: button.button
			});
		});
	});
	
	generateRects();

	var locateRect = ((screenX: number, screenY: number) => {
		var overlay_query = $('#touch_overlay');
		var overlay_pos = overlay_query.offset();
		var overlay_width = overlay_query.width(), overlay_height = overlay_query.height();

		var x = (screenX - overlay_pos.left) / overlay_width;
		var y = (screenY - overlay_pos.top) / overlay_height;

		for (let rect of rects) {
			if (((x >= rect.left) && (x < rect.right)) && ((y >= rect.top && y < rect.bottom))) {
				return rect;
			}
		}
		return null;
	});

	var touchesState:{
		[key: number]: { rect: Rect }
	} = {};

	function simulateButtonDown(button: number) {
		if (emulator.controller) emulator.controller.simulateButtonDown(button);
	}

	function simulateButtonUp(button: number) {
		if (emulator.controller) emulator.controller.simulateButtonUp(button);
	}

	function touchStart(touches: Touch[]) {
		for (var touch of touches) touchesState[touch.identifier] = { rect: null };
		touchMove(touches);
	}

	function touchMove(touches: Touch[]) {
		for (var touch of touches) {
			var rect = locateRect(touch.clientX, touch.clientY);
			var touchState = touchesState[touch.identifier];

			if (touchState.rect) {
				$(touchState.rect.name).removeClass('pressed');
				simulateButtonUp(touchState.rect.button);
			}

			touchState.rect = rect;

			if (rect) {
				$(rect.name).addClass('pressed');
				simulateButtonDown(rect.button);
			}
		}
	}

	function touchEnd(touches: Touch[]) {
		for (var touch of touches) {
			var touchState = touchesState[touch.identifier];

			if (touchState && touchState.rect) {
				$(touchState.rect.name).removeClass('pressed');
				simulateButtonUp(touchState.rect.button);
			}

			delete touchesState[touch.identifier];
		}
	}

	$('#touch_overlay').on('touchstart', (e:any) => {
		touchStart(e.originalEvent['changedTouches']);
		e.preventDefault();
	});

	$('#touch_overlay').on('touchmove', (e:any) => {
		touchMove(e.originalEvent['changedTouches']);
		e.preventDefault();
	});

	$('#touch_overlay').on('touchend', (e:any) => {
		touchEnd(e.originalEvent['changedTouches']);
		e.preventDefault();
	});

	//$('#touch_overlay').mouseover((e) => { updatePos(e.clientX, e.clientY); });
	var pressing = false;

	function generateTouchEvent(x: number, y: number) { return { clientX: x, clientY: y, identifier: 0 }; }

	$('#touch_overlay').mousedown((e) => {
		pressing = true;
		touchStart([generateTouchEvent(e.clientX, e.clientY)]);
	});
	$('#touch_overlay').mouseup((e) => {
		pressing = false;
		touchEnd([generateTouchEvent(e.clientX, e.clientY)]);
	});
	$('#touch_overlay').mousemove((e) => {
		if (pressing) {
			touchMove([generateTouchEvent(e.clientX, e.clientY)]);
		}
	});
}

var emulator = new Emulator();
var _window:any = window;
_window['emulator'] = emulator;
var sampleDemo:string = undefined;

if (document.location.hash) {
	sampleDemo = document.location.hash.substr(1);
	if (sampleDemo.startsWith('samples/')) {
		sampleDemo = 'data/' + sampleDemo;
	}
} else {
	$('#game_menu').show();
}

if (sampleDemo) {
	emulator.downloadAndExecuteAsync(sampleDemo);
}

$(window).load(() => {
	controllerRegister();
});

