/* QG do Abner — motor isométrico em pixel (inspirado nos hotéis pixelados) */
(function () {
  'use strict';
  const TW = 64, TH = 32, WALL = 118;
  const W = (window.World = {});

  function iso(x, y, z) { return [(x - y) * TW / 2, (x + y) * TH / 2 - (z || 0)]; }
  function hexRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(v => v + v).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  function shade(hex, amt) {
    if (hex.startsWith('rgb')) return hex;
    let [r, g, b] = hexRgb(hex);
    if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  W.shade = shade; W.iso = iso;

  const OUT = 'rgba(12,14,22,.6)';
  function poly(ctx, pts, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function box(ctx, x, y, z, w, d, h, col, o) {
    o = o || {};
    const top = [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
    const left = [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
    const right = [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)];
    poly(ctx, left, o.left || shade(col, -0.1), o.noLine ? null : OUT);
    poly(ctx, right, o.right || shade(col, -0.3), o.noLine ? null : OUT);
    poly(ctx, top, o.top || shade(col, 0.16), o.noLine ? null : OUT);
  }
  // quad on the "left" face plane (y = const), spanning x a..b
  function faceY(ctx, y, a, b, z0, z1, fill, stroke) { poly(ctx, [iso(a, y, z0), iso(b, y, z0), iso(b, y, z1), iso(a, y, z1)], fill, stroke); }
  // quad on the "right" face plane (x = const), spanning y a..b
  function faceX(ctx, x, a, b, z0, z1, fill, stroke) { poly(ctx, [iso(x, a, z0), iso(x, b, z0), iso(x, b, z1), iso(x, a, z1)], fill, stroke); }
  function ell(ctx, cx, cy, rx, ry, fill, stroke) {
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  // wall quad: side 'L' => plane x=0 spanning y a..b ; side 'R' => plane y=0 spanning x a..b
  function wq(side, a, b, z0, z1) {
    return side === 'L'
      ? [iso(0, a, z0), iso(0, b, z0), iso(0, b, z1), iso(0, a, z1)]
      : [iso(a, 0, z0), iso(b, 0, z0), iso(b, 0, z1), iso(a, 0, z1)];
  }
  function wallText(ctx, side, a, b, z, text, font, color) {
    ctx.save();
    const mid = (a + b) / 2;
    const p = side === 'L' ? iso(0, mid, z) : iso(mid, 0, z);
    ctx.translate(p[0], p[1]);
    ctx.transform(1, side === 'L' ? -0.5 : 0.5, 0, 1, 0, 0);
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  /* ---------------- SPRITES ---------------- */
  const SW = 26, SH = 40, PAD = 1;
  const spriteCache = new Map();
  function makeSprite(L, frame, back) {
    const key = L.id + '|' + frame + '|' + (back ? 1 : 0);
    if (spriteCache.has(key)) return spriteCache.get(key);
    const c = document.createElement('canvas');
    c.width = SW + PAD * 2; c.height = SH + PAD * 2;
    const g = c.getContext('2d');
    const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x + PAD, y + PAD, w, h); };
    const C = (x, y, w, h) => g.clearRect(x + PAD, y + PAD, w, h);
    const sk = L.skin, skD = shade(sk, -0.18);
    const hair = L.hair, hairD = shade(hair, -0.3), hairH = L.hairHi || shade(hair, 0.28);
    const shirt = L.shirt, shirtD = shade(shirt, -0.18);
    const pants = L.pants || '#2E3A55', shoes = L.shoes || '#1d1d22';
    const dark = '#1b1618';
    const hs = L.hairStyle;

    // back layer for long hair
    if (hs === 'cacheado') {
      P(4, 6, 18, 22, hair);
      for (let y = 8; y < 28; y += 2) { P(y % 4 ? 3 : 4, y, 1, 1, hair); P(y % 4 ? 22 : 21, y, 1, 1, hair); }
      P(5, 28, 3, 1, hair); P(10, 28, 2, 1, hair); P(14, 28, 2, 1, hair); P(18, 28, 3, 1, hair);
      for (let y = 9; y < 28; y += 3) { [5, 8, 17, 20].forEach((x, i) => P(x + ((y + i) % 2), y, 1, 2, hairH)); }
    } else if (hs === 'medio' || (hs === 'rabo' && back)) {
      P(6, 7, 14, back ? 16 : 13, hair);
    }

    // legs
    const lOff = frame === 1 ? -1 : 0, rOff = frame === 2 ? -1 : 0;
    P(9, 29, 4, 7 + lOff, pants); P(13, 29, 4, 7 + rOff, shade(pants, -0.12));
    P(9, 36 + lOff, 4, 2, shoes); P(13, 36 + rOff, 4, 2, shoes);
    if (L.saia) { P(8, 28, 10, 4, L.saia); }

    // torso & arms
    const aL = frame === 1 ? 1 : 0, aR = frame === 2 ? 1 : 0;
    if (L.coat) {
      P(8, 20, 10, 11, L.coat); P(16, 20, 2, 11, shade(L.coat, -0.12));
      if (!back) { P(12, 20, 2, 10, shirt); P(11, 21, 1, 7, shade(L.coat, -0.2)); P(14, 21, 1, 7, shade(L.coat, -0.2)); }
      P(6, 20 + aL, 2, 7, L.coat); P(18, 20 + aR, 2, 7, shade(L.coat, -0.12));
    } else {
      P(8, 20, 10, 9, shirt); P(16, 20, 2, 9, shirtD);
      if (L.stripe) P(8, 24, 10, 1, L.stripe);
      P(6, 20 + aL, 2, 5, shirt); P(18, 20 + aR, 2, 5, shirtD);
    }
    P(6, 25 + aL + (L.coat ? 2 : 0), 2, 3, sk); P(18, 25 + aR + (L.coat ? 2 : 0), 2, 3, skD);
    if (!back) {
      P(11, 20, 4, 1, skD);
      if (L.tie) { P(12, 21, 2, 6, L.tie); }
      if (L.necklace) { P(10, 21, 1, 1, L.necklace); P(11, 22, 4, 1, L.necklace); P(15, 21, 1, 1, L.necklace); }
    }
    // neck
    P(11, 18, 4, 2, skD);

    // head
    P(7, 7, 12, 12, sk); C(7, 7, 1, 1); C(18, 7, 1, 1); C(7, 18, 1, 1); C(18, 18, 1, 1);
    P(17, 9, 1, 9, shade(sk, -0.08));
    P(6, 11, 1, 3, sk); P(19, 11, 1, 3, skD);

    if (!back) {
      // rosto
      const brow = L.brow || hairD;
      if (L.sweet) { P(9, 9, 2, 1, brow); P(15, 9, 2, 1, brow); }
      else { P(9, 10, 3, 1, brow); P(14, 10, 3, 1, brow); }
      if (L.sweet) {
        P(9, 11, 2, 3, dark); P(15, 11, 2, 3, dark);
        P(10, 11, 1, 1, '#ffffff'); P(16, 11, 1, 1, '#ffffff');
        P(8, 11, 1, 1, dark); P(17, 11, 1, 1, dark);
      } else {
        P(9, 12, 2, 2, '#ffffff'); P(10, 12, 1, 2, dark);
        P(15, 12, 2, 2, '#ffffff'); P(16, 12, 1, 2, dark);
      }
      P(12, 14, 2, 1, skD);
      if (L.blush) { P(8, 15, 2, 1, L.blush); P(16, 15, 2, 1, L.blush); }
      if (L.beard) {
        const bd = L.beard;
        P(7, 15, 1, 3, bd); P(18, 15, 1, 3, bd);
        P(8, 16, 1, 2, bd); P(17, 16, 1, 2, bd);
        P(8, 17, 10, 2, bd); C(7, 18, 1, 1); C(18, 18, 1, 1);
        P(10, 15, 2, 1, bd); P(14, 15, 2, 1, bd);
      }
      if (L.smile === 'teeth') { P(11, 16, 4, 1, '#ffffff'); P(10, 16, 1, 1, L.beard || dark); P(15, 16, 1, 1, L.beard || dark); P(12, 15, 2, 1, L.beard || skD); }
      else if (L.lip && L.sweet) { P(10, 15, 1, 1, L.lip); P(15, 15, 1, 1, L.lip); P(11, 16, 1, 1, L.lip); P(14, 16, 1, 1, L.lip); P(12, 16, 2, 1, '#ffffff'); }
      else if (L.lip) { P(11, 16, 4, 1, shade(L.lip, -0.15)); P(10, 15, 1, 1, L.lip); P(15, 15, 1, 1, L.lip); }
      else { P(11, 16, 4, 1, '#7a3434'); P(10, 15, 1, 1, '#7a3434'); P(15, 15, 1, 1, '#7a3434'); }
      if (L.glasses) {
        const gc = L.glasses;
        P(8, 11, 4, 1, gc); P(8, 14, 4, 1, gc); P(8, 11, 1, 4, gc); P(11, 11, 1, 4, gc);
        P(14, 11, 4, 1, gc); P(14, 14, 4, 1, gc); P(14, 11, 1, 4, gc); P(17, 11, 1, 4, gc);
        P(12, 12, 2, 1, gc); P(7, 12, 1, 1, gc); P(18, 12, 1, 1, gc);
      }
    }

    // hair front layer
    if (hs === 'curto' || hs === 'baguncado') {
      P(8, 4, 10, 2, hair); P(7, 5, 12, 4, hair); C(7, 5, 1, 1); C(18, 5, 1, 1);
      P(7, 9, 1, 3, hair); P(18, 9, 1, 3, hair);
      if (!back) { P(8, 9, 3, 1, hair); P(13, 9, 3, 1, hair); P(11, 9, 1, 1, hairD); }
      P(9, 5, 4, 1, hairH); P(14, 6, 2, 1, hairH);
      if (hs === 'baguncado') { P(8, 2, 2, 2, hair); P(12, 1, 2, 3, hair); P(16, 2, 2, 2, hair); }
      if (back) P(7, 9, 12, 8, hair);
    } else if (hs === 'cacheado') {
      P(6, 4, 14, 4, hair); P(5, 5, 16, 3, hair); P(7, 3, 12, 1, hair);
      P(8, 3, 3, 1, hairH); P(14, 4, 3, 1, hairH);
      if (!back) {
        P(7, 7, 3, 2, hair); P(16, 7, 3, 2, hair); P(10, 7, 6, 1, hair); P(8, 7, 1, 1, hairH);
        P(5, 8, 2, 12, hair); P(19, 8, 2, 12, hair); P(7, 9, 1, 2, hair); P(18, 9, 1, 2, hair);
        P(5, 11, 1, 3, hairH); P(20, 13, 1, 3, hairH);
        P(4, 19, 4, 10, hair); P(18, 19, 4, 10, hair);
        P(5, 21, 1, 2, hairH); P(19, 23, 1, 2, hairH); P(6, 26, 1, 2, hairH); P(20, 20, 1, 2, hairH);
        P(4, 29, 2, 1, hair); P(20, 29, 2, 1, hair);
        if (L.earrings) { P(6, 16, 1, 2, L.earrings); P(19, 16, 1, 2, L.earrings); }
      } else { P(6, 7, 14, 14, hair); }
    } else if (hs === 'coque') {
      P(7, 5, 12, 4, hair); P(10, 1, 6, 4, hair); P(11, 1, 2, 1, hairH); C(7, 5, 1, 1); C(18, 5, 1, 1);
      P(7, 9, 1, 4, hair); P(18, 9, 1, 4, hair); P(9, 5, 3, 1, hairH);
      if (back) P(7, 9, 12, 7, hair);
    } else if (hs === 'black') {
      P(6, 1, 14, 3, hair); P(5, 3, 16, 6, hair); P(5, 9, 3, 5, hair); P(18, 9, 3, 5, hair);
      P(8, 2, 3, 1, hairH); P(13, 3, 2, 1, hairH); P(6, 6, 1, 1, hairH);
      if (back) P(6, 9, 14, 8, hair);
    } else if (hs === 'rabo' || hs === 'medio') {
      P(7, 4, 12, 5, hair); C(7, 4, 1, 1); C(18, 4, 1, 1); P(9, 4, 4, 1, hairH);
      if (!back) { P(7, 9, 2, hs === 'medio' ? 11 : 5, hair); P(17, 9, 2, hs === 'medio' ? 11 : 5, hair); P(9, 9, 2, 1, hair); }
      else P(7, 9, 12, 9, hair);
      if (hs === 'rabo' && back) { P(11, 18, 4, 6, hair); }
    } else if (hs === 'careca') {
      P(7, 9, 1, 3, hair); P(18, 9, 1, 3, hair); P(10, 7, 4, 1, shade(sk, 0.2));
    } else if (hs === 'bone') {
      P(7, 4, 12, 5, L.cap || '#c33'); P(9, 4, 4, 1, shade(L.cap || '#c33', 0.3));
      if (!back) P(5, 8, 14, 1, shade(L.cap || '#c33', -0.25));
      P(7, 9, 1, 3, hair); P(18, 9, 1, 3, hair);
      if (back) P(7, 9, 12, 7, hair);
    }

    // outline pass
    const im = g.getImageData(0, 0, c.width, c.height), d = im.data, w = c.width, h = c.height;
    const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[(y * w + x) * 4 + 3];
    const mark = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (a(x, y) === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) mark.push((y * w + x) * 4);
    }
    mark.forEach(i => { d[i] = 22; d[i + 1] = 20; d[i + 2] = 30; d[i + 3] = 235; });
    g.putImageData(im, 0, 0);
    spriteCache.set(key, c);
    return c;
  }
  W.makeSprite = makeSprite;

  /* Portrait helper: draws a sprite big into a given canvas */
  W.drawPortrait = function (canvas, look, scale) {
    const s = makeSprite(look, 0, false);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sc = scale || Math.floor(Math.min(canvas.width / s.width, canvas.height / s.height));
    ctx.drawImage(s, (canvas.width - s.width * sc) / 2, (canvas.height - s.height * sc) / 2, s.width * sc, s.height * sc);
  };

  /* ---------------- FURNITURE ---------------- */
  const WOOD = '#9A6A42';
  const F = {};
  F.tapete = { flat: true, draw(ctx, f) {
    const c = f.color || '#A83A3A';
    poly(ctx, [iso(f.x, f.y), iso(f.x + f.w, f.y), iso(f.x + f.w, f.y + f.d), iso(f.x, f.y + f.d)], f.border || shade(c, 0.35));
    poly(ctx, [iso(f.x + .15, f.y + .15), iso(f.x + f.w - .15, f.y + .15), iso(f.x + f.w - .15, f.y + f.d - .15), iso(f.x + .15, f.y + f.d - .15)], c);
    if (f.text) {
      ctx.save(); const p = iso(f.x + f.w / 2, f.y + f.d / 2); ctx.translate(p[0], p[1]);
      ctx.transform(1, 0.5, -1, 0.5, 0, 0);
      ctx.font = '700 16px "Pixelify Sans", monospace'; ctx.fillStyle = f.textColor || '#F2C94C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.text, 0, 0); ctx.restore();
    }
  } };
  F.mesa = { draw(ctx, f) {
    const c = f.color || WOOD, w = f.w, d = f.d;
    [[.05, .05], [w - .13, .05], [.05, d - .13], [w - .13, d - .13]].forEach(([a, b]) => box(ctx, f.x + a, f.y + b, 0, .08, .08, 22, shade(c, -.2)));
    box(ctx, f.x, f.y, 22, w, d, 5, c);
    if (f.pc) {
      box(ctx, f.x + .2, f.y + .25, 27, .5, .5, 2, '#30343c');
      box(ctx, f.x + .18, f.y + .15, 29, .1, .7, 26, '#22262d');
      faceX(ctx, f.x + .28, f.y + .2, f.y + .8, 33, 52, f.screen || '#7fd8ff', OUT);
      faceX(ctx, f.x + .28, f.y + .3, f.y + .6, 46, 49, 'rgba(255,255,255,.55)');
    }
    if (f.papel) { box(ctx, f.x + .5, f.y + .2, 27, .35, .45, 2, '#f4f1ea'); }
    if (f.caneca) { box(ctx, f.x + .65, f.y + .7, 27, .12, .12, 8, '#d9534f'); }
  } };
  F.carteira = { draw(ctx, f) {
    box(ctx, f.x + .2, f.y + .05, 0, .6, .5, 20, '#7a7f87', {});
    box(ctx, f.x + .1, f.y + .02, 20, .8, .56, 4, '#C69463');
    box(ctx, f.x + .25, f.y + .62, 0, .5, .32, 13, '#3E6E9C');
    box(ctx, f.x + .25, f.y + .9, 13, .5, .06, 16, '#3E6E9C');
    box(ctx, f.x + .3, f.y + .12, 24, .32, .26, 2, '#f4f1ea');
  } };
  F.cadeira = { draw(ctx, f) {
    const c = f.color || '#3E6E9C';
    box(ctx, f.x + .25, f.y + .25, 0, .5, .5, 14, c);
    box(ctx, f.x + .25, f.y + .25, 14, .08, .5, 20, c);
  } };
  F.estante = { draw(ctx, f) {
    const c = f.color || WOOD, cols = ['#C0392B', '#2E86C1', '#F1C40F', '#27AE60', '#8E44AD', '#E67E22', '#ECF0F1'];
    if (f.r === 'L') {
      box(ctx, f.x, f.y, 0, .35, f.d, 96, c);
      [8, 38, 68].forEach((s, si) => { for (let i = 0; i < 6; i++) faceX(ctx, f.x + .35, f.y + .08 + i * f.d * .145, f.y + .08 + i * f.d * .145 + f.d * .11, s, s + 20 + (i % 3) * 2, cols[(i + si * 2) % cols.length], OUT); });
    } else {
      box(ctx, f.x, f.y, 0, f.w, .35, 96, c);
      [8, 38, 68].forEach((s, si) => { for (let i = 0; i < 6; i++) faceY(ctx, f.y + .35, f.x + .08 + i * f.w * .145, f.x + .08 + i * f.w * .145 + f.w * .11, s, s + 20 + (i % 3) * 2, cols[(i + si * 3) % cols.length], OUT); });
    }
  } };
  F.planta = { draw(ctx, f, t) {
    box(ctx, f.x + .3, f.y + .3, 0, .4, .4, 16, f.vaso || '#B4563A');
    const p = iso(f.x + .5, f.y + .5, 16);
    const sw = Math.sin((t || 0) / 900 + f.x) * 1.2;
    ell(ctx, p[0] - 7 + sw, p[1] - 14, 10, 12, '#2E8B57', OUT);
    ell(ctx, p[0] + 7 + sw, p[1] - 16, 10, 12, '#3AA36A', OUT);
    ell(ctx, p[0] + sw, p[1] - 28, 11, 12, '#46B978', OUT);
    ell(ctx, p[0] - 3 + sw, p[1] - 30, 3, 3, '#7FDDA4');
  } };
  F.sofa = { draw(ctx, f) {
    const c = f.color || '#C0504D', w = f.w;
    box(ctx, f.x, f.y + .1, 0, w, .9, 15, c);
    box(ctx, f.x, f.y, 0, w, .25, 38, shade(c, -.05));
    box(ctx, f.x, f.y + .1, 0, .18, .9, 24, c);
    box(ctx, f.x + w - .18, f.y + .1, 0, .18, .9, 24, c);
    box(ctx, f.x + .3, f.y + .28, 15, .45, .2, 14, shade(c, .3));
    if (w > 1.5) box(ctx, f.x + w - .75, f.y + .28, 15, .45, .2, 14, shade(c, .3));
  } };
  F.cama = { draw(ctx, f) {
    const c = f.color || '#5B6BB5';
    box(ctx, f.x + .05, f.y, 0, .9, 2, 12, WOOD);
    box(ctx, f.x + .05, f.y, 0, .9, .12, 44, WOOD);
    box(ctx, f.x + .09, f.y + .12, 12, .82, 1.84, 7, '#F2F2F2');
    box(ctx, f.x + .09, f.y + .75, 13, .82, 1.21, 8, c);
    box(ctx, f.x + .16, f.y + .18, 19, .68, .42, 6, '#FFFFFF');
  } };
  F.abajur = { draw(ctx, f, t, W2) {
    box(ctx, f.x + .3, f.y + .3, 0, .4, .4, 26, WOOD);
    const p = iso(f.x + .5, f.y + .5, 26);
    box(ctx, f.x + .45, f.y + .45, 26, .1, .1, 12, '#444');
    poly(ctx, [[p[0] - 12, p[1] - 12], [p[0] + 12, p[1] - 12], [p[0] + 8, p[1] - 30], [p[0] - 8, p[1] - 30]], f.lit === false ? '#8a7a55' : '#F6D36B', OUT);
  } };
  F.tribuna = { draw(ctx, f) {
    box(ctx, f.x + .15, f.y + .2, 0, .7, .6, 36, '#6B4A2E');
    box(ctx, f.x + .1, f.y + .15, 36, .8, .7, 4, '#8B623F');
    faceY(ctx, f.y + .8, f.x + .3, f.x + .7, 12, 26, '#E8C35A', OUT);
  } };
  F.bancada = { draw(ctx, f) {
    box(ctx, f.x, f.y, 0, f.w, f.d, 28, '#E6EBEF');
    box(ctx, f.x, f.y, 28, f.w, f.d, 3, '#2E3440');
    // béqueres
    const cols = ['#6FD3FF', '#F06292', '#B2FF59'];
    for (let i = 0; i < 3; i++) {
      box(ctx, f.x + .25 + i * .55, f.y + .3, 31, .16, .16, 14, 'rgba(220,240,255,.75)');
      box(ctx, f.x + .25 + i * .55, f.y + .3, 31, .16, .16, 7, cols[i]);
    }
    if (f.micro) {
      const x = f.x + f.w - .55, y = f.y + .25;
      box(ctx, x, y, 31, .35, .4, 4, '#ECEFF1');
      box(ctx, x + .05, y + .05, 35, .1, .12, 26, '#455A64');
      box(ctx, x + .05, y + .05, 58, .3, .12, 6, '#455A64');
      box(ctx, x + .28, y + .1, 46, .08, .08, 12, '#263238');
    }
  } };
  F.cerebro = { draw(ctx, f, t) {
    box(ctx, f.x + .22, f.y + .22, 0, .56, .56, 30, '#DDE3E8');
    const p = iso(f.x + .5, f.y + .5, 30);
    const b = Math.sin((t || 0) / 600) * 2;
    ctx.save(); ctx.translate(p[0], p[1] - 16 + b);
    ell(ctx, -6, 0, 13, 11, '#F28CB1', OUT); ell(ctx, 7, 0, 13, 11, '#EC7FA6', OUT);
    ell(ctx, 0, 8, 8, 4, '#D9668F', OUT);
    ctx.strokeStyle = '#B5466F'; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(-14, -2); ctx.quadraticCurveTo(-8, -9, -3, -2); ctx.quadraticCurveTo(2, 4, 6, -4); ctx.quadraticCurveTo(10, -9, 15, -1);
    ctx.moveTo(-12, 4); ctx.quadraticCurveTo(-6, 0, -1, 5); ctx.moveTo(4, 5); ctx.quadraticCurveTo(9, 0, 14, 5);
    ctx.stroke();
    // sinapses
    ctx.fillStyle = 'rgba(160,240,255,' + (0.5 + 0.5 * Math.sin((t || 0) / 300)) + ')';
    ctx.fillRect(-10, -6, 2, 2); ctx.fillRect(9, -3, 2, 2); ctx.fillRect(1, 2, 2, 2);
    ctx.restore();
  } };
  F.cofre = { draw(ctx, f) {
    box(ctx, f.x + .1, f.y + .1, 0, .8, .8, 54, '#5D6670');
    faceY(ctx, f.y + .9, f.x + .18, f.x + .82, 6, 48, '#6F7A85', OUT);
    const p = iso(f.x + .5, f.y + .9, 28);
    ell(ctx, p[0], p[1], 7, 7, '#E9B949', OUT); ell(ctx, p[0], p[1], 2.5, 2.5, '#7B5E14');
    box(ctx, f.x + .25, f.y + .2, 54, .25, .3, 8, '#E9B949');
    box(ctx, f.x + .5, f.y + .35, 54, .25, .3, 5, '#D4A437');
  } };
  F.carro = { draw(ctx, f) {
    const c = f.color || '#AEB8C2', x = f.x, y = f.y;
    // rodas
    [[.35, .1], [1.55, .1], [.35, .9], [1.55, .9]].forEach(([a, b]) => { const p = iso(x + a, y + b, 6); ell(ctx, p[0], p[1], 8, 6, '#141418', OUT); ell(ctx, p[0], p[1], 3.5, 2.5, '#8c939b'); });
    box(ctx, x + .05, y + .12, 5, 1.9, .76, 14, c);
    box(ctx, x + .62, y + .2, 19, .9, .6, 11, '#1C2733', { top: '#2A3A4A' });
    box(ctx, x + .05, y + .14, 19, .1, .72, 2, '#2C2F36');
    box(ctx, x + .05, y + .14, 21, .14, .72, 3, c);
    // faixas azuis
    poly(ctx, [iso(x + .05, y + .4, 19), iso(x + 1.95, y + .4, 19), iso(x + 1.95, y + .5, 19), iso(x + .05, y + .5, 19)], '#2F6FE0');
    // lanternas redondas
    [.25, .62].forEach(b => { const p = iso(x + .05, y + b, 12); ell(ctx, p[0], p[1], 3, 2.5, '#FF3B3B'); });
    [.25, .62].forEach(b => { const p = iso(x + 1.95, y + b + .1, 12); ell(ctx, p[0], p[1], 3, 2.2, '#FFF6C9'); });
  } };
  F.arcade = { draw(ctx, f, t) {
    box(ctx, f.x + .1, f.y + .15, 0, .8, .7, 76, '#3A2A7A');
    faceY(ctx, f.y + .85, f.x + .18, f.x + .82, 40, 62, '#0B0F1A', OUT);
    const glow = 0.6 + 0.4 * Math.sin((t || 0) / 250);
    faceY(ctx, f.y + .85, f.x + .24, f.x + .76, 44, 58, `rgba(80,255,200,${glow})`);
    faceY(ctx, f.y + .85, f.x + .18, f.x + .82, 66, 74, '#FF4FA3', OUT);
    box(ctx, f.x + .1, f.y + .7, 28, .8, .3, 6, '#2B1F5E');
    const p = iso(f.x + .4, f.y + .85, 34); ell(ctx, p[0], p[1], 2.5, 2, '#FF4F4F');
  } };
  F.pneus = { draw(ctx, f) {
    const p = iso(f.x + .5, f.y + .5);
    for (let i = 0; i < 3; i++) { ell(ctx, p[0], p[1] - i * 9, 15, 8, '#1E1E22', OUT); ell(ctx, p[0], p[1] - i * 9 - 2, 6, 3, '#3a3a40'); }
  } };
  F.cone = { draw(ctx, f) {
    const p = iso(f.x + .5, f.y + .5);
    poly(ctx, [[p[0] - 9, p[1]], [p[0] + 9, p[1]], [p[0] + 2, p[1] - 24], [p[0] - 2, p[1] - 24]], '#FF7A1A', OUT);
    poly(ctx, [[p[0] - 6, p[1] - 9], [p[0] + 6, p[1] - 9], [p[0] + 4, p[1] - 14], [p[0] - 4, p[1] - 14]], '#fff');
  } };
  F.ideia = { draw(ctx, f, t) {
    box(ctx, f.x + .2, f.y + .2, 0, .6, .6, 24, '#41464F');
    const p = iso(f.x + .5, f.y + .5, 24);
    const glow = 0.55 + 0.45 * Math.sin((t || 0) / 400);
    const gr = ctx.createRadialGradient(p[0], p[1] - 28, 4, p[0], p[1] - 28, 46);
    gr.addColorStop(0, `rgba(255,230,120,${0.55 * glow})`); gr.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = gr; ctx.fillRect(p[0] - 50, p[1] - 80, 100, 100);
    ell(ctx, p[0], p[1] - 30, 15, 16, '#FFE27A', OUT);
    box(ctx, f.x + .42, f.y + .42, 24, .16, .16, 8, '#9AA0A8');
    ctx.strokeStyle = '#C9902A'; ctx.beginPath(); ctx.moveTo(p[0] - 4, p[1] - 22); ctx.lineTo(p[0] - 2, p[1] - 34); ctx.lineTo(p[0] + 2, p[1] - 26); ctx.lineTo(p[0] + 4, p[1] - 34); ctx.stroke();
  } };
  F.mesaReuniao = { draw(ctx, f) {
    const c = f.color || '#E9E4DA';
    box(ctx, f.x + .4, f.y + .35, 0, f.w - .8, f.d - .7, 22, '#555');
    box(ctx, f.x, f.y, 22, f.w, f.d, 5, c);
    box(ctx, f.x + .3, f.y + .25, 27, .5, .35, 1, '#F7B733');
    box(ctx, f.x + 1.1, f.y + .4, 27, .45, .3, 1, '#4FC3F7');
  } };
  F.recepcao = { draw(ctx, f) {
    box(ctx, f.x, f.y, 0, f.w, f.d, 32, '#2C4A6B');
    box(ctx, f.x - .05, f.y - .05, 32, f.w + .1, f.d + .1, 4, '#E9B949');
    faceY(ctx, f.y + f.d, f.x + .2, f.x + f.w - .2, 10, 24, '#3B6290', OUT);
  } };
  F.flores = { draw(ctx, f, t) {
    box(ctx, f.x + .32, f.y + .32, 0, .36, .36, 20, '#F5F5F5');
    const p = iso(f.x + .5, f.y + .5, 20);
    const sw = Math.sin((t || 0) / 700) * 1;
    ctx.strokeStyle = '#2E7D32'; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - 6 + sw, p[1] - 18); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + 5 + sw, p[1] - 20); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + sw, p[1] - 24); ctx.stroke();
    [['#FF6F91', -6, -20], ['#FFD166', 5, -22], ['#F15BB5', 0, -27]].forEach(([c, dx, dy]) => ell(ctx, p[0] + dx + sw, p[1] + dy, 4, 4, c, OUT));
  } };
  F.coracao = { flat: false, noBlock: true, draw(ctx, f, t) {
    const p = iso(f.x + .5, f.y + .5, 40 + Math.sin((t || 0) / 500 + f.x) * 5);
    heart(ctx, p[0], p[1], f.size || 3, f.color || '#FF4F79');
  } };
  F.telefone = { draw(ctx, f) {
    box(ctx, f.x + .3, f.y + .3, 0, .4, .4, 24, '#F7C1D9');
    box(ctx, f.x + .33, f.y + .35, 24, .32, .3, 5, '#E0457B');
    box(ctx, f.x + .3, f.y + .38, 29, .38, .12, 4, '#B8325F');
  } };
  F.caixas = { draw(ctx, f) {
    box(ctx, f.x + .1, f.y + .1, 0, .8, .8, 22, '#B98552');
    box(ctx, f.x + .2, f.y + .2, 22, .55, .55, 18, '#C9965F');
  } };
  F.ferramentas = { draw(ctx, f) {
    box(ctx, f.x + .1, f.y + .1, 0, .8, .6, 40, '#C62828');
    [10, 22, 32].forEach(z => faceY(ctx, f.y + .7, f.x + .15, f.x + .85, z, z + 2, '#8E1B1B'));
  } };
  function heart(ctx, x, y, s, col) {
    const px = [[1, 0], [2, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [2, 4], [3, 4], [4, 4], [3, 5]];
    ctx.fillStyle = '#3a0f1c';
    px.forEach(([a, b]) => ctx.fillRect(x + (a - 3.5) * s - 1, y + b * s - 1, s + 2, s + 2));
    ctx.fillStyle = col;
    px.forEach(([a, b]) => ctx.fillRect(x + (a - 3.5) * s, y + b * s, s, s));
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 2 * s, y + s, s, s);
  }
  W.heart = heart;

  /* wall decorations */
  const D = {};
  D.janela = (ctx, o, t, night) => {
    poly(ctx, wq(o.side, o.a - .06, o.b + .06, o.z0 - 5, o.z1 + 5), '#F2F2F2', OUT);
    const g = night ? '#18244A' : '#8FD3FF';
    poly(ctx, wq(o.side, o.a, o.b, o.z0, o.z1), g, OUT);
    if (!night) { poly(ctx, wq(o.side, o.a + .1, o.a + .4, o.z0 + 8, o.z0 + 20), 'rgba(255,255,255,.8)'); }
    const m = (o.a + o.b) / 2;
    poly(ctx, wq(o.side, m - .03, m + .03, o.z0, o.z1), '#F2F2F2');
    poly(ctx, wq(o.side, o.a, o.b, (o.z0 + o.z1) / 2 - 1.5, (o.z0 + o.z1) / 2 + 1.5), '#F2F2F2');
    if (o.lua) {
      const p = o.side === 'L' ? iso(0, o.a + (o.b - o.a) * .3, o.z1 - 16) : iso(o.a + (o.b - o.a) * .7, 0, o.z1 - 16);
      ell(ctx, p[0], p[1], 9, 9, '#FFF3B0'); ell(ctx, p[0] + 4, p[1] - 3, 8, 8, g);
      ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const q = o.side === 'L' ? iso(0, o.a + .15 + i * .3, o.z0 + 8 + (i * 13 % 30)) : iso(o.a + .15 + i * .3, 0, o.z0 + 8 + (i * 13 % 30)); ctx.fillRect(q[0], q[1], 2, 2); }
    }
  };
  D.lousa = (ctx, o) => {
    poly(ctx, wq(o.side, o.a - .08, o.b + .08, o.z0 - 6, o.z1 + 6), '#7A5230', OUT);
    poly(ctx, wq(o.side, o.a, o.b, o.z0, o.z1), '#244A3A', OUT);
    wallText(ctx, o.side, o.a, o.b, o.z1 - 18, o.text || '', '700 15px "Pixelify Sans", monospace', 'rgba(240,240,230,.92)');
    if (o.text2) wallText(ctx, o.side, o.a, o.b, o.z1 - 40, o.text2, '400 11px "Pixelify Sans", monospace', 'rgba(240,240,230,.7)');
    poly(ctx, wq(o.side, o.a, o.b, o.z0 - 6, o.z0 - 2), '#5C3B20');
  };
  D.quadro = (ctx, o) => {
    poly(ctx, wq(o.side, o.a - .05, o.b + .05, o.z0 - 4, o.z1 + 4), o.frame || '#2B2B2B', OUT);
    poly(ctx, wq(o.side, o.a, o.b, o.z0, o.z1), o.color || '#F4F1EA');
    if (o.text) wallText(ctx, o.side, o.a, o.b, (o.z0 + o.z1) / 2, o.text, o.font || '700 12px "Pixelify Sans", monospace', o.textColor || '#222');
  };
  D.post = (ctx, o) => {
    poly(ctx, wq(o.side, o.a - .06, o.b + .06, o.z0 - 5, o.z1 + 5), '#8D6E4A', OUT);
    poly(ctx, wq(o.side, o.a, o.b, o.z0, o.z1), '#C9A574');
    const cols = ['#FFF176', '#FF8A80', '#80D8FF', '#B9F6CA', '#FFD180', '#EA80FC'];
    let k = 0;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const a = o.a + .12 + i * (o.b - o.a - .2) / 4, z = o.z0 + 8 + j * (o.z1 - o.z0 - 10) / 2;
      poly(ctx, wq(o.side, a, a + .45, z, z + 18), cols[k++ % cols.length], 'rgba(0,0,0,.25)');
    }
  };
  D.grafico = (ctx, o) => {
    poly(ctx, wq(o.side, o.a - .05, o.b + .05, o.z0 - 4, o.z1 + 4), '#263238', OUT);
    poly(ctx, wq(o.side, o.a, o.b, o.z0, o.z1), '#F5F7F8');
    const vals = [.35, .55, .45, .75, .9], n = vals.length, wdt = (o.b - o.a) / (n * 1.6);
    vals.forEach((v, i) => { const a = o.a + .12 + i * wdt * 1.5; poly(ctx, wq(o.side, a, a + wdt, o.z0 + 5, o.z0 + 5 + v * (o.z1 - o.z0 - 12)), i === n - 1 ? '#2E9E5B' : '#7FB3D5'); });
  };
  D.neuronio = (ctx, o, t) => {
    poly(ctx, wq(o.side, o.a - .05, o.b + .05, o.z0 - 4, o.z1 + 4), '#0F1830', OUT);
    poly(ctx, wq(o.side, o.a, o.b, o.z0, o.z1), '#132347');
    const c = o.side === 'L' ? iso(0, (o.a + o.b) / 2, (o.z0 + o.z1) / 2) : iso((o.a + o.b) / 2, 0, (o.z0 + o.z1) / 2);
    ctx.save(); ctx.translate(c[0], c[1]); ctx.transform(1, o.side === 'L' ? -0.5 : 0.5, 0, 1, 0, 0);
    ctx.strokeStyle = '#7CF3FF'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const ang = i * Math.PI / 3; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * 16, Math.sin(ang) * 12); ctx.lineTo(Math.cos(ang + .3) * 22, Math.sin(ang + .3) * 16); }
    ctx.moveTo(10, 0); ctx.lineTo(34, 4); ctx.stroke();
    ctx.fillStyle = '#FF7AC6'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
    const k = ((t || 0) / 15) % 34; ctx.fillStyle = '#FFF59D'; ctx.fillRect(k, k / 9 - 1, 3, 3);
    ctx.restore();
  };
  D.eeg = (ctx, o, t) => {
    poly(ctx, wq(o.side, o.a - .05, o.b + .05, o.z0 - 4, o.z1 + 4), '#1A1A1A', OUT);
    poly(ctx, wq(o.side, o.a, o.b, o.z0, o.z1), '#062016');
    ctx.strokeStyle = '#4DFF9A'; ctx.lineWidth = 1.2;
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = o.a + .05 + (o.b - o.a - .1) * i / 40;
        const z = o.z0 + 10 + r * 14 + Math.sin(i * .9 + (t || 0) / 160 + r * 2) * 4 * (1 + (i % 7 === 0 ? 1.5 : 0));
        const p = o.side === 'L' ? iso(0, a, z) : iso(a, 0, z);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
    }
  };
  D.neon = (ctx, o, t) => {
    const fl = (Math.sin((t || 0) / 90) > -0.95) ? 1 : 0.4;
    ctx.save(); ctx.shadowColor = o.color; ctx.shadowBlur = 12 * fl; ctx.globalAlpha = fl;
    wallText(ctx, o.side, o.a, o.b, o.z, o.text, o.font || '700 22px "Pixelify Sans", monospace', o.color);
    ctx.restore();
  };
  D.texto = (ctx, o) => wallText(ctx, o.side, o.a, o.b, o.z, o.text, o.font || '700 11px "Silkscreen", monospace', o.color || '#fff');
  D.cruz = (ctx, o) => {
    poly(ctx, wq(o.side, o.a + .08, o.a + .16, o.z0, o.z0 + 34), '#8B5E34', OUT);
    poly(ctx, wq(o.side, o.a, o.a + .24, o.z0 + 20, o.z0 + 26), '#8B5E34', OUT);
  };
  D.portao = (ctx, o) => {
    poly(ctx, wq(o.side, o.a - .06, o.b + .06, 0, o.z1 + 6), '#3B3B44', OUT);
    for (let z = 4; z < o.z1; z += 7) poly(ctx, wq(o.side, o.a, o.b, z, z + 5), '#8A8F99', 'rgba(0,0,0,.3)');
  };
  D.coracaoQuadro = (ctx, o) => {
    poly(ctx, wq(o.side, o.a - .05, o.b + .05, o.z0 - 4, o.z1 + 4), '#E9B949', OUT);
    poly(ctx, wq(o.side, o.a, o.b, o.z0, o.z1), '#FFF0F5');
    const c = o.side === 'L' ? iso(0, (o.a + o.b) / 2, (o.z0 + o.z1) / 2 + 8) : iso((o.a + o.b) / 2, 0, (o.z0 + o.z1) / 2 + 8);
    heart(ctx, c[0], c[1] - 8, 3, '#FF4F79');
    wallText(ctx, o.side, o.a, o.b, o.z0 + 9, o.text || 'A + B', '700 10px "Silkscreen", monospace', '#B8325F');
  };

  /* ---------------- ENGINE ---------------- */
  let canvas, ctx, dpr = 1, cam = { s: 1, ox: 0, oy: 0 };
  let room = null, objects = [], avatars = [], player = null, blocked = new Set();
  let hoverTile = null, lightsOn = true, handlers = {}, pending = null, fade = 0, labelsVisible = true, nearNpc = null;
  W.avatars = () => avatars;

  class Avatar {
    constructor(o) { Object.assign(this, { x: 0, y: 0, dir: 1, back: false, path: [], frame: 0, t: 0, bubble: null, idle: 0 }, o); }
  }

  W.init = function (cv, h) {
    canvas = cv; ctx = cv.getContext('2d'); handlers = h || {};
    const ro = new ResizeObserver(() => fit()); ro.observe(cv);
    cv.addEventListener('pointermove', e => { const g = toGrid(e); hoverTile = g && inside(g[0], g[1]) ? [Math.floor(g[0]), Math.floor(g[1])] : null; canvas.style.cursor = hitAvatar(e) || hitDoor(e) || hitFurni(e) ? 'pointer' : 'default'; });
    cv.addEventListener('pointerleave', () => { hoverTile = null; });
    cv.addEventListener('click', onClick);
    requestAnimationFrame(loop);
  };
  W.setHandlers = h => Object.assign(handlers, h);

  function fit() {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    if (!room) return;
    const left = iso(0, room.h)[0] - 40, right = iso(room.w, 0)[0] + 40;
    const top = iso(0, 0, WALL)[1] - 54, bottom = iso(room.w, room.h)[1] + 30;
    const s = Math.min(r.width / (right - left), r.height / (bottom - top), 1.6);
    cam.s = s;
    cam.ox = (r.width - (right - left) * s) / 2 - left * s;
    cam.oy = (r.height - (bottom - top) * s) / 2 - top * s;
  }
  W.fit = fit;

  function toGrid(e) {
    if (!room) return null;
    const r = canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left - cam.ox) / cam.s, sy = (e.clientY - r.top - cam.oy) / cam.s;
    const gx = (sy / (TH / 2) + sx / (TW / 2)) / 2, gy = (sy / (TH / 2) - sx / (TW / 2)) / 2;
    return [gx, gy, sx, sy];
  }
  function inside(x, y) { return x >= 0 && y >= 0 && x < room.w && y < room.h; }

  function screenOfAvatar(a) { const p = iso(a.x + .5, a.y + .5); return p; }
  function hitAvatar(e) {
    const g = toGrid(e); if (!g) return null; const [, , sx, sy] = g;
    for (let i = avatars.length - 1; i >= 0; i--) {
      const a = avatars[i]; if (a === player) continue;
      const p = screenOfAvatar(a);
      if (sx > p[0] - 22 && sx < p[0] + 22 && sy > p[1] - 84 && sy < p[1] + 4) return a;
    }
    return null;
  }
  function pip(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if (((poly[i][1] > pt[1]) !== (poly[j][1] > pt[1])) && (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])) c = !c;
    }
    return c;
  }
  function hitDoor(e) {
    const g = toGrid(e); if (!g || !room.doors) return null;
    for (const d of room.doors) if (pip([g[2], g[3]], wq(d.side, d.a, d.a + 1, 0, 88))) return d;
    return null;
  }
  function hitFurni(e) {
    const g = toGrid(e); if (!g) return null;
    const tx = Math.floor(g[0]), ty = Math.floor(g[1]);
    for (const f of room.furni) if (f.act && tx >= f.x && tx < f.x + f.w && ty >= f.y && ty < f.y + f.d) return f;
    // also check above-floor click for tall interactive furniture
    for (const f of room.furni) if (f.act) {
      const p = iso(f.x + f.w / 2, f.y + f.d / 2);
      if (Math.abs(g[2] - p[0]) < 34 && g[3] < p[1] + 10 && g[3] > p[1] - 80) return f;
    }
    return null;
  }

  function onClick(e) {
    if (!room || W.locked) return;
    const a = hitAvatar(e);
    if (a) { walkNear(a.x, a.y, () => { face(player, a); handlers.npc && handlers.npc(a); }); handlers.npcClick && handlers.npcClick(a); return; }
    const d = hitDoor(e);
    if (d) { const t = doorTile(d); walkTo(t[0], t[1], () => handlers.door && handlers.door(d)); return; }
    const f = hitFurni(e);
    if (f) { walkNear(f.x, f.y, () => handlers.furni && handlers.furni(f), f); return; }
    const g = toGrid(e); if (!g) return;
    const tx = Math.floor(g[0]), ty = Math.floor(g[1]);
    if (inside(tx, ty) && !blocked.has(tx + ',' + ty)) walkTo(tx, ty);
  }
  function doorTile(d) { return d.side === 'L' ? [0, d.a] : [d.a, 0]; }
  function face(a, b) { const pa = iso(a.x, a.y), pb = iso(b.x, b.y); a.dir = pb[0] >= pa[0] ? 1 : -1; a.back = pb[1] < pa[1] - 4; }

  function bfs(sx, sy, tx, ty) {
    const key = (x, y) => x + ',' + y;
    if (sx === tx && sy === ty) return [];
    const q = [[sx, sy]], prev = new Map([[key(sx, sy), null]]);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) break;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (!inside(nx, ny) || blocked.has(k) || prev.has(k)) continue;
        if (dx && dy && (blocked.has(key(x + dx, y)) || blocked.has(key(x, y + dy)))) continue;
        prev.set(k, [x, y]); q.push([nx, ny]);
      }
    }
    if (!prev.has(key(tx, ty))) return null;
    const path = []; let cur = [tx, ty];
    while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift(cur); cur = prev.get(key(cur[0], cur[1])); }
    return path;
  }
  function walkTo(tx, ty, cb) {
    if (!player) return;
    const sx = Math.round(player.x), sy = Math.round(player.y);
    const p = bfs(sx, sy, tx, ty);
    if (!p) return;
    player.path = p; pending = cb || null;
    if (!p.length && cb) { pending = null; cb(); }
  }
  function walkNear(x, y, cb, f) {
    const w = f ? f.w : 1, d = f ? f.d : 1;
    const cands = [];
    for (let i = -1; i <= w; i++) for (let j = -1; j <= d; j++) {
      const tx = Math.round(x) + i, ty = Math.round(y) + j;
      if (i >= 0 && i < w && j >= 0 && j < d) continue;
      if (inside(tx, ty) && !blocked.has(tx + ',' + ty)) cands.push([tx, ty]);
    }
    let best = null, bl = 1e9;
    const sx = Math.round(player.x), sy = Math.round(player.y);
    for (const c of cands) { const p = bfs(sx, sy, c[0], c[1]); if (p && p.length < bl) { bl = p.length; best = c; } }
    if (best) walkTo(best[0], best[1], cb); else if (cb) cb();
  }
  W.walkTo = walkTo;
  W.walkToNpc = function (id) { const a = avatars.find(v => v.id === id); if (a && player) walkNear(a.x, a.y, () => { face(player, a); handlers.npc && handlers.npc(a); }); };

  W.load = function (def, opts) {
    opts = opts || {};
    room = def; objects = []; avatars = []; blocked = new Set();
    room.furni.forEach(f => { f.w = f.w || 1; f.d = f.d || 1; const T = F[f.t]; if (T && !T.flat && !T.noBlock && !f.pass) for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) blocked.add((f.x + i) + ',' + (f.y + j)); });
    (room.npcs || []).forEach(n => { const a = new Avatar(Object.assign({}, n)); avatars.push(a); blocked.add(n.x + ',' + n.y); });
    const sp = opts.spawn || room.spawn;
    nearNpc = null; handlers.near && handlers.near(null);
    player = new Avatar({ id: 'abner', name: 'Abner', look: opts.playerLook || W.LOOKS.abner, x: sp[0], y: sp[1], dir: 1, player: true });
    avatars.push(player);
    fade = 1; fit();
  };
  W.player = () => player;
  W.say = function (id, text, ms) {
    const a = avatars.find(v => v.id === id); if (!a) return;
    a.bubble = { text: String(text).replace(/\s+/g, ' ').slice(0, 90) + (String(text).length > 90 ? '…' : ''), until: performance.now() + (ms || 5500) };
  };
  W.setLights = on => { lightsOn = on; };
  W.room = () => room;

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    update(dt, t); draw(t);
    requestAnimationFrame(loop);
  }
  function update(dt, t) {
    if (fade > 0) fade = Math.max(0, fade - dt * 3);
    for (const a of avatars) {
      if (a.path.length) {
        const [tx, ty] = a.path[0];
        const dx = tx - a.x, dy = ty - a.y, dist = Math.hypot(dx, dy), sp = 3.4 * dt;
        const pa = iso(a.x, a.y), pb = iso(tx, ty);
        if (Math.abs(pb[0] - pa[0]) > .5) a.dir = pb[0] > pa[0] ? 1 : -1;
        a.back = pb[1] < pa[1] - .5;
        if (dist <= sp) { a.x = tx; a.y = ty; a.path.shift(); if (!a.path.length && a === player && pending) { const cb = pending; pending = null; cb(); } }
        else { a.x += dx / dist * sp; a.y += dy / dist * sp; }
        a.t += dt; a.frame = 1 + (Math.floor(a.t * 7) % 2);
      } else {
        a.frame = 0;
        if (!a.player) { a.idle -= dt; if (a.idle <= 0) { a.idle = 3 + Math.random() * 5; if (!a.fixed && a !== nearNpc) { a.dir = Math.random() < .5 ? 1 : -1; } } }
      }
    }
    if (player && !player.path.length) {
      let best = null;
      avatars.forEach(a => { if (a === player || !a.talk) return; if (Math.max(Math.abs(a.x - player.x), Math.abs(a.y - player.y)) <= 1.05) best = a; });
      if (best !== nearNpc) { nearNpc = best; if (best) { face(best, player); face(player, best); } handlers.near && handlers.near(best); }
    } else if (player && player.path.length && nearNpc) { nearNpc = null; handlers.near && handlers.near(null); }
  }
  // setas do teclado: andam na direção da tela
  const KEYDIR = { arrowright: [1, -1], d: [1, -1], arrowleft: [-1, 1], a: [-1, 1], arrowup: [-1, -1], w: [-1, -1], arrowdown: [1, 1], s: [1, 1] };
  window.addEventListener('keydown', e => {
    if (!room || !player || W.locked || W.keysOff) return;
    const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
    const d = KEYDIR[(e.key || '').toLowerCase()]; if (!d) return;
    e.preventDefault();
    const base = player.path.length ? player.path[player.path.length - 1] : [Math.round(player.x), Math.round(player.y)];
    let [dx, dy] = d, nx = base[0] + dx, ny = base[1] + dy;
    const free = (x, y) => inside(x, y) && !blocked.has(x + ',' + y);
    if (!free(nx, ny)) { // tenta deslizar por um dos eixos
      if (free(base[0] + dx, base[1])) { nx = base[0] + dx; ny = base[1]; }
      else if (free(base[0], base[1] + dy)) { nx = base[0]; ny = base[1] + dy; }
      else {
        const door = (room.doors || []).find(dr => dr.side === 'L' ? (base[0] === 0 && base[1] === dr.a && dx < 0) : (base[1] === 0 && base[0] === dr.a && dy < 0));
        if (door && !player.path.length) handlers.door && handlers.door(door);
        return;
      }
    } else if (dx && dy && (!free(base[0] + dx, base[1]) || !free(base[0], base[1] + dy))) { if (free(base[0] + dx, base[1])) { nx = base[0] + dx; ny = base[1]; } else if (free(base[0], base[1] + dy)) { nx = base[0]; ny = base[1] + dy; } else return; }
    if (player.path.length > 1) return;
    player.path.push([nx, ny]); pending = null;
  });

  function drawRoom(t) {
    const night = room.night || !lightsOn;
    // floor edge thickness
    poly(ctx, [iso(0, room.h), iso(room.w, room.h), iso(room.w, room.h, -8), iso(0, room.h, -8)], shade(room.floor[0], -.45));
    poly(ctx, [iso(room.w, 0), iso(room.w, room.h), iso(room.w, room.h, -8), iso(room.w, 0, -8)], shade(room.floor[0], -.6));
    for (let x = 0; x < room.w; x++) for (let y = 0; y < room.h; y++) {
      poly(ctx, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], room.floor[(x + y) % 2], 'rgba(0,0,0,.07)');
    }
    // walls
    const wc = room.wall;
    poly(ctx, [iso(0, 0), iso(0, room.h), iso(0, room.h, WALL), iso(0, 0, WALL)], shade(wc, -.04));
    poly(ctx, [iso(0, 0), iso(room.w, 0), iso(room.w, 0, WALL), iso(0, 0, WALL)], shade(wc, -.22));
    // baseboard
    poly(ctx, [iso(0, 0), iso(0, room.h), iso(0, room.h, 7), iso(0, 0, 7)], shade(wc, -.35));
    poly(ctx, [iso(0, 0), iso(room.w, 0), iso(room.w, 0, 7), iso(0, 0, 7)], shade(wc, -.45));
    // wall caps
    const T = .14;
    poly(ctx, [iso(0, 0, WALL), iso(0, room.h, WALL), iso(-T, room.h, WALL), iso(-T, -T, WALL)], shade(wc, .35), OUT);
    poly(ctx, [iso(0, 0, WALL), iso(room.w, 0, WALL), iso(room.w, -T, WALL), iso(-T, -T, WALL)], shade(wc, .35), OUT);
    poly(ctx, [iso(0, room.h, 0), iso(-T, room.h, 0), iso(-T, room.h, WALL), iso(0, room.h, WALL)], shade(wc, -.15), OUT);
    poly(ctx, [iso(room.w, 0, 0), iso(room.w, -T, 0), iso(room.w, -T, WALL), iso(room.w, 0, WALL)], shade(wc, -.4), OUT);
    // decor
    (room.decor || []).forEach(o => D[o.t] && D[o.t](ctx, o, t, night));
    // doors
    (room.doors || []).forEach(d => {
      poly(ctx, wq(d.side, d.a - .08, d.a + 1.08, 0, 94), d.frame || '#E9E2D0', OUT);
      poly(ctx, wq(d.side, d.a, d.a + 1, 0, 86), d.to === 'hall' ? '#20262E' : shade(d.color || '#444', -.35), OUT);
      poly(ctx, wq(d.side, d.a + .1, d.a + .9, 6, 78), d.to === 'hall' ? '#2C343F' : shade(d.color || '#444', -.15));
      const kn = d.side === 'L' ? iso(0, d.a + .8, 40) : iso(d.a + .8, 0, 40);
      ell(ctx, kn[0], kn[1], 2.5, 2.5, '#E9B949');
      // lintel color band
      poly(ctx, wq(d.side, d.a - .08, d.a + 1.08, 88, 94), d.color || '#E9B949');
    });
    // flat furniture
    room.furni.forEach(f => { const T2 = F[f.t]; if (T2 && T2.flat) T2.draw(ctx, f, t); });
    // hover tile
    if (hoverTile && !W.locked) {
      const [x, y] = hoverTile;
      poly(ctx, [iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)], 'rgba(255,255,255,.12)', 'rgba(255,255,255,.85)');
    }
    if (nearNpc) { const p = iso(nearNpc.x + .5, nearNpc.y + .5); ctx.strokeStyle = 'rgba(242,183,5,.95)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(p[0], p[1], 20, 9, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    // sortable
    const items = [];
    room.furni.forEach(f => { const T2 = F[f.t]; if (T2 && !T2.flat) items.push({ k: f.x + f.w / 2 + f.y + f.d / 2 + (f.z || 0), draw: () => T2.draw(ctx, f, t, night) }); });
    avatars.forEach(a => items.push({ k: a.x + a.y + 1.01, draw: () => drawAvatar(a) }));
    items.sort((p, q) => p.k - q.k).forEach(i => i.draw());
  }

  function drawAvatar(a) {
    const p = iso(a.x + .5, a.y + .5);
    ell(ctx, p[0], p[1], 15, 6, 'rgba(0,0,0,.25)');
    const s = makeSprite(a.look, a.frame, a.back);
    const S = 2;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(p[0]), Math.round(p[1]));
    if (a.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(s, -s.width * S / 2, -(SH + PAD) * S + 4, s.width * S, s.height * S);
    ctx.restore();
  }

  function nameplate(x, y, text, col, bg, align) {
    ctx.font = '400 10px "Silkscreen", monospace';
    const w = ctx.measureText(text).width + 12;
    const cx = align === 'right' ? x - w / 2 + 14 : align === 'left' ? x + w / 2 - 14 : x;
    ctx.fillStyle = bg || 'rgba(10,14,22,.82)';
    ctx.fillRect(Math.round(cx - w / 2), Math.round(y - 9), Math.round(w), 16);
    ctx.fillStyle = col || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, Math.round(cx), Math.round(y));
  }
  function bubble(x, y, text) {
    ctx.font = '400 12px "Atkinson Hyperlegible", sans-serif';
    const words = text.split(' '), lines = []; let cur = '';
    words.forEach(w => { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > 190) { lines.push(cur); cur = w; } else cur = tst; });
    if (cur) lines.push(cur);
    const ls = lines.slice(0, 3); if (lines.length > 3) ls[2] += '…';
    const w = Math.max(...ls.map(l => ctx.measureText(l).width)) + 18, h = ls.length * 15 + 10;
    const bx = Math.round(x - w / 2), by = Math.round(y - h - 10);
    ctx.fillStyle = '#121820'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#121820'; ctx.fillRect(x - 5, by + h, 10, 2); ctx.fillRect(x - 3, by + h + 2, 6, 2); ctx.fillRect(x - 1, by + h + 4, 2, 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 4, by + h - 1, 8, 2); ctx.fillRect(x - 2, by + h + 1, 4, 2);
    ctx.fillStyle = '#1B2430'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ls.forEach((l, i) => ctx.fillText(l, bx + 9, by + 6 + i * 15));
  }

  function draw(t) {
    if (!ctx) return;
    const cw = canvas.width, ch = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // void background
    const gr = ctx.createLinearGradient(0, 0, 0, ch);
    gr.addColorStop(0, '#0B1520'); gr.addColorStop(1, '#14263A');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 60; i++) { const x = (i * 137.5 * dpr) % cw, y = (i * 89.3 * dpr * 1.7) % ch; ctx.fillRect(x, y, 2 * dpr, 2 * dpr); }
    if (!room) return;
    ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.ox, dpr * cam.oy);
    drawRoom(t);
    // overlay text (screen-ish space but in world coords)
    const now = performance.now();
    if (labelsVisible) {
      (room.doors || []).forEach(d => {
        const p = d.side === 'L' ? iso(0, d.a + .5, 104) : iso(d.a + .5, 0, 104);
        nameplate(p[0], p[1] - 8, d.label, '#fff', d.to === 'hall' ? 'rgba(10,14,22,.82)' : d.color, d.to === 'hall' ? null : (d.side === 'L' ? 'right' : 'left'));
      });
    }
    avatars.forEach(a => {
      const p = iso(a.x + .5, a.y + .5);
      if (!a.player && a.name) nameplate(p[0], p[1] + 14, a.name, '#fff', 'rgba(10,14,22,.78)');
      if (a.bubble && a.bubble.until > now) bubble(p[0], p[1] - 82, a.bubble.text);
    });
    if (!lightsOn) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(2,4,14,.82)'; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 40; i++) { const x = (i * 211.7 * dpr) % cw, y = (i * 53.1 * dpr * 2.3) % ch, tw = (Math.sin(t / 500 + i) + 1) / 2; ctx.globalAlpha = tw; ctx.fillRect(x, y, 2 * dpr, 2 * dpr); }
      ctx.globalAlpha = 1;
    }
    if (fade > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(6,10,16,${fade})`; ctx.fillRect(0, 0, cw, ch); }
  }

  /* ---------------- LOOKS ---------------- */
  W.LOOKS = {
    abner: { id: 'abner', skin: '#F0C3A0', hair: '#3A2A20', hairHi: '#5A4231', hairStyle: 'curto', beard: '#6B4E3A', glasses: '#26262C', smile: 'teeth', shirt: '#6E3B2B', pants: '#2E3A55', shoes: '#1d1d22' },
    ratinha: { id: 'ratinha', sweet: true, skin: '#E8AE88', hair: '#3E2418', hairHi: '#B87442', hairStyle: 'cacheado', earrings: '#F2C14E', necklace: '#F2C14E', lip: '#E0707F', blush: '#F2A0A0', brow: '#6A4030', shirt: '#2A2230', pants: '#4A3C5C', shoes: '#2a2026' },
    marcha: { id: 'marcha', skin: '#E9BFA0', hair: '#B9B4AE', hairStyle: 'coque', glasses: '#7A3E9D', shirt: '#F4F4F4', coat: '#2F7F73', pants: '#2D3142', lip: '#B5535C' },
    ignicao: { id: 'ignicao', skin: '#D9A07A', hair: '#7A3B22', hairStyle: 'rabo', shirt: '#3C6FD8', coat: '#F4F7FA', pants: '#2D3142', lip: '#B5535C', glasses: '#333' },
    drift: { id: 'drift', skin: '#C98B63', hair: '#1F1612', hairStyle: 'black', shirt: '#F2C230', pants: '#3D3A6B', lip: '#A34755', earrings: '#E9B949' },
    turbo: { id: 'turbo', skin: '#F2CBA8', hair: '#6B4A2B', hairStyle: 'baguncado', shirt: '#6A4FC2', pants: '#24262E', smile: 'teeth' },
    largada: { id: 'largada', skin: '#B87A55', hair: '#1D1715', hairStyle: 'bone', cap: '#E2552D', shirt: '#1F8A70', pants: '#2B2B33', beard: '#2A1E19' },
    vacuo: { id: 'vacuo', skin: '#8D5A3E', hair: '#2A1A14', hairStyle: 'coque', shirt: '#E85D75', pants: '#22324A', lip: '#7E2F3E', earrings: '#E9B949' },
    pitstop: { id: 'pitstop', skin: '#E8B996', hair: '#5B4636', hairStyle: 'careca', beard: '#5B4636', shirt: '#FFFFFF', coat: '#24354F', tie: '#C0392B', pants: '#24354F' },
    faisca: { id: 'faisca', skin: '#EFC6A6', hair: '#ECECEC', hairStyle: 'baguncado', glasses: '#C68A00', shirt: '#2B2B2B', coat: '#F2C230', pants: '#3A3A3A', smile: 'teeth' },
    cambio: { id: 'cambio', skin: '#D8A27C', hair: '#8D8D8D', hairStyle: 'curto', glasses: '#222', shirt: '#FFFFFF', coat: '#17171B', tie: '#E9B949', pants: '#17171B' }
  };
  // compatibilidade com os painéis: retratos em pixel
  window.Avatar = {
    LOOKS: W.LOOKS, sh: shade,
    portrait(canvas, look, opts) {
      opts = opts || {};
      const s = makeSprite(look, 0, false), g = canvas.getContext('2d');
      g.imageSmoothingEnabled = false; g.clearRect(0, 0, canvas.width, canvas.height);
      if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, canvas.width, canvas.height); }
      const [sx, sy, sw, sh] = opts.full ? [0, 0, s.width, s.height] : [2, 0, 24, 24];
      const k = Math.max(1, Math.floor(Math.min(canvas.width / sw, canvas.height / sh)));
      g.drawImage(s, sx, sy, sw, sh, Math.round((canvas.width - sw * k) / 2), Math.round((canvas.height - sh * k) / 2), sw * k, sh * k);
    }
  };

})();
