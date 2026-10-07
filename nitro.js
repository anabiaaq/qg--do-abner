/* Fuga Nitro — jogo de corrida da Garagem Nitro */
(function () {
  'use strict';
  const W = 360, H = 620, ROAD_L = 30, ROAD_R = 330, LANES = 4, LW = (ROAD_R - ROAD_L) / LANES;
  const N = (window.Nitro = {});
  let cv, ctx, raf = 0, st = null, keys = {}, onEnd = null, running = false, paused = false, dpr = 1, last = 0;
  const touch = { l: false, r: false, n: false };

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function reset() {
    st = {
      t: 0, x: W / 2, vx: 0, speed: 300, dist: 0, bonus: 0, nitro: 60, boost: false, gap: 62,
      obs: [], fx: [], pops: [], spawnY: 0, inv: 0, shake: 0, dash: 0, city: 0, over: false, crashes: 0, near: 0, flash: 0
    };
  }
  function laneX(i) { return ROAD_L + LW * i + LW / 2; }
  const CAR_COLORS = ['#E53935', '#FDD835', '#43A047', '#1E88E5', '#8E24AA', '#FB8C00', '#ECEFF1', '#6D4C41'];

  function spawn() {
    const r = Math.random(), lane = Math.floor(Math.random() * LANES);
    const x = laneX(lane);
    let o;
    if (r < 0.52) o = { k: 'car', x, y: -90, w: 34, h: 62, v: 120 + Math.random() * 120, c: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)] };
    else if (r < 0.62) o = { k: 'truck', x, y: -140, w: 40, h: 110, v: 90 + Math.random() * 50, c: '#455A64' };
    else if (r < 0.77) o = { k: 'cone', x: x + (Math.random() * 24 - 12), y: -30, w: 20, h: 22, v: 0 };
    else if (r < 0.86) o = { k: 'barreira', x, y: -30, w: 60, h: 18, v: 0 };
    else if (r < 0.93) o = { k: 'oleo', x, y: -40, w: 46, h: 30, v: 0, soft: true };
    else o = { k: 'nitro', x, y: -30, w: 22, h: 30, v: 0, pick: true };
    st.obs.push(o);
  }

  function hit(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 6; }
  function pop(text, x, y, c) { st.pops.push({ text, x, y, c: c || '#FFE066', t: 1.1 }); }
  function sparks(x, y, c, n) { for (let i = 0; i < (n || 14); i++) st.fx.push({ x, y, vx: (Math.random() - .5) * 260, vy: (Math.random() - .7) * 260, t: .5 + Math.random() * .4, c: c || '#FFC107' }); }

  function update(dt) {
    const s = st; s.t += dt;
    const base = Math.min(720, 320 + s.t * 7);
    const wantBoost = (keys.n || touch.n) && s.nitro > 2;
    s.boost = wantBoost;
    const target = base + (s.boost ? 260 : 0);
    s.speed += Math.sign(target - s.speed) * Math.min(Math.abs(target - s.speed), (s.speed < target ? 160 : 260) * dt);
    s.nitro = Math.max(0, Math.min(100, s.nitro + (s.boost ? -34 : 4) * dt));
    const police = Math.min(760, 300 + s.t * 6.5);
    s.gap = Math.max(0, Math.min(100, s.gap + (s.speed - police) * dt * 0.055));
    // steering
    const dir = ((keys.r || touch.r) ? 1 : 0) - ((keys.l || touch.l) ? 1 : 0);
    const steer = s.slip > 0 ? -dir : dir;
    s.vx += steer * 1500 * dt; s.vx *= Math.pow(0.0009, dt);
    s.x = Math.max(ROAD_L + 18, Math.min(ROAD_R - 18, s.x + s.vx * dt));
    if (s.slip > 0) s.slip -= dt;
    s.dist += s.speed * dt / 10;
    s.dash = (s.dash + s.speed * dt) % 60;
    s.city = (s.city + s.speed * dt * .6) % 120;
    // spawn
    s.spawnY += s.speed * dt;
    const gapNeed = Math.max(110, 230 - s.t * 2.2);
    if (s.spawnY > gapNeed) { s.spawnY = 0; spawn(); if (s.t > 25 && Math.random() < .25) spawn(); }
    const me = { x: s.x, y: H - 120, w: 34, h: 62 };
    for (const o of s.obs) {
      o.y += (s.speed - o.v) * dt;
      if (o.dead) continue;
      if (hit(me, o)) {
        if (o.pick) { o.dead = true; s.nitro = Math.min(100, s.nitro + 38); s.bonus += 100; pop('+NITRO', o.x, o.y, '#4DD0E1'); sparks(o.x, o.y, '#4DD0E1', 10); continue; }
        if (o.soft) { if (!o.used) { o.used = true; s.slip = 1.4; s.vx += (Math.random() < .5 ? -1 : 1) * 260; pop('ÓLEO!', o.x, o.y, '#B0BEC5'); } continue; }
        if (s.inv <= 0) {
          o.dead = true; s.inv = 1.3; s.shake = .4; s.flash = .25; s.crashes++;
          s.speed *= 0.5; s.gap = Math.max(0, s.gap - 26);
          sparks(o.x, (o.y + me.y) / 2, '#FFB300', 22); pop('BATEU!', s.x, me.y - 40, '#FF5252');
        }
      } else if (!o.passed && !o.pick && !o.soft && o.y > me.y + 10) {
        o.passed = true;
        if (Math.abs(o.x - s.x) < (o.w + 34) / 2 + 14) { s.bonus += 50; s.near++; pop('QUASE! +50', s.x, me.y - 50); }
      }
    }
    s.obs = s.obs.filter(o => o.y < H + 160 && !(o.dead && o.pick));
    s.fx.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt + s.speed * dt * .3; p.t -= dt; });
    s.fx = s.fx.filter(p => p.t > 0);
    s.pops.forEach(p => { p.y -= 40 * dt; p.t -= dt; });
    s.pops = s.pops.filter(p => p.t > 0);
    if (s.inv > 0) s.inv -= dt; if (s.shake > 0) s.shake -= dt; if (s.flash > 0) s.flash -= dt;
    if (s.boost && Math.random() < .7) s.fx.push({ x: s.x + (Math.random() - .5) * 14, y: H - 86, vx: (Math.random() - .5) * 40, vy: 160 + Math.random() * 80, t: .3, c: Math.random() < .5 ? '#4FC3F7' : '#E1F5FE' });
    if (s.gap <= 0 && !s.over) { s.over = true; finish(); }
  }
  N.score = () => st ? Math.floor(st.dist + st.bonus) : 0;

  /* ----- desenho ----- */
  function drawCity() {
    const s = st;
    ctx.fillStyle = '#0E1320'; ctx.fillRect(0, 0, ROAD_L, H); ctx.fillRect(ROAD_R, 0, W - ROAD_R, H);
    for (let i = -1; i < H / 120 + 1; i++) {
      const y = i * 120 + s.city;
      [[2, ROAD_L - 6], [ROAD_R + 4, W - ROAD_R - 6]].forEach(([x, w], k) => {
        ctx.fillStyle = k ? '#1A2238' : '#1B1F33'; ctx.fillRect(x, y + 6, w, 104);
        for (let wy = 0; wy < 5; wy++) { ctx.fillStyle = ((i + wy + k) % 3) ? 'rgba(255,214,102,.65)' : 'rgba(120,200,255,.35)'; ctx.fillRect(x + 6, y + 14 + wy * 19, w - 12, 6); }
      });
    }
  }
  function drawRoad() {
    const s = st;
    ctx.fillStyle = '#23262E'; ctx.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, H);
    ctx.fillStyle = '#FF2E88'; ctx.fillRect(ROAD_L - 3, 0, 3, H);
    ctx.fillStyle = '#21E6FF'; ctx.fillRect(ROAD_R, 0, 3, H);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let l = 1; l < LANES; l++) for (let y = -60 + s.dash; y < H; y += 60) ctx.fillRect(ROAD_L + LW * l - 2, y, 4, 30);
    // marcas de velocidade
    if (s.boost) { ctx.fillStyle = 'rgba(160,230,255,.22)'; for (let i = 0; i < 10; i++) ctx.fillRect(ROAD_L + ((i * 97 + s.t * 1000) % (ROAD_R - ROAD_L)), ((i * 173 + s.t * 1800) % H), 2, 40); }
  }
  function wheels(x, y, w, h) { ctx.fillStyle = '#0B0B0D'; [[-w / 2 - 3, -h / 2 + 9], [w / 2 - 3, -h / 2 + 9], [-w / 2 - 3, h / 2 - 21], [w / 2 - 3, h / 2 - 21]].forEach(([a, b]) => ctx.fillRect(x + a, y + b, 6, 13)); }
  function carSimple(o, police) {
    const { x, y, w, h } = o;
    wheels(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(x - w / 2 + 3, y - h / 2 + 5, w, h, 8); ctx.fill();
    ctx.fillStyle = police ? '#F5F5F5' : o.c; rr(x - w / 2, y - h / 2, w, h, 8); ctx.fill();
    if (police) { ctx.fillStyle = '#111'; ctx.fillRect(x - w / 2, y - h / 2 + 18, w, 26); }
    ctx.fillStyle = 'rgba(20,30,45,.9)'; rr(x - w / 2 + 5, y - h / 2 + 30, w - 10, 12, 3); ctx.fill(); rr(x - w / 2 + 5, y - h / 2 + 12, w - 10, 10, 3); ctx.fill();
    ctx.fillStyle = '#FF5252'; ctx.fillRect(x - w / 2 + 3, y + h / 2 - 4, 7, 3); ctx.fillRect(x + w / 2 - 10, y + h / 2 - 4, 7, 3);
    if (police) {
      const on = Math.floor(st.t * 8) % 2;
      ctx.fillStyle = on ? '#FF1744' : '#2979FF'; ctx.fillRect(x - w / 2 + 4, y - 4, w / 2 - 4, 7);
      ctx.fillStyle = on ? '#2979FF' : '#FF1744'; ctx.fillRect(x, y - 4, w / 2 - 4, 7);
      ctx.fillStyle = '#FFF59D'; ctx.fillRect(x - w / 2 + 3, y - h / 2 + 1, 7, 3); ctx.fillRect(x + w / 2 - 10, y - h / 2 + 1, 7, 3);
    }
  }
  function truck(o) {
    const { x, y, w, h } = o;
    wheels(x, y, w, h);
    ctx.fillStyle = '#90A4AE'; rr(x - w / 2, y - h / 2 + 24, w, h - 24, 4); ctx.fill();
    ctx.fillStyle = '#B0BEC5'; ctx.fillRect(x - w / 2 + 4, y - h / 2 + 30, w - 8, h - 36);
    ctx.fillStyle = o.c; rr(x - w / 2 + 2, y + h / 2 - 26, w - 4, 26, 5); ctx.fill();
    ctx.fillStyle = 'rgba(20,30,45,.9)'; ctx.fillRect(x - w / 2 + 6, y + h / 2 - 12, w - 12, 6);
  }
  function gtr(x, y, inv) {
    if (inv > 0 && Math.floor(inv * 12) % 2) return;
    const w = 34, h = 62;
    wheels(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(x - w / 2 + 3, y - h / 2 + 5, w, h, 9); ctx.fill();
    // carroceria prata
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#8E9AA6'); g.addColorStop(.5, '#E3E9EF'); g.addColorStop(1, '#8E9AA6');
    ctx.fillStyle = g; rr(x - w / 2, y - h / 2, w, h, 9); ctx.fill();
    // capô e para-brisa
    ctx.fillStyle = 'rgba(15,25,40,.92)'; rr(x - w / 2 + 5, y - h / 2 + 16, w - 10, 13, 4); ctx.fill();
    ctx.fillStyle = 'rgba(15,25,40,.92)'; rr(x - w / 2 + 6, y + 8, w - 12, 9, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - w / 2 + 8, y - h / 2 + 18, 7, 2);
    // faixas azuis
    ctx.fillStyle = '#2F6FE0'; ctx.fillRect(x - 6, y - h / 2, 4, h); ctx.fillRect(x + 2, y - h / 2, 4, h);
    // faróis
    ctx.fillStyle = '#FFF8D6'; ctx.fillRect(x - w / 2 + 3, y - h / 2 + 2, 8, 3); ctx.fillRect(x + w / 2 - 11, y - h / 2 + 2, 8, 3);
    // aerofólio
    ctx.fillStyle = '#2B2F36'; ctx.fillRect(x - w / 2 - 1, y + h / 2 - 7, w + 2, 4);
    // 4 lanternas redondas
    ctx.fillStyle = '#FF2B2B';
    [-12, -6, 6, 12].forEach(dx => { ctx.beginPath(); ctx.arc(x + dx, y + h / 2 - 1, 2.6, 0, 7); ctx.fill(); });
    if (st.boost) { ctx.fillStyle = 'rgba(79,195,247,.9)'; ctx.beginPath(); ctx.moveTo(x - 7, y + h / 2); ctx.lineTo(x - 4, y + h / 2 + 18 + Math.random() * 10); ctx.lineTo(x - 1, y + h / 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 1, y + h / 2); ctx.lineTo(x + 4, y + h / 2 + 18 + Math.random() * 10); ctx.lineTo(x + 7, y + h / 2); ctx.fill(); }
  }
  function obstacle(o) {
    if (o.dead) return;
    if (o.k === 'car') carSimple(o);
    else if (o.k === 'truck') truck(o);
    else if (o.k === 'cone') { ctx.fillStyle = '#FF6D00'; ctx.beginPath(); ctx.moveTo(o.x - 10, o.y + 11); ctx.lineTo(o.x + 10, o.y + 11); ctx.lineTo(o.x, o.y - 11); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(o.x - 5, o.y, 10, 3); }
    else if (o.k === 'barreira') { ctx.fillStyle = '#fff'; ctx.fillRect(o.x - 30, o.y - 9, 60, 18); ctx.fillStyle = '#E53935'; for (let i = 0; i < 4; i++) ctx.fillRect(o.x - 30 + i * 16, o.y - 9, 8, 18); }
    else if (o.k === 'oleo') { ctx.fillStyle = 'rgba(10,10,14,.85)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 23, 14, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(120,90,200,.35)'; ctx.beginPath(); ctx.ellipse(o.x - 6, o.y - 3, 8, 4, 0, 0, 7); ctx.fill(); }
    else if (o.k === 'nitro') { const p = 0.6 + 0.4 * Math.sin(st.t * 10); ctx.fillStyle = `rgba(77,208,225,${p * .35})`; ctx.beginPath(); ctx.arc(o.x, o.y, 20, 0, 7); ctx.fill(); ctx.fillStyle = '#1565C0'; rr(o.x - 8, o.y - 14, 16, 28, 5); ctx.fill(); ctx.fillStyle = '#E1F5FE'; ctx.font = '700 9px "Silkscreen", monospace'; ctx.textAlign = 'center'; ctx.fillText('N', o.x, o.y + 3); }
  }
  function hud() {
    const s = st;
    ctx.fillStyle = 'rgba(8,10,18,.72)'; ctx.fillRect(0, 0, W, 44);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 18px "Pixelify Sans", monospace';
    ctx.fillText(String(N.score()).padStart(6, '0'), 10, 27);
    ctx.font = '400 9px "Silkscreen", monospace'; ctx.fillStyle = '#9FB3C8'; ctx.fillText('PONTOS', 10, 39);
    ctx.textAlign = 'center'; ctx.font = '700 16px "Pixelify Sans", monospace'; ctx.fillStyle = s.boost ? '#4FC3F7' : '#fff';
    ctx.fillText(Math.round(s.speed / 3.2) + ' km/h', W / 2, 26);
    // nitro
    ctx.fillStyle = '#9FB3C8'; ctx.font = '400 9px "Silkscreen", monospace'; ctx.textAlign = 'left'; ctx.fillText('NITRO', 236, 15);
    ctx.fillStyle = '#1B2333'; ctx.fillRect(236, 19, 112, 8); ctx.fillStyle = '#4FC3F7'; ctx.fillRect(236, 19, 112 * s.nitro / 100, 8);
    ctx.fillStyle = '#9FB3C8'; ctx.fillText('POLÍCIA', 236, 39);
    ctx.fillStyle = '#1B2333'; ctx.fillRect(282, 32, 66, 7); ctx.fillStyle = s.gap < 30 ? '#FF5252' : '#FFD54F'; ctx.fillRect(282, 32, 66 * s.gap / 100, 7);
  }
  function draw() {
    const s = st;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    if (s.shake > 0) ctx.translate((Math.random() - .5) * 10, (Math.random() - .5) * 10);
    drawCity(); drawRoad();
    s.obs.forEach(o => { if (o.soft) obstacle(o); });
    s.obs.forEach(o => { if (!o.soft) obstacle(o); });
    gtr(s.x, H - 120, s.inv);
    // polícia
    if (s.gap < 55) {
      const py = H + 70 - (55 - s.gap) / 55 * 150;
      carSimple({ x: Math.max(ROAD_L + 20, Math.min(ROAD_R - 20, s.x + Math.sin(s.t * 2) * 30)), y: py, w: 36, h: 64 }, true);
    }
    s.fx.forEach(p => { ctx.globalAlpha = Math.max(0, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); });
    ctx.globalAlpha = 1;
    s.pops.forEach(p => { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.font = '700 15px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y); });
    ctx.globalAlpha = 1;
    ctx.restore();
    // sirene nas bordas
    const close = Math.max(0, (45 - s.gap) / 45);
    if (close > 0) {
      const on = Math.floor(s.t * 6) % 2;
      const g = ctx.createLinearGradient(0, H, 0, H - 220);
      g.addColorStop(0, on ? `rgba(255,23,68,${.45 * close})` : `rgba(41,121,255,${.45 * close})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, H - 220, W, 220);
    }
    if (s.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${s.flash * 1.6})`; ctx.fillRect(0, 0, W, H); }
    hud();
    if (paused) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = '700 22px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillText('PAUSADO', W / 2, H / 2); }
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!paused && !st.over) update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  function finish() {
    running = false; cancelAnimationFrame(raf); draw();
    onEnd && onEnd({ score: N.score(), dist: Math.floor(st.dist), near: st.near, crashes: st.crashes, tempo: Math.floor(st.t) });
  }

  function kd(e) {
    if (!running) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.l = true;
    else if (k === 'arrowright' || k === 'd') keys.r = true;
    else if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'shift') keys.n = true;
    else if (k === 'p' || k === 'escape') paused = !paused;
    else return;
    e.preventDefault();
  }
  function ku(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.l = false;
    else if (k === 'arrowright' || k === 'd') keys.r = false;
    else if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'shift') keys.n = false;
  }
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);

  N.mount = function (canvas, opts) {
    cv = canvas; ctx = cv.getContext('2d');
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    onEnd = opts && opts.onEnd;
    // toque na tela: metade esquerda/direita
    const setT = (e, on) => { const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width; if (on) { touch.l = x < .5; touch.r = x >= .5; } else { touch.l = touch.r = false; } };
    cv.onpointerdown = e => { setT(e, true); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (touch.l || touch.r) setT(e, true); };
    cv.onpointerup = cv.onpointercancel = e => setT(e, false);
    reset(); paused = false; draw();
  };
  N.bindButton = function (btn, key) {
    const on = e => { e.preventDefault(); touch[key] = true; };
    const off = () => { touch[key] = false; };
    btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointerleave', off); btn.addEventListener('pointercancel', off);
  };
  N.start = function () { reset(); keys = {}; touch.l = touch.r = touch.n = false; paused = false; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
  N.stop = function () { running = false; cancelAnimationFrame(raf); };
  N.pause = function (p) { paused = p == null ? !paused : p; };
  N.running = () => running;
})();
