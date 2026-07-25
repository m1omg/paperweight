/* PAPERWEIGHT — capture real frames from a real browser.
 *
 * Launches headless Chrome, loads the game off the filesystem, drives it with
 * synthetic key events, and writes canvas PNGs. This is the check that the
 * headless test cannot make: that it actually *looks* like something.
 *
 *   node tools/shots.js [outdir]
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.dirname(__dirname);
const OUT = process.argv[2] || path.join(ROOT, 'shots');
const PORT = 9333;
const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function main() {
  if (!CHROME) { console.error('no chrome found'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });

  const profile = fs.mkdtempSync('/tmp/pw-chrome-');
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile, '--no-first-run', '--no-sandbox',
    '--window-size=1280,760', '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required',
    '--allow-file-access-from-files',
    'file://' + path.join(ROOT, 'index.html')
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) {
    await sleep(250);
    try { targets = (await get(`http://127.0.0.1:${PORT}/json/list`)).filter((t) => t.type === 'page'); }
    catch (e) { /* not up yet */ }
  }
  if (!targets || !targets.length) { console.error('chrome did not start'); chrome.kill(); process.exit(1); }

  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  let id = 0;
  const waiting = new Map();
  const logs = [];

  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled') {
      logs.push(m.params.type + ': ' +
        m.params.args.map((a) => a.value !== undefined ? a.value : a.description).join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      logs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception || {}).description);
    }
  });

  await new Promise((r) => ws.addEventListener('open', r));

  function send(method, params) {
    const msgId = ++id;
    ws.send(JSON.stringify({ id: msgId, method, params: params || {} }));
    return new Promise((r) => waiting.set(msgId, r));
  }

  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', {
      expression: expr, awaitPromise: true, returnByValue: true
    });
    if (r.result && r.result.exceptionDetails) {
      throw new Error(r.result.exceptionDetails.exception.description);
    }
    return r.result.result.value;
  }

  async function key(code, text) {
    const base = { windowsVirtualKeyCode: 0, code, key: text || code, text: undefined };
    await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, base));
    await sleep(28);
    await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
    await sleep(28);
  }

  async function shot(name) {
    const data = await evaluate("document.getElementById('screen').toDataURL('image/png')");
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    console.log('  ' + name + '.png');
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await sleep(1200);

  // Boot past the "click to begin" gate.
  await evaluate("document.getElementById('boot-go').click()");
  await sleep(1500);
  console.log('capturing:');
  await shot('01-title');

  // Start a new game and skip the prologue with the debug hooks.
  await key('KeyZ'); await sleep(500);
  await key('KeyZ'); await sleep(2500);
  await shot('02-bedroom');

  await evaluate(`(function(){
    PWdebug.chapter(2); PWdebug.join('wick'); PWdebug.join('dell');
    PWdebug.flag('tutorial_done', true); PWdebug.flag('met_dell', true);
    PWdebug.give('crown'); PWdebug.give('jam', 3); PWdebug.give('marble');
    PWdebug.room('hub','start');
  })()`);
  await sleep(2200);
  await shot('03-hall-of-doors');

  await evaluate("PWdebug.room('kitchen','start')");
  await sleep(2000);
  await shot('04-kitchen');

  await evaluate("PWdebug.join('hal'); PWdebug.room('garden','start')");
  await sleep(2000);
  await shot('05-garden');

  await evaluate("PWdebug.room('attic','start')");
  await sleep(2000);
  await shot('06-attic');

  await evaluate("PWdebug.room('finalroom','start')");
  await sleep(2000);
  await shot('07-her-room');

  // Dialogue with a portrait.
  await evaluate(`PW.game.top().script.run([
    ['say','wick','warm','You are allowed to keep a thing and put a thing down. They are not opposites.']
  ])`);
  await sleep(2600);
  await shot('08-dialogue');
  await key('KeyZ'); await sleep(400); await key('KeyZ'); await sleep(600);

  // A battle, mid-menu.
  await evaluate("PWdebug.battle('kitchen_c')");
  await sleep(2600);
  await shot('09-battle-intro');
  await key('KeyZ'); await sleep(900);
  await shot('10-battle-menu');

  // Open the skill list.
  await key('ArrowDown'); await sleep(200);
  await key('KeyZ'); await sleep(700);
  await shot('11-battle-skills');
  await key('KeyX'); await sleep(400);

  // Take a couple of real turns so damage numbers and moods appear.
  for (let i = 0; i < 3; i++) { await key('KeyZ'); await sleep(260); }
  await sleep(1400);
  await shot('12-battle-action');
  for (let i = 0; i < 14; i++) { await key('KeyZ'); await sleep(230); }
  await shot('13-battle-later');

  // The pocket menu.
  await evaluate("while(PW.game.top().name!=='field') PW.game.pop();");
  await sleep(700);
  await key('KeyC'); await sleep(700);
  await shot('14-pocket-who');
  await key('ArrowRight'); await sleep(400);
  await shot('15-pocket-things');
  await key('ArrowRight'); await sleep(400);
  await shot('16-pocket-kept');
  await key('KeyX'); await sleep(400);

  // An ending and the credits.
  await evaluate("PWdebug.ending('keep_going')");
  await sleep(3600);
  await shot('17-ending');
  for (let i = 0; i < 30; i++) { await key('KeyZ'); await sleep(120); }
  await sleep(1200);
  await shot('18-credits');

  const missing = await evaluate('PW.assets.missing().length');
  const audio = await evaluate('PW.audio.ok() && PW.audio.current()');
  console.log('\nmissing assets: ' + missing);
  console.log('audio running, current track: ' + audio);
  const bad = logs.filter((l) => /error|EXCEPTION/i.test(l));
  console.log('console errors: ' + bad.length);
  bad.slice(0, 10).forEach((l) => console.log('  ' + l));
  logs.filter((l) => /PAPERWEIGHT/.test(l)).forEach((l) => console.log('  ' + l));

  ws.close();
  chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch (e) { /* chrome still letting go */ }
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
