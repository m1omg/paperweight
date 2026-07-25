/* PAPERWEIGHT — image loading.
 *
 * Everything is loaded up front through <img> tags so the game runs straight
 * off the filesystem with no server and no fetch(). A missing file is never
 * fatal: assets.img() hands back a labelled placeholder instead, so a partial
 * art set still produces a playable game.
 */
'use strict';

PW.assets = (function () {
  var images = {};        // name -> HTMLImageElement (loaded only)
  var placeholders = {};  // name -> canvas
  var total = 0, done = 0;

  // Room art is opaque, so it ships as JPEG; everything with an alpha channel
  // is a palette PNG. See tools/process.py.
  var MANIFEST = [
    // room backgrounds
    ['bg_bedroom', 'assets/bg/bg_bedroom.jpg'],
    ['bg_landing', 'assets/bg/bg_landing.jpg'],
    ['bg_street', 'assets/bg/bg_street.jpg'],
    ['bg_hub', 'assets/bg/bg_hub.jpg'],
    ['bg_kitchen', 'assets/bg/bg_kitchen.jpg'],
    ['bg_garden', 'assets/bg/bg_garden.jpg'],
    ['bg_attic', 'assets/bg/bg_attic.jpg'],
    ['bg_blank', 'assets/bg/bg_blank.jpg'],
    ['bg_finalroom', 'assets/bg/bg_finalroom.jpg'],
    ['bg_title', 'assets/bg/bg_title.jpg'],
    // battle backdrops
    ['bb_hub', 'assets/battlebg/bb_hub.jpg'],
    ['bb_kitchen', 'assets/battlebg/bb_kitchen.jpg'],
    ['bb_garden', 'assets/battlebg/bb_garden.jpg'],
    ['bb_attic', 'assets/battlebg/bb_attic.jpg'],
    ['bb_blank', 'assets/battlebg/bb_blank.jpg']
  ];

  // portraits: <who>_<expression>
  var FACES = ['june', 'dell', 'hal', 'wick', 'nel'];
  var EXPR = ['calm', 'warm', 'low', 'raw'];
  FACES.forEach(function (who) {
    EXPR.forEach(function (e, i) {
      MANIFEST.push(['por_' + who + '_' + e, 'assets/chars/por_' + who + '_' + i + '.png']);
    });
  });

  // walk sprites: <who>_<dir>   (0 down, 1 up, 2 left, 3 right)
  var WALKERS = ['june', 'dell', 'hal', 'wick'];
  var DIRS = ['down', 'up', 'left', 'right'];
  WALKERS.forEach(function (who) {
    DIRS.forEach(function (d, i) {
      MANIFEST.push(['spr_' + who + '_' + d, 'assets/chars/spr_' + who + '_' + i + '.png']);
    });
  });

  // enemies
  ['dustling', 'chippedcup', 'emptycoat', 'hourmoth', 'mitten', 'sorrowvine',
    'staticchild', 'pilotlight', 'drownedlily', 'nameless', 'thehouse'
  ].forEach(function (e) {
    MANIFEST.push(['en_' + e, 'assets/enemies/en_' + e + '.png']);
  });

  // ui
  MANIFEST.push(['ui_paperweight', 'assets/ui/ui_paperweight.png']);
  for (var m = 0; m < 4; m++) MANIFEST.push(['mood_' + m, 'assets/ui/ui_moods_' + m + '.png']);
  for (var it = 0; it < 16; it++) MANIFEST.push(['item_' + it, 'assets/ui/ui_items_' + it + '.png']);

  function makePlaceholder(name) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var g = c.getContext('2d');
    // Soft paper-coloured card with the asset name, so gaps are obvious but pretty.
    g.fillStyle = '#2b2740'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#544d78'; g.lineWidth = 3;
    g.setLineDash([9, 7]); g.strokeRect(6, 6, 244, 244); g.setLineDash([]);
    g.fillStyle = '#7d75a8';
    g.font = '15px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var parts = String(name).split('_');
    for (var i = 0; i < parts.length; i++) {
      g.fillText(parts[i], 128, 128 - (parts.length - 1) * 10 + i * 20);
    }
    return c;
  }

  return {
    load: function (onProgress, onDone) {
      total = MANIFEST.length;
      done = 0;
      if (!total) { onDone(); return; }

      MANIFEST.forEach(function (entry) {
        var name = entry[0], src = entry[1];
        var img = new Image();
        img.onload = function () {
          images[name] = img;
          /* `load` only promises the bytes arrived, not that they have been
             turned into pixels. A room background is a million-odd pixels, and
             decoding one the first time it is painted stalls that frame long
             enough to be seen as a hitch on the way through a door. decode()
             does the work now, off the main thread, while the loading bar is
             still on screen. */
          if (img.decode) {
            img.decode().then(function () { step(name); },
                              function () { step(name); });
          } else {
            step(name);
          }
        };
        img.onerror = function () { step(name); };
        img.src = src;
      });

      function step(name) {
        done++;
        onProgress(done / total, name);
        if (done >= total) onDone();
      }
    },

    /** Always returns something drawable. */
    img: function (name) {
      var i = images[name];
      if (i) return i;
      if (!placeholders[name]) placeholders[name] = makePlaceholder(name);
      return placeholders[name];
    },

    /** True if the real artwork loaded (used to soften layouts around gaps). */
    has: function (name) { return !!images[name]; },

    missing: function () {
      return MANIFEST.map(function (e) { return e[0]; })
        .filter(function (n) { return !images[n]; });
    },

    progress: function () { return total ? done / total : 1; }
  };
})();
