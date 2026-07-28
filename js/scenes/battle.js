/* PAPERWEIGHT — turn-based battles built around the Mood triangle.
 *
 * You choose actions for the whole party, then the round plays out in speed
 * order. Most fights can be won by hitting things. Some can be ended instead
 * by HOLDing whatever is in front of you until it stops needing to be a
 * monster. The game never tells you which; it just remembers.
 */
'use strict';

PW.BattleScene = function (troopId, opts) {
  this.name = 'battle';
  this.opaque = true;
  this.troopId = troopId;
  this.troop = PW.troops[troopId] || { foes: ['dustling'] };
  this.opts = opts || {};
  this.box = new PW.DialogueBox();

  this.t = 0;
  this.state = 'intro';
  this.phaseT = 0;
  this.msg = '';
  this.msgT = 0;
  this.floats = [];
  this.queue = [];
  this.step = 0;
  this.round = 0;
  this.together = 0;
  this.result = null;
  this.usedOnce = {};
};

PW.BattleScene.LAYOUT = {
  cardY: 444, cardH: 88, cardW: 228, cardGap: 8, cardX: 12,
  // Foes stand higher than the party so their name tags clear the party's
  // heads, and they spread over a narrower span than the four party slots so
  // the outermost creature never lands on top of the outermost friend.
  partyY: 436, foeY: 302, foeBossY: 344, foeSpan: 560
};

PW.BattleScene.prototype = {

  /* ============================================================ setup == */

  enter: function () {
    var L = PW.BattleScene.LAYOUT;

    this.party = PW.state.party.map(function (id, i) {
      var s = PW.party.stats(id);
      var r = PW.party.rec(id);
      var def = PW.actors[id];
      return {
        side: 'party', id: id, who: def, name: def.name, rec: r,
        hp: r.hp, maxhp: s.maxhp, bp: r.bp, maxbp: s.maxbp,
        atk: s.atk, def: s.def, spd: s.spd,
        mood: PW.moods.blank(), shield: 0, buffs: [], dots: [], stun: 0, taunt: 0,
        x: L.cardX + i * (L.cardW + L.cardGap) + L.cardW / 2, y: L.partyY,
        lunge: 0, flashT: 0, alive: r.hp > 0, slot: i
      };
    });

    var names = this.troop.foes;
    this.foes = names.map(function (n, i) {
      var d = PW.enemies[n];
      var img = PW.assets.img(d.sprite);
      return {
        side: 'foe', id: n + '#' + i, who: d, name: d.name,
        hp: d.hp, maxhp: d.hp, bp: 0, maxbp: 0,
        atk: d.atk, def: d.def, spd: d.spd,
        mood: d.lean ? { id: d.lean, lvl: 1 } : PW.moods.blank(),
        shield: 0, buffs: [], dots: [], stun: 0,
        actions: d.actions, phase: 0, soothed: 0, settled: false,
        x: 0, y: d.boss ? L.foeBossY : L.foeY,
        scale: d.scale, img: img, lunge: 0, flashT: 0, alive: true,
        appearT: -i * 0.14
      };
    });
    this.layoutFoes();

    var music = this.troop.boss ? (this.foes[0].who.music || 'boss') : 'battle';
    PW.audio.play(music, { fade: 0.25 });
    if (this.troop.boss && this.foes[0].who.tension) {
      PW.audio.setTension(this.foes[0].who.tension);
    }

    this.msg = names.length === 1
      ? this.foes[0].name + ' is in the way.'
      : 'Something is in the way.';
    this.msgT = 1.4;
    this.state = 'intro';
    this.phaseT = 1.4;
    PW.input.flush();
  },

  exit: function () {
    PW.audio.setTension(0);
  },

  layoutFoes: function () {
    var live = this.foes.filter(function (f) { return f.alive && !f.settled; });
    var n = live.length;
    var span = Math.min(PW.BattleScene.LAYOUT.foeSpan, n * 200);
    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 0.5 : i / (n - 1);
      live[i].x = 480 + (t - 0.5) * span;
    }
  },

  /* ========================================================== helpers == */

  livingFoes: function () {
    return this.foes.filter(function (f) { return f.alive && !f.settled; });
  },

  livingParty: function () {
    return this.party.filter(function (p) { return p.alive; });
  },

  buffMult: function (a, key) {
    var m = 1;
    for (var i = 0; i < a.buffs.length; i++) {
      if (a.buffs[i][key] !== undefined) m *= a.buffs[i][key];
    }
    return m;
  },

  say: function (text, hold) {
    this.msg = text;
    this.msgT = hold === undefined ? 1.0 : hold;
  },

  float: function (target, text, color, big) {
    this.floats.push({
      x: target.x + PW.util.rand(-16, 16),
      y: (target.side === 'foe' ? target.y - 90 : target.y - 70),
      text: text, color: color || '#fff', t: 1.0, big: !!big
    });
  },

  /* ---------------------------------------------------------- damage -- */

  computeDamage: function (attacker, target, power, opt) {
    opt = opt || {};
    var M = PW.moods;
    var aM = M.stats(attacker.mood), dM = M.stats(target.mood);
    var atk = attacker.atk * aM.atk * this.buffMult(attacker, 'atk');
    var def = target.def * dM.def * this.buffMult(target, 'def');
    var adv = M.mult(attacker.mood, target.mood);

    var base = atk * power * 1.5;
    var mitig = 130 / (130 + Math.max(0, def));
    var dmg = base * mitig * adv * dM.taken * PW.util.rand(0.92, 1.08);

    var crit = PW.util.chance(0.05 + (adv > 1 ? 0.10 : 0));
    if (crit) dmg *= 1.7;

    return { dmg: Math.max(1, Math.round(dmg)), crit: crit, adv: adv };
  },

  hits: function (attacker, target) {
    var M = PW.moods;
    var acc = 0.95 * M.stats(attacker.mood).acc * this.buffMult(attacker, 'acc');
    var eva = M.stats(target.mood).eva;
    return Math.random() < PW.util.clamp(acc - eva, 0.35, 0.99);
  },

  applyDamage: function (attacker, target, amount, opt) {
    opt = opt || {};
    if (!target.alive) return 0;
    var left = amount;
    if (target.shield > 0) {
      var absorbed = Math.min(target.shield, left);
      target.shield -= absorbed;
      left -= absorbed;
      if (absorbed > 0) this.float(target, '-' + absorbed + ' held', '#9fd4ff');
    }
    target.hp = Math.max(0, target.hp - left);
    target.flashT = 0.3;
    target.lunge = -8;
    if (left > 0) {
      this.float(target, String(left), opt.crit ? '#ffd166' : '#ff8b7a', opt.crit);
    }
    PW.audio.sfx(opt.crit ? 'crit' : 'hit');
    if (opt.crit) PW.game.shake(6, 0.25);

    if (target.side === 'party') {
      this.together = Math.min(100, this.together + (left / target.maxhp) * 26);
    }
    if (target.hp <= 0) this.down(target);
    return left;
  },

  heal: function (target, amount, quiet) {
    if (!target.alive && !quiet) return 0;
    var M = PW.moods.stats(target.mood);
    var amt = Math.round(amount * M.healIn);
    var before = target.hp;
    target.hp = Math.min(target.maxhp, target.hp + amt);
    var got = target.hp - before;
    if (got > 0) {
      this.float(target, '+' + got, '#a8e6a0');
      PW.audio.sfx('heal');
    }
    return got;
  },

  giveBp: function (target, amount) {
    var before = target.bp;
    target.bp = PW.util.clamp(target.bp + amount, 0, target.maxbp);
    var got = target.bp - before;
    if (got > 0) this.float(target, '+' + got + ' breath', '#9fd4ff');
    return got;
  },

  down: function (a) {
    a.alive = false;
    a.hp = 0;
    a.shield = 0;
    a.mood = PW.moods.blank();
    PW.audio.sfx('hurt');
    if (a.side === 'foe') {
      this.say(a.name + ' comes apart into dust.', 0.85);
      this.layoutFoes();
    } else {
      this.say(a.name + ' cannot keep going.', 0.9);
    }
  },

  moodShift: function (target, spec) {
    if (!spec || !target.alive) return;
    var before = PW.moods.label(target.mood);
    PW.moods.shift(target.mood, spec.id, spec.amt || 1, spec.force);
    var after = PW.moods.label(target.mood);
    if (before !== after) {
      this.float(target, after, PW.moods.color(target.mood));
      PW.audio.sfx('chime');
    }
  },

  /* ============================================================ update = */

  update: function (dt) {
    this.t += dt;

    for (var i = this.floats.length - 1; i >= 0; i--) {
      var f = this.floats[i];
      f.t -= dt;
      f.y -= 26 * dt;
      if (f.t <= 0) this.floats.splice(i, 1);
    }
    var all = this.party.concat(this.foes);
    for (var j = 0; j < all.length; j++) {
      var a = all[j];
      if (a.flashT > 0) a.flashT -= dt;
      a.lunge = PW.util.approach(a.lunge, 0, 0.14, dt);
      if (a.appearT !== undefined && a.appearT < 1) a.appearT += dt * 1.6;
    }
    if (this.msgT > 0) this.msgT -= dt;

    if (this.box.active) { this.box.update(dt); return; }
    if (PW.game.busy() && this.state !== 'intro') return;

    switch (this.state) {
      case 'intro': this.updateIntro(dt); break;
      case 'input': this.updateInput(dt); break;
      case 'resolve': this.updateResolve(dt); break;
      case 'endround': this.updateEndRound(dt); break;
      case 'finish': this.updateFinish(dt); break;
    }
  },

  updateIntro: function (dt) {
    this.phaseT -= dt;
    if (this.phaseT <= 0 || PW.input.hit('ok')) this.beginRound();
  },

  beginRound: function () {
    this.round++;
    this.actions = {};
    this.inputIdx = 0;
    this.menu = null;
    this.state = 'input';
    this.nextInput(0);
  },

  /* ------------------------------------------------------------ input -- */

  inputMember: function () {
    return this.party[this.inputIdx];
  },

  nextInput: function (dir) {
    // Walk to the next member who can actually be given an order.
    var n = this.party.length;
    var guard = 0;
    while (guard++ < n * 2) {
      var m = this.party[this.inputIdx];
      if (m && m.alive && m.stun <= 0) break;
      if (m && m.stun > 0) this.actions[m.id] = { type: 'stunned', actor: m };
      this.inputIdx += (dir >= 0 ? 1 : -1);
      if (this.inputIdx >= n) { this.startResolve(); return; }
      if (this.inputIdx < 0) { this.inputIdx = 0; break; }
    }
    if (this.inputIdx >= n) { this.startResolve(); return; }
    this.menu = { level: 'root', idx: 0 };
  },

  rootOptions: function (m) {
    var o = [
      { key: 'attack', label: 'Hit' },
      { key: 'skill', label: 'Do' },
      { key: 'hold', label: 'Hold' },
      { key: 'item', label: 'Thing' }
    ];
    if (m.id === 'june' && this.together >= 100) {
      o.splice(3, 0, { key: 'together', label: 'Together', hot: true });
    }
    o.push({ key: 'flee', label: this.troop.noFlee ? 'Stay' : 'Go' });
    return o;
  },

  updateInput: function (dt) {
    var m = this.inputMember();
    if (!m) { this.startResolve(); return; }
    var menu = this.menu;
    if (!menu) { this.nextInput(1); return; }

    if (menu.level === 'root') this.inputRoot(m, menu);
    else if (menu.level === 'skill') this.inputSkill(m, menu);
    else if (menu.level === 'item') this.inputItem(m, menu);
    else if (menu.level === 'target') this.inputTarget(m, menu);
  },

  moveIdx: function (menu, len, vertical) {
    var up = vertical ? 'up' : 'left', dn = vertical ? 'down' : 'right';
    if (PW.input.rep(up)) { menu.idx = (menu.idx + len - 1) % len; PW.audio.sfx('cursor'); }
    if (PW.input.rep(dn)) { menu.idx = (menu.idx + 1) % len; PW.audio.sfx('cursor'); }
  },

  inputRoot: function (m, menu) {
    var opts = this.rootOptions(m);
    this.moveIdx(menu, opts.length, true);

    var tapped = PW.ui.tapped('cmd');
    if (tapped === 'miss') return;
    if (tapped) menu.idx = tapped.idx;

    if (PW.input.hit('back')) {
      PW.audio.sfx('cancel');
      // step back to the previous member and re-do their order
      var i = this.inputIdx - 1;
      while (i >= 0 && (!this.party[i].alive || this.party[i].stun > 0)) i--;
      if (i >= 0) {
        this.inputIdx = i;
        delete this.actions[this.party[i].id];
        this.menu = { level: 'root', idx: 0 };
      }
      return;
    }

    if (!PW.input.hit('ok') && !tapped) return;
    var key = opts[menu.idx].key;
    PW.audio.sfx('confirm');

    switch (key) {
      case 'attack':
        this.menu = { level: 'target', idx: 0, side: 'foe', act: { type: 'attack' } };
        break;
      case 'skill':
        this.menu = { level: 'skill', idx: 0, list: PW.party.skillsOf(m.id) };
        break;
      case 'hold':
        this.menu = { level: 'target', idx: 0, side: 'any', act: { type: 'hold' } };
        break;
      case 'item':
        var list = PW.items.usable();
        if (!list.length) { PW.audio.sfx('error'); this.say('Your pockets are empty.', 1.0); return; }
        this.menu = { level: 'item', idx: 0, list: list };
        break;
      case 'together':
        this.commit(m, { type: 'together' });
        break;
      case 'flee':
        if (this.troop.noFlee) {
          PW.audio.sfx('error');
          this.say('There is nowhere to go. Not from this one.', 1.2);
        } else {
          this.commit(m, { type: 'flee' });
        }
        break;
    }
  },

  inputSkill: function (m, menu) {
    var list = menu.list;
    if (!list.length) { this.menu = { level: 'root', idx: 0 }; return; }
    this.moveIdx(menu, list.length, true);

    var tapped = PW.ui.tapped('row');
    if (tapped === 'miss') return;
    if (tapped) menu.idx = tapped.idx;

    if (PW.input.hit('back')) {
      PW.audio.sfx('cancel');
      this.menu = { level: 'root', idx: 1 };
      return;
    }
    if (!PW.input.hit('ok') && !tapped) return;

    var sk = PW.skills.get(list[menu.idx]);
    if (!sk) return;
    if (sk.cost > m.bp) {
      PW.audio.sfx('error');
      this.say('Not enough breath for that.', 1.0);
      return;
    }
    if (sk.once && this.usedOnce[m.id + sk.id]) {
      PW.audio.sfx('error');
      this.say('Not twice. Not in one fight.', 1.0);
      return;
    }
    PW.audio.sfx('confirm');
    var act = { type: 'skill', skill: sk };
    if (sk.target === 'enemy') this.menu = { level: 'target', idx: 0, side: 'foe', act: act };
    else if (sk.target === 'ally') this.menu = { level: 'target', idx: 0, side: 'party', act: act };
    else if (sk.target === 'downed') this.menu = { level: 'target', idx: 0, side: 'downed', act: act };
    else this.commit(m, act);
  },

  inputItem: function (m, menu) {
    var list = menu.list;
    this.moveIdx(menu, list.length, true);

    var tapped = PW.ui.tapped('row');
    if (tapped === 'miss') return;
    if (tapped) menu.idx = tapped.idx;

    if (PW.input.hit('back')) {
      PW.audio.sfx('cancel');
      this.menu = { level: 'root', idx: 3 };
      return;
    }
    if (!PW.input.hit('ok') && !tapped) return;
    PW.audio.sfx('confirm');
    var entry = list[menu.idx];
    var act = { type: 'item', item: entry.item, itemId: entry.id };
    var t = entry.item.target;
    if (t === 'enemy') this.menu = { level: 'target', idx: 0, side: 'foe', act: act };
    else if (t === 'ally') this.menu = { level: 'target', idx: 0, side: 'party', act: act };
    else if (t === 'downed') this.menu = { level: 'target', idx: 0, side: 'downed', act: act };
    else this.commit(m, act);
  },

  targetList: function (side) {
    if (side === 'foe') return this.livingFoes();
    if (side === 'party') return this.livingParty();
    if (side === 'downed') return this.party.filter(function (p) { return !p.alive; });
    return this.livingFoes().concat(this.livingParty());
  },

  inputTarget: function (m, menu) {
    var list = this.targetList(menu.side);
    if (!list.length) {
      PW.audio.sfx('error');
      this.say('There is nobody like that.', 0.9);
      this.menu = { level: 'root', idx: 0 };
      return;
    }
    menu.idx = PW.util.clamp(menu.idx, 0, list.length - 1);
    if (PW.input.rep('left') || PW.input.rep('up')) {
      menu.idx = (menu.idx + list.length - 1) % list.length; PW.audio.sfx('cursor');
    }
    if (PW.input.rep('right') || PW.input.rep('down')) {
      menu.idx = (menu.idx + 1) % list.length; PW.audio.sfx('cursor');
    }
    // Tapping a creature or a party card aims straight at it.
    var tapped = PW.ui.tapped('target');
    if (tapped === 'miss') return;
    if (tapped) {
      var i = list.indexOf(tapped.data);
      if (i < 0) return;                 // not a legal target for this action
      menu.idx = i;
    }

    if (PW.input.hit('back')) {
      PW.audio.sfx('cancel');
      this.menu = { level: 'root', idx: 0 };
      return;
    }
    if (PW.input.hit('ok') || tapped) {
      PW.audio.sfx('confirm');
      var act = menu.act;
      act.target = list[menu.idx];
      this.commit(m, act);
    }
  },

  commit: function (m, act) {
    act.actor = m;
    this.actions[m.id] = act;
    this.inputIdx++;
    this.menu = null;
    if (this.inputIdx >= this.party.length) this.startResolve();
    else this.nextInput(1);
  },

  /* ---------------------------------------------------------- resolve -- */

  startResolve: function () {
    var self = this;
    var q = [];

    this.party.forEach(function (p) {
      var a = self.actions[p.id];
      if (!p.alive) return;
      if (!a) a = { type: 'attack', actor: p, target: self.livingFoes()[0] };
      if (a.type === 'stunned') return;
      q.push(a);
    });

    this.livingFoes().forEach(function (f) {
      if (f.stun > 0) return;
      q.push({ type: 'enemy', actor: f });
    });

    var self2 = this;
    q.forEach(function (a) {
      var m = PW.moods.stats(a.actor.mood);
      a.prio = a.actor.spd * (m.acc) * self2.buffMult(a.actor, 'spd') + PW.util.rand(0, 3);
      if (a.type === 'item' || a.type === 'hold') a.prio += 40;   // kindness is quick
    });
    q.sort(function (x, y) { return y.prio - x.prio; });

    this.queue = q;
    this.step = 0;
    this.state = 'resolve';
    this.sub = 'announce';
    this.phaseT = 0;
  },

  updateResolve: function (dt) {
    this.phaseT -= dt;
    if (this.phaseT > 0) {
      if (PW.input.hit('ok') && this.phaseT > 0.12) this.phaseT = 0.05;
      return;
    }

    if (this.step >= this.queue.length) { this.state = 'endround'; this.phaseT = 0; return; }
    var act = this.queue[this.step];

    if (this.sub === 'announce') {
      if (!act.actor.alive) { this.step++; return; }
      this.announce(act);
      this.sub = 'act';
      this.phaseT = 0.42;
      return;
    }

    if (this.sub === 'act') {
      this.perform(act);
      this.sub = 'after';
      this.phaseT = 0.62;
      return;
    }

    this.sub = 'announce';
    this.step++;
    if (this.checkEnd()) return;
  },

  announce: function (act) {
    var a = act.actor;
    a.lunge = a.side === 'party' ? -14 : 14;
    switch (act.type) {
      case 'attack': this.say(a.name + ' swings.', 0); break;
      case 'skill': this.say(act.skill.line.replace('{u}', a.name)
                     .replace('{t}', act.target ? act.target.name : 'everyone'), 0); break;
      case 'hold': this.say(a.name + ' holds on to ' + (act.target ? act.target.name : '—') + '.', 0); break;
      case 'item': this.say(a.name + ' uses the ' + act.item.name + '.', 0); break;
      case 'together': this.say(a.name + ' reaches for everyone at once.', 0); break;
      case 'flee': this.say('You try to leave.', 0); break;
      case 'enemy': this.announceEnemy(act); break;
    }
  },

  announceEnemy: function (act) {
    var f = act.actor;
    var pool = f.actions;
    var total = 0;
    pool.forEach(function (o) { total += o.w || 1; });
    var roll = Math.random() * total, chosen = pool[0];
    for (var i = 0; i < pool.length; i++) {
      roll -= (pool[i].w || 1);
      if (roll <= 0) { chosen = pool[i]; break; }
    }
    act.enemyAction = chosen;
    var line = chosen.line
      ? chosen.line.replace('{e}', f.name)
      : f.name + ' ' + chosen.name + '.';
    this.say(line, 0);
  },

  /* -------------------------------------------------------- performing -- */

  perform: function (act) {
    var a = act.actor;
    if (!a.alive) return;

    switch (act.type) {
      case 'attack': this.doAttack(a, act.target); break;
      case 'skill': this.doSkill(a, act.skill, act.target); break;
      case 'hold': this.doHold(a, act.target); break;
      case 'item': this.doItem(a, act.item, act.itemId, act.target); break;
      case 'together': this.doTogether(a); break;
      case 'flee': this.doFlee(); break;
      case 'enemy': this.doEnemy(a, act.enemyAction); break;
    }
  },

  pickTarget: function (list, fallback) {
    var live = list.filter(function (x) { return x.alive && !x.settled; });
    if (!live.length) return null;
    if (fallback && fallback.alive && !fallback.settled) return fallback;
    return PW.util.pick(live);
  },

  doAttack: function (a, target) {
    target = this.pickTarget(this.foes, target);
    if (!target) return;
    if (!this.hits(a, target)) {
      this.float(target, 'miss', '#cfc7e0');
      PW.audio.sfx('cancel');
      return;
    }
    var r = this.computeDamage(a, target, 1.0);
    this.applyDamage(a, target, r.dmg, { crit: r.crit });
    if (r.adv > 1) this.together = Math.min(100, this.together + 6);
    this.followUp(a, target);
  },

  /* An ally in the same frame of mind chips in for free. */
  followUp: function (a, target) {
    if (a.side !== 'party' || !target.alive) return;
    if (PW.moods.isSteady(a.mood)) return;
    var mates = this.livingParty().filter(function (p) {
      return p !== a && p.mood.id === a.mood.id && p.mood.lvl > 0;
    });
    if (!mates.length || !PW.util.chance(0.45)) return;
    var mate = PW.util.pick(mates);
    var r = this.computeDamage(mate, target, 0.55);
    mate.lunge = -12;
    this.applyDamage(mate, target, r.dmg, {});
    this.float(mate, 'with you', mate.who.colour);
  },

  doSkill: function (a, sk, target) {
    a.bp = Math.max(0, a.bp - sk.cost);
    if (sk.once) this.usedOnce[a.id + sk.id] = true;
    if (sk.sfx) PW.audio.sfx(sk.sfx);

    var self = this;
    var targets;
    if (sk.target === 'allEnemies') targets = this.livingFoes();
    else if (sk.target === 'allAllies') targets = this.livingParty();
    else if (sk.target === 'self') targets = [a];
    else if (sk.target === 'downed') targets = target ? [target] : [];
    else targets = [this.pickTarget(sk.target === 'ally' ? this.party : this.foes, target)].filter(Boolean);

    if (sk.reviveAll) {
      this.party.forEach(function (p) {
        if (!p.alive) {
          p.alive = true;
          p.hp = Math.max(1, Math.round(p.maxhp * sk.reviveAll));
          self.float(p, 'up', '#ffe9a8', true);
        }
      });
      PW.game.flash('#f6e7c4', 0.7, 0.5);
      targets = this.livingParty();
    }

    targets.forEach(function (tg) {
      if (!tg) return;

      if (sk.revive && !tg.alive) {
        tg.alive = true;
        tg.hp = Math.max(1, Math.round(tg.maxhp * sk.revive));
        self.float(tg, 'up', '#ffe9a8', true);
        return;
      }
      if (sk.power) {
        if (tg.side === 'foe' && !self.hits(a, tg)) {
          self.float(tg, 'miss', '#cfc7e0');
          return;
        }
        var hits = sk.hits || 1;
        for (var h = 0; h < hits; h++) {
          var r = self.computeDamage(a, tg, sk.power);
          self.applyDamage(a, tg, r.dmg, { crit: r.crit });
        }
      }
      if (sk.healFrac && tg.alive) self.heal(tg, tg.maxhp * sk.healFrac);
      if (sk.bp) self.giveBp(tg, sk.bp);
      if (sk.shield) {
        tg.shield += Math.round(a.atk * sk.shield);
        self.float(tg, 'held', '#9fd4ff');
      }
      if (sk.buff) {
        var bf = { turns: sk.buff.turns };
        if (sk.buff.atk) bf.atk = sk.buff.atk;
        if (sk.buff.def) bf.def = sk.buff.def;
        tg.buffs.push(bf);
        self.float(tg, 'steadier', '#a8e6a0');
      }
      if (sk.debuff) {
        var db = { turns: sk.debuff.turns };
        if (sk.debuff.atk) db.atk = sk.debuff.atk;
        if (sk.debuff.spd) db.spd = sk.debuff.spd;
        tg.buffs.push(db);
        self.float(tg, 'bound', '#d59ad0');
      }
      if (sk.dot) tg.dots.push({ dmg: Math.round(a.atk * sk.dot.dmg), turns: sk.dot.turns });
      if (sk.stun) { tg.stun = Math.max(tg.stun, sk.stun + 1); self.float(tg, 'still', '#cfe4ff'); }
      if (sk.strip) { tg.buffs = []; self.float(tg, 'undone', '#ffd0c0'); }
      if (sk.moodTarget) self.moodShift(tg, sk.moodTarget);
      if (sk.moodTargetAll) self.moodShift(tg, sk.moodTargetAll);
      // Mood first, then settling, so a skill that does both gets the benefit
      // of the mood it has just put them in.
      if (sk.settle && tg.side === 'foe' && tg.who.soothe) self.settle(tg, sk.settle);
    });

    if (sk.link) {
      var live = this.livingFoes();
      live.forEach(function (f) { f.linked = sk.link; });
    }
    if (sk.moodSelf) this.moodShift(a, sk.moodSelf);
    if (sk.recoil) {
      a.hp = Math.max(1, a.hp - Math.round(a.maxhp * sk.recoil));
      this.float(a, '-' + Math.round(a.maxhp * sk.recoil), '#ff8b7a');
    }
    if (sk.anim === 'burst') PW.game.flash('#f6e7c4', 0.5, 0.3);
  },

  doHold: function (a, target) {
    if (!target || (!target.alive && !target.settled)) return;

    if (target.side === 'party') {
      target.shield += Math.round(a.atk * 1.3);
      this.heal(target, target.maxhp * 0.09);
      PW.moods.shift(target.mood, 'steady', 1);
      target.dots = [];
      this.float(target, 'held', '#ffd9e2');
      this.together = Math.min(100, this.together + 20);
      PW.audio.sfx('guard');
      return;
    }

    // Holding a monster.
    if (!target.who.soothe) {
      this.float(target, 'no', '#cfc7e0');
      this.say(target.name + ' does not want to be held.', 1.1);
      PW.audio.sfx('error');
      this.together = Math.min(100, this.together + 6);
      return;
    }
    this.together = Math.min(100, this.together + 14);
    this.settle(target, 1, true);
  },

  /* Push a thing further toward being put down.
   *
   * How far one hold gets you depends on how the thing is feeling, which is
   * the rest of the game finally mattering here too: something TENDER has
   * already half let you in and settles twice as fast, and something FRAYED is
   * too angry to hear it — the hold still counts, but mostly it takes the edge
   * off, which is what makes the next one land properly. So the way to settle
   * a difficult thing is to work on its mood first, exactly as it is with
   * everything else in this game.
   */
  settle: function (target, amount, spoken) {
    var s = target.who.soothe;
    if (!s) return;

    var mood = target.mood;
    var gain = amount;
    var note = 'settling';
    if (mood.id === 'tender' && mood.lvl > 0) {
      gain = amount * 2;
      note = 'listening';
    } else if (mood.id === 'frayed' && mood.lvl > 0) {
      // Still counts — you do not stop holding something because it is angry —
      // but most of what the hold does is take the anger out of it.
      PW.moods.shift(mood, 'steady', 1);
      note = 'easing';
    }

    target.soothed = Math.min(s.turns, target.soothed + gain);
    PW.audio.sfx('chime');

    if (target.soothed >= s.turns) {
      target.settled = true;
      target.alive = false;
      this.say(s.text, 2.4);
      PW.audio.sfx('sparkle');
      PW.game.flash('#ffe9c4', 0.35, 0.5);
      if (s.drop && PW.items.get(s.drop)) PW.items.give(s.drop);
      this.layoutFoes();
      return;
    }

    this.float(target, note, '#ffd9e2');
    if (spoken) {
      this.say(note === 'easing'
        ? target.name + ' does not soften. Some of the anger goes out of it anyway.'
        : target.name + ' is not sure about this yet.', 1.0);
    }
  },

  doItem: function (a, item, itemId, target) {
    PW.items.take(itemId);
    var self = this;
    var u = item.use || {};
    var targets;
    if (item.target === 'party') targets = this.livingParty();
    else if (item.target === 'all') targets = this.livingParty();
    else if (item.target === 'downed') targets = target ? [target] : [];
    else if (item.target === 'enemy') targets = [this.pickTarget(this.foes, target)].filter(Boolean);
    else targets = [target || a];

    targets.forEach(function (tg) {
      if (!tg) return;
      if (u.revive && !tg.alive) {
        tg.alive = true;
        tg.hp = Math.max(1, Math.round(tg.maxhp * u.revive));
        self.float(tg, 'up', '#ffe9a8', true);
        return;
      }
      if (u.hp) self.heal(tg, u.hp);
      if (u.bp) self.giveBp(tg, u.bp);
      if (u.calm) PW.moods.shift(tg.mood, 'steady', u.calm);
      if (u.mood) self.moodShift(tg, { id: u.mood, amt: u.moodAmt || 1, force: true });
      if (u.buff) { tg.buffs.push({ def: u.buff.def, turns: u.buff.turns }); }
      if (u.dmg) self.applyDamage(a, tg, u.dmg, {});
      if (u.bind) tg.buffs.push({ atk: 0.7, spd: 0.5, turns: u.bind });
    });
    if (u.all) {
      this.livingParty().forEach(function (p) { PW.moods.shift(p.mood, 'steady', 2); });
      this.livingFoes().forEach(function (f) { PW.moods.shift(f.mood, 'steady', 1); });
    }
    PW.audio.sfx(u.dmg ? 'hit' : 'sparkle');
  },

  doTogether: function (a) {
    var self = this;
    this.together = 0;
    PW.game.flash('#f6e7c4', 0.85, 0.6);
    PW.game.shake(9, 0.5);
    PW.audio.sfx('levelup');
    PW.audio.duck(0.4, 1.2);

    var mates = this.livingParty();
    var foes = this.livingFoes();
    foes.forEach(function (f) {
      var total = 0;
      mates.forEach(function (m) {
        var r = self.computeDamage(m, f, 0.85);
        total += r.dmg;
      });
      self.applyDamage(a, f, total, { crit: true });
    });
    mates.forEach(function (m) {
      self.heal(m, m.maxhp * 0.2);
      PW.moods.shift(m.mood, 'steady', 2);
      m.shield += 12;
    });
    this.say('All of you at once. It is briefly enough.', 1.4);
  },

  doFlee: function () {
    var pSpd = 0, fSpd = 0;
    this.livingParty().forEach(function (p) { pSpd += p.spd; });
    this.livingFoes().forEach(function (f) { fSpd += f.spd; });
    if (Math.random() < PW.util.clamp(0.45 + (pSpd - fSpd) * 0.03, 0.2, 0.9)) {
      this.result = 'fled';
      this.say('You go. Nobody stops you.', 1.0);
      this.state = 'finish';
      this.phaseT = 1.0;
    } else {
      this.say('You do not manage it.', 1.0);
    }
  },

  doEnemy: function (f, action) {
    if (!action) return;
    var self = this;
    var targets;
    if (action.all) targets = this.livingParty();
    else {
      var taunters = this.livingParty().filter(function (p) { return p.taunt > 0; });
      targets = [PW.util.pick(taunters.length ? taunters : this.livingParty())];
    }
    targets = targets.filter(Boolean);

    targets.forEach(function (tg) {
      if (action.power) {
        if (!self.hits(f, tg)) { self.float(tg, 'miss', '#cfc7e0'); return; }
        var r = self.computeDamage(f, tg, action.power);
        var dealt = self.applyDamage(f, tg, r.dmg, { crit: r.crit });
        if (action.drain) f.hp = Math.min(f.maxhp, f.hp + Math.round(dealt * action.drain));
        if (f.linked) {
          // Hal's thread: what one of them feels, they all feel.
        }
      }
      if (action.drainBp && tg.bp > 0) {
        var lost = Math.min(tg.bp, action.drainBp);
        tg.bp -= lost;
        self.float(tg, '-' + lost + ' breath', '#b8a8d8');
      }
      if (action.moodTarget) self.moodShift(tg, action.moodTarget);
      if (action.moodTargetAll) self.moodShift(tg, action.moodTargetAll);
      if (action.debuff) tg.buffs.push({ acc: action.debuff.acc, turns: action.debuff.turns });
      if (action.dot) tg.dots.push({ dmg: Math.round(f.atk * action.dot.dmg), turns: action.dot.turns });
    });

    if (action.heal) this.heal(f, f.maxhp * action.heal);
    if (action.buff) f.buffs.push({ atk: action.buff.atk, def: action.buff.def, turns: action.buff.turns });
    if (action.selfMood) this.moodShift(f, action.selfMood);
  },

  /* -------------------------------------------------------- end of round */

  updateEndRound: function (dt) {
    var self = this;
    this.phaseT -= dt;
    if (this.phaseT > 0) return;

    // damage over time, buff timers, breath coming back
    this.party.concat(this.foes).forEach(function (a) {
      if (!a.alive) return;
      for (var i = a.dots.length - 1; i >= 0; i--) {
        var d = a.dots[i];
        a.hp = Math.max(0, a.hp - d.dmg);
        self.float(a, String(d.dmg), '#d59ad0');
        d.turns--;
        if (d.turns <= 0) a.dots.splice(i, 1);
        if (a.hp <= 0) self.down(a);
      }
      for (var j = a.buffs.length - 1; j >= 0; j--) {
        a.buffs[j].turns--;
        if (a.buffs[j].turns <= 0) a.buffs.splice(j, 1);
      }
      if (a.stun > 0) a.stun--;
      if (a.taunt > 0) a.taunt--;
      if (a.side === 'party') {
        var m = PW.moods.stats(a.mood);
        self.giveBp(a, Math.round(2 * m.bp));
      }
    });

    // boss phase changes
    this.livingFoes().forEach(function (f) {
      var ph = f.who.phases;
      if (!ph) return;
      while (f.phase < ph.length && f.hp / f.maxhp <= ph[f.phase].at) {
        var p = ph[f.phase];
        if (p.actions) f.actions = p.actions;
        if (p.set && p.set.lean) f.mood = { id: p.set.lean, lvl: 1 };
        self.say(p.line, 2.0);
        PW.game.shake(8, 0.5);
        PW.audio.sfx('boom');
        f.phase++;
      }
    });

    if (this.checkEnd()) return;
    this.beginRound();
  },

  checkEnd: function () {
    if (this.result) return true;
    if (!this.livingFoes().length) {
      // "Soothed" only counts when nothing in the fight was destroyed.
      var allSettled = this.foes.every(function (f) { return f.settled; });
      this.result = allSettled ? 'soothed' : 'win';
      this.state = 'finish';
      this.phaseT = 0.8;
      this.prepareVictory();
      return true;
    }
    if (!this.livingParty().length) {
      this.result = 'lose';
      this.state = 'finish';
      this.phaseT = 1.2;
      PW.audio.stopMusic(1.2);
      this.say('You cannot stay awake for this.', 2.0);
      return true;
    }
    return false;
  },

  prepareVictory: function () {
    var self = this;
    var xp = 0;
    this.foes.forEach(function (f) {
      var mult = f.settled ? 1.0 : 1.0;
      xp += Math.round(f.who.xp * mult);
    });
    this.xpGained = xp;
    this.grew = PW.party.award(xp);
    this.loot = [];
    this.foes.forEach(function (f) {
      if (f.settled) return;
      (f.who.drops || []).forEach(function (d) {
        if (PW.util.chance(d.chance) && PW.items.get(d.id)) {
          PW.items.give(d.id);
          self.loot.push(PW.items.get(d.id).name);
        }
      });
    });
    PW.state.battlesWon++;
    PW.audio.stopMusic(0.9);
    if (this.result === 'soothed') {
      PW.counter('soothed_count', 1);
      PW.audio.sfx('chime');
    }
  },

  /* ------------------------------------------------------------ finish -- */

  updateFinish: function (dt) {
    this.phaseT -= dt;
    if (this.phaseT > 0) return;

    // Losing a fight the story needs you to finish is not an ending — you get
    // up and it starts again. Popping the scene here would strand a waiting
    // script, so the fight is rebuilt in place instead.
    if (this.result === 'lose' && !this.opts.canLose) {
      if (!this.loseAsked) {
        var self = this;
        this.loseAsked = true;
        this.box.show(null, null,
          'You wake up on the floor of somewhere, with the taste of pennies. ' +
          'The house is still waiting.', 'narrate');
        this.box.ask(['Get up.', 'Stop.'], function (i) {
          if (i === 0) self.restart();
          else PW.game.replace(new PW.TitleScene());
        });
      }
      return;
    }

    if (!PW.input.hit('ok') && this.phaseT > -2.2) return;

    this.saveParty();
    var opts = this.opts;
    var res = this.result;
    PW.game.pop();
    // onEnd always fires, whatever happened, so a waiting script never hangs.
    if (opts.onEnd) opts.onEnd(res);
    if (res === 'lose' && opts.onLose) opts.onLose();
    else if (res === 'soothed' && opts.onSoothe) opts.onSoothe();
    else if ((res === 'win' || res === 'soothed') && opts.onWin) opts.onWin();
  },

  /** Fight it again, from the top, with everyone patched up. */
  restart: function () {
    PW.party.healAll();
    this.floats = [];
    this.queue = [];
    this.step = 0;
    this.round = 0;
    this.together = 0;
    this.result = null;
    this.loseAsked = false;
    this.usedOnce = {};
    this.grew = null;
    this.loot = null;
    this.xpGained = 0;
    this.enter();
  },

  saveParty: function () {
    this.party.forEach(function (p) {
      var r = PW.party.rec(p.id);
      r.hp = Math.max(p.alive ? 1 : 0, p.hp);
      r.bp = p.bp;
    });
  },

  /* ============================================================== draw == */

  draw: function (ctx) {
    var D = PW.draw;
    D.cover(ctx, PW.assets.img(this.troop.bg || 'bb_hub'), PW.W, PW.H);
    D.fill(ctx, '#140f24', 0.18);

    this.drawFoes(ctx);
    this.drawParty(ctx);
    D.vignette(ctx, PW.W, PW.H, 0.55);

    this.drawCards(ctx);
    this.drawTogether(ctx);
    this.drawFloats(ctx);
    this.drawMessage(ctx);

    if (this.state === 'input' && this.menu) this.drawMenu(ctx);
    if (this.state === 'finish') this.drawResult(ctx);
    this.box.draw(ctx);
  },

  /** True while the player is choosing who an action lands on. */
  aiming: function () {
    return this.state === 'input' && this.menu && this.menu.level === 'target';
  },

  drawFoes: function (ctx) {
    for (var i = 0; i < this.foes.length; i++) {
      var f = this.foes[i];
      if (!f.alive && !f.settled) continue;
      var appear = PW.util.clamp(f.appearT, 0, 1);
      var bob = Math.sin(this.t * 1.8 + i) * 6;
      var a = f.settled ? 0.35 : 1;
      ctx.save();
      ctx.globalAlpha = a * PW.util.smooth(appear);
      if (f.flashT > 0) {
        ctx.filter = 'brightness(2.2) saturate(0.3)';
      }
      PW.draw.sprite(ctx, f.img, f.x, f.y + bob + f.lunge * 0.6,
        f.scale * (0.6 + 0.4 * appear),
        { rot: Math.sin(this.t * 1.2 + i) * 0.03 });
      ctx.restore();

      if (!f.settled) this.drawFoeTag(ctx, f);
      if (this.aiming()) {
        var fw = f.img.width * f.scale, fh = f.img.height * f.scale;
        PW.ui.region('target', i, f.x - fw / 2, f.y - fh, fw, fh + 26, f);
      }
    }
  },

  drawFoeTag: function (ctx, f) {
    var D = PW.draw;
    var w = 118, h = 8;
    var x = f.x - w / 2, y = f.y + 14;
    D.bar(ctx, x, y, w, h, f.hp / f.maxhp, { fill: '#d8697a', back: 'rgba(30,22,44,.8)' });
    D.text(ctx, f.name, f.x, y + 12, {
      size: 14, align: 'center', color: '#f2e6cd', shadowOff: 1.5
    });
    if (!PW.moods.isSteady(f.mood)) {
      var img = PW.assets.img('mood_' + PW.moods.icon(f.mood));
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.drawImage(img, f.x + w / 2 - 4, y - 24, 26, 26);
      ctx.restore();
    }
    // How much holding this one would take, shown from the first turn rather
    // than only once you have already guessed right and started.
    if (f.who.soothe) {
      for (var i = 0; i < f.who.soothe.turns; i++) {
        ctx.fillStyle = i < f.soothed ? '#e79ab0' : 'rgba(230,220,240,.28)';
        ctx.beginPath();
        ctx.arc(f.x - w / 2 - 14, y - 4 - i * 11, 4, 0, 6.2832);
        ctx.fill();
      }
    }
  },

  drawParty: function (ctx) {
    for (var i = 0; i < this.party.length; i++) {
      var p = this.party[i];
      var def = p.who;
      var img = PW.assets.img('spr_' + def.sprite + '_up');
      var s = 0.34;
      var bob = def.float ? Math.sin(this.t * 2.4 + i) * 5 - 18 : 0;
      ctx.save();
      if (!p.alive) {
        ctx.globalAlpha = 0.28;
      } else if (p.flashT > 0) {
        ctx.filter = 'brightness(2.0)';
      }
      var yy = p.y + bob + p.lunge + (p.alive ? 0 : 14);
      PW.draw.sprite(ctx, img, p.x, yy, s * (def.float ? 0.62 : 1),
        { rot: p.alive ? 0 : 0.4 });
      ctx.restore();

      if (this.aiming()) {
        // The card is a bigger, steadier target than the little sprite.
        var L2 = PW.BattleScene.LAYOUT;
        PW.ui.region('target', i, L2.cardX + i * (L2.cardW + L2.cardGap),
                     yy - 96, L2.cardW, 96 + L2.cardH, p);
      }

      if (p.shield > 0 && p.alive) {
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(this.t * 4);
        ctx.strokeStyle = '#9fd4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, yy - 42, 44, 54, 0, 0, 6.2832);
        ctx.stroke();
        ctx.restore();
      }
    }
  },

  drawCards: function (ctx) {
    var L = PW.BattleScene.LAYOUT, D = PW.draw;
    for (var i = 0; i < this.party.length; i++) {
      var p = this.party[i];
      var x = L.cardX + i * (L.cardW + L.cardGap), y = L.cardY;
      var active = this.state === 'input' && this.inputMember() === p;

      D.panel(ctx, x, y, L.cardW, L.cardH, {
        fill: active ? 'rgba(250,240,214,.95)' : 'rgba(30,25,46,.86)',
        stroke: active ? '#3a3050' : 'rgba(226,212,180,.5)',
        radius: 12, seed: 31 + i * 5
      });

      var ink = active ? '#33294a' : '#f2e6cd';
      D.text(ctx, p.name, x + 14, y + 8, { size: 19, color: p.alive ? ink : '#8c8299', shadow: !active });

      var mood = PW.moods.label(p.mood);
      if (!PW.moods.isSteady(p.mood)) {
        var mi = PW.assets.img('mood_' + PW.moods.icon(p.mood));
        ctx.drawImage(mi, x + L.cardW - 36, y + 5, 30, 30);
        D.text(ctx, mood, x + L.cardW - 42, y + 12, {
          size: 13, align: 'right', color: PW.moods.color(p.mood), shadow: !active
        });
      }

      D.bar(ctx, x + 14, y + 36, L.cardW - 28, 11, p.hp / p.maxhp, {
        fill: p.hp / p.maxhp < 0.28 ? '#e0625f' : '#84c46a'
      });
      D.bar(ctx, x + 14, y + 52, L.cardW - 28, 8, p.bp / p.maxbp, { fill: '#7fa8d8' });

      D.text(ctx, p.hp + '/' + p.maxhp, x + 14, y + 64, {
        size: 14, color: active ? '#5a4f74' : '#bdb2cd', shadow: false
      });
      if (p.shield > 0) {
        D.text(ctx, '+' + p.shield, x + L.cardW - 16, y + 64, {
          size: 14, align: 'right', color: '#7fb8e8', shadow: false
        });
      }
      if (!p.alive) {
        D.text(ctx, 'down', x + L.cardW - 16, y + 8, {
          size: 15, align: 'right', color: '#a08fa8', shadow: false
        });
      }
    }
  },

  drawTogether: function (ctx) {
    var D = PW.draw;
    var w = 200, x = PW.W - w - 20, y = 20;
    var full = this.together >= 100;
    D.text(ctx, 'together', x + w, y - 2, {
      size: 15, align: 'right', color: full ? '#ffe9a8' : '#b9adc9', shadow: true
    });
    D.bar(ctx, x, y + 20, w, 10, this.together / 100, {
      fill: full ? '#ffd166' : '#c9a2d0'
    });
    if (full) {
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.t * 5);
      D.text(ctx, 'ready', x + w, y + 32, { size: 13, align: 'right', color: '#ffe9a8', shadow: false });
      ctx.restore();
    }
  },

  drawFloats: function (ctx) {
    for (var i = 0; i < this.floats.length; i++) {
      var f = this.floats[i];
      ctx.save();
      ctx.globalAlpha = PW.util.clamp(f.t * 1.6, 0, 1);
      PW.draw.text(ctx, f.text, f.x, f.y, {
        size: f.big ? 32 : 23, align: 'center', color: f.color,
        shadowOff: 2, wobble: 1.2
      });
      ctx.restore();
    }
  },

  drawMessage: function (ctx) {
    if (!this.msg) return;
    if (this.state === 'input') return;
    var D = PW.draw;
    var w = Math.min(760, D.measure(ctx, this.msg, 21) + 56);
    var x = PW.W / 2 - w / 2;
    D.panel(ctx, x, 22, w, 46, {
      fill: 'rgba(22,18,34,.88)', stroke: 'rgba(240,228,200,.55)', radius: 12, seed: 71
    });
    D.text(ctx, this.msg, PW.W / 2, 34, {
      size: 21, align: 'center', color: '#f2e6cd', shadow: false
    });
  },

  /* ------------------------------------------------------------- menus -- */

  drawMenu: function (ctx) {
    var m = this.menu, mem = this.inputMember();
    if (!m || !mem) return;
    if (m.level === 'root') this.drawRootMenu(ctx, mem, m);
    else if (m.level === 'skill') this.drawListMenu(ctx, mem, m, 'skill');
    else if (m.level === 'item') this.drawListMenu(ctx, mem, m, 'item');
    else if (m.level === 'target') this.drawTargetCursor(ctx, mem, m);
  },

  drawRootMenu: function (ctx, mem, m) {
    var D = PW.draw, L = PW.BattleScene.LAYOUT;
    var opts = this.rootOptions(mem);
    var w = 176, h = opts.length * 38 + 20;
    var x = PW.util.clamp(mem.x - w / 2, 12, PW.W - w - 12);
    var y = L.cardY - h - 12;

    D.panel(ctx, x, y, w, h, { fill: 'rgba(250,240,214,.96)', stroke: '#3a3050', radius: 12, seed: 91 });
    for (var i = 0; i < opts.length; i++) {
      var sel = i === m.idx;
      var oy = y + 10 + i * 38;
      PW.ui.region('cmd', i, x + 4, oy - 3, w - 8, 38);
      if (sel) {
        D.panel(ctx, x + 8, oy - 1, w - 16, 34, {
          fill: 'rgba(232,200,130,.7)', stroke: false, radius: 9, seed: 3 + i, shadow: false
        });
      }
      D.text(ctx, opts[i].label, x + 22, oy + 5, {
        size: 21, color: opts[i].hot ? '#a5601f' : '#33294a', shadow: false
      });
    }
    D.text(ctx, mem.name, x + w / 2, y - 26, {
      size: 17, align: 'center', color: mem.who.colour, shadowOff: 2
    });
  },

  drawListMenu: function (ctx, mem, m, kind) {
    var D = PW.draw;
    var w = 520, h = 244;
    var x = PW.W / 2 - w / 2, y = 180;
    D.panel(ctx, x, y, w, h, { fill: 'rgba(250,240,214,.97)', stroke: '#3a3050', radius: 14, seed: 55 });

    var list = m.list;
    var maxRows = 5;
    var start = PW.util.clamp(m.idx - 2, 0, Math.max(0, list.length - maxRows));

    for (var i = 0; i < Math.min(maxRows, list.length); i++) {
      var idx = start + i;
      var sel = idx === m.idx;
      var ry = y + 14 + i * 34;
      PW.ui.region('row', idx, x + 6, ry - 4, w - 12, 34);
      if (sel) {
        D.panel(ctx, x + 10, ry - 2, w - 20, 32, {
          fill: 'rgba(232,200,130,.7)', stroke: false, radius: 8, seed: idx, shadow: false
        });
      }
      if (kind === 'skill') {
        var sk = PW.skills.get(list[idx]);
        var afford = sk.cost <= mem.bp;
        D.text(ctx, sk.name, x + 24, ry + 4, {
          size: 20, color: afford ? '#33294a' : '#9c93ad', shadow: false
        });
        D.text(ctx, sk.cost + ' breath', x + w - 24, ry + 5, {
          size: 17, align: 'right', color: afford ? '#6b5f86' : '#b5abc4', shadow: false
        });
      } else {
        var e = list[idx];
        D.text(ctx, e.item.name, x + 24, ry + 4, {
          size: 20, color: e.kept ? '#7a4f86' : '#33294a', shadow: false
        });
        D.text(ctx, e.kept ? 'kept' : 'x' + e.n, x + w - 24, ry + 5, {
          size: 17, align: 'right', color: '#6b5f86', shadow: false
        });
      }
    }

    var desc, effect;
    if (kind === 'skill') {
      var pick = PW.skills.get(list[m.idx]) || {};
      desc = pick.desc;
      effect = PW.skills.effect(pick);
    } else {
      var ent = list[m.idx] || {};
      desc = ent.item && ent.item.desc;
      effect = ent.item ? PW.items.effect(ent.item) : '';
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(58,48,80,.3)';
    ctx.beginPath(); ctx.moveTo(x + 18, y + h - 66); ctx.lineTo(x + w - 18, y + h - 66); ctx.stroke();
    ctx.restore();
    D.textBlock(ctx, desc || '', x + 22, y + h - 58, w - 44, {
      size: 16, color: '#5a4f74', shadow: false, lineHeight: 21
    });
    // What it feels like sits above; what it does sits under it, plainly.
    if (effect) {
      D.text(ctx, effect, x + 22, y + h - 24, {
        size: 14, color: '#8a6a2f', shadow: false
      });
    }
  },

  drawTargetCursor: function (ctx, mem, m) {
    var list = this.targetList(m.side);
    var tg = list[PW.util.clamp(m.idx, 0, list.length - 1)];
    if (!tg) return;
    var D = PW.draw;
    var bounce = Math.sin(this.t * 6) * 5;
    var ty = tg.side === 'foe' ? tg.y - 130 : tg.y - 130;

    ctx.save();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(tg.x - 13, ty + bounce);
    ctx.lineTo(tg.x + 13, ty + bounce);
    ctx.lineTo(tg.x, ty + 17 + bounce);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // A little card of who they are, and — if you are trying to hold them —
    // whether that is something they might allow.
    if (tg.side === 'foe') {
      var lines = tg.who.desc || '';
      var w = 420, h = 96;
      var x = PW.util.clamp(tg.x - w / 2, 12, PW.W - w - 12);
      D.panel(ctx, x, 96, w, h, {
        fill: 'rgba(24,20,38,.9)', stroke: 'rgba(240,228,200,.5)', radius: 12, seed: 45
      });
      D.text(ctx, tg.name, x + 16, 104, { size: 18, color: '#ffd9a8', shadow: false });
      D.textBlock(ctx, lines, x + 16, 128, w - 32, {
        size: 15, color: '#d8cdbb', shadow: false, lineHeight: 19
      });
      if (m.act && m.act.type === 'hold') {
        var s = tg.who.soothe;
        var note, tint;
        if (!s) {
          note = 'this one will not be held';
          tint = '#9c93ad';
        } else if (tg.mood.id === 'tender' && tg.mood.lvl > 0) {
          note = 'it is listening — ' + (s.turns - tg.soothed) + ' to go, two at a time';
          tint = '#ffd166';
        } else if (tg.mood.id === 'frayed' && tg.mood.lvl > 0) {
          note = 'angry — holding it now mostly takes the edge off';
          tint = '#e07a4c';
        } else {
          note = 'this one might settle — ' + (s.turns - tg.soothed) + ' to go';
          tint = '#e79ab0';
        }
        D.text(ctx, note, x + w - 16, 104, {
          size: 14, align: 'right', color: tint, shadow: false
        });
      }
    }
  },

  drawResult: function (ctx) {
    var D = PW.draw;
    if (this.result === 'lose') return;
    if (this.result === 'fled') return;

    var w = 400, h = 40 + (this.grew ? this.grew.length : 0) * 24 +
                    (this.loot ? this.loot.length : 0) * 22 + 44;
    var x = PW.W / 2 - w / 2, y = 150;
    D.panel(ctx, x, y, w, h, { fill: 'rgba(250,240,214,.96)', stroke: '#3a3050', radius: 14, seed: 63 });

    var line = this.result === 'soothed' ? 'It settles.' : 'It is over.';
    D.text(ctx, line, PW.W / 2, y + 14, { size: 24, align: 'center', color: '#33294a', shadow: false });

    var yy = y + 50;
    D.text(ctx, this.xpGained + ' remembered', PW.W / 2, yy, {
      size: 18, align: 'center', color: '#6b5f86', shadow: false
    });
    yy += 26;
    (this.grew || []).forEach(function (g) {
      var t = PW.actors[g.id].name + ' is level ' + g.lv;
      if (g.learned.length) {
        t += ' — learned ' + g.learned.map(function (s) { return PW.skills.get(s).name; }).join(', ');
      }
      D.text(ctx, t, PW.W / 2, yy, { size: 16, align: 'center', color: '#7a5f2f', shadow: false });
      yy += 24;
    });
    (this.loot || []).forEach(function (l) {
      D.text(ctx, 'found: ' + l, PW.W / 2, yy, { size: 16, align: 'center', color: '#5a7a4f', shadow: false });
      yy += 22;
    });
  }
};
