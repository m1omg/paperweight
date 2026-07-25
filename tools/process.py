#!/usr/bin/env python3
"""Turn the raw GPT Image 2 output in assets/_raw/ into game-ready art.

  * backgrounds  -> cover-cropped to the 960x540 screen
  * grid sheets  -> white dividers detected, cells sliced out, magenta keyed
  * cutouts      -> magenta keyed, trimmed, scaled to fit

The magenta key samples the actual border colour of each image rather than
trusting a hard-coded #FF00FF, because the model gets close but not always
exact. Fringe pixels are de-spilled so nothing keeps a purple halo.

The shipped art is compressed: opaque room art becomes JPEG, everything with an
alpha channel becomes a 255-colour PNG. Pass --lossless to write full-quality
PNGs of everything into assets/_lossless/ instead, as an archival copy.

Usage:  python3 tools/process.py [name ...] [--lossless]
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "assets", "_raw")
sys.path.insert(0, HERE)
from manifest import ASSETS, BY_NAME  # noqa: E402

SCREEN = (960, 540)

# Room art is opaque and painterly, so JPEG costs nothing visible and saves ~6x.
# Everything with an alpha channel stays PNG, quantised to 255 colours — on this
# kind of soft-pencil artwork the difference is invisible and the files are ~4x
# smaller. Both matter: the game loads 85 images before it can start.
BG_QUALITY = 88
PNG_COLOURS = 255

# where each family of asset ends up, and how big it may be
OUT = {
    "bg": ("bg", None),
    "bb": ("battlebg", None),
    "por": ("chars", 384),
    "spr": ("chars", 330),
    "en": ("enemies", 660),
    "ui": ("ui", 300),
}
UI_SIZE = {"ui_items": 132, "ui_moods": 132, "ui_paperweight": 420}


LOSSLESS = False          # set by --lossless


def out_dir(name):
    sub = OUT.get(name.split("_")[0], ("ui", 300))[0]
    base = os.path.join(ROOT, "assets", "_lossless") if LOSSLESS \
        else os.path.join(ROOT, "assets")
    d = os.path.join(base, sub)
    os.makedirs(d, exist_ok=True)
    return d


def max_side(name):
    if name in UI_SIZE:
        return UI_SIZE[name]
    return OUT.get(name.split("_")[0], ("ui", 300))[1]


# --------------------------------------------------------------- keying ----

def sample_key(rgb):
    """Median colour of a ring just inside the border."""
    h, w, _ = rgb.shape
    b = max(2, min(h, w) // 60)
    ring = np.concatenate([
        rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3),
        rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3),
    ])
    key = np.median(ring, axis=0)
    # Only trust it if it actually looks like magenta (R and B high, G low).
    if not (key[0] > 150 and key[2] > 150 and key[1] < 110):
        key = np.array([255.0, 0.0, 255.0])
    return key


def chroma_key(img, t0=62.0, t1=132.0):
    """RGB image -> RGBA with the magenta backdrop removed and de-spilled."""
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)
    key = sample_key(rgb)

    d = np.sqrt(((rgb - key) ** 2).sum(axis=2))
    a = np.clip((d - t0) / (t1 - t0), 0.0, 1.0)

    # De-spill only the soft fringe: pull the magenta cast out of edge pixels
    # without touching legitimately pink artwork in the interior.
    fringe = (a > 0.0) & (a < 1.0)
    if fringe.any():
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        m = (r + b) * 0.5
        excess = np.clip(m - g, 0, None)
        k = np.where(fringe, np.clip(excess / 70.0, 0, 1) * 0.75, 0.0)
        rgb[..., 0] = r - excess * k
        rgb[..., 2] = b - excess * k

    out = np.dstack([np.clip(rgb, 0, 255), a * 255.0]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def autocrop(img, pad=2, thresh=8):
    a = np.asarray(img)[..., 3]
    ys, xs = np.where(a > thresh)
    if len(xs) == 0:
        return img
    x0, x1 = max(0, xs.min() - pad), min(img.width, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(img.height, ys.max() + 1 + pad)
    return img.crop((x0, y0, x1, y1))


# ---------------------------------------------------------------- grids ----

def whiteness(rgb, axis):
    """Per-row (axis=1) or per-column (axis=0) fraction of near-white pixels."""
    near = (rgb > 214).all(axis=2)
    return near.mean(axis=1 - axis)


def find_cuts(rgb, n, axis):
    """Locate the n-1 white divider lines. Returns [(start, end), ...] spans."""
    size = rgb.shape[1] if axis == 0 else rgb.shape[0]
    w = whiteness(rgb, axis)
    spans = []
    win = int(size * 0.09)
    for i in range(1, n):
        centre = int(round(size * i / n))
        lo, hi = max(0, centre - win), min(size - 1, centre + win)
        seg = w[lo:hi + 1]
        j = int(np.argmax(seg)) + lo
        if w[j] < 0.45:                       # no visible divider — cut blind
            spans.append((centre, centre))
            continue
        a = b = j
        while a > lo and w[a - 1] > 0.30:
            a -= 1
        while b < hi and w[b + 1] > 0.30:
            b += 1
        spans.append((a, b + 1))
    return spans


def slice_grid(img, rows, cols):
    rgb = np.asarray(img.convert("RGB"))
    vcuts = find_cuts(rgb, cols, 0)
    hcuts = find_cuts(rgb, rows, 1)

    x_start = [0] + [c[1] for c in vcuts]
    x_end = [c[0] for c in vcuts] + [img.width]
    y_start = [0] + [c[1] for c in hcuts]
    y_end = [c[0] for c in hcuts] + [img.height]

    inset = max(2, int(min(img.width, img.height) * 0.006))
    cells = []
    for r in range(rows):
        for c in range(cols):
            box = (x_start[c] + inset, y_start[r] + inset,
                   max(x_start[c] + inset + 1, x_end[c] - inset),
                   max(y_start[r] + inset + 1, y_end[r] - inset))
            cells.append(img.crop(box))
    return cells


# ---------------------------------------------------------------- resize ---

def cover(img, size):
    tw, th = size
    s = max(tw / img.width, th / img.height)
    nw, nh = max(tw, int(round(img.width * s))), max(th, int(round(img.height * s)))
    img = img.resize((nw, nh), Image.LANCZOS)
    x, y = (nw - tw) // 2, (nh - th) // 2
    return img.crop((x, y, x + tw, y + th))


def save_flat(img, path):
    """Opaque artwork -> JPEG (or full PNG in the archival pass)."""
    img = img.convert("RGB")
    if LOSSLESS:
        img.save(path, optimize=True)
    else:
        img.save(path, quality=BG_QUALITY, optimize=True, progressive=True)


def save_cut(img, path):
    """Artwork with alpha -> palette PNG (or full RGBA in the archival pass)."""
    if LOSSLESS:
        img.save(path, optimize=True)
    else:
        img.quantize(colors=PNG_COLOURS, method=Image.Quantize.FASTOCTREE) \
           .save(path, optimize=True)


def limit(img, m):
    if not m:
        return img
    s = min(1.0, m / max(img.width, img.height))
    if s >= 1.0:
        return img
    return img.resize((max(1, int(img.width * s)), max(1, int(img.height * s))),
                      Image.LANCZOS)


# ----------------------------------------------------------------- main ----

def process(spec):
    name, kind = spec["name"], spec["kind"]
    src = os.path.join(RAW, name + ".png")
    if not os.path.exists(src):
        return f"  MISSING {name}"
    img = Image.open(src)
    d = out_dir(name)

    if kind == "bg":
        out = os.path.join(d, name + (".png" if LOSSLESS else ".jpg"))
        save_flat(cover(img.convert("RGB"), SCREEN), out)
        return f"  {os.path.basename(out)} -> {SCREEN[0]}x{SCREEN[1]}  " \
               f"{os.path.getsize(out) // 1024}k"

    if kind == "sheet":
        rows, cols = spec["rows"], spec["cols"]
        cells = slice_grid(img, rows, cols)
        m = max_side(name)
        sizes = []
        total = 0
        for i, cell in enumerate(cells):
            c = limit(autocrop(chroma_key(cell)), m)
            out = os.path.join(d, f"{name}_{i}.png")
            save_cut(c, out)
            total += os.path.getsize(out)
            sizes.append(f"{c.width}x{c.height}")
        return f"  {name} -> {len(cells)} cells [{', '.join(sizes)}]  {total // 1024}k"

    # cutout / ui
    c = limit(autocrop(chroma_key(img)), max_side(name))
    out = os.path.join(d, name + ".png")
    save_cut(c, out)
    return f"  {name} -> {c.width}x{c.height}  {os.path.getsize(out) // 1024}k"


def main():
    global LOSSLESS
    LOSSLESS = "--lossless" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    todo = [BY_NAME[a] for a in args] if args else ASSETS
    print(f"Processing {len(todo)} asset(s)" +
          (" -> assets/_lossless/ (archival)" if LOSSLESS else "") + "...")
    missing = 0
    for spec in todo:
        line = process(spec)
        if "MISSING" in line:
            missing += 1
        print(line, flush=True)
    print(f"\nDone. {missing} raw file(s) missing.")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
