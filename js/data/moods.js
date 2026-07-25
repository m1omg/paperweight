/* PAPERWEIGHT — the Mood system.
 *
 * Four ways of being. They are not "good" and "bad"; each one gives something
 * up to get something back, and each one has a way of being reached.
 *
 *   TENDER  — open, generous, easy to hurt.        beats FRAYED
 *   FRAYED  — sharp, forceful, careless.           beats DISTANT
 *   DISTANT — guarded, untouchable, hard to help.  beats TENDER
 *   STEADY  — none of the above. No edge, no cost.
 *
 * Gentleness disarms anger; anger cuts through someone who has gone quiet;
 * going quiet defeats someone trying to be kind to you. That triangle is the
 * whole argument of the game, and it is also the combat maths.
 */
'use strict';

PW.moods = (function () {
  var U = PW.util;

  var DEF = {
    steady: {
      id: 'steady', icon: 0, color: '#e8c882', dark: '#7a6338',
      names: ['Steady', 'Steady', 'Steady'],
      levels: [
        { atk: 1, def: 1, acc: 1, eva: 0, healIn: 1, healOut: 1, taken: 1, bp: 1 },
        { atk: 1, def: 1, acc: 1, eva: 0, healIn: 1, healOut: 1, taken: 1, bp: 1 },
        { atk: 1, def: 1, acc: 1, eva: 0, healIn: 1, healOut: 1, taken: 1, bp: 1 }
      ]
    },
    tender: {
      id: 'tender', icon: 1, color: '#e79ab0', dark: '#8c4d63',
      names: ['Steady', 'Tender', 'Wide Open'],
      levels: [
        null,
        { atk: 0.90, def: 0.78, acc: 1.05, eva: 0, healIn: 1.5, healOut: 1.5, taken: 1.1, bp: 1.3 },
        { atk: 0.80, def: 0.58, acc: 1.10, eva: 0, healIn: 2.0, healOut: 2.0, taken: 1.25, bp: 1.6 }
      ]
    },
    frayed: {
      id: 'frayed', icon: 2, color: '#e07a4c', dark: '#8c3f1f',
      names: ['Steady', 'Frayed', 'Blazing'],
      levels: [
        null,
        { atk: 1.35, def: 0.88, acc: 0.85, eva: 0, healIn: 0.8, healOut: 0.8, taken: 1.1, bp: 1 },
        { atk: 1.70, def: 0.72, acc: 0.70, eva: 0, healIn: 0.6, healOut: 0.6, taken: 1.25, bp: 0.8 }
      ]
    },
    distant: {
      id: 'distant', icon: 3, color: '#7f9cc4', dark: '#3f5573',
      names: ['Steady', 'Distant', 'Gone Quiet'],
      levels: [
        null,
        { atk: 0.80, def: 1.35, acc: 0.95, eva: 0.14, healIn: 0.5, healOut: 0.8, taken: 0.9, bp: 0.8 },
        { atk: 0.65, def: 1.70, acc: 0.90, eva: 0.26, healIn: 0.2, healOut: 0.6, taken: 0.8, bp: 0.6 }
      ]
    }
  };

  /* attacker mood -> the mood it has the upper hand against */
  var BEATS = { tender: 'frayed', frayed: 'distant', distant: 'tender' };

  var ORDER = ['steady', 'tender', 'frayed', 'distant'];

  function def(id) { return DEF[id] || DEF.steady; }

  function stats(mood) {
    var d = def(mood.id);
    var lv = U.clamp(mood.lvl || 0, 0, 2);
    return d.levels[lv] || DEF.steady.levels[0];
  }

  function label(mood) {
    if (!mood || mood.id === 'steady' || !mood.lvl) return 'Steady';
    return def(mood.id).names[U.clamp(mood.lvl, 0, 2)];
  }

  function color(mood) {
    if (!mood || mood.id === 'steady' || !mood.lvl) return DEF.steady.color;
    return def(mood.id).color;
  }

  return {
    DEF: DEF,
    ORDER: ORDER,

    blank: function () { return { id: 'steady', lvl: 0 }; },

    def: def,
    stats: stats,
    label: label,
    color: color,

    icon: function (mood) {
      return (!mood || !mood.lvl) ? 0 : def(mood.id).icon;
    },

    isSteady: function (mood) { return !mood || mood.id === 'steady' || !mood.lvl; },

    /** 1.5 with the advantage, 0.7 against it, 1 otherwise. */
    mult: function (att, dfn) {
      if (!att || !dfn || !att.lvl || !dfn.lvl) return 1;
      if (BEATS[att.id] === dfn.id) return 1.5;
      if (BEATS[dfn.id] === att.id) return 0.7;
      return 1;
    },

    beats: function (a, b) { return BEATS[a] === b; },

    /* Moods don't flip on a coin. Pushing someone toward a *different* feeling
       first has to undo the one they're already in — you have to bring a person
       down before you can bring them somewhere else. `force` skips that. */
    shift: function (mood, id, amount, force) {
      amount = amount === undefined ? 1 : amount;
      if (id === 'steady') {
        mood.lvl = Math.max(0, mood.lvl - amount);
        if (mood.lvl === 0) mood.id = 'steady';
        return mood;
      }
      if (mood.id === id && mood.lvl > 0) {
        mood.lvl = U.clamp(mood.lvl + amount, 0, 2);
        if (mood.lvl === 0) mood.id = 'steady';
        return mood;
      }
      if (force || mood.lvl === 0) {
        mood.id = id;
        mood.lvl = U.clamp(amount, 1, 2);
        return mood;
      }
      // Different feeling, and they're already in one: this only cools them off.
      mood.lvl = U.clamp(mood.lvl - amount, 0, 2);
      if (mood.lvl === 0) mood.id = 'steady';
      return mood;
    },

    copy: function (m) { return { id: m.id, lvl: m.lvl }; }
  };
})();
