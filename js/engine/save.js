/* PAPERWEIGHT — game state and save slots.
 *
 * Everything the player has done lives in PW.state. Saving is a JSON blob in
 * localStorage; if that isn't available (some browsers block it on file://)
 * the game still runs perfectly, it just can't remember between sessions —
 * which, all things considered, is on theme.
 */
'use strict';

PW.save = (function () {
  var KEY = 'paperweight.save.';
  var SLOTS = 3;

  function storage() {
    try {
      var t = '__pw__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function freshActor(id) {
    var base = PW.actors && PW.actors[id];
    if (!base) return { id: id, lv: 1, xp: 0, hp: 20, bp: 10 };
    return {
      id: id,
      lv: base.lv || 1,
      xp: 0,
      hp: base.hp,
      bp: base.bp,
      skills: (base.skills || []).slice()
    };
  }

  function newState() {
    return {
      version: 1,
      chapter: 1,
      flags: {},
      party: ['june'],
      actors: {},
      kept: [],
      keptMax: 4,
      room: 'bedroom',
      spawn: 'start',
      facing: 'down',
      playtime: 0,
      steps: 0,
      battlesWon: 0,
      endingSeen: null
    };
  }

  return {
    SLOTS: SLOTS,

    reset: function () {
      PW.state = newState();
      PW.state.actors.june = freshActor('june');
      return PW.state;
    },

    freshActor: freshActor,

    write: function (slot) {
      var s = storage();
      if (!s) return false;
      try {
        PW.state.savedAt = Date.now();
        s.setItem(KEY + slot, JSON.stringify(PW.state));
        return true;
      } catch (e) { return false; }
    },

    read: function (slot) {
      var s = storage();
      if (!s) return null;
      try {
        var raw = s.getItem(KEY + slot);
        if (!raw) return null;
        var d = JSON.parse(raw);
        return (d && d.version) ? d : null;
      } catch (e) { return null; }
    },

    load: function (slot) {
      var d = this.read(slot);
      if (!d) return false;
      PW.state = d;
      // Fill in anything a newer build expects but an older save lacks.
      var blank = newState();
      for (var k in blank) if (PW.state[k] === undefined) PW.state[k] = blank[k];
      return true;
    },

    erase: function (slot) {
      var s = storage();
      if (s) s.removeItem(KEY + slot);
    },

    /** Slot summaries for the title screen. */
    list: function () {
      var out = [];
      for (var i = 0; i < SLOTS; i++) {
        var d = this.read(i);
        out.push(d ? {
          slot: i,
          chapter: d.chapter,
          room: (PW.rooms && PW.rooms[d.room] && PW.rooms[d.room].name) || d.room,
          party: (d.party || []).length,
          playtime: d.playtime || 0,
          kept: (d.kept || []).length
        } : null);
      }
      return out;
    },

    available: function () { return !!storage(); }
  };
})();

/* ---------------------------------------------------------------- flags -- */

PW.flag = function (name, value) {
  if (value === undefined) return !!(PW.state && PW.state.flags[name]);
  PW.state.flags[name] = value;
  return value;
};

PW.counter = function (name, add) {
  if (!PW.state.flags[name]) PW.state.flags[name] = 0;
  if (add) PW.state.flags[name] += add;
  return PW.state.flags[name];
};
