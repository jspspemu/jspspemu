///<reference path="global.d.ts" />
///<reference path="emulator_worker.ts" />

import _controller = require('./core/controller');
import _emulator = require('./emulator');
import { EmulatorController } from './emulator_controller';

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

declare var emulator: Emulator;

/*
var touch_overlay = document.getElementById('touch_overlay');

class ControllerPlugin {
	static use() {
		var rects: Rect[] = [];

		var generateRects = (() => {
			var overlay_pos = { top: touch_overlay.offsetTop, left: touch_overlay.offsetLeft };
			var overlay_width = touch_overlay.offsetWidth, overlay_height = touch_overlay.offsetHeight;
			[
				{ query: 'button_menu', button: 0 },
				{ query: 'button_select', button: PspCtrlButtons.select },
				{ query: 'button_start', button: PspCtrlButtons.start },
				{ query: 'button_up', button: PspCtrlButtons.up },
				{ query: 'button_left', button: PspCtrlButtons.left },
				{ query: 'button_down', button: PspCtrlButtons.down },
				{ query: 'button_right', button: PspCtrlButtons.right },
				{ query: 'button_l', button: PspCtrlButtons.leftTrigger },
				{ query: 'button_r', button: PspCtrlButtons.rightTrigger },
				{ query: 'button_cross', button: PspCtrlButtons.cross },
				{ query: 'button_circle', button: PspCtrlButtons.circle },
				{ query: 'button_square', button: PspCtrlButtons.square },
				{ query: 'button_triangle', button: PspCtrlButtons.triangle },
			].forEach(button => {
				var query = document.getElementById(button.query);
				var item_pos = { top: query.offsetTop, left: query.offsetLeft };
				var query_width = query.offsetWidth, query_height = query.offsetHeight;

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
			var overlay_pos = { top: touch_overlay.offsetTop, left: touch_overlay.offsetLeft };
			var overlay_width = touch_overlay.offsetWidth, overlay_height = touch_overlay.offsetHeight;

			var x = (screenX - overlay_pos.left) / overlay_width;
			var y = (screenY - overlay_pos.top) / overlay_height;

			for (let rect of rects) {
				if (((x >= rect.left) && (x < rect.right)) && ((y >= rect.top && y < rect.bottom))) {
					return rect;
				}
			}
			return null;
		});

		var touchesState: {
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
					DomHelp.fromId(touchState.rect.name).removeClass('pressed');
					simulateButtonUp(touchState.rect.button);
				}

				touchState.rect = rect;

				if (rect) {
					DomHelp.fromId(rect.name).addClass('pressed');
					simulateButtonDown(rect.button);
				}
			}
		}

		function touchEnd(touches: Touch[]) {
			for (var touch of touches) {
				var touchState = touchesState[touch.identifier];

				if (touchState && touchState.rect) {
					DomHelp.fromId(touchState.rect.name).removeClass('pressed');
					simulateButtonUp(touchState.rect.button);
				}

				delete touchesState[touch.identifier];
			}
		}

		DomHelp.fromId('touch_overlay').on('touchstart', (e: any) => {
			touchStart(e.originalEvent['changedTouches']);
			e.preventDefault();
		});

		DomHelp.fromId('touch_overlay').on('touchmove', (e: any) => {
			touchMove(e.originalEvent['changedTouches']);
			e.preventDefault();
		});

		DomHelp.fromId('touch_overlay').on('touchend', (e: any) => {
			touchEnd(e.originalEvent['changedTouches']);
			e.preventDefault();
		});

		//$('#touch_overlay').mouseover((e) => { updatePos(e.clientX, e.clientY); });
		var pressing = false;

		function generateTouchEvent(x: number, y: number) { return { clientX: x, clientY: y, identifier: 0 }; }

		DomHelp.fromId('touch_overlay').mousedown((e) => {
			pressing = true;
			touchStart([generateTouchEvent(e.clientX, e.clientY)]);
		});
		DomHelp.fromId('touch_overlay').mouseup((e) => {
			pressing = false;
			touchEnd([generateTouchEvent(e.clientX, e.clientY)]);
		});
		DomHelp.fromId('touch_overlay').mousemove((e) => {
			if (pressing) {
				touchMove([generateTouchEvent(e.clientX, e.clientY)]);
			}
		});
	}
}
*/

var demos = [
    "-CPU",
	"data/benchmark/benchmark.prx",
    "compilerPerf.elf",
    "counter.elf",
    "fputest.elf",
    "vfputest.elf",
    "mytest.elf",

    "-OS",
    "rtctest.elf",
    "rtctest.pbp",
    "threadstatus.elf",
    "taskScheduler.prx",
    "power.pbp",
    "controller.elf",

    "-IO",
    "mstick.pbp",
    "cwd.elf",
    "ioasync.pbp",

    "-AUDIO",
    "polyphonic.elf",

    "-DISPLAY",
    "displayWait.prx",
    "minifire.elf",
    "HelloWorldPSP.elf",

    "-GPU",
    "2dstudio.prx",
    "3dstudio.pbp",
    "ortho.elf",
    "cube.elf",
	"cube.cso",
    "cube.iso",
    "cubevfpu.prx",
    "lights.pbp",
    "skinning.pbp",
    "morph.pbp",
    "morphskin.pbp",
    "sprite.pbp",
    "lines.pbp",
    "clut.pbp",
    "reflection.pbp",
    "text.elf",
    "intraFontTest.elf",
    "blend.pbp",
    "nehetutorial02.pbp",
    "nehetutorial03.pbp",
    "nehetutorial04.pbp",
    "nehetutorial05.pbp",
    "nehetutorial06.pbp",
    "nehetutorial07.pbp",
    "nehetutorial08.pbp",
    "nehetutorial09.pbp",
    "nehetutorial10.pbp",
    "zbufferfog.elf",

    "-GAMES",
    "cavestory.zip",
    "TrigWars.zip",
    "goldminer.zip",
    "Doom.zip",
    "cdogs.zip",
    "jazz.zip",
    "SkyRoads.zip",
    "PSPTris.zip",
    "Alex4C.zip",
    //"reminiscence/EBOOT.PBP",
    //"UraKaitenPatissierPSP/EBOOT.PBP",
    //"Doom/EBOOT.PBP",
];

DomHelp.fromId('demo_list').html = '';
DomHelp.fromId('files').html = '';
var selectedItem = document.location.hash.substr(1);

function selectFile(file: any) {
	console.clear();
	document.location.hash = file;
	document.location.reload();
}

//$('#files').append('<option value="">-- DEMOS --</option>');
demos.forEach(function(fileName) {
	/*
	if (fileName.substr(0, 1) == '-') {
		$('#files').append($('<option disabled style="background:#eee;">' + fileName.substr(1) + '</option>'));
		$('#demo_list').append($('<li><label class="control-label">' + fileName.substr(1) + '</label></li>'));
	} else {
		var path = (fileName.indexOf('/') >= 0) ? fileName : ('samples/' + fileName);

		//<li class="active"><a href="#">Home</a></li>
		//<li><a href="#">Profile</a></li>
		//<li><a href="#">Messages</a></li>

		$('#demo_list').append($('<li class="' + ((selectedItem == path) ? 'active' : '') + '"><a href="javascript:void(0)" onclick="selectFile(\'' + path + '\')">' + fileName + '</a></li>'));

		var item = $('<option value="' + path + '">' + fileName + '</option>');
		if (selectedItem == path) item.attr('selected', 'selected')
		$('#files').append(item);
	}
	*/
});
DomHelp.fromId('files').on('change', () => {
	selectFile(DomHelp.fromId('files').val());
});


new DomHelp(window).on('hashchange', function() {
	console.clear();
	emulator.downloadAndExecuteAsync(document.location.hash.substr(1));
});
//$(document.body).click(function (e) { e.preventDefault() });
//$(document.body).mousedown(function (e) { e.preventDefault() });
//$(document.body).mouseup(function (e) { e.preventDefault() });

//$(window).on('select', function (e) { e.preventDefault() });
//<a href="index.html?' + fileName + '" style="color:white;">

//$('#touch_buttons_font').css('display', 'block');

class FillScreenPlugin {
	static use() {
		function updateScaleWith(scale: number) {
			var width = 480 * scale, height = 272 * scale;
			//console.info(sprintf('updateScale: %f, %dx%d', scale, width, height));
			DomHelp.fromId('body').width = width;
			DomHelp.fromId('canvas').css('width', width + 'px').css('height', height + 'px');
			DomHelp.fromId('webgl_canvas').css('width', width + 'px').css('height', height + 'px');
			DomHelp.fromId('touch_buttons').css('width', width + 'px').css('height', height + 'px').css('font-size', scale + 'em');
			//DomHelp.fromId('touch_overlay').css('width', width + 'px').css('height', height + 'px').css('font-size', scale + 'em');

			//$('#touch_buttons').css('transform', 'scale(' + scale + ')').css('-webkit-transform', 'scale(' + scale + ')');
		}

		function onResize() {
			var position = DomHelp.fromId('canvas_container').position;
			var windowSize = new DomHelp(window).size;
			//var availableHeight = $(window).height() - position.top * 2;
			var availableHeight = windowSize.height - position.top;
			var availableWidth = windowSize.width;

			var scale1 = availableHeight / 272;
			var scale2 = availableWidth / 480;
			var steps = 0.5;
			var scale = Math.min(scale1, scale2);
			//scale = Math.floor(scale * (1 / steps)) / (1 / steps);

			if (scale < steps) scale = steps;

			updateScaleWith(scale);

			var _document: any = document;
			var isFullScreen = (_document.webkitIsFullScreen || _document.mozIsFullScreen) || ((screen.availHeight || screen.height - 30) <= window.innerHeight);

			if (window.innerHeight > window.innerWidth) isFullScreen = false;

			new DomHelp(document.body).toggleClass('fullscreen', isFullScreen);

			DomHelp.fromId('touch_buttons').css('display', isTouchDevice() ? 'block' : 'none');
			if (windowSize.height >= DomHelp.fromId('canvas').height * 2) {
				DomHelp.fromId('touch_buttons').e.className = 'standalone';
			} else {
				DomHelp.fromId('touch_buttons').e.className = '';
			}
		}

		new DomHelp(window).on('resize', (e) => { onResize(); });
		onResize();
	}
}

function requestFullScreen() {
	var _document: any = document;
	if (_document.body['requestFullScreen']) {
		_document.body['requestFullScreen']();
	} else if (_document.body['webkitRequestFullScreen']) {
		_document.body['webkitRequestFullScreen']();
	} else if (_document.body['mozRequestFullScreen']) {
		_document.body['mozRequestFullScreen']();
	}
}

/*
interface Window {  
	URL: any;
}
*/


window.addEventListener('load', () => {
	
	var emulator = new Emulator();
	var _window: any = window;
	_window['emulator'] = emulator;
	var sampleDemo: string = undefined;

	if (document.location.hash) {
		sampleDemo = document.location.hash.substr(1);
		if (sampleDemo.startsWith('samples/')) {
			sampleDemo = 'data/' + sampleDemo;
		}
	}

	if (sampleDemo) {
		//emulator.downloadAndExecuteAsync(sampleDemo);
		EmulatorController.executeUrl(sampleDemo);
	}

	emulator.checkPlugins();

	//ControllerPlugin.use();
	FillScreenPlugin.use();
	
	DomHelp.fromId('load_file').on('change', (e) => {
		var target: any = e.target;
		if (target.files && target.files.length > 0) {
			console.clear();
			emulator.executeFileAsync(target.files[0]);
		}
	});
	
	DomHelp.fromId('body').removeClass('unready'); 
});
