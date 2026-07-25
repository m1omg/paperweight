/* PAPERWEIGHT — small shared helpers. */
'use strict';

var PW = window.PW || {};
window.PW = PW;

PW.W = 960;
PW.H = 540;

PW.util = {
  clamp: function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },

  lerp: function (a, b, t) { return a + (b - a) * t; },

  // Ease a value toward a target at a rate independent of frame time.
  approach: function (v, target, rate, dt) {
    var t = 1 - Math.pow(1 - PW.util.clamp(rate, 0, 0.9999), dt * 60);
    return v + (target - v) * t;
  },

  smooth: function (t) { return t * t * (3 - 2 * t); },

  rand: function (a, b) { return a + Math.random() * (b - a); },

  randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },

  pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  chance: function (p) { return Math.random() < p; },

  shuffle: function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  },

  dist: function (ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  },

  inRect: function (x, y, r) {
    return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
  },

  // Deterministic pseudo-random in [0,1) from an integer seed — used for the
  // hand-lettered text wobble so it stays still between frames.
  hash: function (n) {
    n = (n << 13) ^ n;
    return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
  },

  // Wrap text to a pixel width using the canvas' current font.
  wrap: function (ctx, text, maxWidth) {
    var out = [];
    var paras = String(text).split('\n');
    for (var p = 0; p < paras.length; p++) {
      var words = paras[p].split(' ');
      var line = '';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
          out.push(line);
          line = words[i];
        } else {
          line = test;
        }
      }
      out.push(line);
    }
    return out;
  }
};
