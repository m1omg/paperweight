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
  var pendingDrop = null;   // a file dropped on the window, waiting to be read

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
      // `pocket` is {itemId: count}. It used to be conjured on first use by
      // PW.items.pocket() and never appeared here, which worked only because
      // that lazy creation quietly covered for it — but it meant a save could
      // carry a field the template did not admit to. Everything saved belongs
      // in here, so that load()'s back-fill has the whole shape to work from.
      pocket: {},
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

    /** Anything a newer build expects but this save has never heard of. */
    backfill: function (d) {
      var blank = newState();
      for (var k in blank) if (d[k] === undefined) d[k] = blank[k];
      return d;
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
      PW.state = this.backfill(d);
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

    available: function () { return !!storage(); },

    /* ------------------------------------------------------ carrying it -- */

    /* The three slots write at fixed points — a chapter break, the rug in the
       hall — and they live in localStorage, which a browser is entitled to
       throw away without asking, and often does on file://. Writing the save
       out to a file is the one save the player makes themselves, at a moment
       of their own choosing, and keeps afterwards.

       What comes out is exactly what goes into a slot: the state blob, plain,
       with no wrapper and no format of its own. Every rule about slots holds
       for it unchanged — an old file loads in a new build because load()
       back-fills, and a new file loads in an old build because nothing here
       adds a field an old build would trip over. */

    /** The blob, stamped with the moment it left. */
    text: function () {
      PW.state.savedAt = Date.now();
      return JSON.stringify(PW.state);
    },

    /** Something a person can find again in a downloads folder six weeks on. */
    filename: function () {
      var d = new Date();
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return 'paperweight-ch' + PW.state.chapter +
        '-' + Math.floor((PW.state.playtime || 0) / 60) + 'min' +
        '-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
        '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
    },

    /**
     * Hand the save to the browser as a download. Returns the filename, or
     * false if the browser would not have it — which is worth saying out loud
     * rather than leaving the player believing they have a copy.
     */
    toFile: function () {
      if (typeof document === 'undefined' || !document.createElement) return false;
      var body = this.text();
      var name = this.filename();
      var url = null, blob = false;
      try {
        var a = document.createElement('a');
        if (a.download === undefined) return false;
        if (typeof Blob !== 'undefined' && window.URL && window.URL.createObjectURL) {
          url = window.URL.createObjectURL(new Blob([body], { type: 'application/json' }));
          blob = true;
        } else {
          // No Blob: a data URI still saves, it just cannot be very large.
          url = 'data:application/json;charset=utf-8,' + encodeURIComponent(body);
        }
        a.href = url;
        a.download = name;
        a.style.display = 'none';
        if (document.body && document.body.appendChild) document.body.appendChild(a);
        a.click();
        if (a.parentNode) a.parentNode.removeChild(a);
        if (blob && window.setTimeout) {
          window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 8000);
        }
        return name;
      } catch (e) {
        return false;
      }
    },

    /**
     * Take a file's text as the game state. Refuses anything that is not a
     * save rather than starting a run inside a room that does not exist.
     */
    adopt: function (text) {
      var d;
      try { d = JSON.parse(String(text)); } catch (e) { return false; }
      if (!d || typeof d !== 'object' || !d.version) return false;
      if (!d.actors || !d.party || !d.party.length) return false;
      if (PW.rooms && !PW.rooms[d.room]) return false;
      PW.state = this.backfill(d);
      return true;
    },

    /**
     * Ask for a file and adopt it. `cb(name)` on success, `cb(false)` if the
     * player cancelled or the file was not a save. Returns false if the
     * browser would not open a picker at all.
     */
    fromFile: function (cb) {
      if (typeof document === 'undefined' || !document.createElement) return false;
      if (typeof FileReader === 'undefined') return false;
      var self = this;
      try {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.position = 'fixed';
        input.style.left = '-2000px';
        input.addEventListener('change', function () {
          if (input.parentNode) input.parentNode.removeChild(input);
          var f = input.files && input.files[0];
          if (!f) { cb(false); return; }
          var r = new FileReader();
          r.onload = function () { cb(self.adopt(r.result) ? f.name : false); };
          r.onerror = function () { cb(false); };
          r.readAsText(f);
        });
        if (document.body && document.body.appendChild) document.body.appendChild(input);
        input.click();
        return true;
      } catch (e) {
        return false;
      }
    },

    /* Dropping the file on the window works when the picker will not — it is
       already a user gesture by the time the browser hands it over, and it is
       what a person tries first anyway. The file waits here until a screen
       that knows what to do with it asks. */
    dropped: function () { var d = pendingDrop; pendingDrop = null; return d; },

    /** Is one waiting? For a screen that has to open the pouch to deal with it. */
    waiting: function () { return !!pendingDrop; },

    /** For the tests, and for anything that wants to fake a drop. */
    drop: function (name, text) { pendingDrop = { name: name, text: text }; }
  };
})();

/* -------------------------------------------------------------- dropping -- */

(function () {
  if (typeof window === 'undefined' || !window.addEventListener) return;
  window.addEventListener('dragover', function (e) {
    if (e.preventDefault) e.preventDefault();
  });
  window.addEventListener('drop', function (e) {
    if (e.preventDefault) e.preventDefault();
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f || typeof FileReader === 'undefined') return;
    var r = new FileReader();
    r.onload = function () { PW.save.drop(f.name, r.result); };
    r.readAsText(f);
  });
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
