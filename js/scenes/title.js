/* PAPERWEIGHT — title screen and save slots. */
'use strict';

PW.TitleScene = function () {
  this.name = 'title';
  this.opaque = true;
  this.t = 0;
  this.mode = 'title';       // title | slots | about
  this.idx = 0;
  this.slots = null;
  this.dust = new PW.draw.Dust(46, { color: 'rgba(250,238,205,', maxR: 2.2 });
  this.appear = 0;
};

PW.TitleScene.prototype = {

  enter: function () {
    PW.audio.play('title', { fade: 1.0 });
    PW.audio.setTension(0);
    this.slots = PW.save.list();
    this.hasAny = this.slots.some(function (s) { return !!s; });
    // A save file is a way back in even when the browser has thrown the three
    // slots away, so it is offered whether or not there are any.
    this.opts = this.hasAny
      ? ['keep going', 'begin again', 'from a file', 'about']
      : ['begin', 'from a file', 'about'];
    this.idx = 0;
    this.trouble = '';
    this.troubleT = 0;
  },

  update: function (dt) {
    this.t += dt;
    this.appear = Math.min(1, this.appear + dt * 0.55);
    this.dust.update(dt);
    if (this.troubleT > 0) this.troubleT -= dt;

    // Dropping the file on the window is what most people try first, and it
    // works from anywhere on this screen.
    var drop = PW.save.dropped();
    if (drop) { this.readIn(drop.text); return; }

    if (this.mode === 'title') this.updateTitle();
    else if (this.mode === 'slots') this.updateSlots();
    else this.updateAbout();
  },

  updateTitle: function () {
    var n = this.opts.length;
    if (PW.input.rep('up')) { this.idx = (this.idx + n - 1) % n; PW.audio.sfx('cursor'); }
    if (PW.input.rep('down')) { this.idx = (this.idx + 1) % n; PW.audio.sfx('cursor'); }

    var t = PW.ui.tapped('title');
    if (t === 'miss') return;
    if (t) this.idx = t.idx;

    if (!PW.input.hit('ok')) return;
    PW.audio.sfx('confirm');
    var pick = this.opts[this.idx];
    if (pick === 'about') { this.mode = 'about'; return; }
    if (pick === 'from a file') { this.fromFile(); return; }
    this.mode = 'slots';
    this.newGame = (pick !== 'keep going');
    this.idx = 0;
  },

  updateSlots: function () {
    var n = PW.save.SLOTS;
    if (PW.input.rep('up')) { this.idx = (this.idx + n - 1) % n; PW.audio.sfx('cursor'); }
    if (PW.input.rep('down')) { this.idx = (this.idx + 1) % n; PW.audio.sfx('cursor'); }
    if (PW.input.hit('back')) { PW.audio.sfx('cancel'); this.mode = 'title'; this.idx = 0; return; }

    var t = PW.ui.tapped('slot');
    if (t === 'miss') return;
    if (t) this.idx = t.idx;

    if (!PW.input.hit('ok')) return;

    var slot = this.idx;
    var data = this.slots[slot];

    if (this.newGame || !data) {
      PW.audio.sfx('confirm');
      this.begin(slot, true);
    } else {
      PW.audio.sfx('confirm');
      this.begin(slot, false);
    }
  },

  updateAbout: function () {
    if (PW.input.hit('ok') || PW.input.hit('back')) {
      PW.audio.sfx('cancel');
      this.mode = 'title';
    }
  },

  /* ------------------------------------------------------ from a file -- */

  fromFile: function () {
    var self = this;
    var opened = PW.save.fromFile(function (name) {
      if (!name) { self.say('That file was not a save.'); return; }
      self.resume();
    });
    if (!opened) self.say('This browser will not open a file. Drop one on the window instead.');
  },

  readIn: function (text) {
    if (!PW.save.adopt(text)) { this.say('That file was not a save.'); return; }
    PW.audio.sfx('confirm');
    this.resume();
  },

  /** Walk back into whatever room the file was written in. */
  resume: function () {
    PW.audio.stopMusic(1.1);
    PW.game.fadeOut(1.2, '#0b0a14', function () {
      PW.game.replace(new PW.FieldScene(PW.state.room, PW.state.spawn));
      PW.game.fadeIn(1.0);
    });
  },

  say: function (msg) {
    PW.audio.sfx('error');
    this.trouble = msg;
    this.troubleT = 4;
  },

  begin: function (slot, fresh) {
    PW.audio.stopMusic(1.1);
    PW.game.fadeOut(1.2, '#0b0a14', function () {
      if (fresh) {
        PW.save.reset();
        PW.state.slot = slot;
        PW.items.give('jam', 2);
        PW.items.give('sweet', 3);
        PW.game.replace(new PW.FieldScene('bedroom', 'frombed'));
        // The opening script raises the veil itself, on its own timing.
        PW.game.top().script.run(PW.scripts.opening);
      } else {
        PW.save.load(slot);
        PW.state.slot = slot;
        PW.game.replace(new PW.FieldScene(PW.state.room, PW.state.spawn));
        PW.game.fadeIn(1.0);
      }
    });
  },

  /* -------------------------------------------------------------- draw -- */

  draw: function (ctx) {
    var D = PW.draw;
    var a = PW.util.smooth(this.appear);

    D.cover(ctx, PW.assets.img('bg_title'), PW.W, PW.H);
    D.fill(ctx, '#0b0a14', 0.25);
    this.dust.draw(ctx);
    D.vignette(ctx, PW.W, PW.H, 0.7);

    // Title, drifting very slightly, like something floating in glass.
    var bob = Math.sin(this.t * 0.55) * 3;
    ctx.save();
    ctx.globalAlpha = a;
    D.text(ctx, 'PAPERWEIGHT', 118, 96 + bob, {
      size: 62, color: '#f6e7c4', glow: 'rgba(246,231,196,.55)', glowBlur: 26,
      wobble: 1.4, shadowOff: 3, seed: 4
    });
    D.text(ctx, 'a small game about the things we hold onto', 124, 168 + bob, {
      size: 19, color: '#b9a9cd', wobble: 0.7, shadowOff: 2, seed: 9
    });
    ctx.restore();

    if (this.mode === 'title') this.drawMenu(ctx, a);
    else if (this.mode === 'slots') this.drawSlots(ctx);
    else this.drawAbout(ctx);

    if (this.troubleT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.troubleT);
      D.text(ctx, this.trouble, 132, PW.H - 74, { size: 16, color: '#e0a06a', shadowOff: 2 });
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.45 * a;
    var help = PW.input.touchCapable()
      ? 'drag to move   tap to choose   two-finger tap to go back   three fingers for your pocket'
      : 'Z confirm   X back   arrows move   C pocket   F fullscreen   M sound';
    D.text(ctx, help, PW.W / 2, PW.H - 30,
      { size: 14, align: 'center', color: '#8d86a6', shadow: false });
    ctx.restore();
  },

  drawMenu: function (ctx, a) {
    var D = PW.draw;
    ctx.save();
    ctx.globalAlpha = a;
    for (var i = 0; i < this.opts.length; i++) {
      var sel = i === this.idx;
      var y = 258 + i * 46;
      // A generous box: a fingertip is a lot blunter than a mouse pointer.
      PW.ui.region('title', i, 100, y - 10, 340, 46);
      if (sel) {
        var w = D.measure(ctx, this.opts[i], 26) + 56;
        D.panel(ctx, 112, y - 6, w, 40, {
          fill: 'rgba(246,231,196,.16)', stroke: 'rgba(246,231,196,.5)',
          radius: 10, seed: 17 + i, shadow: false
        });
      }
      D.text(ctx, this.opts[i], 132, y, {
        size: 26, color: sel ? '#f6e7c4' : '#9b90b4', shadowOff: 2, seed: 3 + i
      });
    }
    ctx.restore();
  },

  drawSlots: function (ctx) {
    var D = PW.draw;
    var w = 470, x = 106, y = 232;
    D.text(ctx, this.newGame ? 'begin where?' : 'from where?', x + 6, y - 36, {
      size: 20, color: '#c9bad9', shadowOff: 2
    });
    for (var i = 0; i < PW.save.SLOTS; i++) {
      var s = this.slots[i];
      var sel = i === this.idx;
      var sy = y + i * 74;
      PW.ui.region('slot', i, x, sy, w, 64);
      D.panel(ctx, x, sy, w, 64, {
        fill: sel ? 'rgba(246,231,196,.94)' : 'rgba(26,22,40,.86)',
        stroke: sel ? '#3a3050' : 'rgba(200,186,217,.4)',
        radius: 12, seed: 41 + i * 7
      });
      var ink = sel ? '#33294a' : '#cfc3e0';
      if (s) {
        var mins = Math.floor(s.playtime / 60);
        D.text(ctx, 'chapter ' + s.chapter + ' — ' + s.room, x + 18, sy + 10, {
          size: 20, color: ink, shadow: !sel
        });
        D.text(ctx, mins + ' min · ' + s.party + ' with you · ' + s.kept + ' kept',
          x + 18, sy + 36, { size: 15, color: sel ? '#6b5f86' : '#9c92b0', shadow: false });
      } else {
        D.text(ctx, 'empty', x + 18, sy + 20, { size: 20, color: sel ? '#8a7fa8' : '#6e6688', shadow: false });
      }
      if (s && this.newGame && sel) {
        D.text(ctx, 'will overwrite', x + w - 18, sy + 10, {
          size: 14, align: 'right', color: '#a5601f', shadow: false
        });
      }
    }
  },

  drawAbout: function (ctx) {
    var D = PW.draw;
    var w = 640, h = 300, x = PW.W / 2 - w / 2, y = 200;
    D.panel(ctx, x, y, w, h, {
      fill: 'rgba(20,16,32,.94)', stroke: 'rgba(246,231,196,.5)', radius: 16, seed: 77
    });
    var text =
      'You are June. Your grandmother Nel lived at the end of the landing, and ' +
      'now her room is a door nobody opens.\n\n' +
      'When you fall asleep holding her paperweight, you end up in a house that ' +
      'is nearly yours, with too many doors and not enough names.\n\n' +
      'Things in there will come at you. Most of them can be hit. Some of them ' +
      'only ever wanted holding. The game will not tell you which is which — but ' +
      'it is paying attention.';
    D.textBlock(ctx, text, x + 30, y + 26, w - 60, {
      size: 18, color: '#ddd2c2', lineHeight: 26, shadow: false
    });
    D.text(ctx, PW.input.touchCapable() ? 'tap to go back' : 'press Z', PW.W / 2, y + h - 42, {
      size: 16, align: 'center', color: '#8d86a6', shadow: false
    });
  }
};
