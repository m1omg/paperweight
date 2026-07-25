/* PAPERWEIGHT — the four of you, and what you can do. */
'use strict';

PW.actors = (function () {

  var A = {

    /* ==================================================================== */
    june: {
      name: 'June', full: 'Juniper Vale', face: 'june', sprite: 'june',
      colour: '#e5c063',
      blurb: 'Twelve. Holds things. Has been holding this one a while.',
      hp: 44, bp: 24, atk: 12, def: 10, spd: 11,
      growth: { hp: 6, bp: 3, atk: 1.7, def: 1.4, spd: 1.1 },
      lean: 'steady',
      skills: ['steady_breath', 'say_it'],
      learn: { 3: 'hold_tight', 6: 'paper_crown', 9: 'keep', 12: 'dont_go' }
    },

    /* ==================================================================== */
    wick: {
      name: 'Wick', full: 'Wick', face: 'wick', sprite: 'wick',
      colour: '#f0c073',
      blurb: 'A lamp with moth wings. Speaks in things she used to say.',
      hp: 32, bp: 36, atk: 8, def: 8, spd: 14,
      growth: { hp: 4, bp: 5, atk: 1.1, def: 1.1, spd: 1.3 },
      lean: 'tender',
      float: true,
      skills: ['warm_up', 'remember_when'],
      learn: { 3: 'little_light', 5: 'shelter', 8: 'rekindle', 11: 'oldest_song' }
    },

    /* ==================================================================== */
    dell: {
      name: 'Dell', full: 'Odell Marsh', face: 'dell', sprite: 'dell',
      colour: '#7fae6a',
      blurb: 'Loud on purpose. It works about half the time.',
      hp: 58, bp: 16, atk: 16, def: 12, spd: 9,
      growth: { hp: 8, bp: 2, atk: 2.1, def: 1.6, spd: 0.8 },
      lean: 'frayed',
      skills: ['clobber', 'get_mad'],
      learn: { 3: 'stand_in_front', 5: 'big_swing', 8: 'still_here', 11: 'all_of_it' }
    },

    /* ==================================================================== */
    hal: {
      name: 'Hal', full: 'Halloway Finch', face: 'hal', sprite: 'hal',
      colour: '#93a8c9',
      blurb: 'Fifteen. Mends things instead of apologising.',
      hp: 42, bp: 28, atk: 13, def: 15, spd: 12,
      growth: { hp: 5, bp: 4, atk: 1.5, def: 2.0, spd: 1.2 },
      lean: 'distant',
      skills: ['bind', 'keep_distance'],
      learn: { 4: 'pull', 6: 'unpick', 9: 'red_thread', 12: 'cut_it' }
    }
  };

  for (var k in A) A[k].id = k;
  return A;
})();

/* ======================================================================== *
 *  SKILLS
 * ======================================================================== */

PW.skills = (function () {

  var S = {

    /* ---------------------------------------------------------- JUNE --- */
    steady_breath: {
      name: 'Steady Breath', cost: 4, target: 'self', icon: '~',
      desc: 'Breathe until the room stops tilting. Come back to Steady, and mend a little.',
      line: '{u} breathes out slowly.',
      healFrac: 0.14, moodSelf: { id: 'steady', amt: 2 }, sfx: 'heal', anim: 'calm'
    },
    say_it: {
      name: 'Say It Out Loud', cost: 7, target: 'enemy', icon: '!',
      desc: 'Name the thing. It makes it smaller and it makes it angrier.',
      line: '{u} says it out loud.',
      power: 1.2, moodTarget: { id: 'frayed', amt: 1 }, sfx: 'hit', anim: 'word'
    },
    hold_tight: {
      name: 'Hold Tight', cost: 12, target: 'allAllies', icon: '+',
      desc: 'Everyone gets held. Shields the party and brings them a step back toward Steady.',
      line: '{u} holds on to everyone at once.',
      shield: 1.6, moodTargetAll: { id: 'steady', amt: 1 }, sfx: 'guard', anim: 'shield'
    },
    paper_crown: {
      name: 'Paper Crown', cost: 9, target: 'ally', icon: '^',
      desc: 'Crown someone. They stand up straighter than they were going to.',
      line: '{u} crowns {t}.',
      buff: { atk: 1.35, def: 1.25, turns: 4 }, healFrac: 0.1, sfx: 'sparkle', anim: 'crown'
    },
    keep: {
      name: 'Keep', cost: 16, target: 'enemy', icon: 'o',
      desc: 'Hold a thing still in your two hands so it cannot go anywhere.',
      line: '{u} holds {t} still.',
      stun: 1, power: 0.4, sfx: 'chime', anim: 'hold'
    },
    dont_go: {
      name: "Don't Go", cost: 24, target: 'allAllies', icon: '*',
      desc: 'Refuse. Everyone who fell gets up, because you are not doing this again.',
      line: '{u} will not let go.',
      reviveAll: 0.4, healFrac: 0.2, sfx: 'levelup', anim: 'burst', once: true
    },

    /* ---------------------------------------------------------- WICK --- */
    warm_up: {
      name: 'Warm Up', cost: 5, target: 'ally', icon: '+',
      desc: 'Sit close to someone until they are less cold.',
      line: '{u} settles against {t}.',
      healFrac: 0.42, sfx: 'heal', anim: 'warm'
    },
    little_light: {
      name: 'Little Light', cost: 11, target: 'allAllies', icon: '+',
      desc: 'Not much light. Enough to see each other by.',
      line: '{u} burns a little brighter.',
      healFrac: 0.24, sfx: 'heal', anim: 'warmall'
    },
    remember_when: {
      name: 'Remember When', cost: 7, target: 'ally', icon: '~',
      desc: 'Say a true thing about someone. It opens them up, for better and worse.',
      line: '{u} remembers something out loud.',
      moodTarget: { id: 'tender', amt: 1, force: true }, bp: 14, sfx: 'chime', anim: 'memory'
    },
    shelter: {
      name: 'Shelter', cost: 9, target: 'allAllies', icon: '#',
      desc: 'Put the lamp between everyone and the dark.',
      line: '{u} puts itself in front.',
      shield: 1.9, sfx: 'guard', anim: 'shield'
    },
    rekindle: {
      name: 'Rekindle', cost: 18, target: 'downed', icon: '*',
      desc: 'Get a light going again from almost nothing.',
      line: '{u} leans down and breathes on the wick.',
      revive: 0.5, sfx: 'levelup', anim: 'burst'
    },
    oldest_song: {
      name: 'The Oldest Song', cost: 22, target: 'allAllies', icon: '@',
      desc: 'Eleven notes, and the twelfth one that never comes. Everyone stops.',
      line: '{u} hums the one that has no ending.',
      healFrac: 0.4, moodTargetAll: { id: 'steady', amt: 2 }, sfx: 'chime', anim: 'song'
    },

    /* ---------------------------------------------------------- DELL --- */
    clobber: {
      name: 'Clobber', cost: 4, target: 'enemy', icon: '!',
      desc: 'The lantern stick was not built for this and does not care.',
      line: '{u} swings wildly.',
      power: 1.65, sfx: 'hit', anim: 'swing'
    },
    get_mad: {
      name: 'Get Mad', cost: 0, target: 'self', icon: '^',
      desc: "Stop being reasonable. It is very effective and it costs you something.",
      line: '{u} decides to be angry about it.',
      moodSelf: { id: 'frayed', amt: 1, force: true }, buff: { atk: 1.2, turns: 3 },
      sfx: 'guard', anim: 'flare'
    },
    stand_in_front: {
      name: 'Stand In Front', cost: 6, target: 'self', icon: '#',
      desc: 'Put yourself between the party and whatever is coming.',
      line: '{u} steps in front of everyone.',
      taunt: 2, buff: { def: 1.5, turns: 2 }, sfx: 'guard', anim: 'shield'
    },
    big_swing: {
      name: 'Big Swing', cost: 10, target: 'allEnemies', icon: '!',
      desc: 'Hit everything. Aim is a problem for later.',
      line: '{u} swings at all of it.',
      power: 1.0, sfx: 'hit', anim: 'sweep'
    },
    still_here: {
      name: 'Still Here', cost: 9, target: 'ally', icon: '+',
      desc: "He is not good at this. He sits down next to you anyway.",
      line: '{u} sits down next to {t} and says nothing.',
      healFrac: 0.26, moodTarget: { id: 'steady', amt: 1 }, sfx: 'heal', anim: 'warm'
    },
    all_of_it: {
      name: 'All Of It', cost: 14, target: 'enemy', icon: '*',
      desc: 'Everything at once, including the parts he was saving.',
      line: '{u} gives it absolutely everything.',
      power: 2.5, recoil: 0.14, moodSelf: { id: 'frayed', amt: 1, force: true },
      sfx: 'crit', anim: 'burst'
    },

    /* ----------------------------------------------------------- HAL --- */
    bind: {
      name: 'Bind', cost: 5, target: 'enemy', icon: 'o',
      desc: 'Three loops of red thread. Nothing moves as fast after that.',
      line: '{u} winds thread around {t}.',
      debuff: { atk: 0.75, spd: 0.6, turns: 3 }, power: 0.5, sfx: 'guard', anim: 'thread'
    },
    keep_distance: {
      name: 'Keep Your Distance', cost: 0, target: 'self', icon: '^',
      desc: 'Step back. It is safer back there and she knows exactly how safe.',
      line: '{u} steps back out of reach.',
      moodSelf: { id: 'distant', amt: 1, force: true }, buff: { def: 1.3, turns: 3 },
      sfx: 'cancel', anim: 'fade'
    },
    pull: {
      name: 'Pull', cost: 7, target: 'enemy', icon: '!',
      desc: 'Hook it and haul. It ends up further away than it started.',
      line: '{u} hauls on the thread.',
      power: 1.3, moodTarget: { id: 'distant', amt: 1 }, sfx: 'hit', anim: 'thread'
    },
    unpick: {
      name: 'Unpick', cost: 9, target: 'enemy', icon: '~',
      desc: 'Find the loose end. Keep pulling. It comes apart over time.',
      line: '{u} finds a loose end.',
      power: 1.05, dot: { dmg: 0.45, turns: 3 }, sfx: 'hit', anim: 'thread'
    },
    red_thread: {
      name: 'Red Thread', cost: 13, target: 'allEnemies', icon: '@',
      desc: 'Tie everything to everything. Now they all feel it.',
      line: '{u} ties them all together.',
      link: 0.55, power: 0.6, sfx: 'chime', anim: 'thread'
    },
    cut_it: {
      name: 'Cut It', cost: 15, target: 'enemy', icon: '*',
      desc: "Sometimes the mend is wrong and the only honest thing is scissors.",
      line: '{u} cuts the thread.',
      power: 2.1, strip: true, sfx: 'crit', anim: 'cut'
    }
  };

  for (var k in S) S[k].id = k;
  return {
    all: S,
    get: function (id) { return S[id] || null; }
  };
})();

/* ======================================================================== *
 *  PARTY — the live roster, levels, and the shared Together gauge.
 * ======================================================================== */

PW.party = (function () {
  var U = PW.util;

  function xpNeeded(lv) { return Math.round(14 * Math.pow(lv, 1.65)); }

  function statAt(base, growth, lv) {
    return Math.round(base + growth * (lv - 1));
  }

  var P = {

    xpNeeded: xpNeeded,

    /** The saved record for a member (hp/bp/lv/xp), creating it if needed. */
    rec: function (id) {
      if (!PW.state.actors[id]) PW.state.actors[id] = PW.save.freshActor(id);
      return PW.state.actors[id];
    },

    /** Static definition. */
    def: function (id) { return PW.actors[id]; },

    /** Current maximum stats at this member's level. */
    stats: function (id) {
      var d = PW.actors[id], r = P.rec(id), lv = r.lv || 1;
      return {
        lv: lv,
        maxhp: statAt(d.hp, d.growth.hp, lv),
        maxbp: statAt(d.bp, d.growth.bp, lv),
        atk: statAt(d.atk, d.growth.atk, lv),
        def: statAt(d.def, d.growth.def, lv),
        spd: statAt(d.spd, d.growth.spd, lv)
      };
    },

    members: function () { return PW.state.party.slice(); },

    has: function (id) { return PW.state.party.indexOf(id) >= 0; },

    add: function (id) {
      if (P.has(id)) return false;
      PW.state.party.push(id);
      var r = P.rec(id);
      // A new friend arrives at the party's level, never behind.
      var top = 1;
      PW.state.party.forEach(function (m) { top = Math.max(top, P.rec(m).lv); });
      while (r.lv < top) { r.lv++; }
      var s = P.stats(id);
      r.hp = s.maxhp; r.bp = s.maxbp;
      return true;
    },

    remove: function (id) {
      var i = PW.state.party.indexOf(id);
      if (i >= 0) PW.state.party.splice(i, 1);
    },

    skillsOf: function (id) {
      var d = PW.actors[id], r = P.rec(id);
      var list = (r.skills && r.skills.length ? r.skills : (d.skills || [])).slice();
      for (var lvl in d.learn) {
        if (r.lv >= +lvl && list.indexOf(d.learn[lvl]) < 0) list.push(d.learn[lvl]);
      }
      return list;
    },

    healAll: function () {
      PW.state.party.forEach(function (id) {
        var r = P.rec(id), s = P.stats(id);
        r.hp = s.maxhp; r.bp = s.maxbp;
      });
    },

    /** Award xp; returns a list of {id, lv, learned:[]} for anyone who grew. */
    award: function (xp) {
      var grew = [];
      PW.state.party.forEach(function (id) {
        var r = P.rec(id);
        if (r.hp <= 0) return;               // the fallen learn nothing today
        r.xp += xp;
        var learned = [];
        while (r.xp >= xpNeeded(r.lv)) {
          r.xp -= xpNeeded(r.lv);
          r.lv++;
          var d = PW.actors[id];
          if (d.learn[r.lv]) learned.push(d.learn[r.lv]);
          var s = P.stats(id);
          r.hp = Math.min(s.maxhp, r.hp + Math.round(s.maxhp * 0.35));
          r.bp = Math.min(s.maxbp, r.bp + Math.round(s.maxbp * 0.35));
        }
        if (learned.length) grew.push({ id: id, lv: r.lv, learned: learned });
        else if (r.lv > (r._seenLv || 1)) grew.push({ id: id, lv: r.lv, learned: [] });
        r._seenLv = r.lv;
      });
      return grew;
    },

    aliveCount: function () {
      var n = 0;
      PW.state.party.forEach(function (id) { if (P.rec(id).hp > 0) n++; });
      return n;
    },

    /** Portrait expression that suits how someone is doing right now. */
    faceFor: function (id, mood, hpFrac) {
      if (hpFrac !== undefined && hpFrac <= 0.25) return 'low';
      if (!mood || !mood.lvl) return 'calm';
      if (mood.id === 'tender') return 'warm';
      if (mood.id === 'frayed') return 'raw';
      if (mood.id === 'distant') return 'low';
      return 'calm';
    }
  };

  return P;
})();
