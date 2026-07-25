# PAPERWEIGHT

*a small game about the things we hold onto*

A hand-drawn JRPG about a twelve-year-old called June, her grandmother's glass
paperweight, and a dream-house that has started taking the names off its own
rooms.

Open `index.html` in a browser. That is the whole installation.

```
./play.sh          # or just double-click index.html
```

No build step, no server, no dependencies, no network. Every picture is an image
file in `assets/`; every note of music and every sound effect is synthesised in
the browser at runtime.

---

## Playing

| keyboard | touch | does |
| --- | --- | --- |
| arrow keys / WASD | drag anywhere | walk |
| Z / Enter / Space | tap | talk, confirm |
| X / Esc | two-finger tap | back, cancel |
| C / Shift | three-finger tap | open your pockets |
| F | button, bottom right | fullscreen |
| M | — | sound on/off |

On touch, a drag is a thumbstick that follows your finger rather than a fixed
pad: hold it to keep walking, flick it to nudge a menu cursor one step. The
on-screen help changes to match whichever you are using.

The game saves to three slots in `localStorage`, and writes automatically at
each chapter break and whenever you sit down on the rug in the Hall of Doors.

---

## What it is

Five chapters, about ninety minutes, three endings.

**The Mood triangle.** Everyone in a fight — you included — is in one of four
states, and they are not good or bad, only costly in different directions.

```
        TENDER ──beats──▶ FRAYED ──beats──▶ DISTANT
           ▲                                   │
           └───────────────beats───────────────┘
```

- **Tender** — open. Heals and gives far more, takes more damage.
- **Frayed** — sharp. Hits much harder, misses more, hard to heal.
- **Distant** — shut. Very hard to hurt, very hard to help.
- **Steady** — none of the above. No edge, no cost.

Gentleness gets through to someone angry. Anger gets through to someone who has
gone quiet. Going quiet defeats someone trying to be kind at you. That triangle
is the combat maths and it is also the argument of the game.

Moods do not flip on a coin: if someone is already deep in a feeling, pushing a
*different* one only cools them down first. You have to bring a person back
before you can bring them somewhere else.

**HOLD.** Every fight can be won by hitting things. Some can instead be ended by
holding whatever is in front of you until it settles — a Dustling takes one
turn, the house at the end takes six. The game never tells you which creatures
will allow it, and never says you should. It just keeps count.

**The pouch.** Supplies are unlimited. *Kept things* — a paper crown, a spool of
red thread, a music box that stops one note early — are not: you can carry four,
then five. When you find something worth keeping and your hands are full, the
game makes you choose, and putting a thing down is permanent.

**The endings** come out of all of that, not out of a question at the end:

- **HELD ON** — you fought your way through and kept everything.
- **SET DOWN** — you settled most of the house instead of destroying it.
- **KEEP GOING** — you held the house *and* let something go.

---

## Chapters

1. **The Shelf** — a bedroom, a rainstorm, and something that will not stop
   catching the light.
2. **The Kitchen That Hums** — Dell, a jar of jam, and a stove that has been
   kept lit for four months with nobody cooking on it.
3. **The Drowned Garden** — Hal, a spool of red thread, and a face made of water
   that says your name slightly wrong.
4. **The Attic of Names** — three boxes, several hundred blank luggage tags, and
   the thing that has been rubbing the labels off.
5. **The Room at the End of the Hall** — the door June has been walking past for
   four months.

---

## How it is built

Plain ES5 in the global `PW` namespace, no modules, so it runs off `file://`.

```
index.html            script tags, in load order
css/style.css         the page around the canvas
js/engine/            util · input · assets · draw · audio · save · game
js/data/              music · moods · items · actors · enemies · rooms · script_*
js/scenes/            scene (dialogue + cutscene runner) · title · field
                      battle · pocket · ending
tools/                the asset pipeline and the tests
assets/_raw/          the untouched GPT Image 2 output (masters)
assets/_lossless/     full-quality PNGs of every finished asset
assets/               83 images (15 JPEG rooms, 68 PNG cut-outs) — 4.6 MB
```

**Rendering** is a single 960×540 canvas scaled to fit the window. There is no
pixel art: backgrounds are full-frame paintings, characters are cut-out sprites
that scale with their y position so the far end of a room reads as further away,
and every panel and every letter of UI text is drawn with a small, *stable*
per-glyph wobble so it looks hand-lettered rather than typeset.

**Audio** is entirely synthesised. Eight instruments (felt piano, music box,
pad, breathy voice, sub bass, pluck, brushed percussion, drone) are built from
oscillators and envelopes; twelve pieces are written as note data in
`js/data/music.js` and played by a look-ahead scheduler. The whole music bus runs
through a tape-wobble delay, a low-pass and a generated convolution reverb, and a
single `tension` knob darkens all of it when the game wants you uncomfortable.
Twenty-two sound effects are built the same way. There are no audio files.

**Input** is one layer. Touch gestures synthesise the same virtual keys the
keyboard produces, so not one scene knows or cares which is in use — dragging
past a dead zone presses a direction, letting go releases it, and menu
auto-repeat therefore behaves identically either way.

**Cutscenes** are arrays of `[op, ...args]` interpreted by `PW.Script` —
`say`, `narrate`, `choice`, `battle`, `goroom`, `give`, `flag`, and so on — which
is why the story files read as prose with brackets round it.

### The art

Every image was generated with GPT Image 2 through the Codex CLI plugin and then
processed locally:

```
python3 tools/gen.py                 # 38 generations, 6 concurrent codex sessions
python3 tools/process.py             # -> the 83 images the game loads
python3 tools/process.py --lossless  # -> assets/_lossless/, the archival copy
```

`tools/manifest.py` holds the prompts. Character sheets and item sets are
generated as labelled grids on flat magenta; `process.py` finds the white divider
lines, slices the cells, keys out the magenta (sampling the actual border colour
rather than trusting `#FF00FF`), de-spills the fringe so nothing keeps a purple
halo, trims and rescales. Backgrounds are cover-fitted to the screen.

Room art is opaque so it ships as JPEG; anything with an alpha channel is a
255-colour PNG, which on this soft-pencil artwork is visually identical and four
times smaller. That takes the game from 26 MB to 4.6 MB. The originals are kept:
`assets/_raw/` holds the untouched generations and `assets/_lossless/` holds
full-quality PNGs of every finished asset, and both derived sets rebuild from
`_raw` with one command.

Nothing here is traced, sampled or copied from another game. If an image is
missing the game still runs — `PW.assets` hands back a labelled placeholder.

### The tests

```
node tools/smoke.js           # 58 checks: data sanity + a full playthrough
node tools/smoke.js --verbose # ...printing every line of dialogue
node tools/paths.js           # 24 checks: endings, every skill, every item
node tools/touch.js           # 20 checks: gestures, through real touch events
node tools/shots.js           # 18 real frames out of headless Chrome
```

`smoke.js` loads every source file into a fake DOM and drives the real scenes
frame by frame with scripted input: it starts a new game, takes the paperweight,
falls asleep, fights the tutorial, recruits all three friends, beats or settles
four bosses, swaps a memory out of a full pouch, and reaches the credits — then
asserts nothing threw and no artwork was missing. It also proves every door leads
somewhere real, every spawn point stands on a floor, every interactive object can
actually be reached, nothing lurks on top of a doorway, and every note in every
song lands in the audible range.

`touch.js` turns on Chrome's touch emulation and sends genuine
touchstart/move/end sequences: it taps with one, two and three fingers, flicks
a menu cursor, holds a drag and checks the party actually walked, checks a
diagonal holds both axes, and checks a tap on the fullscreen button reaches the
DOM instead of being eaten as a gesture.

`shots.js` drives an actual browser over the DevTools protocol and writes
`shots/*.png` from the live canvas — the check a fake DOM cannot make.

### Poking at it

The browser console has `PWdebug`:

```js
PWdebug.room('garden', 'start')   // go anywhere
PWdebug.battle('boss_lily')       // fight anything
PWdebug.join('hal')               // recruit anyone
PWdebug.give('musicbox')          // hand yourself anything
PWdebug.chapter(5)                // unlock the doors
PWdebug.ending('keep_going')      // see any ending
PWdebug.walkboxes()               // draw the collision boxes
```

---

## Influences, and what is not borrowed

It owes its shape to OMORI, its willingness to let you not fight to UNDERTALE,
its quiet domestic horror to Ib and Re:Kinder, and its interest in what a
protagonist is carrying to End Roll. None of its art, music, text, characters,
mechanics or code come from any of them. The Mood triangle, HOLD, the kept-thing
pouch, the house that forgets its own rooms, and everyone in it are original to
this game.
