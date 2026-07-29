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
  var GRACE = 0.08;    // seconds to let the rest of the hand land

  var g = null;        // the gesture in progress
  var multi = null;    // a two/three-finger gesture, already decided
  var touched = false; // has this device ever been touched at all?
  var tapAt = null;    // where a tap landed this frame, in game coordinates
  var screen = null;

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

  /* Screen pixels -> the 960x540 the game draws in, so a tap can be matched
     against the boxes the menus declared while drawing. */
  function toGame(cx, cy) {
    if (!screen && typeof document !== 'undefined') screen = document.getElementById('screen');
    if (!screen || !screen.getBoundingClientRect) return null;
    var r = screen.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
      x: (cx - r.left) / r.width * PW.W,
      y: (cy - r.top) / r.height * PW.H
    };
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
    /* A touch that *begins* on the boot overlay or the fullscreen button
       belongs to the DOM and the gesture layer keeps out of it. But once a
       gesture is already under way, a second finger landing on that button is
       still part of it — the button is 44px in the corner of a phone, and
       without this a two-finger tap that strays onto it quietly becomes a
       one-finger one, turning *back* into *confirm*. */
    var ui = overUI(e);
    if (ui && !g) return;
    if (!ui) e.preventDefault();

    if (!g) {
      var t = e.changedTouches[0];
      g = {
        id: t.identifier,
        ox: t.clientX, oy: t.clientY,
        t0: now(), moved: false, fingers: 0, dirs: {}
      };
    }
    // The most fingers down at any point decides what a tap means.
    var one = g.fingers <= 1;
    g.fingers = Math.max(g.fingers, e.touches.length);
    if (g.fingers <= 1) return;

    // A second finger turns the thumbstick into a gesture. Let go of whatever
    // direction the first finger was holding, or she walks on through it.
    if (one) steer(0, 0);

    /* Two fingers down is never anything but a gesture, so it happens *now*,
       on the way down, and nothing that comes after can take it away. Waiting
       for the release meant asking a question of every two-finger tap — did it
       travel, did it take too long — that a one-finger tap has to be asked and
       a gesture never did, and the answer came back wrong often enough on real
       hardware that two-finger back was simply gone. There is nothing a second
       finger could have meant instead. */
    g.spent = true;
    multi = { n: Math.min(g.fingers, 3), t: 0 };
  }

  function onTouchMove(e) {
    if (!g || overUI(e)) return;
    e.preventDefault();

    /* Only one finger steers. Two and three are gestures, and a hand makes
       them by rolling slightly — the first finger drifts well past DEAD as the
       second lands, which used to mark the gesture as a drag and throw the tap
       away. A two-finger tap that travels is still a two-finger tap. */
    if (g.fingers > 1) return;

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

    // One finger has to earn its tap: it might have been a drag. A gesture has
    // already fired on the way down and owes nothing here.
    if (!g.spent && !g.moved && now() - g.t0 < TAP_MS) {
      vtap('ok');
      tapAt = toGame(g.ox, g.oy);
    }
    steer(0, 0);
    g = null;
  }

  /* A cancelled gesture releases the thumbstick, but a two-finger tap that has
     already been decided still lands — the fingers were down, and whatever the
     browser did afterwards is not the player changing their mind. */
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

    /** Where a one-finger tap landed this frame, in game coordinates. */
    tap: function () { return tapAt; },

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
      tapAt = null;

      /* The gesture was decided when the fingers landed; this only waits long
         enough for the rest of the hand to arrive, so that a third finger is
         still a third finger and not a slow second one. It fires *after* the
         frame has been cleared, so the edge is there to be read next frame
         instead of being wiped the moment it is made. */
      if (multi) {
        multi.t += dt;
        if (multi.t >= GRACE) {
          vtap(TAP_KEY[multi.n] || 'ok');
          multi = null;
        }
      }
    },

    /** Drop any queued edges — used when scenes swap so a keypress isn't eaten twice. */
    flush: function () { pressed = {}; released = {}; tapAt = null; }
  };
})();
