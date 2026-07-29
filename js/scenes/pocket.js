/* PAPERWEIGHT — the pause menu.
 *
 * Three tabs: who is with you, what is in your pockets, and what you have
 * chosen to keep. The pouch is deliberately too small; putting something down
 * to pick something else up is a decision the game wants you to have to make.
 */
'use strict';

PW.PocketScene = function () {
  this.name = 'pocket';
  this.opaque = false;
  this.t = 0;
  this.tab = 0;
  this.idx = 0;
  this.appear = 0;
  this.confirm = null;
  this.pick = null;
  this.note = '';
  this.noteT = 0;
  this.wrote = '';
};

PW.PocketScene.TABS = ['who', 'pockets', 'kept', 'save'];

PW.PocketScene.prototype = {

  enter: function () { PW.input.flush(); },

  update: function (dt) {
    this.t += dt;
    this.appear = Math.min(1, this.appear + dt * 5);
    if (this.noteT > 0) this.noteT -= dt;

    if (this.confirm) { this.updateConfirm(); return; }
    if (this.pick) { this.updatePick(); return; }

    if (PW.input.hit('back') || PW.input.hit('menu')) {
      PW.audio.sfx('cancel');
      PW.game.pop();
      return;
    }

    var tabs = PW.PocketScene.TABS.length;
    if (PW.input.rep('left')) { this.tab = (this.tab + tabs - 1) % tabs; this.idx = 0; PW.audio.sfx('cursor'); }
    if (PW.input.rep('right')) { this.tab = (this.tab + 1) % tabs; this.idx = 0; PW.audio.sfx('cursor'); }

    // A file dropped on the window still asks: it is somebody's afternoon
    // being put down, and a drag lands where it lands.
    var drop = PW.save.dropped();
    if (drop) { this.tab = 3; this.idx = 1; this.askRead(drop); return; }

    // A tap on a tab switches to it outright.
    var tab = PW.ui.tapped('tab');
    if (tab && tab !== 'miss') {
      if (tab.idx !== this.tab) { this.tab = tab.idx; this.idx = 0; PW.audio.sfx('cursor'); }
      return;
    }

    var list = this.list();
    if (list.length) {
      if (PW.input.rep('up')) { this.idx = (this.idx + list.length - 1) % list.length; PW.audio.sfx('cursor'); }
      if (PW.input.rep('down')) { this.idx = (this.idx + 1) % list.length; PW.audio.sfx('cursor'); }
    }

    var row = PW.ui.tapped('prow');
    if (row === 'miss') return;
    if (row) { this.idx = row.idx; this.activate(); return; }

    if (PW.input.hit('ok')) this.activate();
  },

  updateConfirm: function () {
    if (PW.input.rep('left') || PW.input.rep('up')) { this.confirm.idx = 0; PW.audio.sfx('cursor'); }
    if (PW.input.rep('right') || PW.input.rep('down')) { this.confirm.idx = 1; PW.audio.sfx('cursor'); }

    var t = PW.ui.tapped('yesno');
    if (t === 'miss') return;
    if (t) this.confirm.idx = t.idx;

    if (PW.input.hit('back')) { PW.audio.sfx('cancel'); this.confirm = null; return; }
    if (PW.input.hit('ok') || t) {
      PW.audio.sfx('confirm');
      var c = this.confirm;
      this.confirm = null;
      if (c.idx === 0) c.action();
      else if (c.alt) c.alt();
    }
  },

  list: function () {
    if (this.tab === 0) return PW.state.party;
    if (this.tab === 1) {
      var p = PW.items.pocket();
      return Object.keys(p).filter(function (k) { return p[k] > 0; });
    }
    if (this.tab === 2) return PW.state.kept;
    return ['out', 'in'];
  },

  activate: function () {
    var list = this.list();
    if (!list.length) return;
    var self = this;

    if (this.tab === 3) {
      if (list[this.idx] === 'out') this.writeOut();
      else this.askRead(null);
      return;
    }

    if (this.tab === 2) {
      var id = list[this.idx];
      var item = PW.items.get(id);
      if (!item || item.fixed) {
        PW.audio.sfx('error');
        this.say('That one stays.');
        return;
      }
      // A memory you can reach for is two different decisions wearing one
      // button, so it asks which. Putting down still gets its own warning.
      if (PW.items.usableOutside(id) && PW.items.wouldHelp(id).length) {
        this.confirm = {
          idx: 0,
          labels: ['use it', 'put it down'],
          text: 'The ' + item.name + '.',
          action: function () { self.reachFor(id); },
          alt: function () { self.putDown(id, item); }
        };
        return;
      }
      this.putDown(id, item);
      return;
    }

    if (this.tab === 1) this.reachFor(list[this.idx]);
  },

  putDown: function (id, item) {
    var self = this;
    this.confirm = {
      idx: 1,
      text: 'Put down the ' + item.name + '? You will not get it back.',
      action: function () {
        PW.items.take(id);
        PW.counter('put_down', 1);
        PW.flag('put_down_' + id, true);
        self.idx = 0;
        PW.audio.sfx('paper');
        self.say('You set it down. The pouch is lighter.');
      }
    };
  },

  /* ------------------------------------------------- carrying it out --- */

  /* The three slots write when the story says so. This writes when the player
     says so, which is the only way to stop in the middle of the attic and go
     to bed — and it comes out as a file they keep, rather than as something
     the browser is allowed to forget. */

  writeOut: function () {
    var name = PW.save.toFile();
    if (!name) {
      PW.audio.sfx('error');
      this.say('The browser would not hand it over. Try again in a moment.');
      return;
    }
    PW.audio.sfx('paper');
    this.wrote = name;
    this.say('Written out as ' + name);
  },

  /** `drop` is a file already read off the window; null means go and ask. */
  askRead: function (drop) {
    var self = this;
    this.confirm = {
      idx: 1,
      text: drop
        ? 'Take up ' + drop.name + '? Everything since your last save stays here.'
        : 'Read in a save file? Everything since your last save stays here.',
      action: function () {
        if (drop) { self.readIn(drop.text, drop.name); return; }
        var opened = PW.save.fromFile(function (name) {
          if (!name) {
            PW.audio.sfx('error');
            self.say('That was not a save.');
            return;
          }
          self.resume(name);
        });
        if (!opened) {
          PW.audio.sfx('error');
          self.say('This browser will not open a file. Drop it on the window instead.');
        }
      }
    };
  },

  readIn: function (text, name) {
    if (!PW.save.adopt(text)) {
      PW.audio.sfx('error');
      this.say('That was not a save.');
      return;
    }
    this.resume(name);
  },

  /** Put the pouch away and walk back into wherever the file left off. */
  resume: function (name) {
    PW.audio.sfx('chime');
    PW.game.pop();
    PW.game.fadeOut(0.9, '#0b0a14', function () {
      PW.game.replace(new PW.FieldScene(PW.state.room, PW.state.spawn));
      PW.game.toast(name + ' — chapter ' + PW.state.chapter);
      PW.game.fadeIn(0.9);
    });
  },

  /* Using a thing with nothing in front of you. Most of what an item does —
     moods, buffs, binding — only means anything in a fight, so out here the
     question is only ever whether somebody is hurt, winded or on the floor. */
  reachFor: function (id) {
    var item = PW.items.get(id);
    if (!PW.items.usableOutside(id)) {
      PW.audio.sfx('error');
      this.say('You can use that when something is in front of you.');
      return;
    }
    var who = PW.items.wouldHelp(id);
    if (!who.length) {
      PW.audio.sfx('error');
      this.say((item.use || {}).revive
        ? 'Everybody is on their feet.'
        : 'Nobody needs it yet.');
      return;
    }
    if (PW.items.hitsEveryone(id) || who.length === 1) {
      this.apply(id, who);
      return;
    }
    PW.audio.sfx('cursor');
    this.pick = { id: id, item: item, who: who, idx: 0 };
  },

  apply: function (id, who) {
    var item = PW.items.get(id);
    var done = PW.items.useOutside(id, who);
    if (!done) { PW.audio.sfx('error'); this.say('Nobody needs it yet.'); return; }
    PW.audio.sfx((item.use || {}).revive ? 'levelup' : 'heal');
    if (this.idx >= this.list().length) this.idx = Math.max(0, this.list().length - 1);
    this.say(this.tell(item, done));
  },

  /** What just happened, in words, without reading out the numbers twice. */
  tell: function (item, done) {
    var names = done.map(function (d) { return PW.actors[d.id].name; });
    var lifted = done.filter(function (d) { return d.revived; });
    if (lifted.length) {
      return names.join(' and ') + ' gets up. Slowly, and not all the way.';
    }
    var hp = 0, bp = 0;
    done.forEach(function (d) { hp += d.hp; bp += d.bp; });
    var what = [];
    if (hp) what.push('mended ' + hp);
    if (bp) what.push(bp + ' breath back');
    return names.join(' and ') + ': ' + what.join(', ') + '.';
  },

  updatePick: function () {
    var p = this.pick;
    if (PW.input.rep('up')) { p.idx = (p.idx + p.who.length - 1) % p.who.length; PW.audio.sfx('cursor'); }
    if (PW.input.rep('down')) { p.idx = (p.idx + 1) % p.who.length; PW.audio.sfx('cursor'); }

    var t = PW.ui.tapped('pick');
    if (t === 'miss') return;
    if (t) p.idx = t.idx;

    if (PW.input.hit('back')) { PW.audio.sfx('cancel'); this.pick = null; return; }
    if (PW.input.hit('ok') || t) {
      var id = p.id, m = p.who[p.idx];
      this.pick = null;
      this.apply(id, [m]);
    }
  },

  say: function (msg) { this.note = msg; this.noteT = 2.4; },

  /* -------------------------------------------------------------- draw -- */

  draw: function (ctx) {
    var D = PW.draw;
    var a = PW.util.smooth(this.appear);
    D.fill(ctx, '#0b0a14', 0.72 * a);

    var w = 812, h = 424, x = PW.W / 2 - w / 2, y = 58;
    ctx.save();
    ctx.globalAlpha = a;
    D.panel(ctx, x, y, w, h, {
      fill: 'rgba(246,237,220,.97)', stroke: '#3a3050', radius: 18, seed: 123
    });

    this.drawTabs(ctx, x, y, w);

    if (this.tab === 0) this.drawWho(ctx, x, y, w, h);
    else if (this.tab === 1) this.drawPockets(ctx, x, y, w, h);
    else if (this.tab === 2) this.drawKept(ctx, x, y, w, h);
    else this.drawSave(ctx, x, y, w, h);

    var close = PW.input.touchCapable()
      ? 'two-finger tap to close   swipe for tabs'
      : 'C or X to close   \u2190\u2192 tabs';
    D.text(ctx, close, x + w - 34, y + h - 30, {
      size: 14, align: 'right', color: '#8c81a4', shadow: false
    });

    if (this.noteT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.noteT * 1.5);
      D.text(ctx, this.note, x + 26, y + h - 30, { size: 15, color: '#7a6a92', shadow: false });
      ctx.restore();
    }
    ctx.restore();

    if (this.confirm) this.drawConfirm(ctx);
    if (this.pick) this.drawPick(ctx);
  },

  drawPick: function (ctx) {
    var D = PW.draw, p = this.pick;
    D.fill(ctx, '#0b0a14', 0.5);
    var w = 460, h = 96 + p.who.length * 62;
    var x = PW.W / 2 - w / 2, y = PW.H / 2 - h / 2;
    D.panel(ctx, x, y, w, h, {
      fill: 'rgba(246,237,220,.98)', stroke: '#3a3050', radius: 14, seed: 41
    });
    D.text(ctx, 'the ' + p.item.name + ', for who?', x + 26, y + 22, {
      size: 19, color: '#33294a', shadow: false
    });

    for (var i = 0; i < p.who.length; i++) {
      var id = p.who[i], def = PW.actors[id];
      var r = PW.party.rec(id), s = PW.party.stats(id);
      var sel = i === p.idx, ry = y + 62 + i * 62;
      PW.ui.region('pick', i, x + 18, ry, w - 36, 54);
      if (sel) {
        D.panel(ctx, x + 18, ry, w - 36, 54, {
          fill: 'rgba(232,200,130,.6)', stroke: false, radius: 10, seed: 44 + i, shadow: false
        });
      }
      var por = PW.assets.img('por_' + def.face + '_calm');
      var ps = Math.min(44 / por.width, 46 / por.height);
      D.sprite(ctx, por, x + 48, ry + 50, ps);
      D.text(ctx, def.name, x + 82, ry + 6, { size: 19, color: '#33294a', shadow: false });
      if (r.hp <= 0) {
        D.text(ctx, 'down', x + 82, ry + 30, { size: 14, color: '#a5601f', shadow: false });
      } else {
        D.bar(ctx, x + 82, ry + 32, 150, 10, r.hp / s.maxhp, {
          fill: r.hp / s.maxhp < 0.28 ? '#e0625f' : '#84c46a'
        });
        D.text(ctx, r.hp + '/' + s.maxhp + '   ' + r.bp + ' breath', x + 244, ry + 29, {
          size: 13, color: '#6b5f86', shadow: false
        });
      }
    }
  },

  drawTabs: function (ctx, x, y, w) {
    var D = PW.draw;
    var names = PW.PocketScene.TABS;
    for (var i = 0; i < names.length; i++) {
      var sel = i === this.tab;
      var tw = 132, tx = x + 22 + i * (tw + 8);
      PW.ui.region('tab', i, tx, y + 10, tw, 44);
      if (sel) {
        D.panel(ctx, tx, y + 14, tw, 38, {
          fill: 'rgba(232,200,130,.75)', stroke: '#3a3050', radius: 10, seed: 5 + i, shadow: false
        });
      }
      D.text(ctx, names[i], tx + tw / 2, y + 22, {
        size: 20, align: 'center', color: sel ? '#33294a' : '#9c93ad', shadow: false
      });
    }
    // playtime, top right
    var mins = Math.floor(PW.state.playtime / 60);
    var secs = Math.floor(PW.state.playtime % 60);
    D.text(ctx, 'chapter ' + PW.state.chapter + '   ' + mins + ':' +
      (secs < 10 ? '0' : '') + secs, x + w - 22, y + 24, {
      size: 16, align: 'right', color: '#6b5f86', shadow: false
    });
  },

  drawWho: function (ctx, x, y, w, h) {
    var D = PW.draw;
    var ids = PW.state.party;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var def = PW.actors[id], r = PW.party.rec(id), s = PW.party.stats(id);
      var sel = i === this.idx;
      var ry = y + 70 + i * 82;
      PW.ui.region('prow', i, x + 18, ry - 6, w - 36, 76);

      if (sel) {
        D.panel(ctx, x + 18, ry - 6, w - 36, 76, {
          fill: 'rgba(232,200,130,.32)', stroke: false, radius: 12, seed: 60 + i, shadow: false
        });
      }
      var por = PW.assets.img('por_' + def.face + '_calm');
      var ps = Math.min(64 / por.width, 68 / por.height);
      D.sprite(ctx, por, x + 62, ry + 66, ps);

      D.text(ctx, def.name, x + 108, ry, { size: 22, color: '#33294a', shadow: false });
      D.text(ctx, 'lv ' + s.lv, x + 108 + D.measure(ctx, def.name, 22) + 16, ry + 4, {
        size: 16, color: '#8a7fa8', shadow: false
      });
      D.text(ctx, def.blurb, x + 108, ry + 28, { size: 14, color: '#7a6f94', shadow: false });

      D.bar(ctx, x + 108, ry + 50, 240, 11, r.hp / s.maxhp, {
        fill: r.hp / s.maxhp < 0.28 ? '#e0625f' : '#84c46a'
      });
      D.text(ctx, r.hp + '/' + s.maxhp, x + 356, ry + 47, { size: 14, color: '#6b5f86', shadow: false });
      D.bar(ctx, x + 430, ry + 50, 160, 11, r.bp / s.maxbp, { fill: '#7fa8d8' });
      D.text(ctx, r.bp + ' breath', x + 598, ry + 47, { size: 14, color: '#6b5f86', shadow: false });

      var nx = PW.party.xpNeeded(s.lv);
      D.text(ctx, 'remembers ' + r.xp + '/' + nx, x + w - 40, ry + 4, {
        size: 14, align: 'right', color: '#9c93ad', shadow: false
      });
      var skills = PW.party.skillsOf(id).map(function (k) { return PW.skills.get(k).name; });
      D.text(ctx, skills.join(' · '), x + w - 40, ry + 26, {
        size: 13, align: 'right', color: '#8a7fa8', shadow: false
      });
    }
  },

  drawPockets: function (ctx, x, y, w, h) {
    var D = PW.draw;
    var list = this.list();
    if (!list.length) {
      D.text(ctx, 'Nothing but fluff and a bus ticket.', x + w / 2, y + 170, {
        size: 20, align: 'center', color: '#9c93ad', shadow: false
      });
      return;
    }
    for (var i = 0; i < Math.min(6, list.length); i++) {
      var id = list[i], item = PW.items.get(id);
      var sel = i === this.idx;
      var ry = y + 70 + i * 52;
      PW.ui.region('prow', i, x + 18, ry - 4, w - 36, 46);
      if (sel) {
        D.panel(ctx, x + 18, ry - 4, w - 36, 46, {
          fill: 'rgba(232,200,130,.4)', stroke: false, radius: 10, seed: 70 + i, shadow: false
        });
      }
      var icon = PW.assets.img('item_' + item.icon);
      var is = Math.min(38 / icon.width, 38 / icon.height);
      D.sprite(ctx, icon, x + 46, ry + 40, is);
      D.text(ctx, item.name, x + 80, ry + 4, { size: 20, color: '#33294a', shadow: false });
      D.text(ctx, 'x' + PW.items.count(id), x + 320, ry + 6, { size: 17, color: '#6b5f86', shadow: false });
      D.text(ctx, item.desc, x + 380, ry - 2, { size: 14, color: '#7a6f94', shadow: false });
      // Knowing what it is does not tell you when to reach for it.
      D.text(ctx, PW.items.effect(item), x + 380, ry + 18, {
        size: 14, color: '#8a6a2f', shadow: false
      });
    }
  },

  drawKept: function (ctx, x, y, w, h) {
    var D = PW.draw;
    var list = PW.state.kept;

    D.text(ctx, 'memories. you can carry ' + PW.state.keptMax + ' of them',
      x + w - 22, y + 62, { size: 15, align: 'right', color: '#8a7fa8', shadow: false });

    for (var i = 0; i < PW.state.keptMax; i++) {
      var ry = y + 86 + i * 74;
      var id = list[i];
      var sel = i === this.idx && id;
      if (id) PW.ui.region('prow', i, x + 22, ry, w - 44, 64);

      D.panel(ctx, x + 22, ry, w - 44, 64, {
        fill: sel ? 'rgba(232,200,130,.5)' : (id ? 'rgba(58,48,80,.07)' : 'rgba(58,48,80,.03)'),
        stroke: id ? 'rgba(58,48,80,.35)' : 'rgba(58,48,80,.14)',
        radius: 12, seed: 80 + i, shadow: false, lineWidth: 2
      });

      if (!id) {
        D.text(ctx, 'empty', x + 46, ry + 20, { size: 18, color: '#b0a6c0', shadow: false });
        continue;
      }
      var item = PW.items.get(id);
      var icon = PW.assets.img('item_' + item.icon);
      var is = Math.min(46 / icon.width, 46 / icon.height);
      D.sprite(ctx, icon, x + 60, ry + 56, is);
      D.text(ctx, item.name, x + 96, ry + 8, { size: 20, color: '#33294a', shadow: false });
      // The memory is the thing itself, not a description of the object, so it
      // is marked as one rather than left to look like a second subtitle.
      if (item.memory) {
        D.text(ctx, 'you remember', x + 96, ry + 32, {
          size: 12, color: '#a5601f', shadow: false
        });
      }
      // A memory is still a thing you can reach for mid-fight, so it says what
      // that does — the same line the pockets tab gives a jar of jam.
      D.text(ctx, PW.items.effect(item), x + w - 44, ry + 32, {
        size: 13, align: 'right', color: '#8a6a2f', shadow: false
      });
      D.textBlock(ctx, item.memory || item.desc, x + 96,
        ry + (item.memory ? 46 : 32), w - 180, {
          size: 14, color: '#6b5f86', shadow: false, lineHeight: 17
        });
      if (item.fixed) {
        D.text(ctx, 'stays', x + w - 44, ry + 8, {
          size: 14, align: 'right', color: '#8a7fa8', shadow: false
        });
      } else if (sel) {
        D.text(ctx, PW.items.usableOutside(id) && PW.items.wouldHelp(id).length
          ? 'Z to use or put down' : 'Z to put down', x + w - 44, ry + 8, {
          size: 14, align: 'right', color: '#a5601f', shadow: false
        });
      }
    }
  },

  drawSave: function (ctx, x, y, w, h) {
    var D = PW.draw;
    var rows = [
      { name: 'write it out', sub: 'save here, now, to a file of your own' },
      { name: 'read one in', sub: 'pick a file up and carry on from it' }
    ];
    for (var i = 0; i < rows.length; i++) {
      var sel = i === this.idx, ry = y + 78 + i * 66;
      PW.ui.region('prow', i, x + 22, ry, w - 44, 58);
      D.panel(ctx, x + 22, ry, w - 44, 58, {
        fill: sel ? 'rgba(232,200,130,.5)' : 'rgba(58,48,80,.07)',
        stroke: 'rgba(58,48,80,.35)', radius: 12, seed: 90 + i, shadow: false, lineWidth: 2
      });
      D.text(ctx, rows[i].name, x + 46, ry + 8, { size: 20, color: '#33294a', shadow: false });
      D.text(ctx, rows[i].sub, x + 46, ry + 32, { size: 14, color: '#7a6f94', shadow: false });
    }

    D.textBlock(ctx,
      'The game writes to its three slots by itself, at each chapter and on the ' +
      'rug in the hall. This is the other kind: the save you make, wherever you ' +
      'happen to be standing.\n\n' +
      'It comes out as a file. Put it somewhere you will find it — the three ' +
      'slots live in the browser, and a browser is allowed to forget them. You ' +
      'can also just drop a file onto the window.',
      x + 26, y + 224, w - 52, { size: 15, color: '#6b5f86', shadow: false, lineHeight: 23 });

    if (this.wrote) {
      D.text(ctx, 'last written out: ' + this.wrote, x + 26, y + h - 58, {
        size: 13, color: '#8a6a2f', shadow: false
      });
    }
  },

  drawConfirm: function (ctx) {
    var D = PW.draw;
    D.fill(ctx, '#0b0a14', 0.5);
    var w = 520, h = 168, x = PW.W / 2 - w / 2, y = 190;
    D.panel(ctx, x, y, w, h, {
      fill: 'rgba(246,237,220,.98)', stroke: '#3a3050', radius: 14, seed: 99
    });
    D.textBlock(ctx, this.confirm.text, x + 28, y + 26, w - 56, {
      size: 19, color: '#33294a', shadow: false, lineHeight: 26
    });
    var labels = this.confirm.labels || ['yes', 'no'];
    for (var i = 0; i < 2; i++) {
      var sel = i === this.confirm.idx;
      var bx = x + 120 + i * 160;
      PW.ui.region('yesno', i, bx - 16, y + h - 60, 114, 46);
      if (sel) {
        D.panel(ctx, bx - 12, y + h - 56, 106, 38, {
          fill: 'rgba(232,200,130,.75)', stroke: '#3a3050', radius: 9, seed: 7 + i, shadow: false
        });
      }
      D.text(ctx, labels[i], bx + 41, y + h - 48, {
        size: 20, align: 'center', color: sel ? '#33294a' : '#9c93ad', shadow: false
      });
    }
  }
};
