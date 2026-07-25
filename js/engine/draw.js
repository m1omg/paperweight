/* PAPERWEIGHT — drawing helpers that give the UI its hand-made look. */
'use strict';

PW.draw = (function () {
  var U = PW.util;

  var FONT = "'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Comic Neue', " +
             "'Trebuchet MS', system-ui, sans-serif";

  var INK = '#3a3050';
  var PAPER = '#f6eddc';

  function font(size, weight) {
    return (weight ? weight + ' ' : '') + Math.round(size) + 'px ' + FONT;
  }

  /* ------------------------------------------------------------ text ---- */

  /* Draws a string one glyph at a time with a tiny, *stable* offset per glyph
     so it reads as hand-lettered rather than typeset. The offset is derived
     from the character position, so it never jitters between frames. */
  function letter(ctx, str, x, y, wob, seed) {
    str = String(str);
    var cx = x;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var w = ctx.measureText(ch).width;
      if (ch !== ' ') {
        var h1 = U.hash(seed + i * 37);
        var h2 = U.hash(seed + i * 91 + 7);
        ctx.fillText(ch, cx + (h1 - 0.5) * wob, y + (h2 - 0.5) * wob);
      }
      cx += w;
    }
    return cx - x;
  }

  function text(ctx, str, x, y, o) {
    o = o || {};
    var size = o.size || 20;
    ctx.save();
    ctx.font = font(size, o.weight);
    ctx.textBaseline = o.baseline || 'top';
    var w = ctx.measureText(String(str)).width;
    var ax = x;
    if (o.align === 'center') ax = x - w / 2;
    else if (o.align === 'right') ax = x - w;

    var wob = o.wobble === undefined ? 0.9 : o.wobble;
    var seed = (o.seed || 0) + Math.round(ax) * 3 + Math.round(y) * 11;

    if (o.shadow !== false) {
      ctx.fillStyle = o.shadowColor || 'rgba(20,16,32,.45)';
      letter(ctx, str, ax + (o.shadowOff || 2), y + (o.shadowOff || 2), wob, seed);
    }
    if (o.glow) {
      ctx.shadowColor = o.glow;
      ctx.shadowBlur = o.glowBlur || 16;
    }
    ctx.fillStyle = o.color || INK;
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    letter(ctx, str, ax, y, wob, seed);
    ctx.restore();
    return w;
  }

  function measure(ctx, str, size, weight) {
    ctx.save();
    ctx.font = font(size, weight);
    var w = ctx.measureText(String(str)).width;
    ctx.restore();
    return w;
  }

  /** Word-wrapped block. Returns the height used. */
  function textBlock(ctx, str, x, y, maxW, o) {
    o = o || {};
    var size = o.size || 20;
    var lh = o.lineHeight || size * 1.45;
    ctx.save();
    ctx.font = font(size, o.weight);
    var lines = U.wrap(ctx, str, maxW);
    ctx.restore();
    for (var i = 0; i < lines.length; i++) {
      text(ctx, lines[i], x, y + i * lh, o);
    }
    return lines.length * lh;
  }

  /* ----------------------------------------------------------- panels --- */

  /* A rounded rectangle whose corners and edges are nudged by a stable hash,
     so every panel looks like it was drawn by an unsteady hand. */
  function wobblyPath(ctx, x, y, w, h, r, amp, seed) {
    r = Math.min(r, w / 2, h / 2);
    var pts = [];
    var steps = 5;                      // samples along each edge
    function edge(x0, y0, x1, y1) {
      for (var i = 0; i < steps; i++) {
        var t = i / steps;
        var hx = U.hash(seed + pts.length * 53) - 0.5;
        var hy = U.hash(seed + pts.length * 97 + 3) - 0.5;
        pts.push([x0 + (x1 - x0) * t + hx * amp, y0 + (y1 - y0) * t + hy * amp]);
      }
    }
    edge(x + r, y, x + w - r, y);
    edge(x + w, y + r, x + w, y + h - r);
    edge(x + w - r, y + h, x + r, y + h);
    edge(x, y + h - r, x, y + r);

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  }

  function panel(ctx, x, y, w, h, o) {
    o = o || {};
    var seed = o.seed !== undefined ? o.seed : (x * 7 + y * 13 + w * 3 + h);
    ctx.save();
    if (o.shadow !== false) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000';
      wobblyPath(ctx, x + 4, y + 5, w, h, o.radius || 14, 2, seed);
      ctx.filter = 'blur(2px)';
      ctx.fill();
      ctx.restore();
    }
    wobblyPath(ctx, x, y, w, h, o.radius || 14, o.amp === undefined ? 2 : o.amp, seed);
    ctx.fillStyle = o.fill || PAPER;
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    ctx.fill();
    if (o.stroke !== false) {
      ctx.lineWidth = o.lineWidth || 3;
      ctx.strokeStyle = o.stroke || INK;
      ctx.stroke();
      // A second, offset pass sells the "gone over it twice with a pen" look.
      ctx.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * 0.4;
      wobblyPath(ctx, x + 1, y + 1, w - 1, h - 1, o.radius || 14, 2.4, seed + 999);
      ctx.lineWidth = (o.lineWidth || 3) * 0.6;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------- sprites --- */

  /** Draw an image anchored at bottom-centre, scaled about its own size. */
  function sprite(ctx, img, x, y, scale, o) {
    o = o || {};
    if (!img) return;
    var w = img.width * scale, h = img.height * scale;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    if (o.tint) {
      ctx.shadowColor = o.tint;
      ctx.shadowBlur = o.tintBlur || 20;
    }
    ctx.drawImage(img, -w / 2 + (o.dx || 0), -h + (o.dy || 0), w, h);
    ctx.restore();
  }

  /** Scale factor that makes an image fit inside a w×h box. */
  function fitScale(img, w, h) {
    if (!img) return 1;
    return Math.min(w / img.width, h / img.height);
  }

  /** Draw an image covering the whole screen, cropping the overflow. */
  function cover(ctx, img, w, h) {
    if (!img) return;
    var s = Math.max(w / img.width, h / img.height);
    var dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  /* ------------------------------------------------------------ bars ---- */

  function bar(ctx, x, y, w, h, frac, o) {
    o = o || {};
    frac = U.clamp(frac, 0, 1);
    ctx.save();
    ctx.fillStyle = o.back || 'rgba(40,32,58,.75)';
    roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    if (o.ghost !== undefined && o.ghost > frac) {
      ctx.fillStyle = o.ghostColor || 'rgba(230,120,120,.55)';
      roundRect(ctx, x, y, w * U.clamp(o.ghost, 0, 1), h, h / 2); ctx.fill();
    }
    if (frac > 0) {
      ctx.fillStyle = o.fill || '#e6b45a';
      roundRect(ctx, x, y, Math.max(h * 0.6, w * frac), h, h / 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      roundRect(ctx, x + 1, y + 1, Math.max(h * 0.6, w * frac) - 2, h * 0.4, h * 0.2); ctx.fill();
    }
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = o.stroke || 'rgba(28,22,42,.8)';
    roundRect(ctx, x, y, w, h, h / 2); ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ----------------------------------------------------------- effects -- */

  function vignette(ctx, w, h, strength, color) {
    var g = ctx.createRadialGradient(w / 2, h / 2, h * 0.30, w / 2, h / 2, h * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, color || 'rgba(10,8,20,' + (strength === undefined ? 0.62 : strength) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function fill(ctx, color, alpha, w, h) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = U.clamp(alpha, 0, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w || PW.W, h || PW.H);
    ctx.restore();
  }

  /* A drifting field of dust motes — used in most dream rooms. */
  function Dust(count, o) {
    o = o || {};
    this.p = [];
    for (var i = 0; i < count; i++) {
      this.p.push({
        x: Math.random() * PW.W,
        y: Math.random() * PW.H,
        r: U.rand(o.minR || 1, o.maxR || 2.6),
        s: U.rand(0.25, 0.85),
        drift: U.rand(-9, 9),
        ph: Math.random() * 6.28,
        a: U.rand(0.15, 0.5)
      });
    }
    this.color = o.color || 'rgba(250,238,205,';
    this.t = 0;
  }
  Dust.prototype.update = function (dt) {
    this.t += dt;
    for (var i = 0; i < this.p.length; i++) {
      var m = this.p[i];
      m.y -= m.s * 14 * dt;
      m.x += Math.sin(this.t * 0.5 + m.ph) * m.drift * dt;
      if (m.y < -6) { m.y = PW.H + 6; m.x = Math.random() * PW.W; }
    }
  };
  Dust.prototype.draw = function (ctx) {
    ctx.save();
    for (var i = 0; i < this.p.length; i++) {
      var m = this.p[i];
      var a = m.a * (0.6 + 0.4 * Math.sin(this.t * 1.5 + m.ph));
      ctx.fillStyle = this.color + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  };

  return {
    FONT: FONT, INK: INK, PAPER: PAPER,
    font: font, text: text, textBlock: textBlock, measure: measure,
    panel: panel, wobblyPath: wobblyPath,
    sprite: sprite, fitScale: fitScale, cover: cover,
    bar: bar, roundRect: roundRect,
    vignette: vignette, fill: fill, Dust: Dust
  };
})();
