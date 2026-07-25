/* PAPERWEIGHT — drive the game with real touch events.
 *
 * Launches Chrome with touch emulation on, loads the game, and sends genuine
 * touchstart/move/end sequences through the browser's input pipeline — the
 * only way to prove the gesture layer works, since the headless harness stubs
 * input out entirely.
 *
 *   node tools/touch.js            local file://
 *   node tools/touch.js <url>      a deployed copy
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.dirname(__dirname);
const TARGET = process.argv[2] || 'file://' + path.join(ROOT, 'index.html');
const PORT = 9000 + Math.floor(Math.random() * 900);   // avoid colliding with a previous run
const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Chrome forks renderer processes that outlive a plain kill() on the launcher.
   Leaving one behind means the next run connects to the *previous* browser on
   the same debug port and tests a stale page, which is a genuinely baffling
   way to spend an afternoon. */
function shutdown(proc) {
  try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) { /* already gone */ }
  try { proc.kill('SIGKILL'); } catch (e) { /* already gone */ }
}

const get = (u) => new Promise((res, rej) => {
  http.get(u, (r) => { let d = ''; r.on('data', (c) => { d += c; }); r.on('end', () => res(JSON.parse(d))); })
    .on('error', rej);
});

let pass = 0, fail = 0;
function check(name, ok, detail) {
  ok ? pass++ : fail++;
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (detail !== undefined ? '  — ' + detail : ''));
}

(async () => {
  if (!CHROME) { console.error('no chrome found'); process.exit(1); }

  const profile = fs.mkdtempSync('/tmp/pw-touch-');
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile, '--no-first-run', '--no-sandbox',
    '--window-size=900,520', '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required',
    '--allow-file-access-from-files', TARGET
  ], { stdio: 'ignore', detached: true });

  let t = null;
  for (let i = 0; i < 80 && !t; i++) {
    await sleep(250);
    try { t = (await get(`http://127.0.0.1:${PORT}/json/list`)).filter((x) => x.type === 'page')[0]; }
    catch (e) { /* not up yet */ }
  }
  if (!t) { console.error('chrome did not start'); shutdown(chrome); process.exit(1); }

  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0;
  const waiting = new Map();
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') {
      logs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception || {}).description);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      logs.push('error: ' + m.params.args.map((a) => a.value).join(' '));
    }
  });
  await new Promise((r) => ws.addEventListener('open', r));

  const send = (method, params = {}) => {
    const i = ++id;
    ws.send(JSON.stringify({ id: i, method, params }));
    return new Promise((r) => waiting.set(i, r));
  };
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r.result.result.value;
  };

  /* -------------------------------------------------------- gestures --- */

  const pt = (x, y, i) => ({ x, y, id: i, radiusX: 12, radiusY: 12, force: 1 });

  async function touchStart(points) {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  }
  async function touchMove(points) {
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points });
  }
  async function touchEnd() {
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  /** A tap with `n` fingers, all down together, all up together. */
  async function tap(n, x = 450, y = 260) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(pt(x + i * 40, y, i));
    // Fingers land one at a time, as they do on a real screen.
    for (let i = 0; i < n; i++) await touchStart(pts.slice(0, i + 1));
    await sleep(60);
    await touchEnd();
    await sleep(160);
  }

  /** Drag from (x,y) by (dx,dy), hold for `holdMs`, then let go. */
  async function drag(x, y, dx, dy, holdMs = 0) {
    await touchStart([pt(x, y, 0)]);
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await touchMove([pt(x + dx * i / steps, y + dy * i / steps, 0)]);
      await sleep(16);
    }
    if (holdMs) await sleep(holdMs);
    await touchEnd();
    await sleep(120);
  }

  // Everything is declared in the 960x540 the game draws in, so the test asks
  // the page to convert a game point into a screen point before tapping it.
  const toScreen = async (gx, gy) => JSON.parse(await evaluate(`(function(){
    var r = document.getElementById('screen').getBoundingClientRect();
    return JSON.stringify([r.left + ${gx} / 960 * r.width,
                           r.top  + ${gy} / 540 * r.height]);
  })()`));

  /** Wait until a menu's tap targets are live (one frame after it draws). */
  async function awaitRegions(tag) {
    for (let i = 0; i < 40; i++) {
      if (await evaluate('PW.ui.has(' + JSON.stringify(tag) + ')')) return true;
      await sleep(50);
    }
    return false;
  }

  async function tapGame(gx, gy, fingers) {
    const [sx, sy] = await toScreen(gx, gy);
    await tap(fingers || 1, sx, sy);
  }

  /* ------------------------------------------------------------ setup -- */

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: false });
  await sleep(1500);
  for (let i = 0; i < 40; i++) {
    if (await evaluate('!!(window.PW && PW.assets && PW.assets.progress() >= 1)')) break;
    await sleep(500);
  }

  console.log('\n— touch —');
  check('touch capability is detected', await evaluate('PW.input.touchCapable()'));

  // The boot button must still work by tap: it is plain HTML above the canvas.
  const box = await evaluate(`(function(){
    var r = document.getElementById('boot-go').getBoundingClientRect();
    return JSON.stringify([r.left + r.width/2, r.top + r.height/2]);
  })()`);
  const [bx, by] = JSON.parse(box);
  await tap(1, bx, by);
  await sleep(1600);
  check('tapping "begin" starts the game', await evaluate('!!PW.game.top()'),
        await evaluate('PW.game.top() && PW.game.top().name'));

  /* ------------------------------------------------- one-finger = OK --- */

  check('title screen is up', (await evaluate('PW.game.top().name')) === 'title');
  await tapGame(200, 270);                         // the first option, "begin"
  check('one-finger tap confirms', (await evaluate('PW.game.top().mode')) === 'slots',
        await evaluate('PW.game.top().mode'));

  /* ------------------------------------------------ two fingers = back - */

  await tap(2);
  check('two-finger tap goes back', (await evaluate('PW.game.top().mode')) === 'title',
        await evaluate('PW.game.top().mode'));

  /* ------------------------------------------------- swipe = a cursor -- */

  const before = await evaluate('PW.game.top().idx');
  await drag(450, 260, 0, 90);
  const after = await evaluate('PW.game.top().idx');
  check('a downward flick moves the menu cursor', after === before + 1,
        before + ' -> ' + after);

  await drag(450, 260, 0, -90);
  check('an upward flick moves it back', (await evaluate('PW.game.top().idx')) === before);

  check('a flick is not also a tap', (await evaluate('PW.game.top().mode')) === 'title',
        await evaluate('PW.game.top().mode'));

  /* ------------------------------------------- tapping an option direct - */

  // The title menu is 'begin' at y≈258 and 'about' at y≈304. The cursor starts
  // on 'begin'; tapping 'about' must go straight there without any swiping.
  check('cursor starts on the first option', (await evaluate('PW.game.top().idx')) === 0);
  await tapGame(200, 316);
  check('tapping a menu option selects it without swiping first',
        (await evaluate('PW.game.top().mode')) === 'about',
        'mode=' + await evaluate('PW.game.top().mode') +
        ' idx=' + await evaluate('PW.game.top().idx'));
  await tap(1);                                   // dismiss the about panel
  await sleep(300);

  // ...and a tap that lands nowhere near an option must not pick anything.
  const idxBefore = await evaluate('PW.game.top().idx');
  const modeBefore = await evaluate('PW.game.top().mode');
  await tapGame(820, 120);
  check('tapping past the menu does nothing',
        (await evaluate('PW.game.top().mode')) === modeBefore &&
        (await evaluate('PW.game.top().idx')) === idxBefore,
        await evaluate('PW.game.top().mode'));

  /* ------------------------------------------------------- in the world */

  await evaluate(`(function(){
    PW.save.reset(); PW.state.slot = 0;
    PW.game.replace(new PW.FieldScene('hub', 'start'));
    PW.state.chapter = 2; PW.party.add('wick');
    PW.game.top().script.stop();
  })()`);
  await sleep(900);
  check('in the field', (await evaluate('PW.game.top().name')) === 'field');

  const p0 = await evaluate('JSON.stringify([PW.game.top().player.x, PW.game.top().player.y])');
  await drag(450, 260, -110, 0, 700);          // hold left for ~0.7s
  const p1 = await evaluate('JSON.stringify([PW.game.top().player.x, PW.game.top().player.y])');
  const [x0] = JSON.parse(p0), [x1] = JSON.parse(p1);
  check('holding a drag walks the party', x1 < x0 - 20,
        Math.round(x0) + ' -> ' + Math.round(x1));

  check('the direction is released on lift',
        (await evaluate('PW.input.axisX()')) === 0 && (await evaluate('PW.input.axisY()')) === 0);

  // A diagonal drag should hold two directions at once.
  await touchStart([pt(450, 260, 0)]);
  await touchMove([pt(380, 190, 0)]);
  await sleep(120);
  const diag = await evaluate('PW.input.axisX() + "," + PW.input.axisY()');
  await touchEnd();
  await sleep(120);
  check('a diagonal drag holds both axes', diag === '-1,-1', diag);

  /* ------------------------------------------------ tapping in a battle - */

  await evaluate("PWdebug.battle('hub_c')");
  await sleep(2600);
  await evaluate('PW.game.top().phaseT = 0');     // skip the intro beat
  await sleep(700);
  check('a battle is taking orders',
        (await evaluate('PW.game.top().state')) === 'input',
        await evaluate('PW.game.top().state'));

  // The command list runs Hit / Do / Hold / Thing / Go downward from the card.
  const cmd = JSON.parse(await evaluate(`(function(){
    var b = PW.game.top();
    var opts = b.rootOptions(b.inputMember());
    var w = 176, h = opts.length * 38 + 20;
    var x = Math.max(12, Math.min(b.inputMember().x - w/2, 960 - w - 12));
    var y = 444 - h - 12;
    return JSON.stringify([x + w/2, y + 10 + 2*38 + 17, opts[2].key]);
  })()`));
  check('the third command is Hold', cmd[2] === 'hold', cmd[2]);
  check('the command list is tappable', await awaitRegions('cmd'));
  await tapGame(cmd[0], cmd[1]);
  check('tapping "Hold" jumps the cursor there and opens it',
        (await evaluate('PW.game.top().menu && PW.game.top().menu.level')) === 'target' &&
        (await evaluate('PW.game.top().menu && PW.game.top().menu.act.type')) === 'hold',
        await evaluate('JSON.stringify(PW.game.top().menu && PW.game.top().menu.level)'));

  // Now aim at the *second* creature by tapping it, not by swiping across.
  const foe = JSON.parse(await evaluate(`(function(){
    var b = PW.game.top(), f = b.livingFoes()[1];
    return JSON.stringify([f.x, f.y - f.img.height * f.scale / 2, f.name]);
  })()`));
  check('the creatures became tappable', await awaitRegions('target'));
  await tapGame(foe[0], foe[1]);
  const aimed = await evaluate(`(function(){
    var b = PW.game.top();
    var a = b.actions[b.party[0].id];
    return a && a.target ? a.target.name : null;
  })()`);
  check('tapping a creature aims at that creature', aimed === foe[2],
        aimed + ' (wanted ' + foe[2] + ')');

  // The one frame after a menu opens it has declared nothing yet. A tap in
  // that window must read as a miss, not fall through to the plain confirm and
  // pick whatever the cursor was resting on. The window is a single frame, so
  // this asks the rule directly rather than trying to race it.
  const verdicts = JSON.parse(await evaluate([
    '(function(){',
    '  var real = PW.input.tap, out = {};',
    '  PW.input.tap = function(){ return { x: 480, y: 270 }; };',
    '  PW.ui.clear();',
    "  out.empty = PW.ui.tapped('target');",
    "  PW.ui.region('target', 7, 400, 200, 160, 140, 'the moth');",
    '  PW.ui.commit();',
    "  var hit = PW.ui.tapped('target');",
    '  out.hitIdx = hit && hit.idx; out.hitData = hit && hit.data;',
    "  out.other = PW.ui.tapped('cmd');",
    '  PW.input.tap = real; PW.ui.clear();',
    '  return JSON.stringify(out);',
    '})()'
  ].join('\n')));
  check('a tap before a menu has declared anything is a miss',
        verdicts.empty === 'miss', String(verdicts.empty));
  check('a tap inside a declared region returns it',
        verdicts.hitIdx === 7 && verdicts.hitData === 'the moth',
        verdicts.hitIdx + '/' + verdicts.hitData);
  check("a tap on another menu's region is a miss here",
        verdicts.other === 'miss', String(verdicts.other));

  await evaluate("while(PW.game.top().name==='battle') PW.game.pop();");
  await sleep(600);

  /* ---------------------------------------------- three fingers = menu - */

  await tap(3);
  check('three-finger tap opens the pocket',
        (await evaluate('PW.game.top().name')) === 'pocket',
        await evaluate('PW.game.top().name'));

  await drag(450, 260, 110, 0);
  check('swiping changes tab', (await evaluate('PW.game.top().tab')) === 1,
        await evaluate('PW.game.top().tab'));

  await tapGame(442, 90);                          // the third tab, "kept"
  check('tapping a tab switches to it', (await evaluate('PW.game.top().tab')) === 2,
        await evaluate('PW.game.top().tab'));

  await tap(2);
  check('two-finger tap closes the pocket',
        (await evaluate('PW.game.top().name')) === 'field',
        await evaluate('PW.game.top().name'));

  /* -------------------------------------------------------- page setup - */

  // A tap on the fullscreen button must reach the DOM, not the gesture layer.
  const fsBox = await evaluate(`(function(){
    var e = document.getElementById('fs');
    e.dataset.hit = '';
    e.addEventListener('click', function(){ e.dataset.hit = 'yes'; }, { once: true });
    var r = e.getBoundingClientRect();
    return JSON.stringify([r.left + r.width/2, r.top + r.height/2]);
  })()`);
  const [fx, fy] = JSON.parse(fsBox);
  const sceneBefore = await evaluate('PW.game.top().name');
  await tap(1, fx, fy);
  check('the fullscreen button still receives its tap',
        (await evaluate("document.getElementById('fs').dataset.hit")) === 'yes');
  check('and that tap is not also fed to the game',
        (await evaluate('PW.game.top().name')) === sceneBefore);

  check('the browser is not allowed to pan or zoom',
        (await evaluate("getComputedStyle(document.body).touchAction")) === 'none');
  check('a fullscreen button exists for touch',
        await evaluate("!!document.getElementById('fs')"));
  check('nothing threw', logs.length === 0, logs.slice(0, 3).join(' | '));

  console.log('\n' + pass + '/' + (pass + fail) + ' touch checks passed');
  ws.close();
  shutdown(chrome);
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch (e) { /* */ }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
