/* PAPERWEIGHT — everything you hear is synthesised at runtime.
 *
 * There are no audio files. Music is played by a look-ahead scheduler that
 * builds each note out of oscillators, and the whole music bus runs through a
 * tape-wobble delay, a gentle low-pass and a generated convolution reverb, so
 * it comes out soft, warm and a little worn — the sound of a room remembering
 * a song rather than a song being played in it.
 */
'use strict';

PW.audio = (function () {
  var U = PW.util;
  var ctx = null;
  var ready = false;
  var muted = false;

  var master, comp, musicBus, musicGain, sfxBus, sfxGain;
  var wobbleDelay, wobbleLFO, wobbleDepth, tone, verb, verbSend, sfxVerbSend;

  var song = null, songName = null;
  var nextNoteTime = 0, beat = 0, timer = null;
  var bpm = 72;
  var fadeReq = null;
  var tension = 0;     // 0 = warm, 1 = tense: darkens the tone and deepens wobble

  var LOOKAHEAD = 0.12;   // seconds scheduled ahead of the clock
  var TICK = 25;          // scheduler interval, ms

  /* ------------------------------------------------------------- setup -- */

  function makeReverb(seconds, decay, damp) {
    var rate = ctx.sampleRate;
    var len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var t = i / len;
        // Noise shaped by an exponential tail, then one-pole low-passed so the
        // reverb tail darkens as it decays instead of hissing.
        var n = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        last = last + damp * (n - last);
        d[i] = last * (0.35 + 0.65 * (1 - t));
      }
    }
    return buf;
  }

  function init() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    master = ctx.createGain(); master.gain.value = 0.9;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 26;
    comp.ratio.value = 3.2; comp.attack.value = 0.006; comp.release.value = 0.28;
    master.connect(comp); comp.connect(ctx.destination);

    verb = ctx.createConvolver();
    verb.buffer = makeReverb(3.2, 2.6, 0.28);
    var verbOut = ctx.createGain(); verbOut.gain.value = 0.9;
    verb.connect(verbOut); verbOut.connect(master);

    // --- music chain: bus -> wobble -> tone -> (dry + reverb send) --------
    musicBus = ctx.createGain(); musicBus.gain.value = 1;
    musicGain = ctx.createGain(); musicGain.gain.value = 0.0;

    wobbleDelay = ctx.createDelay(0.1);
    wobbleDelay.delayTime.value = 0.006;
    wobbleLFO = ctx.createOscillator();
    wobbleLFO.type = 'sine'; wobbleLFO.frequency.value = 0.42;
    wobbleDepth = ctx.createGain(); wobbleDepth.gain.value = 0.0016;
    wobbleLFO.connect(wobbleDepth); wobbleDepth.connect(wobbleDelay.delayTime);
    wobbleLFO.start();

    tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 5200; tone.Q.value = 0.4;

    musicBus.connect(wobbleDelay);
    wobbleDelay.connect(tone);
    tone.connect(musicGain);
    musicGain.connect(master);
    verbSend = ctx.createGain(); verbSend.gain.value = 0.42;
    musicGain.connect(verbSend); verbSend.connect(verb);

    // --- sfx chain --------------------------------------------------------
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1;
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.85;
    sfxBus.connect(sfxGain); sfxGain.connect(master);
    sfxVerbSend = ctx.createGain(); sfxVerbSend.gain.value = 0.16;
    sfxGain.connect(sfxVerbSend); sfxVerbSend.connect(verb);

    ready = true;
    return true;
  }

  function resume() {
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* -------------------------------------------------------------- notes -- */

  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  /* Note names are pitches; bare numbers are literal hertz. The percussion
     parts are written as hertz (60 = kick, 420 = rim, 1400 = brush), so they
     must not be run through the note maths — that overflows to Infinity. */
  function freq(note) {
    if (typeof note === 'number') return note;
    var m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(String(note));
    if (!m) return 440;
    var s = SEMI[m[1].toUpperCase()];
    if (m[2] === '#') s++; else if (m[2] === 'b') s--;
    var midi = (parseInt(m[3], 10) + 1) * 12 + s;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function env(param, t, a, d, s, r, peak, sustain) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
    param.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d);
    param.setValueAtTime(Math.max(0.0001, sustain), t + Math.max(a + d, s));
    param.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, s) + r);
  }

  function osc(type, f, t, detune) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.setValueAtTime(detune, t);
    return o;
  }

  var noiseCache = {};
  function noiseBuf(sec) {
    // Percussion asks for the same length several times a second; one buffer
    // per length is plenty, and nobody can hear the repetition under a filter.
    var key = sec.toFixed(2);
    if (noiseCache[key]) return noiseCache[key];
    var len = Math.max(1, Math.floor(ctx.sampleRate * sec));
    var b = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseCache[key] = b;
    return b;
  }

  /* -------------------------------------------------------- instruments -- */
  /* Each returns nothing; it schedules its own teardown. `out` is a bus. */

  var INST = {};

  /* Felt piano: a small stack of partials, each decaying faster than the last. */
  INST.piano = function (out, f, t, dur, vel) {
    var PART = [[1, 1.0, 1.0], [2, 0.30, 0.62], [3, 0.14, 0.42], [4.02, 0.07, 0.3]];
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.9);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(9000, f * 9 + 900), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(320, f * 2.4), t + dur + 0.5);
    g.connect(lp); lp.connect(out);
    PART.forEach(function (p) {
      var o = osc('sine', f * p[0], t, (Math.random() - 0.5) * 4);
      var pg = ctx.createGain();
      pg.gain.setValueAtTime(0.0001, t);
      pg.gain.linearRampToValueAtTime(p[1], t + 0.006);
      pg.gain.exponentialRampToValueAtTime(0.0001, t + (dur + 0.8) * p[2]);
      o.connect(pg); pg.connect(g);
      o.start(t); o.stop(t + dur + 1.1);
    });
  };

  /* Music box: bright, inharmonic, very short bloom then a long shimmer. */
  INST.box = function (out, f, t, dur, vel) {
    var PART = [[1, 1], [2.76, 0.34], [5.4, 0.13], [8.9, 0.05]];
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.34, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.5) + 1.4);
    g.connect(out);
    PART.forEach(function (p, i) {
      var o = osc('sine', f * p[0], t);
      var pg = ctx.createGain();
      pg.gain.setValueAtTime(p[1], t);
      pg.gain.exponentialRampToValueAtTime(0.0001, t + (1.5 - i * 0.28));
      o.connect(pg); pg.connect(g);
      o.start(t); o.stop(t + 1.8);
    });
  };

  /* Warm pad: two drifting saws under a slow filter. */
  INST.pad = function (out, f, t, dur, vel) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.09, t + 0.6);
    g.gain.setValueAtTime(vel * 0.09, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(f * 2.2 + 180, t);
    lp.frequency.linearRampToValueAtTime(f * 4.5 + 400, t + dur * 0.6);
    lp.frequency.linearRampToValueAtTime(f * 1.8 + 150, t + dur + 1.0);
    g.connect(lp); lp.connect(out);
    [-7, 6].forEach(function (d) {
      var o = osc('sawtooth', f, t, d);
      var og = ctx.createGain(); og.gain.value = 0.5;
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + dur + 1.4);
    });
  };

  /* Breathy choir-ish voice with vibrato — used sparingly, for aching moments. */
  INST.voice = function (out, f, t, dur, vel) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.15, t + 0.35);
    g.gain.setValueAtTime(vel * 0.15, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.8);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = f * 2.4; bp.Q.value = 1.6;
    g.connect(bp); bp.connect(out);
    var o = osc('sawtooth', f, t);
    var vib = osc('sine', 5.1, t);
    var vg = ctx.createGain(); vg.gain.value = f * 0.011;
    vib.connect(vg); vg.connect(o.frequency);
    o.connect(g);
    o.start(t); vib.start(t);
    o.stop(t + dur + 1.0); vib.stop(t + dur + 1.0);
  };

  /* Round sub bass. */
  INST.bass = function (out, f, t, dur, vel) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.42, t + 0.02);
    g.gain.setValueAtTime(vel * 0.34, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380;
    g.connect(lp); lp.connect(out);
    var o = osc('triangle', f, t);
    var o2 = osc('sine', f * 0.5, t);
    var g2 = ctx.createGain(); g2.gain.value = 0.5;
    o.connect(g); o2.connect(g2); g2.connect(g);
    o.start(t); o2.start(t); o.stop(t + dur + 0.4); o2.stop(t + dur + 0.4);
  };

  /* Nylon-ish pluck. */
  INST.pluck = function (out, f, t, dur, vel) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.3, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.35) + 0.3);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(f * 7 + 600, t);
    lp.frequency.exponentialRampToValueAtTime(f * 1.5 + 200, t + 0.4);
    g.connect(lp); lp.connect(out);
    var o = osc('triangle', f, t);
    var o2 = osc('sawtooth', f, t, 8);
    var g2 = ctx.createGain(); g2.gain.value = 0.22;
    o.connect(g); o2.connect(g2); g2.connect(g);
    o.start(t); o2.start(t);
    o.stop(t + dur + 0.5); o2.stop(t + dur + 0.5);
  };

  /* Soft brushed percussion. type via pitch: low=kick, mid=rim, high=brush. */
  INST.perc = function (out, f, t, dur, vel) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf(0.4);
    var bp = ctx.createBiquadFilter();
    bp.type = f < 120 ? 'lowpass' : 'bandpass';
    bp.frequency.value = f < 120 ? 180 : f * 3;
    bp.Q.value = f < 120 ? 1 : 0.9;
    var g = ctx.createGain();
    var decay = f < 120 ? 0.16 : (f > 900 ? 0.09 : 0.13);
    g.gain.setValueAtTime(vel * (f < 120 ? 0.5 : 0.16), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(bp); bp.connect(g); g.connect(out);
    src.start(t); src.stop(t + 0.45);
    if (f < 120) {  // add a body thump to the kick
      var o = osc('sine', 92, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      var og = ctx.createGain();
      og.gain.setValueAtTime(vel * 0.6, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
      o.connect(og); og.connect(out);
      o.start(t); o.stop(t + 0.25);
    }
  };

  /* A low, slow, wrong-feeling drone. */
  INST.drone = function (out, f, t, dur, vel) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.13, t + 1.2);
    g.gain.setValueAtTime(vel * 0.13, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.6);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 2;
    g.connect(lp); lp.connect(out);
    [0, 13, -11].forEach(function (d) {
      var o = osc('sawtooth', f, t, d);
      var og = ctx.createGain(); og.gain.value = 0.33;
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + dur + 1.8);
    });
  };

  /* ---------------------------------------------------------- sequencer -- */

  function scheduleBeat(b, when) {
    if (!song) return;
    for (var i = 0; i < song.tracks.length; i++) {
      var tr = song.tracks[i];
      var inst = INST[tr.inst] || INST.piano;
      var tg = tr.gain === undefined ? 1 : tr.gain;
      for (var j = 0; j < tr.notes.length; j++) {
        var n = tr.notes[j];
        if (n[0] !== b) continue;
        var dur = (n[2] === undefined ? 1 : n[2]) * (60 / bpm);
        var vel = (n[3] === undefined ? 1 : n[3]) * tg;
        var pitches = Array.isArray(n[1]) ? n[1] : [n[1]];
        for (var k = 0; k < pitches.length; k++) {
          if (pitches[k] === null) continue;
          inst(musicBus, freq(pitches[k]), when, dur, vel);
        }
      }
    }
  }

  function tick() {
    if (!song || !ctx) return;
    var spb = 60 / bpm;
    while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
      scheduleBeat(beat, Math.max(nextNoteTime, ctx.currentTime + 0.01));
      beat++;
      if (beat >= song.length) beat = song.loopFrom || 0;
      nextNoteTime += spb;
    }
  }

  function startSong(name) {
    var s = PW.music && PW.music[name];
    if (!s) { stopMusic(0.6); return; }
    song = s;
    songName = name;
    bpm = s.bpm || 72;
    beat = 0;
    nextNoteTime = ctx.currentTime + 0.08;
    if (timer) clearInterval(timer);
    timer = setInterval(tick, TICK);
    var g = musicGain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(0.0001, g.value), ctx.currentTime);
    g.linearRampToValueAtTime(muted ? 0 : (s.volume === undefined ? 0.62 : s.volume),
                              ctx.currentTime + (s.fadeIn || 1.1));
    applyTension();
  }

  function play(name, opts) {
    opts = opts || {};
    if (!ready && !init()) return;
    resume();
    if (songName === name && !opts.restart) return;
    if (!songName || opts.hard) { songName = name; startSong(name); return; }
    // Cross-fade: duck the old song out, then swap.
    var out = opts.fade === undefined ? 0.8 : opts.fade;
    var g = musicGain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0.0001, ctx.currentTime + out);
    songName = name;
    if (fadeReq) clearTimeout(fadeReq);
    fadeReq = setTimeout(function () { startSong(name); }, out * 1000);
  }

  function stopMusic(fade) {
    if (!ready) return;
    fade = fade === undefined ? 1.0 : fade;
    var g = musicGain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0.0001, ctx.currentTime + fade);
    songName = null;
    if (fadeReq) clearTimeout(fadeReq);
    fadeReq = setTimeout(function () {
      if (timer) { clearInterval(timer); timer = null; }
      song = null;
    }, fade * 1000 + 60);
  }

  function applyTension() {
    if (!ready) return;
    var t = ctx.currentTime;
    tone.frequency.linearRampToValueAtTime(5200 - tension * 3100, t + 1.5);
    wobbleDepth.gain.linearRampToValueAtTime(0.0016 + tension * 0.004, t + 1.5);
    wobbleLFO.frequency.linearRampToValueAtTime(0.42 + tension * 0.9, t + 1.5);
  }

  /* --------------------------------------------------------------- sfx --- */

  var SFX = {};

  function tone1(type, f, t, dur, vel, sweepTo, filt) {
    var o = osc(type, f, t);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var node = g;
    if (filt) {
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = filt;
      g.connect(lp); node = lp;
    }
    o.connect(g); node.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise1(t, dur, vel, type, f, q, sweepTo) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf(Math.min(2, dur + 0.1));
    var bp = ctx.createBiquadFilter();
    bp.type = type || 'bandpass'; bp.frequency.setValueAtTime(f, t);
    if (q) bp.Q.value = q;
    if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.1);
  }

  SFX.blip = function (t) { tone1('triangle', U.rand(560, 700), t, 0.045, 0.10, null, 2400); };
  SFX.blip_low = function (t) { tone1('triangle', U.rand(300, 380), t, 0.055, 0.11, null, 1800); };
  SFX.cursor = function (t) { tone1('square', 720, t, 0.05, 0.07, null, 2600); };
  SFX.confirm = function (t) {
    tone1('triangle', 620, t, 0.09, 0.14, null, 3000);
    tone1('triangle', 930, t + 0.055, 0.14, 0.11, null, 3600);
  };
  SFX.cancel = function (t) { tone1('triangle', 400, t, 0.11, 0.12, 250, 1800); };
  SFX.error = function (t) { tone1('square', 190, t, 0.16, 0.10, 150, 900); };

  SFX.hit = function (t) {
    noise1(t, 0.13, 0.30, 'bandpass', 900, 0.8, 300);
    tone1('triangle', 210, t, 0.11, 0.22, 90, 1200);
  };
  SFX.crit = function (t) {
    noise1(t, 0.2, 0.36, 'bandpass', 1600, 0.7, 350);
    tone1('square', 320, t, 0.16, 0.18, 110, 1800);
    tone1('triangle', 1250, t + 0.02, 0.2, 0.12, 500, 4000);
  };
  SFX.hurt = function (t) {
    tone1('sawtooth', 260, t, 0.2, 0.16, 130, 1100);
    noise1(t, 0.16, 0.16, 'lowpass', 800);
  };
  SFX.guard = function (t) { noise1(t, 0.18, 0.2, 'bandpass', 480, 1.4); tone1('sine', 150, t, 0.2, 0.16, 110); };

  SFX.heal = function (t) {
    [660, 880, 1100, 1320].forEach(function (f, i) {
      tone1('sine', f, t + i * 0.06, 0.5, 0.09, null, 5000);
    });
  };
  SFX.sparkle = function (t) {
    for (var i = 0; i < 5; i++) tone1('sine', U.rand(1400, 2600), t + i * 0.035, 0.28, 0.055, null, 6000);
  };
  SFX.levelup = function (t) {
    ['C5', 'E5', 'G5', 'C6'].forEach(function (n, i) {
      INST.box(sfxBus, freq(n), t + i * 0.09, 0.3, 0.7);
    });
  };

  SFX.door = function (t) {
    noise1(t, 0.42, 0.14, 'lowpass', 700, 1, 200);
    tone1('sine', 120, t + 0.28, 0.18, 0.16, 70);
  };
  SFX.step = function (t) { noise1(t, 0.07, 0.055, 'bandpass', U.rand(700, 1100), 1.2); };
  SFX.water = function (t) { noise1(t, 0.3, 0.09, 'bandpass', U.rand(900, 1500), 0.7, 400); };
  SFX.flame = function (t) { noise1(t, 0.5, 0.1, 'lowpass', 1200, 1, 300); };

  SFX.glass = function (t) {
    [1860, 2480, 3140].forEach(function (f, i) {
      tone1('sine', f, t + i * 0.012, 0.9 - i * 0.2, 0.075, null, 8000);
    });
  };
  SFX.heartbeat = function (t) {
    tone1('sine', 68, t, 0.2, 0.34, 42);
    tone1('sine', 62, t + 0.26, 0.26, 0.24, 38);
  };
  SFX.erase = function (t) { noise1(t, 0.55, 0.16, 'bandpass', 2400, 0.6, 260); };
  SFX.boom = function (t) {
    tone1('sine', 90, t, 0.7, 0.4, 30);
    noise1(t, 0.6, 0.24, 'lowpass', 900, 1, 120);
  };
  SFX.chime = function (t) { INST.box(sfxBus, freq('G5'), t, 0.5, 0.8); };
  SFX.wind = function (t) { noise1(t, 1.6, 0.07, 'bandpass', 500, 0.5, 1400); };
  SFX.paper = function (t) { noise1(t, 0.16, 0.11, 'highpass', 2200, 0.5); };

  function sfx(name, delay) {
    if (!ready || muted) return;
    var fn = SFX[name];
    if (!fn) return;
    resume();
    fn(ctx.currentTime + (delay || 0) + 0.005);
  }

  /* -------------------------------------------------------------- api --- */

  return {
    init: init,
    resume: resume,
    freq: freq,
    ok: function () { return ready; },
    play: play,
    stopMusic: stopMusic,
    current: function () { return songName; },
    sfx: sfx,

    /** 0 warm .. 1 dread. Bends the whole music bus. */
    setTension: function (v) {
      tension = U.clamp(v, 0, 1);
      applyTension();
    },

    setMuted: function (m) {
      muted = m;
      if (!ready) return;
      master.gain.linearRampToValueAtTime(m ? 0.0001 : 0.9, ctx.currentTime + 0.2);
    },
    toggleMute: function () { this.setMuted(!muted); return muted; },
    isMuted: function () { return muted; },

    /** Duck the music briefly — used when something lands hard. */
    duck: function (amount, time) {
      if (!ready || !song) return;
      var g = musicGain.gain, now = ctx.currentTime;
      var base = song.volume === undefined ? 0.62 : song.volume;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(base * (1 - amount), now + 0.08);
      g.linearRampToValueAtTime(muted ? 0 : base, now + (time || 1.2));
    }
  };
})();
