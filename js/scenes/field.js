/* PAPERWEIGHT — walking around. */
'use strict';

PW.FieldScene = function (roomId, spawnId) {
  this.name = 'field';
  this.opaque = true;
  this.box = new PW.DialogueBox();
  this.script = new PW.Script(this);
  this.startRoom = roomId;
  this.startSpawn = spawnId;
  this.t = 0;
  this.cardT = 0;
  this.room = null;
  this.entities = [];
  this.foes = [];
  this.trail = [];
  this.pending = null;
  this.debug = false;
};

PW.FieldScene.SPRITE = 0.46;      // walk sprites are drawn at ~46% of source
PW.FieldScene.FOLLOW_GAP = 40;    // pixels of trail between party members
PW.FieldScene.REACH = 96;         // how far the player's arm goes, in pixels
PW.FieldScene.AIM = 0.34;         // how squarely they must face it (~70 degrees)

PW.FieldScene.DIRV = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]
};

PW.FieldScene.prototype = {

  /* ------------------------------------------------------------ setup -- */

  enter: function () {
    this.enterRoom(this.startRoom || PW.state.room, this.startSpawn || PW.state.spawn);
  },

  exit: function () {},

  resumed: function () {
    // Coming back from a battle or the pocket: re-assert the room's music.
    if (this.room && this.room.music) PW.audio.play(this.room.music);
    if (this.pending) {
      var p = this.pending;
      this.pending = null;
      if (p) p();
    }
  },

  enterRoom: function (roomId, spawnId) {
    var room = PW.rooms[roomId];
    if (!room) { console.error('no such room', roomId); return; }
    this.room = room;
    PW.state.room = roomId;
    PW.state.spawn = spawnId || 'start';

    var sp = room.spawns[spawnId] || room.spawns.start ||
             { x: (room.walk[0][0] + room.walk[0][2] / 2), y: room.walk[0][1] + room.walk[0][3] - 20, dir: 'down' };

    this.player = { x: sp.x, y: sp.y, dir: sp.dir || 'down', walkT: 0, moving: false };
    PW.state.facing = this.player.dir;

    this.seedTrail(sp.x, sp.y, this.player.dir);

    this.buildEntities();
    this.buildFoes();

    this.dust = room.dust ? new PW.draw.Dust(room.dust.n, { color: room.dust.color }) : null;
    this.cardT = 2.6;
    this.t = 0;
    // Nothing pounces the moment you walk through a door.
    this.grace = 1.4;

    if (room.music) PW.audio.play(room.music);
    PW.audio.setTension(room.tension || 0);

    // A room may fire a one-off story beat on arrival. The trigger function is
    // stored rather than called: calling it is what consumes its flag, and a
    // room is often entered from inside a script that is still running.
    this.pendingTrigger =
      (PW.scripts && PW.scripts.roomTriggers && PW.scripts.roomTriggers[roomId]) || null;
  },

  /** Runs a stored room trigger once the stage is actually free. */
  checkTrigger: function () {
    if (!this.pendingTrigger) return;
    if (this.script.running || this.box.active || PW.game.busy()) return;
    var fn = this.pendingTrigger;
    this.pendingTrigger = null;
    var prog = PW.resolveScript(fn);
    if (prog && prog.length) this.script.run(prog);
  },

  buildEntities: function () {
    var self = this;
    this.entities = this.room.entities.map(function (e) {
      var o = Object.create(e);
      o.visible = e.visibleIf ? !!e.visibleIf() : true;
      if (PW.flag('hide_' + self.room.id + '_' + e.id)) o.visible = false;
      o.bob = Math.random() * 6.28;
      return o;
    });
  },

  buildFoes: function () {
    var self = this;
    this.foes = [];
    this.room.foes.forEach(function (f) {
      if (PW.flag('foe_' + self.room.id + '_' + f.id)) return;
      self.foes.push({
        def: f, x: f.x, y: f.y, hx: f.x, hy: f.y,
        vx: PW.util.rand(-1, 1), vy: PW.util.rand(-1, 1),
        t: Math.random() * 6.28, cool: 0
      });
    });
  },

  /* ------------------------------------------------------- collision --- */

  canStand: function (x, y) {
    var r = this.room, i;
    var ok = false;
    for (i = 0; i < r.walk.length; i++) {
      if (PW.util.inRect(x, y, r.walk[i])) { ok = true; break; }
    }
    if (!ok) return false;
    for (i = 0; i < r.block.length; i++) {
      if (PW.util.inRect(x, y, r.block[i])) return false;
    }
    return true;
  },

  depthScale: function (y) {
    var d = this.room.depth;
    var t = PW.util.clamp((y - d.y0) / (d.y1 - d.y0), 0, 1);
    return PW.util.lerp(d.s0, d.s1, t) * PW.FieldScene.SPRITE;
  },

  /* ---------------------------------------------------------- update --- */

  update: function (dt) {
    this.t += dt;
    if (this.cardT > 0) this.cardT -= dt;
    if (this.dust) this.dust.update(dt);

    // Scripted walking has to keep going while the script itself is waiting.
    this.stepScripted(this.player, dt);
    for (var q = 0; q < this.entities.length; q++) this.stepScripted(this.entities[q], dt);

    if (this.box.active) { this.box.update(dt); this.script.update(dt); this.updateFoes(dt, true); return; }
    if (this.script.running) { this.script.update(dt); this.updateFoes(dt, true); return; }
    if (PW.game.busy()) return;
    this.checkTrigger();
    if (this.script.running) return;

    this.updatePlayer(dt);
    this.updateFoes(dt, false);

    if (PW.input.hit('ok')) this.interact();
    if (PW.input.hit('menu')) {
      PW.audio.sfx('confirm');
      PW.game.push(new PW.PocketScene());
    }
  },

  updateBelow: function (dt) {
    // keeps the room breathing while a menu sits on top
    this.t += dt;
    if (this.dust) this.dust.update(dt);
  },

  updatePlayer: function (dt) {
    var p = this.player;
    var ax = PW.input.axisX(), ay = PW.input.axisY();
    var speed = 168;

    if (ax || ay) {
      var len = Math.sqrt(ax * ax + ay * ay);
      var dx = (ax / len) * speed * dt, dy = (ay / len) * speed * dt;

      if (this.canStand(p.x + dx, p.y + dy)) { p.x += dx; p.y += dy; }
      else if (this.canStand(p.x + dx, p.y)) { p.x += dx; }
      else if (this.canStand(p.x, p.y + dy)) { p.y += dy; }

      // Face along whichever axis is dominant.
      if (Math.abs(ax) > Math.abs(ay)) p.dir = ax > 0 ? 'right' : 'left';
      else if (ay) p.dir = ay > 0 ? 'down' : 'up';

      p.moving = true;
      p.walkT += dt;
      PW.state.facing = p.dir;
      PW.state.steps++;
      if (p.walkT > 0.34) { p.walkT = 0; PW.audio.sfx('step'); }
    } else {
      p.moving = false;
      p.walkT = 0;
    }

    this.pushTrail();
  },

  /* Lay the follow-trail out *behind* the player, so the party arrives in a
     line instead of all standing inside each other until you move. Followers
     tuck in wherever the floor allows. */
  seedTrail: function (x, y, dir) {
    var back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[dir] || [0, -1];
    this.trail = [];
    for (var i = 0; i < 240; i++) {
      var d = i * 2;
      var tx = x + back[0] * d, ty = y + back[1] * d;
      if (!this.canStand(tx, ty)) { tx = x; ty = y; }
      this.trail.push({ x: tx, y: ty, dir: dir, d: d });
    }
  },

  pushTrail: function () {
    var p = this.player;
    var head = this.trail[0];
    var d = PW.util.dist(p.x, p.y, head.x, head.y);
    if (d < 1.5) return;
    this.trail.unshift({ x: p.x, y: p.y, dir: p.dir, d: 0 });
    var acc = 0;
    for (var i = 1; i < this.trail.length; i++) {
      acc += PW.util.dist(this.trail[i].x, this.trail[i].y,
                          this.trail[i - 1].x, this.trail[i - 1].y);
      this.trail[i].d = acc;
    }
    if (this.trail.length > 400) this.trail.length = 400;
  },

  trailAt: function (dist) {
    for (var i = 0; i < this.trail.length; i++) {
      if (this.trail[i].d >= dist) return this.trail[i];
    }
    return this.trail[this.trail.length - 1];
  },

  updateFoes: function (dt, frozen) {
    var p = this.player;
    if (this.grace > 0) this.grace -= dt;
    for (var i = 0; i < this.foes.length; i++) {
      var f = this.foes[i];
      f.t += dt;
      if (f.cool > 0) f.cool -= dt;

      if (!frozen && this.grace <= 0) {
        // A slow drift around home, with a nudge toward the player when near.
        var toP = PW.util.dist(f.x, f.y, p.x, p.y);
        var wanderX = Math.cos(f.t * 0.7 + f.def.x) * 26;
        var wanderY = Math.sin(f.t * 0.55 + f.def.y) * 20;
        var tx = f.hx + wanderX, ty = f.hy + wanderY;
        if (toP < 150) { tx = tx * 0.35 + p.x * 0.65; ty = ty * 0.35 + p.y * 0.65; }
        var sp = (toP < 150 ? 52 : 26) * dt;
        var dx = tx - f.x, dy = ty - f.y;
        var m = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = f.x + (dx / m) * sp, ny = f.y + (dy / m) * sp;
        if (this.canStand(nx, ny)) { f.x = nx; f.y = ny; }
        else if (PW.util.dist(f.x, f.y, f.hx, f.hy) > 4) {
          f.hx = f.def.x; f.hy = f.def.y;
        }

        if (toP < 30 && f.cool <= 0 && !PW.game.busy()) {
          this.beginEncounter(f);
          return;
        }
      }
    }
  },

  /* ------------------------------------------------------ interaction -- */

  /* What the player is about to touch.
   *
   * This is judged from where the player is standing, not from a single probe
   * point in front of them: anything within arm's reach that lies in the
   * direction they face is a candidate, and whichever they face most squarely
   * wins. Standing inside something — a doorway, a rug — counts as reaching it
   * from any direction.
   *
   * A probe point is what this used to be, and it was far too brittle: a box a
   * few pixels out of place, or one merely narrower than the gap between two
   * standing spots, could not be picked at all. Reaching from the body means
   * the boxes only have to sit roughly on the object they stand for.
   *
   * `at` lets callers ask the question from somewhere the player is not, which
   * is how the reachability sweep in the tests works.
   */
  nearest: function (at) {
    var p = at || this.player;
    var dir = PW.FieldScene.DIRV[p.dir] || PW.FieldScene.DIRV.down;
    var best = null, bestScore = 1e9;

    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (!e.visible) continue;
      if (!e.talk && !e.kind) continue;

      var x0 = e.x - e.w / 2, y0 = e.y - e.h;
      var cx = PW.util.clamp(p.x, x0, x0 + e.w);
      var cy = PW.util.clamp(p.y, y0, y0 + e.h);
      var dx = cx - p.x, dy = cy - p.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > PW.FieldScene.REACH) continue;

      // Standing in it is as good as facing it head-on.
      var aim = d < 6 ? 1 : (dx / d) * dir[0] + (dy / d) * dir[1];
      if (aim < PW.FieldScene.AIM) continue;

      // Nearest wins, squareness helps, and the distance to the middle breaks
      // ties between two things the player happens to be standing inside.
      var score = d + (1 - aim) * 30 +
                  PW.util.dist(p.x, p.y, e.x, e.y - e.h / 2) * 0.05;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  },

  interact: function () {
    var e = this.nearest();
    if (e) this.trigger(e);
  },

  trigger: function (e) {
    var self = this;
    if (e.need && !e.need()) {
      PW.audio.sfx('error');
      this.script.run([['narrate', e.blocked || 'Not this way. Not yet.']]);
      return;
    }
    if (e.kind === 'door' && e.to) {
      PW.audio.sfx('door');
      PW.game.transition(function () {
        self.enterRoom(e.to[0], e.to[1]);
      }, { out: 0.34, in: 0.5 });
      return;
    }
    var prog = PW.resolveScript(e.talk);
    if (prog && prog.length) {
      PW.audio.sfx('cursor');
      this.script.run(prog);
    }
  },

  setEntityVisible: function (id, v) {
    for (var i = 0; i < this.entities.length; i++) {
      if (this.entities[i].id === id) this.entities[i].visible = v;
    }
    PW.flag('hide_' + this.room.id + '_' + id, !v);
  },

  /* ------------------------------------------------- script movement --- */

  actorRef: function (who) {
    if (who === 'player' || who === 'june') return this.player;
    for (var i = 0; i < this.entities.length; i++) {
      if (this.entities[i].id === who) return this.entities[i];
    }
    return null;
  },

  scriptMove: function (who, x, y, speed) {
    var a = this.actorRef(who);
    if (!a) return;
    a.mv = { x: x, y: y, speed: speed || 150 };
  },

  scriptMoving: function (who) {
    var a = this.actorRef(who);
    return !!(a && a.mv);
  },

  scriptFace: function (who, dir) {
    var a = this.actorRef(who);
    if (a) a.dir = dir;
  },

  scriptWarp: function (who, x, y) {
    var a = this.actorRef(who);
    if (!a) return;
    a.x = x; a.y = y;
    if (a === this.player) this.seedTrail(x, y, a.dir);
  },

  stepScripted: function (a, dt) {
    if (!a.mv) return;
    var dx = a.mv.x - a.x, dy = a.mv.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    var step = a.mv.speed * dt;
    if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 'right' : 'left';
    else if (dy) a.dir = dy > 0 ? 'down' : 'up';
    if (d <= step) {
      a.x = a.mv.x; a.y = a.mv.y; a.mv = null;
      a.moving = false;
    } else {
      a.x += (dx / d) * step;
      a.y += (dy / d) * step;
      a.moving = true;
      a.walkT = (a.walkT || 0) + dt;
    }
    if (a === this.player) this.pushTrail();
  },

  /* ----------------------------------------------------------- battle -- */

  beginEncounter: function (foe) {
    var self = this;
    PW.audio.sfx('boom');
    PW.game.flash('#f6e7c4', 0.85, 0.45);
    PW.game.shake(9, 0.5);
    foe.cool = 3;
    PW.game.fadeOut(0.55, '#0b0a14', function () {
      PW.flag('foe_' + self.room.id + '_' + foe.def.id, true);
      for (var i = 0; i < self.foes.length; i++) {
        if (self.foes[i] === foe) { self.foes.splice(i, 1); break; }
      }
      self.pending = function () { PW.game.fadeIn(0.5); };
      PW.game.push(new PW.BattleScene(foe.def.troop, {}));
      PW.game.fadeIn(0.4);
    });
  },

  startBattle: function (troopId, opts) {
    var self = this;
    PW.audio.sfx('boom');
    PW.game.flash('#f6e7c4', 0.9, 0.5);
    PW.game.shake(10, 0.55);
    PW.game.fadeOut(0.6, '#0b0a14', function () {
      self.pending = function () { PW.game.fadeIn(0.5); };
      PW.game.push(new PW.BattleScene(troopId, opts));
      PW.game.fadeIn(0.4);
    });
  },

  /* ------------------------------------------------------------- draw -- */

  draw: function (ctx) {
    var D = PW.draw;
    var r = this.room;
    if (!r) return;

    D.cover(ctx, PW.assets.img(r.bg), PW.W, PW.H);
    if (r.tint) { ctx.fillStyle = r.tint; ctx.fillRect(0, 0, PW.W, PW.H); }

    // Everything that stands on the floor is sorted by its feet.
    var drawables = [];

    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (e.visible && e.sprite) {
        drawables.push({ y: e.y, kind: 'npc', e: e });
      }
    }
    for (var f = 0; f < this.foes.length; f++) {
      drawables.push({ y: this.foes[f].y, kind: 'foe', f: this.foes[f] });
    }

    var party = PW.state.party;
    drawables.push({ y: this.player.y, kind: 'party', idx: 0, x: this.player.x, dir: this.player.dir,
                     moving: this.player.moving, walkT: this.player.walkT || 0 });
    for (var m = 1; m < party.length; m++) {
      var t = this.trailAt(m * PW.FieldScene.FOLLOW_GAP);
      drawables.push({ y: t.y, kind: 'party', idx: m, x: t.x, dir: t.dir,
                       moving: this.player.moving, walkT: (this.player.walkT || 0) + m * 0.1 });
    }

    drawables.sort(function (a, b) { return a.y - b.y; });

    for (var k = 0; k < drawables.length; k++) {
      var it = drawables[k];
      if (it.kind === 'party') this.drawWalker(ctx, party[it.idx], it);
      else if (it.kind === 'foe') this.drawFoe(ctx, it.f);
      else this.drawNpc(ctx, it.e);
    }

    if (this.dust) this.dust.draw(ctx);
    D.vignette(ctx, PW.W, PW.H, 0.5);

    if (this.debug) this.drawDebug(ctx);
    this.drawInteractHint(ctx);
    if (this.cardT > 0) this.drawRoomCard(ctx);
    this.box.draw(ctx);
  },

  shadow: function (ctx, x, y, s, a) {
    ctx.save();
    ctx.globalAlpha = a === undefined ? 0.3 : a;
    ctx.fillStyle = '#120e20';
    ctx.beginPath();
    ctx.ellipse(x, y, 22 * s / 0.46, 7 * s / 0.46, 0, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  },

  drawWalker: function (ctx, id, it) {
    var def = PW.actors[id];
    if (!def) return;
    var img = PW.assets.img('spr_' + def.sprite + '_' + it.dir);
    var s = this.depthScale(it.y);
    var bobY = 0, rot = 0;

    if (def.float) {
      bobY = Math.sin(this.t * 2.4 + it.idx) * 6 - 26;
      rot = Math.sin(this.t * 1.7 + it.idx) * 0.05;
      this.shadow(ctx, it.x, it.y, s * 0.8, 0.18);
    } else {
      // a small bounce while walking sells the step without extra frames
      if (it.moving) bobY = -Math.abs(Math.sin(it.walkT * 11)) * 5;
      rot = it.moving ? Math.sin(it.walkT * 11) * 0.035 : 0;
      this.shadow(ctx, it.x, it.y, s);
    }
    PW.draw.sprite(ctx, img, it.x, it.y + bobY, s * (def.float ? 0.62 : 1), { rot: rot });
  },

  drawNpc: function (ctx, e) {
    var def = PW.actors[e.sprite];
    var img = def ? PW.assets.img('spr_' + def.sprite + '_' + (e.dir || 'down'))
                  : PW.assets.img(e.sprite);
    var s = this.depthScale(e.y) * (e.scale || 1);
    var bob = def && def.float ? Math.sin(this.t * 2.2) * 5 - 24 : 0;
    this.shadow(ctx, e.x, e.y, s);
    PW.draw.sprite(ctx, img, e.x, e.y + bob, s);
  },

  drawFoe: function (ctx, f) {
    var img = PW.assets.img(f.def.sprite);
    var bob = Math.sin(f.t * 2.6) * 5;
    var s = f.def.scale * (0.9 + 0.2 * PW.util.clamp((f.y - 300) / 240, 0, 1));
    this.shadow(ctx, f.x, f.y, s * 2.4, 0.24);
    ctx.save();
    ctx.globalAlpha = 0.92;
    PW.draw.sprite(ctx, img, f.x, f.y + bob, s, { rot: Math.sin(f.t * 1.4) * 0.06 });
    ctx.restore();
  },

  drawInteractHint: function (ctx) {
    if (this.box.active || this.script.running) return;
    var e = this.nearest();
    if (!e) return;
    // Some boxes reach off the top of the screen — a hatch in the ceiling, a
    // bookcase taller than the room — so the label is kept where it can be read.
    var lx = PW.util.clamp(e.x, 76, PW.W - 76);
    var ly = PW.util.clamp(e.y - e.h - 26, 14, PW.H - 150);
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(this.t * 4);
    PW.draw.text(ctx, e.label || (e.kind === 'door' ? 'a door' : 'look'), lx, ly, {
      size: 16, align: 'center', color: '#f6e7c4', shadow: true, shadowOff: 2
    });
    ctx.restore();
  },

  drawRoomCard: function (ctx) {
    var a = PW.util.clamp(this.cardT > 2.2 ? (2.6 - this.cardT) / 0.4 : this.cardT / 0.7, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    var w = PW.draw.measure(ctx, this.room.name, 26) + 66;
    PW.draw.panel(ctx, PW.W / 2 - w / 2, 34, w, 50, {
      fill: 'rgba(22,18,34,.82)', stroke: 'rgba(246,231,196,.6)', radius: 12, seed: 11
    });
    PW.draw.text(ctx, this.room.name, PW.W / 2, 47, {
      size: 26, align: 'center', color: '#f6e7c4', shadow: false
    });
    ctx.restore();
  },

  drawDebug: function (ctx) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(80,255,140,.75)';
    this.room.walk.forEach(function (r) { ctx.strokeRect(r[0], r[1], r[2], r[3]); });
    ctx.strokeStyle = 'rgba(255,80,80,.75)';
    this.room.block.forEach(function (r) { ctx.strokeRect(r[0], r[1], r[2], r[3]); });
    ctx.strokeStyle = 'rgba(120,180,255,.8)';
    this.entities.forEach(function (e) {
      if (!e.visible) return;
      ctx.strokeRect(e.x - e.w / 2, e.y - e.h, e.w, e.h);
    });
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    ctx.fillText(Math.round(this.player.x) + ',' + Math.round(this.player.y), 12, 20);
    ctx.restore();
  }
};
