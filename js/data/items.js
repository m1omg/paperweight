/* PAPERWEIGHT — things you carry, and things you keep.
 *
 * POCKET things are ordinary supplies. You may carry as many as you like.
 * KEPT things are memories with a weight to them, and the pouch only holds so
 * many. Filling it is the point. So is deciding what comes out again.
 */
'use strict';

PW.items = (function () {

  var I = {

    /* ------------------------------------------------------ supplies --- */

    jam: {
      name: 'Jar of Jam', icon: 0, kind: 'pocket',
      desc: 'Strawberry. The lid was always too tight for you.',
      target: 'ally', use: { hp: 60 },
      flavour: 'Sweet enough to make your teeth ache.'
    },
    sweet: {
      name: 'Boiled Sweet', icon: 12, kind: 'pocket',
      desc: 'Lemon, gone slightly sticky in its wrapper.',
      target: 'ally', use: { hp: 25, bp: 12 },
      flavour: 'It clicks against your teeth.'
    },
    plaster: {
      name: 'Fabric Plaster', icon: 3, kind: 'pocket',
      desc: 'For the sort of hurt you can point at.',
      target: 'ally', use: { hp: 45, calm: 1 },
      flavour: 'Someone smooths it down with their thumb.'
    },
    sock: {
      name: 'Warm Sock', icon: 11, kind: 'pocket',
      desc: 'Hand-knitted. One of them is always longer.',
      target: 'ally', use: { bp: 35 },
      flavour: 'Your feet stop being an emergency.'
    },
    crane: {
      name: 'Paper Crane', icon: 9, kind: 'pocket',
      desc: 'Folded out of a page from an old catalogue.',
      target: 'ally', use: { hp: 20, mood: 'steady', moodAmt: 2 },
      flavour: 'It settles on their shoulder and everything gets quieter.'
    },
    thimble: {
      name: 'Chipped Thimble', icon: 8, kind: 'pocket',
      desc: 'Porcelain, and no good at its job any more.',
      target: 'ally', use: { buff: { def: 1.4, turns: 4 } },
      flavour: 'A small hard shell for a small soft finger.'
    },
    pencil: {
      name: 'Pencil Stub', icon: 10, kind: 'pocket',
      desc: 'Chewed at one end. Still writes.',
      target: 'downed', use: { revive: 0.5 },
      flavour: 'You draw them back in, line by line.'
    },

    /* --------------------------------------------------- kept things --- */

    crown: {
      name: 'Paper Crown', icon: 13, kind: 'kept', chapter: 1,
      desc: 'She made it for you out of the local paper. ' +
            'You wore it to breakfast for a week.',
      target: 'ally', use: { mood: 'steady', moodAmt: 2, bp: 15 },
      flavour: 'You are still, technically, a queen.',
      memory: 'You were six and you would not take it off. She never once told ' +
              'you to.'
    },
    marble: {
      name: 'Glass Marble', icon: 4, kind: 'kept', chapter: 2,
      desc: 'A blue swirl inside. Dell traded you three for it and then cried, ' +
            'so you gave them all back and kept only this one.',
      target: 'enemy', use: { dmg: 40, mood: 'frayed' },
      flavour: 'It has a small chip you can feel with your thumbnail.',
      memory: 'He said it was his best one. He gave it to you anyway.'
    },
    thread: {
      name: 'Spool of Red Thread', icon: 2, kind: 'kept', chapter: 3,
      desc: 'Hal carries it everywhere and will not say why.',
      target: 'enemy', use: { bind: 3 },
      flavour: 'The end is frayed from being wound and unwound.',
      memory: 'She mends things instead of saying sorry. It is not nothing.'
    },
    violet: {
      name: 'Pressed Violet', icon: 6, kind: 'kept', chapter: 3,
      desc: 'From the garden, flattened between two panes of glass. ' +
            'It kept its colour longer than anyone expected.',
      target: 'party', use: { hp: 35, mood: 'tender' },
      flavour: 'It smells of nothing at all now.',
      memory: 'She used to say the small ones were the stubborn ones.'
    },
    musicbox: {
      name: 'Wind-Up Music Box', icon: 7, kind: 'kept', chapter: 4,
      desc: 'It plays eleven notes and then gives up.',
      target: 'all', use: { mood: 'steady', moodAmt: 2, all: true },
      flavour: 'Everyone stops to listen. Even the things that were shouting.',
      memory: 'You know the twelfth note. You have always known it.'
    },
    photo: {
      name: 'Photograph, Face Down', icon: 1, kind: 'kept', chapter: 4,
      desc: 'You have not turned it over. You know what it is.',
      target: 'ally', use: { hp: 80, mood: 'tender', moodAmt: 1 },
      flavour: 'You look at the back of it, which is white, and that is enough.',
      memory: 'Four people at a kitchen table. One chair pushed out.'
    },
    locket: {
      name: 'Tarnished Locket', icon: 14, kind: 'kept', chapter: 5,
      desc: 'The catch is stiff. There is something inside, obviously.',
      target: 'party', use: { hp: 60, bp: 20 },
      flavour: 'Warm from your pocket, as if it has been held all day.',
      memory: 'She wore it every day and never once opened it in front of you.'
    },
    key: {
      name: 'Small Brass Key', icon: 5, kind: 'kept', chapter: 5,
      desc: 'It fits one door. You have been avoiding that door.',
      target: null,
      flavour: 'Heavier than a key that size has any right to be.',
      memory: 'It was in the pocket of the apron. It was always in the pocket.'
    },
    paperweight: {
      name: 'The Paperweight', icon: 15, kind: 'kept', chapter: 1, fixed: true,
      desc: 'Glass, the size of an apple, with a tiny lit house inside it. ' +
            'It is the last thing on the shelf that is still hers.',
      target: null,
      flavour: 'It is heavy. That is what it is for.',
      memory: 'It held her letters down so the window could stay open.'
    }
  };

  for (var k in I) I[k].id = k;

  /* What using a thing actually does, written out of its own `use` block.
     The descriptions are flavour and stay flavour — this is the line that
     tells you whether the Warm Sock is any use to you right now. Deriving it
     rather than writing it twice means it cannot quietly go out of date when
     a number is tuned. */
  function effectOf(item) {
    if (!item || !item.target) return '';
    var u = item.use || {}, out = [];
    if (u.revive) out.push('gets someone up again');
    if (u.hp) out.push('mends ' + u.hp);
    if (u.dmg) out.push('does ' + u.dmg);
    if (u.bp) out.push(u.bp + ' breath back');
    if (u.calm) out.push('steadies');
    if (u.bind) out.push('leaves them weaker and slower for ' + u.bind + ' turns');
    if (u.mood) out.push('nudges them ' + u.mood);
    if (u.buff) {
      if (u.buff.def) out.push('harder to hurt');
      if (u.buff.atk) out.push('hits harder');
      if (u.buff.turns) out[out.length - 1] += ' for ' + u.buff.turns + ' turns';
    }
    return out.join(', ');
  }

  /* What a thing is good for when nothing is in front of you.
     Moods, buffs and binding only mean anything inside a fight — out here a
     thing is worth reaching for if it mends, gives breath back, or gets
     somebody up off the floor. */
  function fieldUse(item) {
    if (!item || item.target === 'enemy') return false;
    var u = item.use || {};
    return !!(u.hp || u.bp || u.revive);
  }

  return {
    all: I,
    get: function (id) { return I[id] || null; },
    isKept: function (id) { return I[id] && I[id].kind === 'kept'; },
    effect: function (id) {
      return effectOf(typeof id === 'string' ? I[id] : id);
    },

    /** Spend one, if it is the sort of thing that gets spent. A memory is not:
        the only way a kept thing leaves the pouch is being put down on purpose,
        which is a decision the player makes and the ending counts. */
    consume: function (id) {
      if (I[id] && I[id].kind === 'kept') return;
      this.take(id);
    },

    /* ------------------------------------------------ the two pouches -- */

    /** Consumables the player is carrying: {id: count}. */
    pocket: function () {
      if (!PW.state.pocket) PW.state.pocket = {};
      return PW.state.pocket;
    },

    give: function (id, n) {
      n = n || 1;
      var it = I[id];
      if (!it) return false;
      if (it.kind === 'kept') {
        if (PW.state.kept.indexOf(id) >= 0) return false;
        if (PW.state.kept.length >= PW.state.keptMax) return 'full';
        PW.state.kept.push(id);
        return true;
      }
      var p = this.pocket();
      p[id] = (p[id] || 0) + n;
      return true;
    },

    take: function (id, n) {
      n = n || 1;
      var it = I[id];
      if (!it) return false;
      if (it.kind === 'kept') {
        var i = PW.state.kept.indexOf(id);
        if (i < 0) return false;
        PW.state.kept.splice(i, 1);
        return true;
      }
      var p = this.pocket();
      if (!p[id]) return false;
      p[id] -= n;
      if (p[id] <= 0) delete p[id];
      return true;
    },

    count: function (id) {
      if (I[id] && I[id].kind === 'kept') return PW.state.kept.indexOf(id) >= 0 ? 1 : 0;
      return this.pocket()[id] || 0;
    },

    has: function (id) { return this.count(id) > 0; },

    /** Everything usable in a battle, as [{id, n, item}]. */
    usable: function () {
      var out = [];
      var p = this.pocket();
      for (var id in p) {
        if (p[id] > 0 && I[id] && I[id].target) out.push({ id: id, n: p[id], item: I[id] });
      }
      for (var i = 0; i < PW.state.kept.length; i++) {
        var kid = PW.state.kept[i];
        if (I[kid] && I[kid].target) out.push({ id: kid, n: 1, item: I[kid], kept: true });
      }
      return out;
    },

    /* ------------------------------------------- using one out in the world -- */

    /** True if this is any use with nothing attacking you. */
    usableOutside: function (id) {
      return fieldUse(typeof id === 'string' ? I[id] : id);
    },

    /** Everything in either pouch worth reaching for out here. */
    fieldUsable: function () {
      var out = [], p = this.pocket(), id;
      for (id in p) if (p[id] > 0 && fieldUse(I[id])) out.push(id);
      for (var i = 0; i < PW.state.kept.length; i++) {
        id = PW.state.kept[i];
        if (fieldUse(I[id])) out.push(id);
      }
      return out;
    },

    /** Members this would actually do something for right now — so the game can
        say "nobody needs it" instead of spending a jar of jam on nothing. */
    wouldHelp: function (id) {
      var it = I[id];
      if (!fieldUse(it)) return [];
      var u = it.use || {}, out = [];
      PW.state.party.forEach(function (m) {
        var r = PW.party.rec(m), s = PW.party.stats(m);
        if (r.hp <= 0) { if (u.revive) out.push(m); return; }
        if ((u.hp && r.hp < s.maxhp) || (u.bp && r.bp < s.maxbp)) out.push(m);
      });
      return out;
    },

    /** Does the whole party at once rather than asking who. */
    hitsEveryone: function (id) {
      var it = I[id];
      return !!it && (it.target === 'party' || it.target === 'all');
    },

    /** Use it out in the world on `who` (member ids). Spends it and returns
        what it did, as [{id, hp, bp, revived}], or null if it would do
        nothing at all. */
    useOutside: function (id, who) {
      var it = I[id];
      if (!fieldUse(it) || !who || !who.length) return null;
      var u = it.use || {}, done = [];
      who.forEach(function (m) {
        var r = PW.party.rec(m), s = PW.party.stats(m), got = null;
        if (r.hp <= 0) {
          if (!u.revive) return;
          r.hp = Math.max(1, Math.round(s.maxhp * u.revive));
          got = { id: m, hp: r.hp, bp: 0, revived: true };
        } else {
          var dh = 0, db = 0;
          if (u.hp) { dh = Math.min(s.maxhp, r.hp + u.hp) - r.hp; r.hp += dh; }
          if (u.bp) { db = Math.min(s.maxbp, r.bp + u.bp) - r.bp; r.bp += db; }
          if (dh || db) got = { id: m, hp: dh, bp: db, revived: false };
        }
        if (got) done.push(got);
      });
      if (!done.length) return null;
      this.consume(id);
      return done;
    },

    keptFull: function () { return PW.state.kept.length >= PW.state.keptMax; },

    /** How many slots the pouch has room for. */
    keptFree: function () { return Math.max(0, PW.state.keptMax - PW.state.kept.length); }
  };
})();
