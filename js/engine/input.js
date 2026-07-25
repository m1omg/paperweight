/* PAPERWEIGHT — input.
 *
 * Keyboard and touch both feed the same small set of virtual keys, so no scene
 * ever has to know which one is being used:
 *
 *   keyboard          touch
 *   ---------------   ---------------------------------------------
 *   arrows / WASD     drag anywhere — a thumbstick that follows your finger
 *   Z / Enter         tap with one finger
 *   X / Esc           tap with two fingers
 *   C / Shift         tap with three fingers
 *
 * A drag steers continuously while you hold it, and a quick flick moves a menu
 * cursor exactly one step, because crossing the dead zone produces a single key
 * edge and letting go produces the release.
 */
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

  var REPEAT_DELAY = 0.34;
  var REPEAT_RATE = 0.085;

  /* ------------------------------------------------------ virtual keys -- */

  function vpress(a) {
    if (!down[a]) { pressed[a] = true; repeatT[a] = -REPEAT_DELAY; }
    down[a] = true;
  }

  function vrelease(a) {
    down[a] = false;
    released[a] = true;
    repeatT[a] = 0;
  }

  /** A press and release in the same frame — one clean edge, nothing held. */
  function vtap(a) { vpress(a); vrelease(a); }

  /* ---------------------------------------------------------- keyboard -- */

  function onDown(e) {
    var a = MAP[e.code];
    if (!a) return;
    // Stop the page scrolling / going back a page under the game.
    if (e.code === 'Space' || e.code === 'Backspace' || e.code.indexOf('Arrow') === 0) {
      e.preventDefault();
    }
    if (e.repeat) return;
    vpress(a);
  }

  function onUp(e) {
    var a = MAP[e.code];
    if (!a) return;
    vrelease(a);
  }

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', function () { down = {}; repeatT = {}; });

  /* ------------------------------------------------------------- touch -- */

  var DEAD = 20;       // px of travel before a touch is a drag and not a tap
  var STICK = 62;      // the origin trails the finger at this distance
  var TAP_MS = 500;    // longer than this and it is not a tap either
  var DIAG = 0.38;     // how much of the vector an axis needs to count

  var g = null;        // the gesture in progress
  var touched = false; // has this device ever been touched at all?

  var TAP_KEY = { 1: 'ok', 2: 'back', 3: 'menu' };

  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
  }

  /* The boot overlay and the fullscreen button are ordinary HTML sitting above
     the canvas. Touches on them must reach the DOM as normal clicks, so the
     gesture layer ignores them entirely rather than swallowing the event. */
  function overUI(e) {
    var el = e.target;
    return !!(el && el.closest && el.closest('#boot, #fs'));
  }

  function findTouch(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  /* Turn a stick offset into held direction keys, pressing and releasing only
     on the transitions so menu auto-repeat behaves exactly as it does on a
     keyboard. Diagonals hold two keys at once, which the field already sums. */
  function steer(dx, dy) {
    var want = {};
    var mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > DEAD) {
      var nx = dx / mag, ny = dy / mag;
      if (nx > DIAG) want.right = true;
      if (nx < -DIAG) want.left = true;
      if (ny > DIAG) want.down = true;
      if (ny < -DIAG) want.up = true;
    }
    var dirs = ['up', 'down', 'left', 'right'];
    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      if (want[d] && !g.dirs[d]) vpress(d);
      else if (!want[d] && g.dirs[d]) vrelease(d);
    }
    g.dirs = want;
  }

  function onTouchStart(e) {
    touched = true;
    if (overUI(e)) return;
    e.preventDefault();

    if (!g) {
      var t = e.changedTouches[0];
      g = {
        id: t.identifier,
        ox: t.clientX, oy: t.clientY,
        t0: now(), moved: false, fingers: 0, dirs: {}
      };
    }
    // The most fingers down at any point decides what a tap means.
    g.fingers = Math.max(g.fingers, e.touches.length);
  }

  function onTouchMove(e) {
    if (!g || overUI(e)) return;
    e.preventDefault();

    var t = findTouch(e.touches, g.id);
    if (!t) return;

    var dx = t.clientX - g.ox, dy = t.clientY - g.oy;
    var mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > DEAD) g.moved = true;

    // Let the origin trail the finger, so a long drag keeps steering instead
    // of pinning itself to wherever the gesture happened to start.
    if (mag > STICK) {
      g.ox = t.clientX - dx / mag * STICK;
      g.oy = t.clientY - dy / mag * STICK;
      dx = t.clientX - g.ox;
      dy = t.clientY - g.oy;
    }
    steer(dx, dy);
  }

  function onTouchEnd(e) {
    if (!g) return;
    if (!overUI(e)) e.preventDefault();
    if (e.touches.length > 0) return;      // wait for every finger to lift

    if (!g.moved && now() - g.t0 < TAP_MS) {
      vtap(TAP_KEY[Math.min(g.fingers, 3)] || 'ok');
    }
    steer(0, 0);
    g = null;
  }

  function onTouchCancel() {
    if (g) { steer(0, 0); g = null; }
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    var opts = { passive: false };
    document.addEventListener('touchstart', onTouchStart, opts);
    document.addEventListener('touchmove', onTouchMove, opts);
    document.addEventListener('touchend', onTouchEnd, opts);
    document.addEventListener('touchcancel', onTouchCancel, opts);
  }

  /* ---------------------------------------------------------------- api -- */

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

    /** Has this device been touched? Used to label the on-screen help. */
    touched: function () { return touched; },

    /** Does it look like a touch device at all? Known before the first touch. */
    touchCapable: function () {
      if (touched) return true;
      if (typeof window === 'undefined') return false;
      if ('ontouchstart' in window) return true;
      return !!(typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    },

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
