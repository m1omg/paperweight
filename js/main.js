/* PAPERWEIGHT — boot. */
'use strict';

(function () {
  var boot = document.getElementById('boot');
  var fill = document.getElementById('boot-fill');
  var msg = document.getElementById('boot-msg');
  var go = document.getElementById('boot-go');

  var MESSAGES = [
    'gathering the house',
    'folding the crown',
    'winding the music box',
    'filling the greenhouse',
    'lighting the stove',
    'hanging the tags',
    'turning down the bed'
  ];

  PW.save.reset();          // a valid state exists before anything draws
  PW.game.boot();

  var t0 = Date.now();

  PW.assets.load(
    function (frac) {
      fill.style.width = Math.round(frac * 100) + '%';
      var i = Math.min(MESSAGES.length - 1, Math.floor(frac * MESSAGES.length));
      msg.textContent = MESSAGES[i] + '…';
    },
    function () {
      var missing = PW.assets.missing();
      if (missing.length) {
        console.warn('PAPERWEIGHT: ' + missing.length + ' image(s) missing:', missing);
      }
      fill.style.width = '100%';
      msg.textContent = missing.length
        ? '(' + missing.length + ' pictures are missing — the game still runs)'
        : 'ready';

      // The browser will not make a sound until the player has touched something.
      go.hidden = false;
      go.focus();

      var started = false;
      function start() {
        if (started) return;
        started = true;
        PW.audio.init();
        PW.audio.resume();
        boot.classList.add('gone');
        setTimeout(function () { boot.style.display = 'none'; }, 700);
        PW.game.start(new PW.TitleScene());
        console.log('PAPERWEIGHT ready in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
      }

      go.addEventListener('click', start);
      window.addEventListener('keydown', function (e) {
        if (!started && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ')) {
          e.preventDefault();
          start();
        }
      });
    }
  );

  // A small hook for poking at the game from the console during development.
  window.PWdebug = {
    room: function (id, spawn) {
      PW.game.replace(new PW.FieldScene(id, spawn || 'start'));
    },
    battle: function (troop) { PW.game.push(new PW.BattleScene(troop, {})); },
    give: function (id, n) { PW.items.give(id, n); },
    join: function (id) { PW.party.add(id); },
    chapter: function (n) { PW.state.chapter = n; },
    ending: function (id) { PW.game.replace(new PW.EndingScene(id)); },
    flag: function (f, v) { return PW.flag(f, v); },
    walkboxes: function () {
      var s = PW.game.top();
      if (s && s.name === 'field') s.debug = !s.debug;
    },
    state: function () { return PW.state; }
  };
})();
