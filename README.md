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
| X / Esc / C / Shift | two-finger tap | back — and, out in a room, your pockets |
| F | button, bottom right | fullscreen |
| M | — | sound on/off |

On touch, a drag is a thumbstick that follows your finger rather than a fixed
pad: hold it to keep walking, flick it to nudge a menu cursor one step. You can
also just **tap the thing you want** — a menu option, a save slot, a tab, or the
creature you mean to hit — and it is chosen outright, with no swiping to it
first. Tapping past a menu does nothing rather than confirming whatever happened
to be highlighted. The on-screen help changes to match whichever you are using.

**Back and pocket are one button.** Out in a room there is nothing to go back
to, so it opens your pockets; in a menu there is nowhere further in, so it
closes them. Two ways of saying the same thing was only ever a way to press the
wrong one — and on a phone it meant the easiest gesture you have did nothing at
all for most of the game.

The game saves to three slots in `localStorage`, and writes automatically at
each chapter break and whenever you sit down on the rug in the Hall of Doors.

**To save anywhere else, write it out to a file.** The *save* tab in your pocket
does it wherever you happen to be standing — mid-attic, mid-hall, one room from
somewhere you would rather not be — and hands you a file to keep. It is the only
save you make yourself, and the only one that survives a browser deciding to
clear its storage. Read one back in from the title screen, from the same tab, or
by dropping the file anywhere on the window.

The file is the save, exactly as a slot holds it, so all of the above applies to
it too: it will still load in a build that has not been written yet.

**A save is meant to keep working.** Somebody is always mid-playthrough, so a
save written by any version loads in any other, in both directions — a newer
build fills in whatever an older save has not heard of, and never writes
anything that would confuse an older one. Nothing gets invalidated by an
update, and there is no "your save is from an old version" screen, because
there is not going to be one.

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

**Together.** A meter in the corner fills as you get hurt and as you hold things.
Hitting well barely touches it; holding somebody fills it faster than anything
else in the game. When it is full, June — and only June — can spend it: everyone
strikes at once, for the sum of what all of them could do alone, and afterwards
everyone is a little mended, a little braced and a little calmer. The game does
not explain this one either. The word just goes gold.

**The pouch.** Supplies are unlimited. *Kept things* — a paper crown, a spool of
red thread, a music box that stops one note early — are not: you can carry four,
then five. When you find something worth keeping and your hands are full, the
game makes you choose, and putting a thing down is permanent.

You do not have to be in a fight to open it. Anything that mends, gives breath
back or gets somebody up off the floor works from the pause menu too, so a bad
fight is not a walk back to the last save. It will not let you spend one on
somebody who does not need it. Using a memory never costs you the memory —
only putting it down does that, and the game asks first.

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
assets/bg/            12 room paintings      ─┐ JPEG: opaque, so no
assets/battlebg/       5 fight backdrops     ─┘ alpha channel to keep
assets/chars/         36 portraits and sprites  ─┐
assets/enemies/       11 things in the house     ├ PNG, 255 colours
assets/ui/            21 items, icons, panels   ─┘
```

85 images, 7.7 MB — 3.9 of paintings and 3.8 of cut-outs.

**Rendering** is a single canvas. The game draws in a fixed 960×540, but that
is a coordinate system, not a resolution: the canvas is backed by as many real
device pixels as the display has (up to 3×), so the text, panels and bars come
out at the screen's own sharpness instead of being blown up from 960 wide. The
paintings ship at 1536×864, which is what the model actually drew, cropped to
the screen's shape and no further.

There is no pixel art: backgrounds are full-frame paintings, characters are
cut-out sprites that scale with their y position so the far end of a room reads
as further away, and every panel and every letter of UI text is drawn with a
small, *stable* per-glyph wobble so it looks hand-lettered rather than typeset.

**Interaction** is judged from where the player is standing, not from a probe
point in front of them: anything within arm's reach that lies in the direction
they face is a candidate, and whichever they face most squarely wins. The rooms
were painted rather than laid out to a plan, so every interaction box was
measured against its picture — `python3 tools/boxes.py` draws the boxes, the
walkable floor and the spawn points back over the art so a mismatch is obvious
at a glance.

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

**Tappable things** are declared, not laid out. A menu calls `PW.ui.region()`
for each option while it draws; the list becomes live for the next frame, and a
tap is matched against it. That is one frame stale — invisible to a player — and
it means the menus stay plain drawing code with no layout pass and no retained
widget tree. Three lines in a menu's update turn "confirm the highlighted row"
into "go to the row you touched, and ignore touches that miss".

**Cutscenes** are arrays of `[op, ...args]` interpreted by `PW.Script` —
`say`, `narrate`, `choice`, `battle`, `goroom`, `give`, `flag`, and so on — which
is why the story files read as prose with brackets round it.

### The art

Every image was generated with GPT Image 2 through the Codex CLI plugin and then
processed locally:

```
python3 tools/gen.py                 # 38 generations, 6 concurrent codex sessions
python3 tools/process.py             # -> the 85 images the game loads
python3 tools/process.py --lossless  # -> assets/_lossless/, the archival copy
python3 tools/hall.py                # repaint the hall with doors taken out
```

`hall.py` is the odd one out: it works off the shipped `assets/` rather than the
masters, because the two worn states of the Hall of Doors are edits of the
finished painting — it clones wallpaper over doors the narration has just said
are gone. `--check` writes before-and-after proofs into `shots/hall/`.

`tools/manifest.py` holds the prompts. Character sheets and item sets are
generated as labelled grids on flat magenta; `process.py` finds the white divider
lines, slices the cells, keys out the magenta (sampling the actual border colour
rather than trusting `#FF00FF`), de-spills the fringe so nothing keeps a purple
halo, trims and rescales. Backgrounds are cover-fitted to the screen.

Room art is opaque so it ships as JPEG; anything with an alpha channel is a
255-colour PNG, which on this soft-pencil artwork is visually identical and
several times smaller than the full-quality version. That is what keeps the whole
set to under 8 MB — small enough that the game loads off a phone's connection in
one go, and small enough to keep in a repository without apologising for it. The
originals are kept: `assets/_raw/` holds the untouched generations and
`assets/_lossless/` holds full-quality PNGs of every finished asset, and both
derived sets rebuild from `_raw` with one command.

Nothing here is traced, sampled or copied from another game. If an image is
missing the game still runs — `PW.assets` hands back a labelled placeholder.

### The tests

```
node tools/smoke.js           # 59 checks: data sanity + a full playthrough
node tools/smoke.js --verbose # ...printing every line of dialogue
node tools/paths.js           # 66 checks: endings, skills, items, save compatibility
node tools/gestures.js        # 26 checks: the gesture layer, real touch events, no browser
node tools/touch.js           # 34 checks: gestures and taps, through real touch events
node tools/shots.js           # 18 real frames out of headless Chrome
python3 tools/boxes.py        # every room's boxes drawn over its painting
```

`smoke.js` loads every source file into a fake DOM and drives the real scenes
frame by frame with scripted input: it starts a new game, takes the paperweight,
falls asleep, fights the tutorial, recruits all three friends, beats or settles
four bosses, swaps a memory out of a full pouch, and reaches the credits — then
asserts nothing threw and no artwork was missing. It also proves every door leads
somewhere real, every spawn point stands on a floor, every interactive object can
actually be reached, nothing lurks on top of a doorway, and every note in every
song lands in the audible range.

`paths.js` covers what a single playthrough cannot: all three endings, every
skill cast, every item used, the mood triangle in both directions, a party
wipe, and **save compatibility** — that a save is still plain JSON, that play
never invents a field the template does not declare, and that a save missing
today's fields entirely still loads and picks up whatever has been added since.
It does the same for a save written out to a file: that what comes out is the
slot blob and nothing else, that it reaches the browser as a download carrying
the run it came from, that reading one back in lands her in the right room, and
that anything which is not a save is refused rather than half-loaded.
It also checks the quieter rules: that a jar of jam mends somebody out in the
world and refuses to be spent on a party that does not need it, that using a
memory never destroys it, and that nobody from the dream follows June when she
is awake.

`gestures.js` needs no browser at all: it fires real touchstart/move/end
sequences at the handlers the input layer registered and reads the true input
state. It exists for a class of bug no still-fingered test could catch. A
gesture is now decided the moment the second finger lands, so the checks are
all the ways a real hand fails to be tidy: a hand that rolls, a finger that
wandered first, fingers that lift raggedly, a third finger arriving late, and
the browser cancelling the whole thing halfway through. None of them can lose
the tap any more. It also sends real keystrokes, to hold the other half of that
fix in place: X, Esc, C and Shift all have to press the same key, and Z still
has to be its own.

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
