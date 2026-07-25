/* PAPERWEIGHT — tappable regions.
 *
 * On a touchscreen you expect to hit the thing you are looking at, not to walk
 * a cursor to it first. Menus therefore declare where their options are while
 * they draw, and a tap the following frame is matched against that list.
 *
 * Regions are declared during draw and read during the next update, which is
 * exactly one frame stale — invisible to a player, and it keeps the menus as
 * plain drawing code with no layout pass or retained widget tree.
 *
 *   draw:    PW.ui.region('menu', i, x, y, w, h)
 *   update:  var t = PW.ui.tapped('menu');
 *            if (t === 'miss') return;      // tapped past the menu: ignore
 *            if (t) this.idx = t.idx;       // tapped an option: go there
 *            if (!PW.input.hit('ok')) return;
 */
'use strict';

PW.ui = (function () {
  var building = [];   // regions this frame's draw is declaring
  var live = [];       // regions the player can actually hit right now

  return {
    /** Declare a tappable box, in game coordinates. Call this while drawing.
     *  `data` rides along for regions that stand for an object rather than a
     *  row number — a creature in a battle, say. */
    region: function (tag, idx, x, y, w, h, data) {
      building.push({ tag: tag, idx: idx, x: x, y: y, w: w, h: h, data: data });
    },

    /** End of frame: what was just drawn becomes what can be tapped. */
    commit: function () {
      live = building;
      building = [];
    },

    clear: function () { building = []; live = []; },

    /** The region under a point, topmost first — later draws sit on top. */
    at: function (x, y) {
      for (var i = live.length - 1; i >= 0; i--) {
        var r = live[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
      }
      return null;
    },

    has: function (tag) {
      for (var i = 0; i < live.length; i++) if (live[i].tag === tag) return true;
      return false;
    },

    /**
     * What a tap this frame means for the menu called `tag`:
     *   {idx}   an option was tapped
     *   'miss'  something was tapped and it was not one of this menu's options
     *   null    nothing was tapped
     *
     * A miss is reported even when the menu has no live regions at all, which
     * is the case for exactly one frame after it opens. Without that, a tap
     * arriving in that window would fall through to the plain confirm and pick
     * whatever the cursor was resting on — the wrong thing, and precisely when
     * the player is tapping fastest. Only ever call this from a menu that does
     * declare regions; plain "tap to continue" paths must not call it at all.
     */
    tapped: function (tag) {
      var p = PW.input.tap();
      if (!p) return null;
      var r = this.at(p.x, p.y);
      return (r && r.tag === tag) ? r : 'miss';
    }
  };
})();
