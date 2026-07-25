/* PAPERWEIGHT — scene base, the dialogue box, and the cutscene interpreter. */
'use strict';

/* Room entities hold `talk` as either a program, or a function returning one,
   or (commonly) a function returning *another* function from PW.scripts. Peel
   until an actual list of commands falls out. */
PW.resolveScript = function (v) {
  var guard = 0;
  while (typeof v === 'function' && guard++ < 8) v = v();
  return Array.isArray(v) ? v : null;
};

/* ======================================================================== *
 *  DIALOGUE BOX
 * ======================================================================== */

PW.DialogueBox = function () {
  this.active = false;
  this.who = null;
  this.expr = 'calm';
  this.text = '';
  this.lines = [];
  this.shown = 0;
  this.speed = 46;          // characters per second
  this.finished = false;
  this.style = 'say';       // say | narrate | think
  this.t = 0;
  this.blipT = 0;
  this.choices = null;
  this.choiceIdx = 0;
  this.onChoice = null;
  this.autoAdvance = 0;
};

PW.DialogueBox.prototype = {
  show: function (who, expr, text, style) {
    this.active = true;
    this.who = who || null;
    this.expr = expr || 'calm';
    this.text = String(text);
    this.style = style || (who ? 'say' : 'narrate');
    this.shown = 0;
    this.finished = false;
    this.t = 0;
    this.lines = null;      // laid out lazily, once we have a context
    this.choices = null;
  },

  ask: function (options, cb) {
    this.choices = options;
    this.choiceIdx = 0;
    this.onChoice = cb;
  },

  close: function () {
    this.active = false;
    this.choices = null;
    this.who = null;
  },

  /** True once the text is fully typed and the player has dismissed it. */
  update: function (dt) {
    if (!this.active) return false;
    this.t += dt;

    if (!this.finished) {
      this.shown += this.speed * dt;
      if (this.shown >= this.text.length) {
        this.shown = this.text.length;
        this.finished = true;
      } else {
        this.blipT -= dt;
        if (this.blipT <= 0) {
          var c = this.text[Math.floor(this.shown)] || '';
          if (c !== ' ' && c !== '\n') {
            PW.audio.sfx(this.style === 'narrate' ? 'blip_low' : 'blip');
          }
          this.blipT = 0.042;
        }
      }
      if (PW.input.hit('ok') || PW.input.hit('back')) {
        this.shown = this.text.length;
        this.finished = true;
      }
      return false;
    }

    if (this.choices) {
      var n = this.choices.length;
      if (PW.input.rep('up')) { this.choiceIdx = (this.choiceIdx + n - 1) % n; PW.audio.sfx('cursor'); }
      if (PW.input.rep('down')) { this.choiceIdx = (this.choiceIdx + 1) % n; PW.audio.sfx('cursor'); }

      var t = PW.ui.tapped('choice');
      if (t === 'miss') return false;
      if (t) this.choiceIdx = t.idx;

      if (PW.input.hit('ok')) {
        PW.audio.sfx('confirm');
        var cb = this.onChoice, i = this.choiceIdx;
        this.choices = null; this.onChoice = null;
        this.close();
        if (cb) cb(i);
        return true;
      }
      return false;
    }

    if (PW.input.hit('ok')) {
      PW.audio.sfx('cursor');
      this.close();
      return true;
    }
    return false;
  },

  layout: function (ctx, maxW) {
    if (this.lines) return;
    ctx.save();
    ctx.font = PW.draw.font(this.style === 'narrate' ? 21 : 22);
    this.lines = PW.util.wrap(ctx, this.text, maxW);
    ctx.restore();
  },

  draw: function (ctx) {
    if (!this.active) return;
    var D = PW.draw;
    var narrate = this.style === 'narrate';

    var bx = 40, bh = 148, by = PW.H - bh - 26, bw = PW.W - 80;
    var hasFace = !!this.who && PW.assets.has('por_' + this.who + '_' + this.expr);
    var textX = bx + (hasFace ? 172 : 30);
    var textW = bw - (hasFace ? 200 : 60);

    D.panel(ctx, bx, by, bw, bh, {
      fill: narrate ? 'rgba(24,20,38,.90)' : 'rgba(246,237,220,.96)',
      stroke: narrate ? 'rgba(214,200,168,.75)' : '#3a3050',
      radius: 16, seed: 7
    });

    // The portrait goes on top of the panel and hangs out over its top edge,
    // like a sticker stuck to the corner of the box.
    if (hasFace) {
      var img = PW.assets.img('por_' + this.who + '_' + this.expr);
      var s = Math.min(150 / img.width, 168 / img.height);
      var bob = Math.sin(this.t * 2.2) * 2;
      D.sprite(ctx, img, bx + 88, by + bh - 10 + bob, s);
    }

    // name tag
    if (this.who) {
      var who = PW.actors[this.who];
      var nm = who ? who.name : (this.who === 'nel' ? 'Nel' : this.who);
      var col = who ? who.colour : '#c8a2c8';
      var tw = D.measure(ctx, nm, 18) + 30;
      D.panel(ctx, textX - 8, by - 17, tw, 32, {
        fill: col, stroke: '#3a3050', radius: 10, seed: 3, shadow: false
      });
      D.text(ctx, nm, textX + 7, by - 10, { size: 18, color: '#241d38', shadow: false });
    }

    this.layout(ctx, textW);
    var visible = Math.floor(this.shown);
    var count = 0;
    var lh = 30;
    var ty = by + 26;
    for (var i = 0; i < this.lines.length && i < 4; i++) {
      var line = this.lines[i];
      var take = Math.max(0, Math.min(line.length, visible - count));
      if (take > 0) {
        D.text(ctx, line.substring(0, take), textX, ty + i * lh, {
          size: narrate ? 21 : 22,
          color: narrate ? '#e7ddc4' : '#33294a',
          shadow: narrate,
          wobble: 0.8
        });
      }
      count += line.length + 1;
    }

    if (this.finished && !this.choices) {
      var a = 0.45 + 0.55 * Math.abs(Math.sin(this.t * 3));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = narrate ? '#e7ddc4' : '#33294a';
      var px = bx + bw - 34, py = by + bh - 26 + Math.sin(this.t * 3) * 2;
      ctx.beginPath();
      ctx.moveTo(px - 8, py - 5); ctx.lineTo(px + 8, py - 5); ctx.lineTo(px, py + 6);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    if (this.choices) this.drawChoices(ctx, by);
  },

  drawChoices: function (ctx, boxTop) {
    var D = PW.draw;
    var w = 0;
    for (var i = 0; i < this.choices.length; i++) {
      w = Math.max(w, D.measure(ctx, this.choices[i], 21));
    }
    w += 76;
    var h = this.choices.length * 42 + 22;
    var x = PW.W - w - 54, y = boxTop - h - 16;

    D.panel(ctx, x, y, w, h, { fill: 'rgba(246,237,220,.97)', stroke: '#3a3050', radius: 14, seed: 21 });
    for (var j = 0; j < this.choices.length; j++) {
      var sel = j === this.choiceIdx;
      var ty = y + 12 + j * 42;
      PW.ui.region('choice', j, x + 6, ty - 4, w - 12, 42);
      if (sel) {
        D.panel(ctx, x + 10, ty - 2, w - 20, 38, {
          fill: 'rgba(232,200,130,.65)', stroke: false, radius: 10, seed: 5 + j, shadow: false
        });
      }
      D.text(ctx, (sel ? '• ' : '   ') + this.choices[j], x + 22, ty + 6, {
        size: 21, color: '#33294a', shadow: false
      });
    }
  }
};

/* When you find something worth keeping and there is no room for it, the game
   does not quietly drop it. It makes you choose, and the choice is permanent —
   which is the only mechanic in here that is really about anything. */
PW.keptFullPrompt = function (newId) {
  var item = PW.items.get(newId);
  var opts = [];

  PW.state.kept.forEach(function (kid) {
    var k = PW.items.get(kid);
    if (!k || k.fixed) return;
    opts.push(['Put down the ' + k.name + '.', [
      ['call', function () {
        PW.items.take(kid);
        PW.items.give(newId);
        PW.counter('put_down', 1);
        PW.flag('put_down_' + kid, true);
        PW.audio.sfx('paper');
        PW.game.toast('kept: ' + item.name);
      }],
      ['narrate', 'You set the ' + k.name + ' down where you found it, and you ' +
        'do not look at it again, and you pick up the ' + item.name + '.']
    ]]);
  });

  opts.push(['Leave the ' + item.name + '.', [
    ['call', function () {
      PW.flag('left_' + newId, true);
      PW.audio.sfx('cancel');
    }],
    ['narrate', 'You leave it. You make a careful note of exactly where, which ' +
      'is the sort of thing you do instead of coming back.']
  ]]);

  return [
    ['narrate', 'The ' + item.name + '. You could keep this.'],
    ['narrate', 'Your hands are full. They have been full for a while. ' +
      'Something has to go down before anything else comes up, and down here ' +
      'means down for good.'],
    ['choice', null, opts]
  ];
};

/* ======================================================================== *
 *  SCRIPT RUNNER — the little language the story is written in.
 * ======================================================================== */

PW.Script = function (scene) {
  this.scene = scene;
  this.frames = [];        // {prog, pc}
  this.waitFn = null;
  this.timer = 0;
  this.running = false;
  this.onDone = null;
};

PW.Script.prototype = {

  run: function (prog, onDone) {
    if (!prog || !prog.length) { if (onDone) onDone(); return; }
    this.frames = [{ prog: prog, pc: 0 }];
    this.running = true;
    this.waitFn = null;
    this.timer = 0;
    this.onDone = onDone || null;
  },

  stop: function () {
    this.frames = [];
    this.running = false;
    this.waitFn = null;
  },

  /** Push a nested block (choice branch, if branch, subroutine). */
  enter: function (prog) {
    if (prog && prog.length) this.frames.push({ prog: prog, pc: 0 });
  },

  update: function (dt) {
    if (!this.running) return;

    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer > 0) return;
    }
    if (this.waitFn) {
      if (this.waitFn()) return;
      this.waitFn = null;
    }

    // Step through commands until one of them asks us to wait.
    var guard = 0;
    while (this.running && !this.waitFn && this.timer <= 0) {
      if (++guard > 500) { console.warn('script: runaway loop'); break; }
      var f = this.frames[this.frames.length - 1];
      if (!f) { this.finish(); return; }
      if (f.pc >= f.prog.length) {
        this.frames.pop();
        if (!this.frames.length) { this.finish(); return; }
        continue;
      }
      var cmd = f.prog[f.pc++];
      if (!cmd) continue;
      this.exec(cmd);
    }
  },

  finish: function () {
    this.running = false;
    this.frames = [];
    var cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  },

  exec: function (cmd) {
    var self = this;
    var sc = this.scene;
    var op = cmd[0];
    var a = cmd[1], b = cmd[2], c = cmd[3], d = cmd[4];

    switch (op) {

      /* ---------------------------------------------------------- talk -- */
      case 'say':
        sc.box.show(a, b, c, 'say');
        this.waitFn = function () { return sc.box.active; };
        break;

      case 'narrate':
        sc.box.show(null, null, a, 'narrate');
        this.waitFn = function () { return sc.box.active; };
        break;

      case 'choice':
        // ['choice', 'prompt or null', [[label, [cmds]], ...]]
        var prompt = a, opts = b;
        if (Array.isArray(a)) { opts = a; prompt = null; }
        if (prompt) sc.box.show(null, null, prompt, 'narrate');
        else { sc.box.show(null, null, ' ', 'narrate'); sc.box.shown = 1; sc.box.finished = true; }
        sc.box.ask(opts.map(function (o) { return o[0]; }), function (i) {
          self.enter(opts[i][1]);
        });
        this.waitFn = function () { return sc.box.active; };
        break;

      /* ---------------------------------------------------------- flow -- */
      case 'wait':
        this.timer = a;
        break;

      case 'if':
        if (a()) this.enter(b); else this.enter(c);
        break;

      case 'run':
        this.enter(PW.resolveScript(a));
        break;

      case 'call':
        a(sc, this);
        break;

      case 'waitfor':
        this.waitFn = a;
        break;

      /* --------------------------------------------------------- world -- */
      case 'move':
        sc.scriptMove(a, b, c, d);
        this.waitFn = function () { return sc.scriptMoving(a); };
        break;

      case 'face':
        sc.scriptFace(a, b);
        break;

      case 'warp':
        sc.scriptWarp(a, b, c);
        break;

      case 'show': sc.setEntityVisible(a, true); break;
      case 'hide': sc.setEntityVisible(a, false); break;

      case 'goroom':
        PW.game.transition(function () { sc.enterRoom(a, b); }, { out: 0.4, in: 0.55 });
        this.waitFn = function () { return PW.game.busy(); };
        break;

      /* ------------------------------------------------------ presentn -- */
      case 'music': PW.audio.play(a, b); break;
      case 'stopmusic': PW.audio.stopMusic(a); break;
      case 'sfx': PW.audio.sfx(a, b); break;
      case 'tension': PW.audio.setTension(a); break;
      case 'shake': PW.game.shake(a === undefined ? 8 : a, b); break;
      case 'flash': PW.game.flash(a, b, c); break;

      case 'fade':
        // Wait until the veil has *arrived*, not until it is idle — after a
        // fade-out it is never idle, it is simply covering the screen.
        PW.game.fadeOut(a === undefined ? 0.6 : a, b);
        this.waitFn = function () { return PW.game.veilAlpha() < 1; };
        break;

      case 'unfade':
        PW.game.fadeIn(a === undefined ? 0.6 : a);
        this.waitFn = function () { return PW.game.veilAlpha() > 0; };
        break;

      /* -------------------------------------------------------- record -- */
      case 'flag': PW.flag(a, b === undefined ? true : b); break;
      case 'chapter': PW.state.chapter = a; break;

      case 'give':
        var res = PW.items.give(a, b);
        if (res === true) {
          PW.audio.sfx('sparkle');
          var it = PW.items.get(a);
          PW.game.toast((it.kind === 'kept' ? 'kept: ' : 'got: ') + it.name);
        } else if (res === 'full') {
          this.enter(PW.keptFullPrompt(a));
        }
        break;

      case 'takeitem': PW.items.take(a, b); break;
      case 'keptmax': PW.state.keptMax = a; PW.game.toast('the pouch feels roomier'); break;

      case 'partyadd':
        if (PW.party.add(a)) {
          PW.audio.sfx('levelup');
          PW.game.toast(PW.actors[a].name + ' is with you');
        }
        break;

      case 'partyremove': PW.party.remove(a); break;
      case 'heal': PW.party.healAll(); break;

      /* -------------------------------------------------------- battle -- */
      case 'battle':
        // The battle is pushed after a fade, so "has it finished?" cannot be
        // asked of the scene stack — the scene is not on it yet. A flag owned
        // by the field scene spans the whole fade-fight-fade sequence.
        var opt = b || {};
        sc.battlePending = true;
        sc.startBattle(a, {
          canLose: !!opt.canLose,
          onEnd: function (result) {
            if (result === 'soothed' && opt.onSoothe) self.enter(opt.onSoothe);
            else if (result === 'lose' && opt.onLose) self.enter(opt.onLose);
            else if ((result === 'win' || result === 'soothed') && opt.onWin) self.enter(opt.onWin);
            sc.battlePending = false;
          }
        });
        this.waitFn = function () { return sc.battlePending; };
        break;

      case 'ending':
        PW.game.replace(new PW.EndingScene(a));
        this.stop();
        break;

      case 'title':
        PW.game.replace(new PW.TitleScene());
        this.stop();
        break;

      case 'save':
        PW.save.write(PW.state.slot || 0);
        PW.game.toast('the house remembers');
        break;

      default:
        console.warn('script: unknown op', op);
    }
  }
};
