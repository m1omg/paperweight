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
  this.note = '';
  this.noteT = 0;
};

PW.PocketScene.TABS = ['who', 'pockets', 'kept'];

PW.PocketScene.prototype = {

  enter: function () { PW.input.flush(); },

  update: function (dt) {
    this.t += dt;
    this.appear = Math.min(1, this.appear + dt * 5);
    if (this.noteT > 0) this.noteT -= dt;

    if (this.confirm) { this.updateConfirm(); return; }

    if (PW.input.hit('back') || PW.input.hit('menu')) {
      PW.audio.sfx('cancel');
      PW.game.pop();
      return;
    }

    if (PW.input.rep('left')) { this.tab = (this.tab + 2) % 3; this.idx = 0; PW.audio.sfx('cursor'); }
    if (PW.input.rep('right')) { this.tab = (this.tab + 1) % 3; this.idx = 0; PW.audio.sfx('cursor'); }

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
    }
  },

  list: function () {
    if (this.tab === 0) return PW.state.party;
    if (this.tab === 1) {
      var p = PW.items.pocket();
      return Object.keys(p).filter(function (k) { return p[k] > 0; });
    }
    return PW.state.kept;
  },

  activate: function () {
    var list = this.list();
    if (!list.length) return;
    var self = this;

    if (this.tab === 2) {
      var id = list[this.idx];
      var item = PW.items.get(id);
      if (!item || item.fixed) {
        PW.audio.sfx('error');
        this.say('That one stays.');
        return;
      }
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
      return;
    }

    if (this.tab === 1) {
      PW.audio.sfx('cursor');
      this.say('You can use that when something is in front of you.');
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
    else this.drawKept(ctx, x, y, w, h);

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
      D.text(ctx, item.desc, x + 380, ry + 8, { size: 14, color: '#7a6f94', shadow: false });
    }
  },

  drawKept: function (ctx, x, y, w, h) {
    var D = PW.draw;
    var list = PW.state.kept;

    D.text(ctx, 'you can carry ' + PW.state.keptMax + ' of these',
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
      D.textBlock(ctx, item.memory || item.desc, x + 96, ry + 32, w - 180, {
        size: 14, color: '#6b5f86', shadow: false, lineHeight: 17
      });
      if (item.fixed) {
        D.text(ctx, 'stays', x + w - 44, ry + 8, {
          size: 14, align: 'right', color: '#8a7fa8', shadow: false
        });
      } else if (sel) {
        D.text(ctx, 'Z to put down', x + w - 44, ry + 8, {
          size: 14, align: 'right', color: '#a5601f', shadow: false
        });
      }
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
    var labels = ['yes', 'no'];
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
