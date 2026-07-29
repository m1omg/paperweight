/* PAPERWEIGHT — headless smoke test.
 *
 * Loads every game script into a fake DOM, then drives the actual scenes for
 * thousands of frames with scripted input: walks the whole story through, wins
 * and settles battles, opens every menu. Anything that throws, hangs, or draws
 * a missing asset shows up here rather than in the browser.
 *
 *   node tools/smoke.js            full run
 *   node tools/smoke.js --verbose  print every line of dialogue as it plays
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

/* ----------------------------------------------------------- fake DOM ---- */

function fakeCanvasCtx() {
  const noop = () => {};
  const ctx = {
    canvas: { width: 960, height: 540 },
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    setTransform: noop, resetTransform: noop,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    clearRect: noop, fillRect: noop, strokeRect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, arc: noop, arcTo: noop, ellipse: noop,
    fill: noop, stroke: noop, clip: noop, setLineDash: noop,
    drawImage: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
    measureText: (s) => ({ width: String(s).length * 9.4 }),
    fillText: noop, strokeText: noop,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop
  };
  return ctx;
}

/** Width/height straight out of a PNG or JPEG header. */
function imageSize(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {      // PNG
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {          // JPEG
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      // SOF0..SOF15, skipping the four markers that are not frame headers
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

const images = {};
function fakeImage() {
  const img = { width: 256, height: 256, complete: true };
  Object.defineProperty(img, 'src', {
    set(v) {
      img._src = v;
      const p = path.join(ROOT, v);
      // Real dimensions out of the file header, so layout maths is honest.
      if (fs.existsSync(p)) {
        const d = imageSize(fs.readFileSync(p));
        if (d) { img.width = d[0]; img.height = d[1]; }
        images[v] = true;
        if (img.onload) img.onload();          // synchronous: the test has no event loop
      } else if (img.onerror) {
        img.onerror();
      }
    },
    get() { return img._src; }
  });
  return img;
}

const listeners = {};
const docListeners = {};
const store = {};

// Anything the game handed to the browser as a download, so a test can look at
// what would have landed in the downloads folder.
const downloads = [];

const el = (tag) => ({
  style: {}, classList: { add() {}, remove() {} },
  addEventListener() {}, focus() {}, hidden: false, textContent: '',
  getContext: fakeCanvasCtx, width: 960, height: 540,
  // Exporting a save builds an <a download> and clicks it. Give the fake one
  // enough of an anchor to be recognised as capable, and record the click.
  tagName: String(tag || 'div').toUpperCase(),
  download: tag === 'a' ? '' : undefined,
  href: '', type: '', accept: '', files: null,
  appendChild(c) { c.parentNode = this; return c; },
  removeChild(c) { c.parentNode = null; return c; },
  parentNode: null,
  click() { if (this.download !== undefined) downloads.push({ name: this.download, href: this.href }); },
  // The gesture layer asks the #screen element how big it is, to turn a touch
  // into game coordinates, and asks a touch target whether it is the boot
  // overlay or the fullscreen button. Answer both, or taps land nowhere.
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
  closest: () => null
});

const win = {
  innerWidth: 1920, innerHeight: 1080,
  addEventListener: (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); },
  removeEventListener() {},
  requestAnimationFrame() { return 0; },
  performance: { now: () => Date.now() },
  setTimeout: (fn, ms) => setTimeout(fn, 0),
  clearTimeout, setInterval: () => 0, clearInterval() {},
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  console,
  Image: fakeImage,
  AudioContext: undefined,          // audio disables itself cleanly
  document: {
    getElementById: el,
    body: el('body'),
    createElement: (t) => (t === 'canvas' ? { width: 0, height: 0, getContext: fakeCanvasCtx } : el(t)),
    // Touch listeners live on the document. Record them so a test can send a
    // real gesture through the real handlers instead of poking input state.
    addEventListener: (k, fn) => { (docListeners[k] = docListeners[k] || []).push(fn); },
    removeEventListener() {},
    documentElement: { requestFullscreen() {} },
    fullscreenElement: null, exitFullscreen() {}
  }
};
win.window = win;
win.globalThis = win;
win.self = win;

const sandbox = vm.createContext(win);
sandbox.performance = win.performance;
sandbox.requestAnimationFrame = win.requestAnimationFrame;
sandbox.setTimeout = win.setTimeout;
sandbox.clearTimeout = clearTimeout;
sandbox.setInterval = win.setInterval;
sandbox.clearInterval = win.clearInterval;
sandbox.Image = fakeImage;
sandbox.document = win.document;
sandbox.localStorage = win.localStorage;

/* --------------------------------------------------------- load scripts -- */

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map((m) => m[1])
  .filter((f) => f !== 'js/main.js');

for (const f of files) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.error('MISSING SOURCE ' + f); process.exit(1); }
  try {
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.error('LOAD ERROR in ' + f + ':\n  ' + e.stack.split('\n').slice(0, 4).join('\n  '));
    process.exit(1);
  }
}

const PW = sandbox.PW;
console.log('loaded ' + files.length + ' source files');

/* ------------------------------------------------------------ harness --- */

// Track which images the game actually asks for, and whether they exist.
const missingArt = new Set();
const origImg = PW.assets.img.bind(PW.assets);
PW.assets.img = function (name) {
  if (String(name).indexOf('undefined') >= 0 && !global.__badOnce) {
    global.__badOnce = true;
    const b = PW.game.top();
    console.log('BAD ASSET ' + name + ' | state.party=' + JSON.stringify(PW.state.party) +
      ' | battle.party=' + JSON.stringify((b.party||[]).map(x=>({id:x.id, def:x.def && x.def.sprite}))));
  }
  if (!PW.assets.has(name)) missingArt.add(name);
  return origImg(name);
};

// Capture dialogue for the transcript.
const transcript = [];
const origShow = PW.DialogueBox.prototype.show;
PW.DialogueBox.prototype.show = function (who, expr, text, style) {
  transcript.push((who ? who + ': ' : '') + text);
  if (VERBOSE) console.log('   ' + (who ? '<' + who + '> ' : '| ') + text);
  return origShow.call(this, who, expr, text, style);
};

/* The real input module, kept before the scripted one replaces it. Everything
   below reads a fake `keys` object so a test can press keys without a DOM —
   but that also means the actual gesture layer is bypassed, so a touch test
   has to ask `rawInput` what genuinely happened. */
const rawInput = {
  held: PW.input.held, hit: PW.input.hit, rep: PW.input.rep, up: PW.input.up,
  any: PW.input.any, axisX: PW.input.axisX, axisY: PW.input.axisY,
  tap: PW.input.tap, endFrame: PW.input.endFrame, flush: PW.input.flush
};

// Scripted input: the test presses keys by setting these.
const keys = { down: {}, pressed: {} };
PW.input.held = (a) => !!keys.down[a];
PW.input.hit = (a) => !!keys.pressed[a];
PW.input.rep = (a) => !!keys.pressed[a];
PW.input.up = () => false;
PW.input.any = () => Object.keys(keys.pressed).length > 0;
PW.input.axisX = () => (keys.down.right ? 1 : 0) - (keys.down.left ? 1 : 0);
PW.input.axisY = () => (keys.down.down ? 1 : 0) - (keys.down.up ? 1 : 0);
PW.input.endFrame = () => { keys.pressed = {}; };
PW.input.flush = () => { keys.pressed = {}; };

PW.save.reset();
PW.game.boot();
PW.assets.load(() => {}, () => {});     // synchronous with the fake Image above

let frame = 0;
const errors = [];

function tick(press, hold) {
  keys.pressed = press ? (Array.isArray(press) ? Object.fromEntries(press.map((k) => [k, true])) : { [press]: true }) : {};
  keys.down = hold ? Object.fromEntries((Array.isArray(hold) ? hold : [hold]).map((k) => [k, true])) : {};
  frame++;
  try {
    PW.game.step(1 / 60);      // the shell's own frame, minus requestAnimationFrame
  } catch (e) {
    errors.push('frame ' + frame + ' [' + (top() && top().name) + ']: ' + e.message +
                '\n    ' + (e.stack || '').split('\n')[1]);
    if (errors.length > 12) { report(); process.exit(1); }
  }
  PW.input.endFrame(1 / 60);
}

function top() { return PW.game.top(); }

function run(n, press, hold) {
  for (let i = 0; i < n; i++) tick(i === 0 ? press : null, hold);
}

/** Advance until `fn()` is true, pressing `key` each frame. Returns success. */
function until(fn, key, limit, hold) {
  limit = limit || 3000;
  for (let i = 0; i < limit; i++) {
    if (fn()) return true;
    tick(key && i % 3 === 0 ? key : null, hold);
  }
  return false;
}

/* ----------------------------------------------------------- the tests -- */

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
}

/* --------------------------------------------------------------- touch ---- */

/** Fire a real event at whatever the gesture layer registered on `document`. */
function fire(type, ev) {
  (docListeners[type] || []).forEach((fn) => fn(ev));
}

/** Tap a real key at the handlers input.js registered on `window`. */
function key(code) {
  const e = { code, repeat: false, preventDefault() {} };
  (listeners.keydown || []).forEach((fn) => fn(e));
  (listeners.keyup || []).forEach((fn) => fn(e));
}

function touchList(points) {
  const list = points.map((p, i) => ({
    identifier: i, clientX: p[0], clientY: p[1], target: null
  }));
  list.item = (i) => list[i];
  return list;
}

function ev(points) {
  return {
    touches: touchList(points),
    changedTouches: touchList(points),
    target: { closest: () => null },
    preventDefault() {}, stopPropagation() {}
  };
}

/**
 * Let a decided multi-finger gesture out. It fires on the way down, but not
 * until the grace window has passed, so that a third finger arriving late is
 * still a third finger — which means a frame has to go by first.
 */
function settle() { rawInput.endFrame.call(PW.input, 0.1); }

/**
 * Tap with `n` fingers, the way a hand does it: every finger down, then every
 * finger up. One finger aims at (x, y); two and three are gestures and the
 * position is ignored, exactly as the gesture layer treats them.
 */
function tapFingers(n, x, y) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([(x || 480) + i * 40, (y || 270)]);
  for (let i = 1; i <= n; i++) fire('touchstart', ev(pts.slice(0, i)));
  for (let i = n - 1; i >= 0; i--) fire('touchend', ev(pts.slice(0, i)));
  if (n > 1) settle();
}

/** Press and hold a drag from (x,y) to (x+dx, y+dy) without lifting. */
function dragTo(x, y, dx, dy) {
  fire('touchstart', ev([[x, y]]));
  fire('touchmove', ev([[x + dx, y + dy]]));
}

function dragEnd(x, y) { fire('touchend', ev([])); }

module.exports = { PW, tick, run, until, check, results, errors, transcript, missingArt, top,
                   fire, key, tapFingers, dragTo, dragEnd, settle, rawInput, downloads };

if (require.main === module) {
  require('./smoke_run.js').main(module.exports);
}

function report() {
  console.log('\nerrors:');
  errors.forEach((e) => console.log('  ' + e));
}
