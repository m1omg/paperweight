#!/usr/bin/env python3
"""Take doors out of the Hall of Doors.

The house is losing rooms, and the hall is where the player is supposed to
notice. Chapter four says two of the doors have gone and the wallpaper where
they were is completely smooth; chapter five says the hall is emptier still.
The hall is a painting, so the doors have to be painted out, and this is what
does it:

    python3 tools/hall.py            # write both worn states
    python3 tools/hall.py --check    # ...and before/after proofs into shots/hall/

A door is covered by cloning wallpaper from somewhere else on the same rows.
Taking it from the same rows means the vertical run of the stripes and the
perspective of the wall arrive already correct, and only the sideways fall of
the lamplight has to be fixed. That is done by finding the nearest genuinely
clean wall on each side of the patch and leaning the clone's colour between the
two, per channel, so the cream-and-pink stripes stay cream and pink.

Which wall counts as clean is measured, not guessed. A column of wallpaper is
pale and barely changes from one row to the next; a column crossing a door is
darker, and full of planks, hinges and frame shadow. Neither test alone is
enough — door panels are vertical planks and so are quiet down a column, and
the lit end of the hall is brighter than the wallpaper in the corners — but
together they separate wall from door reliably.

Every rectangle below is in bg_hub.jpg pixels, and was measured against the
painting rather than reasoned about: the room art was generated, not drawn to
a plan, so guessing does not work here. The game is drawn at 960x540 into a
1536x864 painting, so image = game * 1.6 exactly, and any box in
js/data/rooms.js converts straight across.

Reads assets/bg/bg_hub.jpg; writes bg_hub_worn.jpg and bg_hub_bare.jpg beside it.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BG = os.path.join(ROOT, "assets", "bg")
QUALITY = 84                     # matches BG_QUALITY in tools/process.py

# The back wall, corner to corner, floor to ceiling. The side walls are left
# alone: they run away from the viewer hard enough that a cloned strip cannot
# follow the perspective, and all three of the doors that still go somewhere
# are on them.
WALL = (440, 100, 1140, 402)

# Doors on the back wall the story still needs, so never paint over these and
# never clone out of them.
KEEP = [
    (700, 258, 834, 404),        # door_final — her door, at the end of the hall
]

# Chapter four: two doors go. This pair, because they stand one above the other
# in the flattest, most evenly lit stretch of the wall, so losing them reads as
# a bite taken out of the hall rather than as two unrelated accidents.
WORN = [
    (818, 216, 888, 320),        # the pink one
    (826, 320, 886, 400),        # the mustard one beneath it
]

# Chapter five: three more, up along the same stretch, so the emptiness spreads
# from where it started rather than breaking out at random.
BARE = WORN + [
    (749, 177, 819, 255),        # the maroon one
    (821, 209, 875, 263),        # the red one beside it
    (893, 209, 939, 255),        # the little barred window
]


# --------------------------------------------------------------- measuring --

def column_stats(img, y0, y1):
    """Per column of the wall: how quiet it is, and how light it is."""
    px = img.convert("L").load()
    out = {}
    for x in range(WALL[0], WALL[2]):
        grad = lum = 0
        for y in range(y0, y1):
            lum += px[x, y]
            if y < y1 - 1:
                grad += abs(px[x, y + 1] - px[x, y])
        n = float(max(1, y1 - y0))
        out[x] = (grad / max(1.0, n - 1), lum / n)
    return out


def clean_runs(stats, xlo, xhi, thr, floor, avoid, minw=6):
    """Runs of quiet, pale columns in [xlo, xhi) that miss everything in `avoid`."""
    runs, cur = [], None
    for x in range(xlo, xhi):
        s = stats.get(x)
        blocked = any(a0 <= x < a1 for a0, a1 in avoid)
        if s and s[0] < thr and s[1] >= floor and not blocked:
            cur = [x, x + 1] if cur is None else [cur[0], x + 1]
        else:
            if cur and cur[1] - cur[0] >= minw:
                runs.append(tuple(cur))
            cur = None
    if cur and cur[1] - cur[0] >= minw:
        runs.append(tuple(cur))
    return runs


def steps(stats):
    """Thresholds to try, loosest last: quietness paired with a lightness floor.

    The floor is a percentile of this band's own columns rather than a fixed
    number, because the far end of the hall is lit and the corners are not, and
    a number that finds the wallpaper under a lantern finds none beside one.
    """
    lums = sorted(s[1] for s in stats.values())

    def pct(p):
        return lums[min(len(lums) - 1, int(len(lums) * p))]

    return [(3.5, pct(0.72)), (4.5, pct(0.66)), (6.0, pct(0.58)),
            (9.0, pct(0.50)), (14.0, pct(0.40))]


def pick_source(stats, box, avoid, xlo, xhi):
    """The widest run of clean wall on these rows, preferring one near the door."""
    x0, _, x1, _ = box
    mid = (x0 + x1) / 2.0
    for thr, floor in steps(stats):
        runs = clean_runs(stats, xlo, xhi, thr, floor, avoid)
        if not runs:
            continue
        # Wide enough not to repeat obviously, then as close as it can be.
        runs.sort(key=lambda r: (-min(r[1] - r[0], 26),
                                 abs((r[0] + r[1]) / 2.0 - mid)))
        return runs[0]
    return None


def reference(img, stats, box, avoid, side, xlo, xhi):
    """Mean colour of the nearest clean wallpaper on one side of the door."""
    x0, y0, x1, y1 = box
    lo, hi = (xlo, x0) if side == "left" else (x1, xhi)
    edge = x0 if side == "left" else x1
    for thr, floor in steps(stats):
        runs = clean_runs(stats, lo, hi, thr, floor, avoid, minw=4)
        if not runs:
            continue
        run = min(runs, key=lambda r: abs((r[0] + r[1]) / 2.0 - edge))
        strip = img.crop((run[0], y0, run[1], y1))
        n = float(strip.width * strip.height)
        px = list(strip.getdata())
        return tuple(sum(c[i] for c in px) / n for i in range(3))
    return None


# ---------------------------------------------------------------- painting --

def clone_patch(img, box, src):
    """A wallpaper patch the size of `box`, cloned off the column run `src`."""
    x0, y0, x1, y1 = box
    strip = img.crop((src[0], y0, src[1], y1))
    mirror = strip.transpose(Image.FLIP_LEFT_RIGHT)

    patch = Image.new("RGB", (x1 - x0, y1 - y0))
    x, n = 0, 0
    while x < patch.width:
        # Alternate the strip with its own mirror so the stripes carry on
        # without the eye finding where the repeat starts.
        patch.paste(mirror if n % 2 else strip, (x, 0))
        x += strip.width
        n += 1
    return patch


def relight(patch, left, right):
    """Lean the patch between two wall colours, per channel, across its width.

    The hall is lit by lanterns hung down its length, so the wall either side
    of a door is not the same colour. The clone comes from one place only and
    would otherwise arrive at one edge visibly wrong.
    """
    if left is None and right is None:
        return patch
    left = left if left is not None else right
    right = right if right is not None else left

    w, h = patch.size
    px = list(patch.getdata())
    mean = [sum(p[i] for p in px) / float(len(px)) for i in range(3)]
    if min(mean) < 1:
        return patch

    # Per-column, per-channel multiplier, held near 1 so the grain survives.
    ramps = []
    for i in range(3):
        ramps.append([
            max(0.75, min(1.35,
                          (left[i] + (right[i] - left[i]) * (x / float(max(1, w - 1))))
                          / mean[i]))
            for x in range(w)
        ])

    out = []
    for j, (r, g, b) in enumerate(px):
        x = j % w
        out.append((min(255, int(r * ramps[0][x] + 0.5)),
                    min(255, int(g * ramps[1][x] + 0.5)),
                    min(255, int(b * ramps[2][x] + 0.5))))
    patch = patch.copy()
    patch.putdata(out)
    return patch


BAND = 34        # rows of wall solved at a time
OVERLAP = 10     # rows of cross-fade between one band and the next


def bands(y0, y1):
    """Row ranges covering y0..y1, each overlapping the one before."""
    out, y = [], y0
    while True:
        ye = min(y + BAND, y1)
        out.append((y, ye))
        if ye >= y1:
            return out
        y += BAND - OVERLAP


def make_patch(src_img, box, avoid, xlo, xhi):
    """Wallpaper the size of `box`, solved one horizontal band at a time.

    Solving the whole height at once does not work: a column that is wallpaper
    for most of a tall door's height and some other door's arch for the rest
    still averages out as clean, and drags that arch across with it. Judging a
    band at a time means every strip of the patch is cloned from wall that is
    genuinely wall at exactly those rows, and it lets the light be matched up
    the wall as well as across it.
    """
    x0, y0, x1, y1 = box
    patch = Image.new("RGB", (x1 - x0, y1 - y0))
    first = True

    for by0, by1 in bands(y0, y1):
        bbox = (x0, by0, x1, by1)
        stats = column_stats(src_img, by0, by1)
        src = pick_source(stats, bbox, avoid, xlo, xhi)
        if src is None:
            return None
        band = relight(
            clone_patch(src_img, bbox, src),
            reference(src_img, stats, bbox, avoid, "left", xlo, xhi),
            reference(src_img, stats, bbox, avoid, "right", xlo, xhi))

        if first:
            patch.paste(band, (0, by0 - y0))
            first = False
            continue
        # Fade each band in over the tail of the one above, so bands cloned
        # from different parts of the wall meet without a line.
        mask = Image.new("L", band.size, 255)
        ramp = ImageDraw.Draw(mask)
        for i in range(min(OVERLAP, band.size[1])):
            ramp.line([(0, i), (band.size[0], i)],
                      fill=int(255.0 * (i + 1) / (OVERLAP + 1)))
        patch.paste(band, (0, by0 - y0), mask)

    return patch


def smooth_over(out, src_img, box, avoid, feather=4):
    """Paint one door out of `out`, reading always from the untouched original."""
    patch = make_patch(src_img, box, avoid, WALL[0], WALL[2])
    if patch is None:
        return False

    w, h = patch.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rectangle(
        (feather, feather, w - 1 - feather, h - 1 - feather), fill=255)
    # Painted wallpaper, not printed: a hard join reads as a mistake.
    mask = mask.filter(ImageFilter.GaussianBlur(feather * 0.9))

    out.paste(patch, (box[0], box[1]), mask)
    return True


# ------------------------------------------------------------------ states --

def build(doors, out_name):
    src_img = Image.open(os.path.join(BG, "bg_hub.jpg")).convert("RGB")
    # Never clone out of a door — one being removed, or one that is staying.
    avoid = [(b[0] - 6, b[2] + 6) for b in doors] + \
            [(k[0] - 6, k[2] + 6) for k in KEEP]

    out = src_img.copy()
    done = sum(1 for box in doors if smooth_over(out, src_img, box, avoid))

    path = os.path.join(BG, out_name)
    out.save(path, quality=QUALITY, optimize=True, progressive=True)
    print("wrote %s  (%d doors painted out)" % (path, done))
    return out


def main():
    states = [(WORN, "bg_hub_worn.jpg"), (BARE, "bg_hub_bare.jpg")]
    made = [(name, build(doors, name)) for doors, name in states]

    if "--check" in sys.argv:
        out_dir = os.path.join(ROOT, "shots", "hall")
        os.makedirs(out_dir, exist_ok=True)
        base = Image.open(os.path.join(BG, "bg_hub.jpg")).convert("RGB")
        for name, im in made:
            proof = Image.new("RGB", (base.width, base.height * 2))
            proof.paste(base, (0, 0))
            proof.paste(im, (0, base.height))
            proof.save(os.path.join(out_dir, name.replace(".jpg", ".png")))
        print("proofs in %s" % out_dir)


if __name__ == "__main__":
    main()
