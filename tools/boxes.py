#!/usr/bin/env python3
"""PAPERWEIGHT — draw a room's interaction boxes over its art.

The boxes in js/data/rooms.js are typed in by hand against paintings that were
generated, not drawn to a plan, so the only way to know whether "the shelf" is
where the shelf is is to look. This renders each room at 2x with a labelled
coordinate grid, the walkable floor, the blocked furniture and every entity box,
so a mismatch is obvious at a glance.

    python3 tools/boxes.py            # every room -> shots/boxes/
    python3 tools/boxes.py bedroom    # just one

Entity boxes follow the game's own convention: x is the centre, y is the
*bottom* edge, so the box is (x - w/2, y - h, w, h).
"""
import json
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'shots', 'boxes')
W, H = 960, 540
K = 2                      # render scale, so the labels are legible

GRID = (110, 110, 130)
GRID_MAJOR = (240, 240, 255)
WALK = (80, 255, 140)
BLOCK = (255, 80, 80)
ENT = (120, 180, 255)
DOOR = (255, 200, 90)
SPAWN = (255, 120, 240)


def rooms():
    """Ask node for the room table — it is JS, and it has functions in it."""
    js = r"""
    global.PW = { flag: function () { return false; }, state: { chapter: 9 },
                  party: { has: function () { return false; } }, scripts: {} };
    PW.scripts = new Proxy({}, { get: function () { return []; } });
    require('%s');
    var out = {};
    for (var k in PW.rooms) {
      var r = PW.rooms[k];
      out[k] = {
        name: r.name, bg: r.bg, walk: r.walk, block: r.block,
        spawns: r.spawns || {},
        entities: r.entities.map(function (e) {
          return { id: e.id, x: e.x, y: e.y, w: e.w, h: e.h,
                   kind: e.kind || null, label: e.label || null,
                   sprite: e.sprite || null };
        })
      };
    }
    process.stdout.write(JSON.stringify(out));
    """ % os.path.join(ROOT, 'js', 'data', 'rooms.js')
    p = subprocess.run(['node', '-e', js], capture_output=True, text=True)
    if p.returncode:
        sys.exit('could not read rooms.js:\n' + p.stderr)
    return json.loads(p.stdout)


def grid(d):
    for x in range(0, W + 1, 60):
        major = x % 120 == 0
        d.line([(x * K, 0), (x * K, H * K)], fill=GRID_MAJOR if major else GRID, width=1)
        if major:
            d.text((x * K + 3, 3), str(x), fill=GRID_MAJOR)
    for y in range(0, H + 1, 60):
        major = y % 120 == 0
        d.line([(0, y * K), (W * K, y * K)], fill=GRID_MAJOR if major else GRID, width=1)
        if major:
            d.text((3, y * K + 3), str(y), fill=GRID_MAJOR)


def label(d, x, y, s, fill):
    """Text with a dark plate under it, so it reads over any painting."""
    box = d.textbbox((x, y), s)
    d.rectangle([box[0] - 2, box[1] - 1, box[2] + 2, box[3] + 1], fill=(10, 8, 18))
    d.text((x, y), s, fill=fill)


def render(rid, r):
    bg = os.path.join(ROOT, 'assets', 'bg', r['bg'] + '.jpg')
    if os.path.exists(bg):
        img = Image.open(bg).convert('RGB').resize((W * K, H * K), Image.LANCZOS)
    else:
        img = Image.new('RGB', (W * K, H * K), (30, 26, 44))
    d = ImageDraw.Draw(img)
    grid(d)

    for b in r['walk']:
        d.rectangle([b[0] * K, b[1] * K, (b[0] + b[2]) * K, (b[1] + b[3]) * K],
                    outline=WALK, width=3)
    for b in r['block']:
        d.rectangle([b[0] * K, b[1] * K, (b[0] + b[2]) * K, (b[1] + b[3]) * K],
                    outline=BLOCK, width=3)

    for name, s in r['spawns'].items():
        d.ellipse([s['x'] * K - 7, s['y'] * K - 7, s['x'] * K + 7, s['y'] * K + 7],
                  outline=SPAWN, width=3)
        label(d, s['x'] * K + 10, s['y'] * K - 6, name, SPAWN)

    for e in r['entities']:
        col = DOOR if e['kind'] == 'door' else ENT
        x0, y0 = (e['x'] - e['w'] / 2) * K, (e['y'] - e['h']) * K
        x1, y1 = x0 + e['w'] * K, y0 + e['h'] * K
        d.rectangle([x0, y0, x1, y1], outline=col, width=3)
        # a tick at the anchor point, which is the middle of the bottom edge
        d.line([(e['x'] * K - 6, e['y'] * K), (e['x'] * K + 6, e['y'] * K)], fill=col, width=3)
        label(d, x0 + 4, y0 + 4, e['id'], col)

    label(d, 8, H * K - 20, '%s  (%s)' % (rid, r['name']), (255, 255, 255))
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, rid + '.png')
    img.save(path)
    return path


def main():
    want = sys.argv[1:]
    R = rooms()
    for rid, r in R.items():
        if want and rid not in want:
            continue
        print(render(rid, r))


if __name__ == '__main__':
    main()
