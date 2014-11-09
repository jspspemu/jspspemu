///<reference path="global.d.ts" />
var _controller = require('./core/controller');
var _emulator = require('./emulator');
var PspCtrlButtons = _controller.PspCtrlButtons;
var Emulator = _emulator.Emulator;
function controllerRegister() {
    var rects = [];
    var generateRects = (function () {
        var overlay_query = $('#touch_overlay');
        var overlay_pos = overlay_query.offset();
        var overlay_width = overlay_query.width(), overlay_height = overlay_query.height();
        [
            { query: '#button_menu', button: 0 },
            { query: '#button_select', button: 1 /* select */ },
            { query: '#button_start', button: 8 /* start */ },
            { query: '#button_up', button: 16 /* up */ },
            { query: '#button_left', button: 128 /* left */ },
            { query: '#button_down', button: 64 /* down */ },
            { query: '#button_right', button: 32 /* right */ },
            { query: '#button_l', button: 256 /* leftTrigger */ },
            { query: '#button_r', button: 512 /* rightTrigger */ },
            { query: '#button_cross', button: 16384 /* cross */ },
            { query: '#button_circle', button: 8192 /* circle */ },
            { query: '#button_square', button: 32768 /* square */ },
            { query: '#button_triangle', button: 4096 /* triangle */ },
        ].forEach(function (button) {
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
    var locateRect = (function (screenX, screenY) {
        var overlay_query = $('#touch_overlay');
        var overlay_pos = overlay_query.offset();
        var overlay_width = overlay_query.width(), overlay_height = overlay_query.height();
        var x = (screenX - overlay_pos.left) / overlay_width;
        var y = (screenY - overlay_pos.top) / overlay_height;
        for (var n = 0; n < rects.length; n++) {
            var rect = rects[n];
            if (((x >= rect.left) && (x < rect.right)) && ((y >= rect.top && y < rect.bottom))) {
                return rect;
            }
        }
        return null;
    });
    var touchesState = {};
    function simulateButtonDown(button) {
        if (window['emulator'].controller)
            window['emulator'].controller.simulateButtonDown(button);
    }
    function simulateButtonUp(button) {
        if (window['emulator'].controller)
            window['emulator'].controller.simulateButtonUp(button);
    }
    function touchStart(touches) {
        for (var n = 0; n < touches.length; n++) {
            var touch = touches[n];
            touchesState[touch.identifier] = { rect: null };
        }
        touchMove(touches);
    }
    function touchMove(touches) {
        for (var n = 0; n < touches.length; n++) {
            var touch = touches[n];
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
    function touchEnd(touches) {
        for (var n = 0; n < touches.length; n++) {
            var touch = touches[n];
            var touchState = touchesState[touch.identifier];
            if (touchState && touchState.rect) {
                $(touchState.rect.name).removeClass('pressed');
                simulateButtonUp(touchState.rect.button);
            }
            delete touchesState[touch.identifier];
        }
    }
    $('#touch_overlay').on('touchstart', function (e) {
        touchStart(e.originalEvent['changedTouches']);
        e.preventDefault();
    });
    $('#touch_overlay').on('touchmove', function (e) {
        touchMove(e.originalEvent['changedTouches']);
        e.preventDefault();
    });
    $('#touch_overlay').on('touchend', function (e) {
        touchEnd(e.originalEvent['changedTouches']);
        e.preventDefault();
    });
    //$('#touch_overlay').mouseover((e) => { updatePos(e.clientX, e.clientY); });
    var pressing = false;
    function generateTouchEvent(x, y) {
        return { clientX: x, clientY: y, identifier: 0 };
    }
    $('#touch_overlay').mousedown(function (e) {
        pressing = true;
        touchStart([generateTouchEvent(e.clientX, e.clientY)]);
    });
    $('#touch_overlay').mouseup(function (e) {
        pressing = false;
        touchEnd([generateTouchEvent(e.clientX, e.clientY)]);
    });
    $('#touch_overlay').mousemove(function (e) {
        if (pressing) {
            touchMove([generateTouchEvent(e.clientX, e.clientY)]);
        }
    });
}
var emulator = new Emulator();
window['emulator'] = emulator;
var sampleDemo = undefined;
if (document.location.hash) {
    sampleDemo = document.location.hash.substr(1);
    if (sampleDemo.startsWith('samples/')) {
        sampleDemo = 'data/' + sampleDemo;
    }
}
else {
    $('#game_menu').show();
}
if (sampleDemo) {
    emulator.downloadAndExecuteAsync(sampleDemo);
}
$(window).load(function () {
    controllerRegister();
});
//# sourceMappingURL=app.js.map