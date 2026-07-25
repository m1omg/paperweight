/* PAPERWEIGHT — the shell: canvas, main loop, scene stack, screen transitions. */
'use strict';

PW.game = (function () {
  var U = PW.util;
  var canvas, ctx;
  var stack = [];
  var last = 0, acc = 0;
  var running = false;

  // Full-screen transition veil, owned by the shell so scenes never fight over it.
  var veil = { a: 0, target: 0, speed: 2.6, color: '#0b0a14', onArrive: null, hold: 0 };
  var shake = { t: 0, mag: 0 };
  var flashes = [];
  var toasts = [];

  function fit() {
    var pad = 0;
    var aw = window.innerWidth - pad, ah = window.innerHeight - pad;
    var s = Math.min(aw / PW.W, ah / PW.H);
    canvas.style.width = Math.floor(PW.W * s) + 'px';
    canvas.style.height = Math.floor(PW.H * s) + 'px';
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = (now - last) / 1000;
    last = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.05);            // never let one long frame teleport anything

    update(dt);
    render();
    PW.input.endFrame(dt);
  }

  function arrive() {
    var cb = veil.onArrive;
    veil.onArrive = null;
    if (cb) cb();
  }

  function update(dt) {
    if (PW.state) PW.state.playtime += dt;

    if (PW.input.hit('fullscreen')) toggleFullscreen();
    if (PW.input.hit('mute')) {
      var m = PW.audio.toggleMute();
      toast(m ? 'sound off' : 'sound on');
    }

    // Veil. "Arrived" has to include already-being-there: a transition asked
    // for while the screen is still black must run its callback, not stall.
    if (veil.hold > 0) {
      veil.hold -= dt;
    } else if (veil.a !== veil.target) {
      var d = veil.speed * dt;
      if (Math.abs(veil.target - veil.a) <= d) {
        veil.a = veil.target;
        arrive();
      } else {
        veil.a += Math.sign(veil.target - veil.a) * d;
      }
    } else if (veil.onArrive) {
      arrive();
    }

    if (shake.t > 0) shake.t -= dt;

    for (var i = flashes.length - 1; i >= 0; i--) {
      flashes[i].t -= dt;
      if (flashes[i].t <= 0) flashes.splice(i, 1);
    }
    for (var j = toasts.length - 1; j >= 0; j--) {
      toasts[j].t -= dt;
      if (toasts[j].t <= 0) toasts.splice(j, 1);
    }

    // Scenes below the top may opt in to running (e.g. the field keeps
    // breathing under a dialogue box).
    var top = stack.length - 1;
    for (var k = 0; k <= top; k++) {
      var sc = stack[k];
      if (k === top) sc.update(dt);
      else if (sc.updateBelow) sc.updateBelow(dt);
    }
  }

  function render() {
    ctx.save();
    ctx.clearRect(0, 0, PW.W, PW.H);

    if (shake.t > 0) {
      var m = shake.mag * (shake.t / shake.dur);
      ctx.translate(U.rand(-m, m), U.rand(-m, m));
    }

    // Draw upward from the deepest scene that fully covers the screen.
    var from = 0;
    for (var i = stack.length - 1; i >= 0; i--) {
      if (stack[i].opaque) { from = i; break; }
    }
    for (var j = from; j < stack.length; j++) stack[j].draw(ctx);

    ctx.restore();

    for (var f = 0; f < flashes.length; f++) {
      var fl = flashes[f];
      PW.draw.fill(ctx, fl.color, (fl.t / fl.dur) * fl.strength);
    }

    if (veil.a > 0) PW.draw.fill(ctx, veil.color, veil.a);

    drawToasts();

    // Whatever the scenes just declared is what a tap can land on next frame.
    PW.ui.commit();
  }

  function drawToasts() {
    for (var i = 0; i < toasts.length; i++) {
      var t = toasts[i];
      var a = Math.min(1, t.t / 0.4);
      var y = 24 + i * 40;
      ctx.save();
      ctx.globalAlpha = a;
      var w = PW.draw.measure(ctx, t.msg, 17) + 34;
      PW.draw.panel(ctx, PW.W - w - 22, y, w, 34, {
        fill: 'rgba(28,24,44,.86)', stroke: 'rgba(246,231,196,.5)', radius: 10, shadow: false
      });
      PW.draw.text(ctx, t.msg, PW.W - 22 - w / 2, y + 8, {
        size: 17, align: 'center', color: '#f6e7c4', shadow: false
      });
      ctx.restore();
    }
  }

  function toggleFullscreen() {
    var el = document.documentElement;
    // Safari on iOS only ever had the prefixed form.
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    var on = document.fullscreenElement || document.webkitFullscreenElement;
    if (!on) { if (req) req.call(el); }
    else if (exit) { exit.call(document); }
  }

  /* ---------------------------------------------------------- scenes ---- */

  function push(sc) {
    stack.push(sc);
    PW.input.flush();
    if (sc.enter) sc.enter();
  }

  function pop() {
    var sc = stack.pop();
    if (sc && sc.exit) sc.exit();
    PW.input.flush();
    var top = stack[stack.length - 1];
    if (top && top.resumed) top.resumed();
    return sc;
  }

  function replace(sc) {
    while (stack.length) {
      var old = stack.pop();
      if (old && old.exit) old.exit();
    }
    push(sc);
  }

  return {
    boot: function (onReady) {
      canvas = document.getElementById('screen');
      ctx = canvas.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.textBaseline = 'top';
      fit();
      window.addEventListener('resize', fit);
      window.addEventListener('orientationchange', fit);
      ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
        document.addEventListener(ev, function () {
          fit();
          var on = document.fullscreenElement || document.webkitFullscreenElement;
          document.body.classList.toggle('is-fullscreen', !!on);
        });
      });

      // Touch devices get a real button, because there is no F key to press.
      var fsBtn = document.getElementById('fs');
      if (fsBtn) {
        fsBtn.addEventListener('click', function (e) {
          e.preventDefault();
          toggleFullscreen();
        });
      }
      onReady && onReady();
    },

    start: function (scene) {
      replace(scene);
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    },

    /** One frame, driven by hand. Used by the headless test harness. */
    step: function (dt) { update(dt); render(); },

    ctx: function () { return ctx; },
    stack: function () { return stack; },
    top: function () { return stack[stack.length - 1]; },
    push: push, pop: pop, replace: replace,

    /** Is a scene of this constructor already somewhere on the stack? */
    hasScene: function (name) {
      for (var i = 0; i < stack.length; i++) if (stack[i].name === name) return true;
      return false;
    },

    /* Fade to black, run `mid`, fade back. The two halves are separated so a
       scene swap always happens while the screen is fully covered. */
    transition: function (mid, opts) {
      opts = opts || {};
      veil.color = opts.color || '#0b0a14';
      veil.speed = 1 / (opts.out === undefined ? 0.35 : opts.out);
      veil.target = 1;
      veil.onArrive = function () {
        if (mid) mid();
        veil.hold = opts.hold || 0.08;
        veil.speed = 1 / (opts.in === undefined ? 0.45 : opts.in);
        veil.target = 0;
        veil.onArrive = opts.then || null;
      };
    },

    fadeOut: function (dur, color, then) {
      veil.color = color || '#0b0a14';
      veil.speed = 1 / (dur || 0.5);
      veil.target = 1;
      veil.onArrive = then || null;
    },

    fadeIn: function (dur, then) {
      veil.speed = 1 / (dur || 0.5);
      veil.target = 0;
      veil.onArrive = then || null;
    },

    veilAlpha: function () { return veil.a; },
    busy: function () { return veil.a > 0 || veil.target > 0; },

    shake: function (mag, dur) {
      shake.mag = mag; shake.t = dur || 0.35; shake.dur = dur || 0.35;
    },

    flash: function (color, strength, dur) {
      flashes.push({ color: color || '#fff', strength: strength || 0.6, t: dur || 0.25, dur: dur || 0.25 });
    },

    toast: toast,
    toggleFullscreen: toggleFullscreen
  };

  function toast(msg) { toasts.push({ msg: msg, t: 2.2 }); }
})();
