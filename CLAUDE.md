# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PAPERWEIGHT is a hand-drawn JRPG that runs as plain ES5 in a browser, straight
off `file://`. **No build step, no bundler, no package.json, no dependencies, no
network.** Everything lives in one global `PW` namespace; `index.html` lists the
source files in load order and that list *is* the module system.

Hard constraints to preserve:

- ES5 only (`var`, no arrow functions, no `let/const`, no classes, no modules) in
  everything under `js/`. Tools under `tools/` are Node/Python and may use modern syntax.
- No `fetch`/XHR/import — the game must work from the filesystem. Images load via
  `<img>` tags; audio is synthesised, not loaded.
- Adding a `js/` file means adding a `<script src>` to `index.html` in the right
  section (engine → data → scenes → main). `tools/smoke.js` regexes those script
  tags to know what to load, so the tests pick a new file up automatically.
- **Saves stay compatible, both ways.** Somebody is always mid-playthrough, so a
  save written by any version must load in any other: a newer build back-fills
  what an older save lacks and never writes anything that would confuse an older
  build. There is no migration step and no version gate — don't add one. See
  *State and saving* below for what that means in practice; `tools/paths.js`
  enforces it.

## Commands

```bash
./play.sh                      # open index.html in a browser (or just double-click it)

node tools/smoke.js            # 59 checks: data sanity + a full scripted playthrough
node tools/smoke.js --verbose  # ...printing every line of dialogue
node tools/paths.js            # 47 checks: endings, every skill, every item, party wipe, saves
node tools/gestures.js         # 15 checks: the gesture layer, real touch events, no Chrome
node tools/touch.js            # 33 checks: real touch events through headless Chrome
node tools/shots.js [outdir]   # 18 real frames out of headless Chrome -> shots/
python3 tools/boxes.py [room]  # draw each room's boxes/floor/spawns over its art
python3 tools/hall.py          # repaint bg_hub with doors taken out of it
```

`smoke.js` and `paths.js` are the everyday tests and run in ~3s each with no
setup. `touch.js` and `shots.js` need a Chrome binary at
`/usr/bin/google-chrome-stable`, `/usr/bin/chromium` or `/usr/bin/chromium-browser`
— **not installed in this environment**, so they will exit with "no chrome found".
`boxes.py` needs Pillow (present) and writes to `shots/boxes/`. `hall.py` needs
Pillow too, and unlike the rest of the art pipeline it works off the shipped
`assets/`, so it does run in this checkout; `--check` writes before/after proofs
into `shots/hall/`.

### Running one check

There is no test framework and no per-test filter. `tools/smoke.js` exports its
harness, so a single scenario is a throwaway script:

```js
const {PW, tick, run, until, top, errors} = require('./tools/smoke.js');
PW.save.reset();
PW.game.start(new PW.FieldScene('kitchen', 'start'));
until(() => top().name === 'field' && !top().script.running, 'ok', 600);
run(60, 'ok');                       // frames, with 'ok' pressed each one
console.log(errors);
```

`tick(press, hold)` drives one frame with a virtual key press/hold; `run(n, ...)`
repeats it; `until(fn, key, limit)` runs until a predicate holds. Requiring
`smoke.js` loads every game file into a fake DOM but does *not* run the
playthrough (that lives in `tools/smoke_run.js`).

### Asset pipeline

```bash
python3 tools/gen.py                 # regenerate raw art via the Codex GPT-Image tool
python3 tools/process.py             # assets/_raw -> the 83 images the game loads
python3 tools/process.py --lossless  # -> assets/_lossless/, the archival copy
```

Both read prompts/specs from `tools/manifest.py`. `assets/_raw/` and
`assets/_lossless/` are gitignored and **absent from this checkout**, so
`process.py` has nothing to work from here; the shipped `assets/` are the
finished outputs. `tools/publish.sh` creates the GitHub repo, pushes and enables
Pages (needs a PAT file).

## Architecture

### Shell and scene stack — `js/engine/game.js`

`PW.game` owns the canvas, the RAF loop, a scene *stack*, and the transition
veil/shake/flash/toast so scenes never fight over them. A scene is a plain object
with `name`, `opaque`, and `update(dt)` / `draw(ctx)`, optionally
`enter/exit/resumed/updateBelow`. Rendering starts at the deepest `opaque` scene,
so the field keeps drawing under a pushed battle or pocket menu; only the top
scene is updated unless it defines `updateBelow`.

`PW.game.step(dt)` drives one frame by hand — that is the hook the headless tests
use instead of RAF.

The game is written in a fixed **960×540 coordinate system** (`PW.W`/`PW.H`),
not a resolution: the canvas backing store is sized to real device pixels (up to
3×) and one `setTransform` per frame maps between them. Never assume canvas
pixels equal game units.

### Tappable UI — `js/engine/ui.js`

Menus have no layout pass and no widget tree. While drawing, a menu calls
`PW.ui.region(tag, idx, x, y, w, h, data)`; `PW.game` commits those at end of
frame; next frame's update reads `PW.ui.tapped(tag)`, which returns a region,
the string `'miss'`, or `null`. **The `'miss'` case must be honoured** (`return`
early) — otherwise a tap that lands outside the menu falls through to the plain
confirm and picks whatever the cursor happened to rest on. Only menus that
actually declare regions may call `tapped()`.

### Input — `js/engine/input.js`

One layer. Touch gestures synthesise the same virtual actions the keyboard
produces (`up/down/left/right/ok/back/pocket/fullscreen/mute`), so no scene knows
which is in use. Read with `held()`, `hit()` (this frame), `rep()` (menu
auto-repeat), `axisX/axisY()`, `tap()` (game coordinates).

**One finger steers; two and three are gestures.** A drag is a thumbstick, so it
tracks the first finger and cancels itself past `DEAD` (20px) — but a hand makes
a multi-finger tap by *rolling*, and that drift used to mark the gesture as a
drag and throw the tap away, which is how two-finger back silently died on real
hardware. Once `g.fingers > 1`, `onTouchMove` returns without steering or
setting `moved`, and the second finger releases whatever direction the first was
holding. Nothing here can be tested with still fingers: `tools/gestures.js`
fires real events with a roll in them, and reads `rawInput` because `smoke.js`
replaces `PW.input`'s readers with a scripted `keys` object for every other test.

### State and saving — `js/engine/save.js`

Everything the player has done is one JSON-able blob in `PW.state`; three
localStorage slots. `PW.flag(name[, value])` and `PW.counter(name[, add])` are
the story bits. localStorage being unavailable (common on `file://`) is
non-fatal by design.

Keeping saves loadable in both directions comes down to four rules:

- **`newState()` is the whole shape of a save.** Adding a field means adding it
  there, so `load()` can back-fill it for saves that predate it. Never let a
  field be conjured into `PW.state` from somewhere else — `pocket` was created
  lazily by `items.js` for a long time and only worked by luck.
- **Only add, never repurpose.** Changing what an existing field means, or
  narrowing what it may hold, breaks saves silently and in the player's favour
  the one time you would rather it did not.
- **Nothing unserialisable.** `PW.state` gets `JSON.stringify`d as it stands.
  Room `bg` is a function now; that lives on the room, never on the state.
- **New content should arrive on its own.** A new skill goes in an actor's
  `learn` map, so an existing save at that level simply has it next time — no
  migration, no fixup pass on load.

`tools/paths.js` checks all of this: that play invents no undeclared field, that
the blob is still plain JSON, and that a save missing today's fields loads and
picks up what has been added since.

### Cutscene language — `js/scenes/scene.js`

Story is data: arrays of `[op, ...args]` interpreted by `PW.Script`, which is a
stack of frames so `choice`/`if`/`run` can nest. Ops cover talk (`say`,
`narrate`, `remember`, `choice`), flow (`wait`, `if`, `call`, `waitfor`), world (`move`,
`face`, `warp`, `goroom`, `show`/`hide`), presentation (`music`, `sfx`,
`tension`, `shake`, `flash`, `fade`/`unfade`), and record-keeping (`flag`,
`chapter`, `give`, `partyadd`, `battle`, `ending`, `save`). Adding an op means
adding a `case` to `PW.Script.prototype.exec`. Ops that take time set
`this.waitFn`.

`remember` is `narrate` in a warm box labelled *you remember* — it is what a
memory looks like, as opposed to a description of the furniture. `give` of a
`kind: 'kept'` item plays its `memory` field in that box automatically, so
picking one up says what it is a memory of rather than only toasting its name.

Scripts live in `js/data/script_*.js` under `PW.scripts.<name>`. Room entities
usually hold `talk` as a function returning one of those arrays (evaluated at
interaction time so it can read flags) — `PW.resolveScript` peels functions until
an array falls out.

### Rooms — `js/data/rooms.js`

`walk` is a union of floor rectangles, `block` punches furniture out of it, and
an entity's `x` is its **centre** while `y` is the line its feet stand on (box =
`x - w/2, y - h, w, h`). Doors carry `kind: 'door'` and `to: [roomId, spawnId]`;
`need`/`blocked` gate them; `visibleIf` hides entities.

A room's `bg` is usually an asset name but may be a **function of the story** —
read it through `PW.roomBg(room)`, never `room.bg` directly. The hall is the one
room that uses this: it loses two doors at chapter 4 and three more at chapter 5,
because the narration says so out loud and the painting has to agree.
`tools/hall.py` paints those states out of `bg_hub.jpg` by cloning wallpaper, and
holds the measured door rectangles.

Roaming `foes` are not decoration. They mooch around their own patch until the
player comes within `SIGHT`, stop dead for a beat with a `!` over them, and then
give chase at `CHASE`. The player is faster, so a chase is always escapable —
being caught is the price of walking past something, not of sharing a room with
it. The constants are at the top of `js/scenes/field.js`.

`waking: true` marks the three rooms June is awake in — her bedroom, the
landing, Wren Street. They draw no follow-trail: awake, she walks alone. Wick is
a lamp with moth wings and cannot stand on a real street, and Dell being real is
already said by Dell *being there*, as an NPC, rather than trailing her out of a
dream. A script can still stage anyone deliberately with `show`/`move`; the flag
only suppresses the automatic conga line.

The room art was generated, not drawn to a plan, so every box was measured
against its painting — **verify changes with `python3 tools/boxes.py <room>` and
look at the image**, don't guess coordinates. `smoke.js` independently asserts
every door leads to a real room+spawn, every spawn stands on a floor, and every
interactive object is actually reachable.

Interaction (`FieldScene.nearest`) is judged from where the player stands, not a
probe point in front of them: anything within `REACH` (96px) whose direction
clears `AIM` (~70°) is a candidate and the most squarely-faced wins. Standing
inside a box counts from any direction.

### Moods, battle, endings

`js/data/moods.js` is the whole game in one file: TENDER beats FRAYED beats
DISTANT beats TENDER, STEADY is neutral. `mult()` gives 1.5/0.7/1. `shift()`
encodes the rule that pushing someone toward a *different* feeling only cools the
one they are in first (pass `force` to skip that) — most balance bugs live here.

`js/scenes/battle.js` (the largest file) is the turn engine: menus, resolve
queue, damage, and **HOLD**, which settles an enemy that defines `soothe:
{turns, drop, text}` instead of killing it. Settling increments
`soothed_count`; putting a kept thing down increments `put_down`; those two plus
`soothed_the_house` are all `PW.pickEnding()` (`js/scenes/ending.js`) looks at.
Enemy/troop tables are in `js/data/enemies.js`; troops name enemies + a backdrop.

All settling goes through `BattleScene.settle(target, amount)`, and **how far one
hold gets you depends on the target's mood** — double for TENDER, and a FRAYED
thing spends most of the hold calming down instead. That is what connects HOLD to
the rest of the game: the way to settle a difficult thing is to work on its mood
first. A skill can push settling directly with `settle: n` (June's *Keep*), and
Wick's *Say Their Name* exists to force a target TENDER so a hold lands properly.
A fight only counts as `soothed` if **every** foe settled, so mixing a kill into
a settle silently costs the ending.

### Items — `js/data/items.js`

`kind: 'pocket'` supplies are unlimited; `kind: 'kept'` memories are capped by
`PW.state.keptMax`. `PW.items.give()` returns `true`, `'full'`, or false — the
`'full'` path runs `PW.keptFullPrompt()`, which makes the player permanently
choose what to set down. Don't quietly drop a kept item — spend one with
`PW.items.consume()`, never `take()`, because `consume` refuses to spend a
memory. Using a thing is not putting it down: only the deliberate put-down
removes a kept item and increments `put_down`, which the ending reads.

Items work **outside a fight** too. Moods, buffs and binding only mean anything
in battle, so out there an item counts only if it mends, gives breath back, or
gets somebody up — `usableOutside()` decides, `wouldHelp()` says who it would
actually do something for (so the menu can refuse to waste one on a party at
full health), and `useOutside()` applies it to the saved actor records. The
pockets tab uses this; the kept tab offers *use it* / *put it down* when a
memory could do both. All of it runs on `PW.party.rec()`/`stats()`, not on
battle combatants, so nothing there may reach for `mood`, `buffs` or `alive`.

### Audio — `js/engine/audio.js`

Entirely synthesised: eight instruments from oscillators/envelopes, twelve songs
as note data in `js/data/music.js` played by a look-ahead scheduler, ~22 SFX in
the `SFX` table. There are no audio files. A single `setTension(0..1)` knob
darkens the whole music bus. Web Audio can only start after a user gesture, which
is why `main.js` gates `PW.audio.init()` behind the "click to begin" button.

### Images — `js/engine/assets.js`

The `MANIFEST` array (plus the generated `por_*`, `spr_*`, `en_*`, `ui_*` names)
is the authoritative list of art the game loads; adding art means adding a
manifest entry and matching the naming convention. `PW.assets.img()` always
returns something drawable — a labelled placeholder if the file is missing — and
`smoke.js` fails if a playthrough ever requests one.

## Debugging

The browser console exposes `PWdebug` (defined in `js/main.js`):

```js
PWdebug.room('garden', 'start')  PWdebug.battle('boss_lily')  PWdebug.join('hal')
PWdebug.give('musicbox')         PWdebug.chapter(5)           PWdebug.ending('keep_going')
PWdebug.walkboxes()              PWdebug.state()
```

## Prose

Dialogue, item descriptions and comments are part of the work, not filler — the
existing register is dry, concrete, understated, and never explains the theme to
the player. Match it when adding text.
