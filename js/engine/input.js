/* PAPERWEIGHT — keyboard input with edge detection and menu auto-repeat. */
'use strict';

PW.input = (function () {
  var MAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'ok', Enter: 'ok', Space: 'ok',
    KeyX: 'back', Escape: 'back', Backspace: 'back',
    KeyC: 'menu', ShiftLeft: 'menu', ShiftRight: 'menu',
    KeyF: 'fullscreen',
    KeyM: 'mute'
  };

  var down = {};       // currently held
  var pressed = {};    // went down this frame
  var released = {};
  var repeatT = {};    // for held-direction auto repeat
  var anyKeySince = false;

  var REPEAT_DELAY = 0.34;
  var REPEAT_RATE = 0.085;

  function onDown(e) {
    var a = MAP[e.code];
    if (!a) return;
    // Stop the page scrolling / going back a page under the game.
    if (e.code === 'Space' || e.code === 'Backspace' || e.code.indexOf('Arrow') === 0) {
      e.preventDefault();
    }
    if (e.repeat) return;
    if (!down[a]) { pressed[a] = true; repeatT[a] = -REPEAT_DELAY; }
    down[a] = true;
    anyKeySince = true;
  }

  function onUp(e) {
    var a = MAP[e.code];
    if (!a) return;
    down[a] = false;
    released[a] = true;
    repeatT[a] = 0;
  }

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', function () { down = {}; repeatT = {}; });

  return {
    /** Held right now. */
    held: function (a) { return !!down[a]; },

    /** Went down during this frame. */
    hit: function (a) { return !!pressed[a]; },

    /** Went down this frame, or is held long enough to auto-repeat (menus). */
    rep: function (a) { return !!pressed[a] || repeatT[a] === 'fire'; },

    up: function (a) { return !!released[a]; },

    /** Any input at all this frame — used for "press any key" prompts. */
    any: function () {
      for (var k in pressed) if (pressed[k]) return true;
      return false;
    },

    /** -1 / 0 / +1 movement axes from held keys. */
    axisX: function () { return (down.right ? 1 : 0) - (down.left ? 1 : 0); },
    axisY: function () { return (down.down ? 1 : 0) - (down.up ? 1 : 0); },

    /** Called once per frame *after* everything has read the state. */
    endFrame: function (dt) {
      for (var a in repeatT) {
        if (repeatT[a] === 'fire') repeatT[a] = 0;
        if (down[a]) {
          repeatT[a] += dt;
          if (repeatT[a] >= REPEAT_RATE) { repeatT[a] = 'fire'; }
        }
      }
      pressed = {};
      released = {};
    },

    /** Drop any queued edges — used when scenes swap so a keypress isn't eaten twice. */
    flush: function () { pressed = {}; released = {}; }
  };
})();
