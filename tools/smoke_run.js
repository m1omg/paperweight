/* PAPERWEIGHT — the actual playthrough driven by tools/smoke.js. */
'use strict';

exports.main = function (H) {
  const { PW, tick, run, until, check, results, errors, transcript, missingArt } = H;
  const top = H.top;

  const t0 = Date.now();

  /* ------------------------------------------------------ data sanity -- */

  console.log('\n— data —');

  // Every skill an actor can ever learn must exist.
  let badSkill = [];
  Object.keys(PW.actors).forEach((id) => {
    const a = PW.actors[id];
    (a.skills || []).forEach((s) => { if (!PW.skills.get(s)) badSkill.push(id + '.' + s); });
    Object.values(a.learn || {}).forEach((s) => { if (!PW.skills.get(s)) badSkill.push(id + '.' + s); });
  });
  check('all party skills exist', badSkill.length === 0, badSkill.join(', '));

  // Every troop names real enemies and a real backdrop.
  let badTroop = [];
  Object.keys(PW.troops).forEach((t) => {
    PW.troops[t].foes.forEach((f) => { if (!PW.enemies[f]) badTroop.push(t + ':' + f); });
  });
  check('all troops reference real enemies', badTroop.length === 0, badTroop.join(', '));

  // Every door leads to a room that exists, with a spawn point that exists.
  let badDoor = [];
  Object.keys(PW.rooms).forEach((rid) => {
    PW.rooms[rid].entities.forEach((e) => {
      if (!e.to) return;
      const dest = PW.rooms[e.to[0]];
      if (!dest) badDoor.push(rid + '.' + e.id + ' -> ' + e.to[0]);
      else if (!dest.spawns[e.to[1]]) badDoor.push(rid + '.' + e.id + ' -> ' + e.to.join('/'));
    });
  });
  check('all doors lead somewhere real', badDoor.length === 0, badDoor.join(', '));

  // Every spawn point must be inside its room's walkable floor.
  let badSpawn = [];
  Object.keys(PW.rooms).forEach((rid) => {
    const r = PW.rooms[rid];
    Object.keys(r.spawns).forEach((sid) => {
      const s = r.spawns[sid];
      const inWalk = r.walk.some((w) => PW.util.inRect(s.x, s.y, w));
      const inBlock = r.block.some((b) => PW.util.inRect(s.x, s.y, b));
      if (!inWalk || inBlock) badSpawn.push(rid + '/' + sid);
    });
  });
  check('all spawn points stand on the floor', badSpawn.length === 0, badSpawn.join(', '));

  // Every roaming enemy must start somewhere it can stand.
  let badFoe = [];
  Object.keys(PW.rooms).forEach((rid) => {
    const r = PW.rooms[rid];
    r.foes.forEach((f) => {
      if (!PW.troops[f.troop]) badFoe.push(rid + '.' + f.id + ' troop?');
      const inWalk = r.walk.some((w) => PW.util.inRect(f.x, f.y, w));
      if (!inWalk) badFoe.push(rid + '.' + f.id + ' off-floor');
    });
  });
  check('all roaming creatures start on the floor', badFoe.length === 0, badFoe.join(', '));

  // ...and far enough from every door that arriving is not an ambush.
  let tooClose = [];
  Object.keys(PW.rooms).forEach((rid) => {
    const r = PW.rooms[rid];
    r.foes.forEach((f) => {
      Object.keys(r.spawns).forEach((sid) => {
        const s = r.spawns[sid];
        const d = PW.util.dist(f.x, f.y, s.x, s.y);
        if (d < 180) tooClose.push(rid + '.' + f.id + ' is ' + Math.round(d) + 'px from ' + sid);
      });
    });
  });
  check('nothing lurks on top of a doorway', tooClose.length === 0, tooClose.join(', '));

  /* Overlapping interaction boxes can hide one thing permanently behind
     another. Sweep every standable tile in every room, in all four facings,
     and make sure each entity wins the pick from somewhere. */
  const unreachable = [];
  const DIRS = ['up', 'down', 'left', 'right'];
  Object.keys(PW.rooms).forEach((rid) => {
    const r = PW.rooms[rid];
    const scene = new PW.FieldScene(rid, Object.keys(r.spawns)[0]);
    scene.room = r;
    scene.entities = r.entities.map((e) => {
      const o = Object.create(e);
      o.visible = true;                    // ask "could this ever be reached"
      return o;
    });
    const reachable = new Set();
    for (let x = 0; x < 960; x += 8) {
      for (let y = 0; y < 540; y += 8) {
        if (!scene.canStand(x, y)) continue;
        for (const dir of DIRS) {
          const e = scene.nearest({ x, y, dir });
          if (e) reachable.add(e.id);
        }
      }
    }
    r.entities.forEach((e) => {
      if (!e.talk && !e.kind) return;
      if (!reachable.has(e.id)) unreachable.push(rid + '.' + e.id);
    });
  });
  check('every interactive thing can be reached', unreachable.length === 0,
        unreachable.join(', '));

  /* Reachable-from-somewhere is not enough: a spawn point standing inside a
     door sends the player straight back where they came from, and a box that
     can only be won from one tile in the room is a box nobody will find. */
  const flimsy = [];
  Object.keys(PW.rooms).forEach((rid) => {
    const r = PW.rooms[rid];
    const scene = new PW.FieldScene(rid, Object.keys(r.spawns)[0]);
    scene.room = r;
    scene.entities = r.entities.map((e) => {
      const o = Object.create(e);
      o.visible = true;
      return o;
    });
    const tiles = {};
    for (let x = 0; x < 960; x += 8) {
      for (let y = 0; y < 540; y += 8) {
        if (!scene.canStand(x, y)) continue;
        for (const dir of DIRS) {
          const e = scene.nearest({ x, y, dir });
          if (e) tiles[e.id] = (tiles[e.id] || 0) + 1;
        }
      }
    }
    r.entities.forEach((e) => {
      if (!e.talk && !e.kind) return;
      if ((tiles[e.id] || 0) < 4) flimsy.push(rid + '.' + e.id + ' (' + (tiles[e.id] || 0) + ')');
    });
    Object.keys(r.spawns).forEach((sid) => {
      const s = r.spawns[sid];
      if (!scene.canStand(s.x, s.y)) flimsy.push(rid + '.' + sid + ' is off the floor');
      const e = scene.nearest({ x: s.x, y: s.y, dir: s.dir || 'down' });
      if (e && e.kind === 'door') flimsy.push(rid + '.' + sid + ' faces straight into ' + e.id);
    });
  });
  check('nothing is reachable from only a sliver of floor', flimsy.length === 0,
        flimsy.join(', '));

  // Items referenced by drops / soothe rewards must exist.
  let badItem = [];
  Object.keys(PW.enemies).forEach((id) => {
    (PW.enemies[id].drops || []).forEach((d) => {
      if (!PW.items.get(d.id)) badItem.push(id + ' drops ' + d.id);
    });
    const s = PW.enemies[id].soothe;
    if (s && s.drop && !PW.items.get(s.drop)) badItem.push(id + ' soothe drops ' + s.drop);
  });
  check('all enemy drops are real items', badItem.length === 0, badItem.join(', '));

  // Music: every note parses and every track uses a known instrument.
  const INSTS = ['piano', 'box', 'pad', 'voice', 'bass', 'pluck', 'perc', 'drone'];
  let badMusic = [];
  Object.keys(PW.music).forEach((k) => {
    const s = PW.music[k];
    s.tracks.forEach((tr) => {
      if (INSTS.indexOf(tr.inst) < 0) badMusic.push(k + ':' + tr.inst);
      tr.notes.forEach((n) => {
        if (n[0] === undefined || n[0] < 0 || n[0] >= s.length) {
          badMusic.push(k + ' step ' + n[0] + ' outside 0..' + s.length);
        }
        const ps = Array.isArray(n[1]) ? n[1] : [n[1]];
        ps.forEach((p) => {
          if (typeof p === 'string' && !/^[A-Ga-g][#b]?-?\d$/.test(p)) {
            badMusic.push(k + ' bad note ' + p);
          }
        });
      });
    });
  });
  check('all music data is well formed', badMusic.length === 0,
        [...new Set(badMusic)].slice(0, 6).join(', '));

  // Every pitch must resolve to a finite, audible frequency. (Percussion parts
  // are written as literal hertz, so this also catches them being mistaken for
  // note numbers and overflowing.)
  let badHz = [];
  Object.keys(PW.music).forEach((k) => {
    PW.music[k].tracks.forEach((tr) => {
      tr.notes.forEach((n) => {
        (Array.isArray(n[1]) ? n[1] : [n[1]]).forEach((p) => {
          if (p === null) return;
          const hz = PW.audio.freq(p);
          if (!isFinite(hz) || hz < 20 || hz > 18000) badHz.push(k + ' ' + p + ' -> ' + hz);
        });
      });
    });
  });
  check('every note lands in the audible range', badHz.length === 0,
        [...new Set(badHz)].slice(0, 6).join(', '));

  /* --------------------------------------------------------- the game -- */

  console.log('\n— playthrough —');

  PW.game.start(new PW.TitleScene());
  run(20);
  check('title screen runs', top().name === 'title');

  // begin -> slot 1
  tick('ok');                       // "begin"
  run(10);
  tick('ok');                       // slot 0
  const started = until(() => top().name === 'field', null, 400);
  check('new game reaches the bedroom', started && PW.state.room === 'bedroom');

  /** Is the field scene idle — no cutscene, no dialogue, no veil? */
  function idle() {
    const s = top();
    return s.name === 'field' && !s.script.running && !s.box.active && !PW.game.busy();
  }
  /** Mash Z until whatever is playing hands control back (or a battle starts). */
  function clearScript(limit) {
    return until(() => idle() || top().name === 'battle', 'ok', limit || 2500);
  }
  /* Choose option `i`. Only presses while something is actually on screen, so a
     missing choice can never turn into three hundred stray presses in a room. */
  function choose(i) {
    const found = until(
      () => (top().box && top().box.choices) || idle(),
      'ok', 900);
    if (!found || !top().box || !top().box.choices) return false;
    for (let k = 0; k < i; k++) { tick('down'); run(3); }
    tick('ok'); run(6);
    return true;
  }
  /* Put the player on the nearest patch of floor from which this entity is the
     one they would touch. Guessing a spot and a facing is not good enough: the
     rooms are painted, so what stands where is not predictable from the id. */
  function stand(sc, e) {
    let best = null, bestD = 1e9;
    for (let x = 0; x < 960; x += 8) {
      for (let y = 0; y < 540; y += 8) {
        if (!sc.canStand(x, y)) continue;
        for (const dir of ['up', 'down', 'left', 'right']) {
          if (sc.nearest({ x, y, dir }) !== e) continue;
          const d = Math.hypot(x - e.x, y - e.y);
          if (d < bestD) { bestD = d; best = { x, y, dir }; }
        }
      }
    }
    if (!best) return false;
    sc.player.x = best.x;
    sc.player.y = best.y;
    sc.player.dir = best.dir;
    return true;
  }

  /** Stand in front of an entity and interact with it. */
  function use(id) {
    // A press during a room transition is swallowed; wait for control first.
    until(() => idle(), null, 600);
    const sc = top();
    if (sc.name !== 'field') return false;
    const e = sc.entities.find((x) => x.id === id);
    if (!e || !e.visible) return false;
    if (!stand(sc, e)) return false;
    run(2);
    tick('ok');
    run(4);
    return true;
  }

  clearScript();
  check('opening narration plays', transcript.length > 3, transcript.length + ' lines');

  use('shelf');
  choose(0);                                    // pick it up
  clearScript(4000);
  check('paperweight taken', PW.items.has('paperweight'));
  check('fell asleep into the hall', PW.state.room === 'hub', PW.state.room);

  /* --- the tutorial battle ------------------------------------------- */
  const inBattle = until(() => top().name === 'battle', 'ok', 2500);
  check('Wick joins', PW.party.has('wick'));
  check('tutorial battle starts', inBattle);

  /** Fight until the battle scene is gone. `hold` = use HOLD instead of HIT. */
  function fight(hold, limit) {
    let guard = 0;
    while (top().name === 'battle' && guard++ < (limit || 2600)) {
      const b = top();
      if (b.box.active) { tick('ok'); run(2); continue; }
      if (b.state === 'input' && b.menu && b.menu.level === 'root') {
        const opts = b.rootOptions(b.inputMember());
        const wantKey = hold ? 'hold' : 'attack';
        const wantIdx = opts.findIndex((o) => o.key === wantKey);
        if (b.menu.idx < wantIdx) { tick('down'); run(2); continue; }
        if (b.menu.idx > wantIdx) { tick('up'); run(2); continue; }
        tick('ok'); run(2); continue;
      }
      if (b.state === 'input' && b.menu && b.menu.level === 'target') { tick('ok'); run(2); continue; }
      if (b.state === 'input' && b.menu) { tick('back'); run(2); continue; }
      tick('ok');
      run(2);
    }
    return top().name !== 'battle';
  }

  const won = fight(false);
  check('tutorial battle resolves', won);
  clearScript(4000);
  check('chapter 2 unlocked', PW.state.chapter >= 2, 'chapter ' + PW.state.chapter);

  /* --- kitchen -------------------------------------------------------- */
  use('door_kitchen');
  until(() => PW.state.room === 'kitchen', null, 400);
  check('kitchen door opens', PW.state.room === 'kitchen', PW.state.room);
  clearScript();

  use('dell_meet');
  clearScript(4000);
  check('Dell joins', PW.party.has('dell'));

  use('herbs');
  clearScript();
  check('paper crown kept', PW.items.has('crown'));

  use('table');
  choose(0);
  clearScript();
  use('jars');
  clearScript();
  check('jam found', PW.items.count('jam') > 0);

  // A roaming fight, to prove field encounters work.
  const sc = top();
  if (sc.foes.length) {
    sc.player.x = sc.foes[0].x;
    sc.player.y = sc.foes[0].y;
    until(() => top().name === 'battle', null, 300);
    check('roaming creature starts a fight', top().name === 'battle');
    fight(false);
    until(() => top().name === 'field', 'ok', 400);
  }

  use('stove');
  until(() => top().name === 'battle', 'ok', 1500);
  check('PILOT LIGHT appears', top().name === 'battle');
  const bossBeaten = fight(false, 4000);
  check('PILOT LIGHT resolves', bossBeaten);
  clearScript(5000);
  check('chapter 3 unlocked', PW.state.chapter >= 3, 'chapter ' + PW.state.chapter);

  /* --- garden --------------------------------------------------------- */
  use('out');
  until(() => PW.state.room === 'hub', null, 400);
  use('door_garden');
  until(() => PW.state.room === 'garden', null, 400);
  check('garden door opens', PW.state.room === 'garden', PW.state.room);
  clearScript();

  use('hal_meet');
  clearScript(4000);
  check('Hal joins', PW.party.has('hal'));

  use('wateringcan'); clearScript();
  use('lily_a'); clearScript();
  check('violet kept', PW.items.has('violet'));

  use('deepwater');
  until(() => top().name === 'battle', 'ok', 2000);
  check('THE DROWNED LILY appears', top().name === 'battle');
  // Settle this one instead of killing it, to exercise the HOLD path.
  const soothed = fight(true, 5000);
  check('THE DROWNED LILY resolves via HOLD', soothed);
  clearScript(5000);
  check('the lily was settled, not destroyed', PW.flag('soothed_lily'));
  check('chapter 4 unlocked', PW.state.chapter >= 4, 'chapter ' + PW.state.chapter);
  check('pouch grew', PW.state.keptMax === 5, 'max ' + PW.state.keptMax);

  /* --- attic ---------------------------------------------------------- */
  use('out');
  until(() => PW.state.room === 'hub', null, 400);
  clearScript(2000);
  use('door_attic');
  until(() => PW.state.room === 'attic', null, 500);
  check('attic door opens', PW.state.room === 'attic', PW.state.room);
  clearScript(2500);

  use('box_1'); choose(1); clearScript();
  // The pouch is full by now: this must offer a swap rather than silently
  // eating a story item.
  use('box_2');
  const swapped = choose(0);
  clearScript();
  check('a full pouch offers a swap', swapped);
  check('music box kept', PW.items.has('musicbox'));
  check('something was put down for it', PW.counter('put_down') > 0);
  use('box_3'); if (PW.items.keptFull()) choose(0); clearScript();
  check('key found', PW.flag('has_key'));

  // Leaving and re-entering fires the "it has noticed us" trigger.
  use('out');
  until(() => PW.state.room === 'hub', null, 500);
  clearScript(2000);
  use('door_attic');
  until(() => PW.state.room === 'attic', null, 500);
  const toBlank = until(() => PW.state.room === 'blank', 'ok', 2500);
  check('the floor gives way to the Blank', toBlank, PW.state.room);
  clearScript(2500);

  use('doorway');
  until(() => top().name === 'battle', 'ok', 2000);
  check('THE NAMELESS appears', top().name === 'battle');
  fight(false, 6000);
  clearScript(6000);
  check('chapter 5 unlocked', PW.state.chapter >= 5, 'chapter ' + PW.state.chapter);
  check('back in the hall', PW.state.room === 'hub', PW.state.room);

  /* --- the pocket menu ------------------------------------------------ */
  // Let any arrival cutscene start *and* finish before asking for the menu.
  run(6);
  until(() => idle(), 'ok', 1500);
  run(6);
  tick('menu'); run(8);
  check('pocket menu opens', top().name === 'pocket');
  tick('right'); run(6);
  check('pockets tab', top().tab === 1);
  tick('right'); run(6);
  check('kept tab', top().tab === 2);
  // Slot 0 is the paperweight, which is meant to refuse.
  tick('ok'); run(6);
  check('the paperweight cannot be set down', !top().confirm);
  tick('down'); run(6);                    // a memory that *can* go
  tick('ok'); run(6);
  const asked = !!top().confirm;
  const before = PW.counter('put_down');
  tick('left'); run(4);                    // "yes"
  tick('ok'); run(8);
  check('the pouch lets you set something down',
        asked && PW.counter('put_down') === before + 1);
  tick('back'); run(8);
  check('pocket menu closes', top().name === 'field');

  /* --- the end -------------------------------------------------------- */
  clearScript(3000);
  use('door_final');
  choose(0);
  until(() => PW.state.room === 'finalroom', 'ok', 2500);
  check('her room opens', PW.state.room === 'finalroom', PW.state.room);
  clearScript(4000);

  ['chair', 'bed', 'glasses', 'window_b'].forEach((id) => {
    use(id);
    if (top().box && top().box.choices) choose(0);
    clearScript(2500);
  });

  const houseFight = until(() => top().name === 'battle', 'ok', 3000);
  check('THE HOUSE THAT FORGETS appears', houseFight);
  const houseHeld = fight(true, 9000);
  check('the house resolves via HOLD', houseHeld);

  const ended = until(() => top().name === 'ending', 'ok', 6000);
  check('the house was held, not beaten', PW.flag('soothed_the_house'));
  check('an ending is reached', ended, ended ? top().id : PW.state.room);
  if (ended) {
    check('holding + putting down gives KEEP GOING or SET DOWN',
      ['keep_going', 'set_down'].indexOf(top().id) >= 0, top().id);
    run(400, 'ok');                       // scroll through the ending
    until(() => top().phase === 'credits', 'ok', 4000);
    check('credits roll', top().phase === 'credits' || top().phase === 'done');
  }

  /* ---------------------------------------------------------- results -- */

  console.log('\n— art —');
  const missing = [...missingArt];
  check('no missing artwork was requested', missing.length === 0,
        missing.slice(0, 8).join(', ') + (missing.length > 8 ? ' …+' + (missing.length - 8) : ''));

  console.log('\n— summary —');
  console.log('  ' + transcript.length + ' lines of dialogue played');
  console.log('  ' + PW.state.battlesWon + ' battles won, ' +
              PW.counter('soothed_count') + ' settled');
  console.log('  party: ' + PW.state.party.join(', '));
  console.log('  kept: ' + PW.state.kept.join(', '));
  console.log('  levels: ' + PW.state.party.map((p) => p + ' ' + PW.party.rec(p).lv).join(', '));
  console.log('  ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');

  if (errors.length) {
    console.log('\n— runtime errors (' + errors.length + ') —');
    [...new Set(errors.map((e) => e.replace(/frame \d+/, 'frame')))]
      .slice(0, 15).forEach((e) => console.log('  ' + e));
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' checks passed' +
              (errors.length ? ', ' + errors.length + ' runtime errors' : ''));
  process.exit(failed || errors.length ? 1 : 0);
};
