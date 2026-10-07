/* QG do Abner — núcleo: utilidades, armazenamento, login, IA, renderizadores e exportações */
(function () {
  'use strict';
  const Q = (window.QG = {});
  // ignora null/false em replaceChildren e append (blocos opcionais)
  ['replaceChildren', 'append'].forEach(m => { const o = Element.prototype[m]; Element.prototype[m] = function (...k) { return o.apply(this, k.filter(x => x != null && x !== false)); }; });

  /* ---------- utilidades ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach(c => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
  }
  function md(s) {
    if (!s) return '';
    const lines = String(s).replace(/\r/g, '').split('\n');
    let out = '', list = null, para = [];
    const flushP = () => { if (para.length) { out += '<p>' + inline(para.join(' ')) + '</p>'; para = []; } };
    const flushL = () => { if (list) { out += `<${list.t}>` + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + `</${list.t}>`; list = null; } };
    for (const raw of lines) {
      const l = raw.trim();
      let m;
      if (!l) { flushP(); flushL(); continue; }
      if ((m = l.match(/^#{1,4}\s+(.*)/))) { flushP(); flushL(); out += '<h4>' + inline(m[1]) + '</h4>'; continue; }
      if ((m = l.match(/^[-•*]\s+(.*)/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = l.match(/^\d+[.)]\s+(.*)/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
      flushL(); para.push(l);
    }
    flushP(); flushL();
    return out;
  }
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtBRL = v => BRL.format(Number(v) || 0);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad2 = n => String(n).padStart(2, '0');
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function monthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function monthLabel(k) { const [y, m] = k.split('-'); return MESES[+m - 1] + ' de ' + y; }
  function fmtDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return d + '/' + m + '/' + y; }
  function toast(msg, kind) {
    const t = $('#toast'); if (!t) return;
    const el = h('div', { class: 'toast-item ' + (kind || '') , role: 'status' }, msg);
    t.append(el); setTimeout(() => el.classList.add('out'), 3800); setTimeout(() => el.remove(), 4300);
  }
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); toast('Copiado!'); if (btn) { const o = btn.textContent; btn.textContent = 'Copiado'; setTimeout(() => btn.textContent = o, 1400); } }
    catch (e) { toast('Não deu para copiar automaticamente. Selecione o texto e copie.', 'warn'); }
  }
  Object.assign(Q, { $, $$, esc, h, md, inline, fmtBRL, uid, todayISO, monthKey, monthLabel, fmtDate, toast, copy, MESES, pad2 });

  /* ---------- armazenamento ---------- */
  const LS = 'qg-abner:';
  function lsGet(k) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { } }
  const Store = {
    mode: 'local', db: null, uid: null, user: null, queues: {}, ready: null,
    init() {
      if (this.ready) return this.ready;
      this.ready = (async () => {
        if (!(window.claude && typeof window.claude.use === 'function')) return;
        try {
          const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
          this.user = user;
          if (db && user) { const id = await user.id(); if (id) { this.db = db; this.uid = id; this.mode = 'db'; } }
        } catch (e) { }
      })();
      return this.ready;
    },
    ref(k) { return this.db.doc('data/users/' + this.uid + '/' + k); },
    async get(k) {
      await this.init();
      if (this.mode === 'db') {
        try { const s = await this.ref(k).get(); if (s.exists) { const v = JSON.parse(JSON.stringify(s.data())); lsSet(k, v); return v; } return lsGet(k); }
        catch (e) { return lsGet(k); }
      }
      return lsGet(k);
    },
    set(k, v) {
      lsSet(k, v);
      const run = async () => {
        await this.init();
        if (this.mode !== 'db') return;
        try { await this.ref(k).set(v); }
        catch (e) {
          if (e && e.code === 'invalid_argument') { this.mode = 'local'; Q.onStoreDegraded && Q.onStoreDegraded(); }
          else if (e && e.code === 'quota_exceeded') toast('O espaço do QG está cheio. Apague itens antigos.', 'warn');
        }
      };
      const prev = this.queues[k] || Promise.resolve();
      const next = prev.then(run, run);
      this.queues[k] = next;
      return next;
    },
    async del(k) { try { localStorage.removeItem(LS + k); } catch (e) { } await this.init(); if (this.mode === 'db') { try { await this.ref(k).delete(); } catch (e) { } } },
    lget: lsGet, lset: lsSet
  };
  Q.Store = Store;

  /* ---------- login ---------- */
  async function sha(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let h1 = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h1 ^= text.charCodeAt(i); h1 = Math.imul(h1, 16777619); } return 'f' + (h1 >>> 0).toString(16);
    }
  }
  Q.Auth = {
    async account() { return Store.get('conta'); },
    async create(user, pass) { const salt = uid(); const conta = { usuario: user.trim().toLowerCase(), salt, hash: await sha(salt + ':' + pass), criadoEm: Date.now() }; await Store.set('conta', conta); return conta; },
    async check(conta, user, pass) { return conta && conta.usuario === user.trim().toLowerCase() && conta.hash === await sha(conta.salt + ':' + pass); },
    remember(on) { try { on ? sessionStorage.setItem(LS + 'sessao', '1') : sessionStorage.removeItem(LS + 'sessao'); } catch (e) { } },
    remembered() { try { return sessionStorage.getItem(LS + 'sessao') === '1'; } catch (e) { return false; } }
  };

  /* ---------- IA ---------- */
  const CTX = 'CONTEXTO: Abner é estudante de Psicologia no 6º semestre (UNINASSAU), integrante da Neuroliga da UFBA (liga acadêmica de neurociência), cristão, e quer empreender unindo psicologia, política e fé. Escreva sempre em português do Brasil, com clareza, calor humano e rigor.';
  const BLOCKS = `Formato dos "blocos" (cada um é um objeto com "tipo"):
{"tipo":"texto","titulo":"...","texto":"parágrafos curtos; use **negrito** para termos-chave; separe parágrafos com \\n\\n"}
{"tipo":"lista","titulo":"...","itens":["..."]}
{"tipo":"passos","titulo":"...","itens":[{"titulo":"...","texto":"..."}]}
{"tipo":"tabela","titulo":"...","colunas":["..."],"linhas":[["..."]],"fonte":"..."}
{"tipo":"grafico","forma":"barras"|"linha"|"pizza","titulo":"...","rotulos":["..."],"valores":[numeros],"unidade":"% ou outra","fonte":"de onde vêm os números, ou 'Ilustrativo' se forem didáticos"}
{"tipo":"mapa","titulo":"...","centro":"conceito central","ramos":[{"titulo":"...","itens":["..."]}]}
{"tipo":"analogia","texto":"..."}
{"tipo":"exemplo","titulo":"...","texto":"..."}
{"tipo":"destaque","titulo":"...","texto":"..."}
{"tipo":"citacao","texto":"...","autor":"..."}`;
  const REFS_RULE = 'Referências: use apenas obras e documentos reais e conhecidos (livros clássicos, manuais, artigos muito citados, resoluções do CFP, documentos da OMS/Ministério da Saúde). Formate em ABNT NBR 6023:2018 (SOBRENOME, Nome. Título em negrito sem marcação. Edição. Cidade: Editora, ano.). Nunca invente DOI, link, página ou autor; se não tiver certeza de um detalhe, omita esse detalhe.';
  Q.CTX = CTX; Q.BLOCKS = BLOCKS; Q.REFS_RULE = REFS_RULE;

  const AI = {
    _p: null,
    get() { if (!this._p) this._p = (window.claude && typeof window.claude.use === 'function') ? window.claude.use('sample').catch(() => null) : Promise.resolve(null); return this._p; },
    async json(prompt, o) {
      o = o || {};
      const s = await this.get(); if (!s) throw { code: 'unavailable' };
      return s.json(prompt, { signal: o.signal, images: o.images, modelTier: o.tier || 'default', cache: false, onText: o.onProgress ? ({ text }) => o.onProgress(text) : undefined });
    },
    async text(input, o) {
      o = o || {};
      const s = await this.get(); if (!s) throw { code: 'unavailable' };
      return s(input, { signal: o.signal, modelTier: o.tier || 'default', cache: false, onText: o.onText });
    },
    async limits() { const s = await this.get(); if (!s) return null; try { return await s.limits(); } catch (e) { return null; } },
    msg(e) {
      const c = e && e.code, det = e && e.message ? ' (' + e.message + ')' : '';
      return ({
        unavailable: 'A IA não carregou. Saia e entre de novo no QG.',
        not_granted: 'Sua conta não tem permissão para usar a IA. Confira o secret ALLOWED_EMAILS no Supabase.' + det,
        session_expired: 'A função da IA recusou o acesso. Desligue a verificação de JWT da função "claude" no Supabase, ou saia e entre de novo.' + det,
        rate_limited: 'Muitos pedidos seguidos ou limite da conta Anthropic atingido. Espere um pouco.' + det,
        refused: 'O agente não pôde responder a esse pedido. Tente reformular.',
        invalid_json: 'A resposta veio bagunçada. Toque em tentar de novo.',
        image_rejected: 'Essa imagem não foi aceita. Tente uma foto JPG ou PNG mais nítida.',
        prompt_too_large: 'O pedido ficou grande demais. Tente com menos texto.',
        empty_completion: 'O agente ficou sem palavras. Tente de outro jeito.',
        cancelled: 'Pedido interrompido.'
      })[c] || ('A IA não respondeu' + (det || '.') );
    }
  };
  Q.AI = AI;

  /* carregamento estilo hotel */
  Q.loading = function (label, onStop) {
    const txt = h('span', { class: 'ld-txt' }, label);
    const meta = h('span', { class: 'ld-meta' }, 'Pensando…');
    const stop = onStop ? h('button', { class: 'btn ghost sm', type: 'button', onclick: onStop }, 'Parar') : null;
    const el = h('div', { class: 'loading', role: 'status' }, h('span', { class: 'ld-dots' }, h('i'), h('i'), h('i')), h('div', { class: 'ld-col' }, txt, meta), stop);
    el.progress = n => { meta.textContent = 'Escrevendo… ' + (n > 1000 ? (n / 1000).toFixed(1) + ' mil' : n) + ' caracteres'; };
    return el;
  };

  /* ---------- gráficos SVG ---------- */
  const num = v => { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  function fmtN(v, u) { const s = Math.abs(v) >= 1000 ? v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }); return u === 'R$' ? 'R$ ' + s : s + (u ? (u === '%' ? '%' : ' ' + u) : ''); }
  function chart(spec) {
    if (!spec || !Array.isArray(spec.rotulos) || !Array.isArray(spec.valores)) return null;
    const n = Math.min(spec.rotulos.length, spec.valores.length);
    if (!n) return null;
    let labels = spec.rotulos.slice(0, n).map(String), vals = spec.valores.slice(0, n).map(num);
    const forma = (spec.forma || 'barras').toLowerCase();
    let svg = '';
    if (forma.startsWith('pizza') || forma.startsWith('rosca')) {
      if (labels.length > 6) { const rest = vals.slice(5).reduce((a, b) => a + b, 0); labels = labels.slice(0, 5).concat('Outros'); vals = vals.slice(0, 5).concat(rest); }
      const tot = vals.reduce((a, b) => a + Math.max(0, b), 0) || 1;
      let a0 = -Math.PI / 2; const cx = 90, cy = 90, R = 78, r = 48;
      const arcs = vals.map((v, i) => {
        const a1 = a0 + Math.max(0, v) / tot * Math.PI * 2;
        const big = a1 - a0 > Math.PI ? 1 : 0;
        const p = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
        const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
        const d = vals.length === 1 ? `M${cx - R},${cy}a${R},${R} 0 1,0 ${R * 2},0a${R},${R} 0 1,0 ${-R * 2},0M${cx - r},${cy}a${r},${r} 0 1,1 ${r * 2},0a${r},${r} 0 1,1 ${-r * 2},0` : `M${x0},${y0}A${R},${R} 0 ${big} 1 ${x1},${y1}L${x2},${y2}A${r},${r} 0 ${big} 0 ${x3},${y3}Z`;
        a0 = a1;
        return `<path d="${d}" class="sr s${i + 1}" fill-rule="evenodd"><title>${esc(labels[i])}: ${fmtN(vals[i], spec.unidade)} (${(v / tot * 100).toFixed(0)}%)</title></path>`;
      }).join('');
      const pctU = spec.unidade === '%';
      const legend = labels.map((l, i) => `<div class="lg-row"><span class="sw s${i + 1}"></span><span class="lg-l">${esc(l)}</span><span class="lg-v">${pctU ? (vals[i] / tot * 100).toFixed(0) + '%' : fmtN(vals[i], spec.unidade) + ' · ' + (vals[i] / tot * 100).toFixed(0) + '%'}</span></div>`).join('');
      const center = pctU ? '' : `<text x="90" y="88" class="c-big" text-anchor="middle">${fmtN(tot, spec.unidade)}</text><text x="90" y="106" class="c-mut" text-anchor="middle">total</text>`;
      svg = `<div class="donut-wrap"><svg viewBox="0 0 180 180" class="donut" role="img" aria-label="${esc(spec.titulo || 'Gráfico')}">${arcs}${center}</svg><div class="legend">${legend}</div></div>`;
    } else if (forma.startsWith('linha')) {
      const Wd = 600, Ht = 260, L = 58, Rr = 16, T = 26, B = 36;
      const mx = Math.max(...vals), mn = Math.min(0, ...vals), span = (mx - mn) || 1;
      const X = i => L + (n === 1 ? (Wd - L - Rr) / 2 : i * (Wd - L - Rr) / (n - 1)), Y = v => T + (Ht - T - B) * (1 - (v - mn) / span);
      const ticks = 4; let grid = '';
      for (let i = 0; i <= ticks; i++) { const v = mn + span * i / ticks, y = Y(v); grid += `<line x1="${L}" x2="${Wd - Rr}" y1="${y}" y2="${y}" class="c-grid"/><text x="${L - 6}" y="${y + 4}" class="c-ax" text-anchor="end">${fmtN(+v.toFixed(1), spec.unidade === '%' ? '%' : '')}</text>`; }
      const pts = vals.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
      const area = `M${X(0)},${Y(mn)} L${vals.map((v, i) => `${X(i)},${Y(v)}`).join(' L')} L${X(n - 1)},${Y(mn)}Z`;
      const step = Math.ceil(n / 7);
      const xl = labels.map((l, i) => (i % step === 0 || i === n - 1) ? `<text x="${X(i)}" y="${Ht - 12}" class="c-ax" text-anchor="middle">${esc(l.length > 10 ? l.slice(0, 9) + '…' : l)}</text>` : '').join('');
      const dots = vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === n - 1 ? 5 : 3.5}" class="c-dot"><title>${esc(labels[i])}: ${fmtN(v, spec.unidade)}</title></circle>`).join('');
      const lastLbl = `<text x="${Math.min(X(n - 1), Wd - Rr - 4)}" y="${Math.max(16, Y(vals[n - 1]) - 10)}" class="c-val" text-anchor="end">${fmtN(vals[n - 1], spec.unidade)}</text>`;
      svg = `<svg viewBox="0 0 ${Wd} ${Ht}" class="chart" role="img" aria-label="${esc(spec.titulo || 'Gráfico')}">${grid}<path d="${area}" class="c-area"/><polyline points="${pts}" class="c-line"/>${dots}${lastLbl}${xl}</svg>`;
    } else {
      const mx = Math.max(...vals.map(v => Math.abs(v))) || 1;
      svg = `<div class="hbars" role="img" aria-label="${esc(spec.titulo || 'Gráfico')}">` + vals.map((v, i) => `<div class="hb-row"><span class="hb-l">${esc(labels[i])}</span><span class="hb-track"><span class="hb-bar ${spec.cores ? 's' + (i % 6 + 1) : 's1'}" style="width:${Math.max(1.5, Math.abs(v) / mx * 100).toFixed(1)}%" title="${esc(labels[i])}: ${fmtN(v, spec.unidade)}"></span></span><span class="hb-v">${fmtN(v, spec.unidade)}</span></div>`).join('') + '</div>';
    }
    const ilustr = /ilustrativ/i.test(spec.fonte || '');
    return h('figure', { class: 'fig' },
      spec.titulo ? h('figcaption', { class: 'fig-t' }, spec.titulo, ilustr ? h('span', { class: 'chip mini' }, 'dados ilustrativos') : null) : null,
      h('div', { class: 'fig-body', html: svg }),
      spec.fonte && !ilustr ? h('div', { class: 'fig-src' }, 'Fonte: ' + spec.fonte) : null);
  }
  Q.chart = chart;

  /* mapa conceitual (a "imagem" da aula) */
  function mindmap(b) {
    const ramos = (b.ramos || []).slice(0, 6); if (!ramos.length) return null;
    const Wd = 660, Ht = 460, cx = Wd / 2, cy = Ht / 2;
    let s = '';
    const pos = ramos.map((r, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / ramos.length; return [cx + Math.cos(a) * 215, cy + Math.sin(a) * 140]; });
    pos.forEach(([x, y], i) => { s += `<path d="M${cx},${cy} Q${(cx + x) / 2},${cy} ${x},${y}" class="mm-edge e${i % 6 + 1}"/>`; });
    s += `<g><rect x="${cx - 92}" y="${cy - 26}" width="184" height="52" rx="10" class="mm-center"/><foreignObject x="${cx - 88}" y="${cy - 24}" width="176" height="48"><div xmlns="http://www.w3.org/1999/xhtml" class="mm-ct">${esc(b.centro || '')}</div></foreignObject></g>`;
    pos.forEach(([x, y], i) => {
      const r = ramos[i]; const items = (r.itens || []).slice(0, 3);
      const hh = 34 + items.length * 20;
      const bx = Math.max(4, Math.min(Wd - 178, x - 87)), by = Math.max(4, Math.min(Ht - hh - 4, y - hh / 2));
      s += `<g><rect x="${bx}" y="${by}" width="174" height="${hh}" rx="8" class="mm-node n${i % 6 + 1}"/><foreignObject x="${bx + 7}" y="${by + 5}" width="160" height="${hh - 6}"><div xmlns="http://www.w3.org/1999/xhtml" class="mm-nd"><b>${esc(r.titulo || '')}</b>${items.map(t => '<span>' + esc(t) + '</span>').join('')}</div></foreignObject></g>`;
    });
    return h('figure', { class: 'fig' }, b.titulo ? h('figcaption', { class: 'fig-t' }, b.titulo) : null,
      h('div', { class: 'fig-body scroll-x', html: `<svg viewBox="0 0 ${Wd} ${Ht}" class="mindmap" role="img" aria-label="${esc(b.titulo || 'Mapa conceitual')}">${s}</svg>` }),
      h('details', { class: 'mm-alt' }, h('summary', null, 'Ver como lista'), h('ul', null, ramos.map(r => h('li', null, h('b', null, r.titulo + ': '), (r.itens || []).join('; '))))));
  }

  /* ---------- renderizador de documentos em blocos ---------- */
  function table(b) {
    if (!b || !Array.isArray(b.colunas)) return null;
    return h('figure', { class: 'fig' }, b.titulo ? h('figcaption', { class: 'fig-t' }, b.titulo) : null,
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, b.colunas.map(c => h('th', { html: inline(c) })))),
        h('tbody', null, (b.linhas || []).map(r => h('tr', null, (Array.isArray(r) ? r : [r]).map(c => h('td', { html: inline(c) }))))))),
      b.fonte ? h('div', { class: 'fig-src' }, 'Fonte: ' + b.fonte) : null);
  }
  function block(b, opts) {
    if (!b || typeof b !== 'object') return null;
    const t = (b.tipo || '').toLowerCase();
    const copyBtn = txt => opts && opts.copiavel ? h('button', { class: 'btn ghost xs', type: 'button', onclick: e => copy(txt, e.currentTarget) }, 'Copiar') : null;
    switch (t) {
      case 'texto': return h('section', { class: 'blk' }, b.titulo ? h('h3', null, b.titulo) : null, h('div', { class: 'prose', html: md(b.texto) }));
      case 'lista': return h('section', { class: 'blk' }, b.titulo ? h('h3', null, b.titulo) : null,
        h('ul', { class: 'list' + (opts && opts.copiavel ? ' copy-list' : '') }, (b.itens || []).map(i => h('li', null, h('span', { html: inline(typeof i === 'string' ? i : JSON.stringify(i)) }), copyBtn(String(i).replace(/\*\*/g, ''))))));
      case 'passos': return h('section', { class: 'blk' }, b.titulo ? h('h3', null, b.titulo) : null,
        h('ol', { class: 'steps' }, (b.itens || []).map(i => h('li', null, h('b', { html: inline(i.titulo || '') }), i.prazo ? h('span', { class: 'chip mini' }, i.prazo) : null, h('div', { class: 'prose', html: md(i.texto || '') })))));
      case 'tabela': return table(b);
      case 'grafico': return chart(b);
      case 'mapa': return mindmap(b);
      case 'analogia': return h('aside', { class: 'callout analogy' }, h('div', { class: 'co-t' }, 'Analogia'), h('div', { class: 'prose', html: md(b.texto) }));
      case 'exemplo': return h('aside', { class: 'callout example' }, h('div', { class: 'co-t' }, b.titulo || 'Exemplo prático'), h('div', { class: 'prose', html: md(b.texto) }));
      case 'destaque': return h('aside', { class: 'callout note' }, h('div', { class: 'co-t' }, b.titulo || 'Atenção'), h('div', { class: 'prose', html: md(b.texto) }), copyBtn(b.texto || ''));
      case 'citacao': return h('blockquote', { class: 'quote' }, h('p', { html: inline(b.texto) }), b.autor ? h('cite', null, '— ' + b.autor) : null);
      default: return b.texto ? h('div', { class: 'prose', html: md(b.texto) }) : null;
    }
  }
  function refs(list) {
    if (!Array.isArray(list) || !list.length) return null;
    return h('section', { class: 'blk refs' }, h('h3', null, 'Referências'),
      h('ol', { class: 'ref-list' }, list.map(r => h('li', { html: inline(r) }))),
      h('p', { class: 'fine' }, 'Referências sugeridas pelo agente. Confira edição e ano na biblioteca ou no Google Acadêmico antes de citar em trabalho.'));
  }
  Q.renderDoc = function (doc, opts) {
    opts = opts || {};
    const wrap = h('article', { class: 'doc' });
    if (doc.titulo) wrap.append(h('h2', { class: 'doc-t' }, doc.titulo));
    if (doc.resumo) wrap.append(h('p', { class: 'doc-lead', html: inline(doc.resumo) }));
    if (Array.isArray(doc.objetivos) && doc.objetivos.length) wrap.append(h('div', { class: 'goals' }, h('span', { class: 'lbl' }, 'Ao final você vai'), h('ul', null, doc.objetivos.map(o => h('li', { html: inline(o) })))));
    (doc.blocos || []).forEach(b => { try { const el = block(b, opts); if (el) wrap.append(el); } catch (e) { } });
    const r = refs(doc.referencias); if (r) wrap.append(r);
    return wrap;
  };
  Q.block = block; Q.table = table;

  /* ---------- downloads ---------- */
  Q.save = async function (filename, data) {
    let d = null;
    try { d = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { }
    if (!d) { toast('Download indisponível nesta visualização. Abra o QG pelo Claude.', 'warn'); return false; }
    try { await d.save({ filename, data }); toast('Arquivo pronto: ' + filename); return true; }
    catch (e) { if (e && e.code === 'declined') return false; toast(e && e.code === 'rate_limited' ? 'Já tem um download aguardando confirmação.' : 'Não consegui gerar o download agora.', 'warn'); return false; }
  };

  /* ---------- ABNT: estrutura de trabalho ---------- */
  function strip(s) { return String(s || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1'); }
  Q.toPaper = function (doc, meta) {
    meta = meta || {};
    const secs = [];
    let cur = null;
    const ensure = t => { if (t || !cur) { cur = { titulo: t || 'Desenvolvimento', itens: [] }; secs.push(cur); } return cur; };
    (doc.blocos || []).forEach(b => {
      const t = (b.tipo || '').toLowerCase();
      if (t === 'texto') { const s = ensure(b.titulo); String(b.texto || '').split(/\n\s*\n/).forEach(p => p.trim() && s.itens.push({ p: p.replace(/\n/g, ' ').trim() })); }
      else if (t === 'lista') { const s = ensure(b.titulo); (b.itens || []).forEach((it, i) => s.itens.push({ p: String.fromCharCode(97 + (i % 26)) + ') ' + (typeof it === 'string' ? it : JSON.stringify(it)) + (i === b.itens.length - 1 ? '.' : ';'), alinea: true })); }
      else if (t === 'passos') { const s = ensure(b.titulo); (b.itens || []).forEach((it, i) => s.itens.push({ p: '**' + (i + 1) + '. ' + (it.titulo || '') + '**' + (it.prazo ? ' (' + it.prazo + ')' : '') + ' — ' + (it.texto || '') })); }
      else if (t === 'tabela') { ensure(null).itens.push({ tabela: b }); }
      else if (t === 'grafico') { ensure(null).itens.push({ tabela: { titulo: b.titulo, colunas: ['Item', 'Valor' + (b.unidade ? ' (' + b.unidade + ')' : '')], linhas: (b.rotulos || []).map((r, i) => [r, String((b.valores || [])[i] ?? '')]), fonte: b.fonte } }); }
      else if (t === 'mapa') { const s = ensure(b.titulo); (b.ramos || []).forEach(r => s.itens.push({ p: '**' + (r.titulo || '') + ':** ' + (r.itens || []).join('; ') + '.' })); }
      else if (t === 'citacao') { ensure(null).itens.push({ citacao: b.texto, autor: b.autor }); }
      else if (b.texto) { ensure(null).itens.push({ p: (b.titulo ? '**' + b.titulo + ':** ' : (t === 'analogia' ? '**Analogia:** ' : '')) + b.texto }); }
    });
    return {
      instituicao: meta.instituicao || 'UNIVERSIDADE FEDERAL DA BAHIA',
      setor: meta.setor || 'NEUROLIGA',
      autor: meta.autor || 'Abner',
      titulo: doc.titulo || 'Estudo',
      subtitulo: meta.subtitulo || '',
      cidade: meta.cidade || 'Vitória da Conquista',
      ano: meta.ano || String(new Date().getFullYear()),
      resumo: doc.resumo || '',
      palavras: doc.palavras_chave || [],
      secoes: secs,
      referencias: (doc.referencias || []).slice().sort((a, b) => strip(a).localeCompare(strip(b), 'pt-BR'))
    };
  };

  /* ---------- ABNT: .docx ---------- */
  function x(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function runs(text, o) {
    const parts = String(text).split(/(\*\*.+?\*\*)/g).filter(Boolean);
    return parts.map(pt => {
      const b = /^\*\*.+\*\*$/.test(pt) || o.bold;
      const t = pt.replace(/^\*\*|\*\*$/g, '');
      return `<w:r><w:rPr>${b ? '<w:b/>' : ''}${o.caps ? '<w:caps/>' : ''}<w:sz w:val="${o.size || 24}"/><w:szCs w:val="${o.size || 24}"/></w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
    }).join('');
  }
  function wp(text, o) {
    o = o || {};
    const ppr = `<w:pPr>${o.pageBreak ? '<w:pageBreakBefore/>' : ''}${o.keepNext ? '<w:keepNext/>' : ''}<w:spacing w:before="${o.before || 0}" w:after="${o.after || 0}" w:line="${o.line || 360}" w:lineRule="auto"/>${o.indLeft ? `<w:ind w:left="${o.indLeft}"/>` : (o.ind === 0 ? '' : `<w:ind w:firstLine="${o.ind || 709}"/>`)}<w:jc w:val="${o.align || 'both'}"/></w:pPr>`;
    return `<w:p>${ppr}${text ? runs(text, o) : ''}</w:p>`;
  }
  function wtable(tb, n) {
    const cols = tb.colunas.length, cw = Math.floor(9071 / cols);
    const border = 'w:val="single" w:sz="6" w:space="0" w:color="000000"';
    const cell = (t, bold) => `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/></w:tcPr>${wp(t, { size: 20, line: 240, ind: 0, align: 'center', bold })}</w:tc>`;
    let s = wp('Tabela ' + n + ' – ' + (tb.titulo || ''), { size: 20, line: 240, ind: 0, align: 'center', before: 120, after: 60, keepNext: true });
    s += `<w:tbl><w:tblPr><w:tblW w:w="9071" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top ${border}/><w:bottom ${border}/><w:insideH w:val="single" w:sz="2" w:space="0" w:color="999999"/></w:tblBorders></w:tblPr><w:tblGrid>${Array(cols).fill(`<w:gridCol w:w="${cw}"/>`).join('')}</w:tblGrid>`;
    s += `<w:tr><w:trPr><w:tblHeader/></w:trPr>${tb.colunas.map(c => cell(strip(c), true)).join('')}</w:tr>`;
    (tb.linhas || []).forEach(r => { const row = Array.isArray(r) ? r : [r]; s += '<w:tr>' + Array.from({ length: cols }, (_, i) => cell(strip(row[i] ?? ''))).join('') + '</w:tr>'; });
    s += '</w:tbl>';
    s += wp('Fonte: ' + (tb.fonte || 'Elaborado pelo autor (' + new Date().getFullYear() + ').'), { size: 20, line: 240, ind: 0, align: 'left', after: 240 });
    return s;
  }
  Q.docxABNT = async function (paper) {
    if (!window.JSZip) throw new Error('JSZip ausente');
    let body = '';
    const blank = (k) => Array(k).fill(wp('', { ind: 0 })).join('');
    // capa
    body += wp(paper.instituicao, { bold: true, caps: true, align: 'center', ind: 0 });
    if (paper.setor) body += wp(paper.setor, { bold: true, caps: true, align: 'center', ind: 0 });
    body += blank(3) + wp(paper.autor, { caps: true, align: 'center', ind: 0 }) + blank(8);
    body += wp(paper.titulo + (paper.subtitulo ? ':' : ''), { bold: true, caps: true, align: 'center', ind: 0 });
    if (paper.subtitulo) body += wp(paper.subtitulo, { align: 'center', ind: 0 });
    body += blank(10) + wp(paper.cidade, { align: 'center', ind: 0 }) + wp(paper.ano, { align: 'center', ind: 0 });
    // resumo
    body += wp('RESUMO', { bold: true, align: 'center', ind: 0, pageBreak: true, after: 240 });
    body += wp(paper.resumo, { line: 240, ind: 0 });
    if (paper.palavras && paper.palavras.length) body += wp('**Palavras-chave:** ' + paper.palavras.join('; ') + '.', { line: 240, ind: 0, before: 240 });
    // texto
    let tn = 0;
    paper.secoes.forEach((s, i) => {
      body += wp((i + 1) + ' ' + s.titulo.toUpperCase(), { bold: true, align: 'left', ind: 0, before: 360, after: 240, keepNext: true, pageBreak: i === 0 });
      s.itens.forEach(it => {
        if (it.p) body += wp(it.p, it.alinea ? { indLeft: 709, ind: 0 } : {});
        else if (it.tabela) body += wtable(it.tabela, ++tn);
        else if (it.citacao) body += wp(it.citacao + (it.autor ? ' (' + it.autor + ')' : ''), { size: 20, line: 240, indLeft: 2268, ind: 0, before: 240, after: 240 });
      });
    });
    body += wp('REFERÊNCIAS', { bold: true, align: 'center', ind: 0, pageBreak: true, after: 240 });
    paper.referencias.forEach(r => { body += wp(r, { line: 240, ind: 0, align: 'left', after: 240 }); });
    const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701" w:header="1134" w:footer="709" w:gutter="0"/><w:titlePg/></w:sectPr></w:body></w:document>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
    const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${W_NS}><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>2</w:t></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:hdr>`;
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>');
    zip.file('word/document.xml', docXml);
    zip.file('word/styles.xml', styles);
    zip.file('word/header1.xml', header);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  };

  /* ---------- PDF (jsPDF) ---------- */
  const CP1252 = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  function pdfSafe(s) {
    return strip(s).replace(/→/g, '->').replace(/←/g, '<-').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/≈/g, '~').replace(/×/g, 'x')
      .split('').filter(c => { const k = c.charCodeAt(0); return (k >= 32 && k <= 126) || (k >= 160 && k <= 255) || CP1252.includes(c) || c === '\n'; }).join('');
  }
  Q.pdfSafe = pdfSafe;
  function newPdf() { if (!window.jspdf) throw new Error('jsPDF ausente'); return new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }); }
  // escreve parágrafo justificado com recuo de primeira linha
  function pdfPara(pdf, st, text, o) {
    o = o || {};
    const size = o.size || 12; pdf.setFont(o.font || 'times', o.bold ? 'bold' : 'normal'); pdf.setFontSize(size);
    const lh = size * 0.3528 * (o.line || 1.5);
    const left = st.L + (o.indLeft || 0), width = st.W - (o.indLeft || 0);
    const words = pdfSafe(text).split(/\s+/).filter(Boolean);
    const lines = []; let cur = [], first = true;
    const avail = () => width - (first && o.ind !== 0 ? (o.ind || 12.5) : 0);
    words.forEach(w => {
      const test = cur.concat(w).join(' ');
      if (pdf.getTextWidth(test) > avail() && cur.length) { lines.push({ w: cur, first }); cur = [w]; first = false; }
      else cur.push(w);
    });
    if (cur.length) lines.push({ w: cur, first, last: true });
    lines.forEach((ln, idx) => {
      if (st.y + lh > st.B) { st.addPage(); pdf.setFont(o.font || 'times', o.bold ? 'bold' : 'normal'); pdf.setFontSize(size); }
      const ind = ln.first && o.ind !== 0 ? (o.ind || 12.5) : 0;
      const x0 = left + ind, lw = width - ind;
      if (o.align === 'center') pdf.text(ln.w.join(' '), st.L + st.W / 2, st.y, { align: 'center' });
      else if (o.align === 'left' || ln.last || ln.w.length === 1) pdf.text(ln.w.join(' '), x0, st.y);
      else {
        const tw = ln.w.reduce((a, w) => a + pdf.getTextWidth(w), 0), gap = (lw - tw) / (ln.w.length - 1);
        let xx = x0; ln.w.forEach(w => { pdf.text(w, xx, st.y); xx += pdf.getTextWidth(w) + gap; });
      }
      st.y += lh;
    });
    st.y += o.after || 0;
  }
  function pdfState(pdf, numbered) {
    const st = { L: 30, R: 20, T: 30, Bm: 20, W: 160, y: 30, B: 297 - 20, page: 1 };
    st.addPage = () => { pdf.addPage(); st.page++; st.y = st.T; if (numbered) { pdf.setFont('times', 'normal'); pdf.setFontSize(10); pdf.text(String(st.page), 210 - st.R, 20, { align: 'right' }); } };
    return st;
  }
  function pdfTable(pdf, st, tb, n, font) {
    font = font || 'times';
    const cols = tb.colunas.length, cw = st.W / cols;
    pdf.setFont(font, 'normal'); pdf.setFontSize(10);
    if (st.y + 20 > st.B) st.addPage();
    if (n != null) { pdf.text(pdfSafe('Tabela ' + n + ' – ' + (tb.titulo || '')), st.L + st.W / 2, st.y, { align: 'center' }); st.y += 3; }
    pdf.setLineWidth(0.4); pdf.line(st.L, st.y, st.L + st.W, st.y);
    const row = (cells, bold) => {
      pdf.setFont(font, bold ? 'bold' : 'normal');
      const wrapped = cells.map(c => pdf.splitTextToSize(pdfSafe(c), cw - 3));
      const hgt = Math.max(...wrapped.map(w => w.length)) * 4.2 + 2.5;
      if (st.y + hgt > st.B) { st.addPage(); pdf.setFont(font, bold ? 'bold' : 'normal'); pdf.setFontSize(10); }
      wrapped.forEach((w, i) => pdf.text(w, st.L + i * cw + 1.5, st.y + 4.6));
      st.y += hgt;
    };
    row(tb.colunas.map(strip), true);
    pdf.setLineWidth(0.2); pdf.line(st.L, st.y, st.L + st.W, st.y);
    (tb.linhas || []).forEach(r => { const rr = Array.isArray(r) ? r : [r]; row(Array.from({ length: cols }, (_, i) => strip(rr[i] ?? ''))); });
    pdf.setLineWidth(0.4); pdf.line(st.L, st.y, st.L + st.W, st.y); st.y += 4;
    pdf.setFont(font, 'normal'); pdf.setFontSize(10);
    if (tb.fonte !== false) { pdf.text(pdfSafe('Fonte: ' + (tb.fonte || 'Elaborado pelo autor (' + new Date().getFullYear() + ').')), st.L, st.y); st.y += 8; }
  }
  Q.pdfTable = pdfTable;
  Q.pdfABNT = function (paper) {
    const pdf = newPdf(); const st = pdfState(pdf, true);
    const C = (t, o) => pdfPara(pdf, st, t, Object.assign({ align: 'center', ind: 0 }, o));
    pdf.setFont('times', 'bold'); pdf.setFontSize(12);
    C(paper.instituicao.toUpperCase(), { bold: true }); if (paper.setor) C(paper.setor.toUpperCase(), { bold: true });
    st.y += 25; C(paper.autor.toUpperCase());
    st.y = 120; C(paper.titulo.toUpperCase() + (paper.subtitulo ? ':' : ''), { bold: true }); if (paper.subtitulo) C(paper.subtitulo);
    st.y = 262; C(paper.cidade); C(paper.ano);
    st.addPage();
    C('RESUMO', { bold: true, after: 6 });
    pdfPara(pdf, st, paper.resumo, { line: 1, ind: 0 });
    if (paper.palavras && paper.palavras.length) { st.y += 4; pdfPara(pdf, st, 'Palavras-chave: ' + paper.palavras.join('; ') + '.', { line: 1, ind: 0 }); }
    let tn = 0;
    paper.secoes.forEach((s, i) => {
      if (i === 0) st.addPage(); else st.y += 6;
      if (st.y + 20 > st.B) st.addPage();
      pdfPara(pdf, st, (i + 1) + ' ' + s.titulo.toUpperCase(), { bold: true, align: 'left', ind: 0, after: 4 });
      s.itens.forEach(it => {
        if (it.p) pdfPara(pdf, st, it.p, it.alinea ? { indLeft: 12.5, ind: 0 } : {});
        else if (it.tabela) { st.y += 2; pdfTable(pdf, st, it.tabela, ++tn); }
        else if (it.citacao) { st.y += 3; pdfPara(pdf, st, it.citacao + (it.autor ? ' (' + it.autor + ')' : ''), { size: 10, line: 1, indLeft: 40, ind: 0, after: 4 }); }
      });
    });
    st.addPage();
    C('REFERÊNCIAS', { bold: true, after: 6 });
    paper.referencias.forEach(r => pdfPara(pdf, st, r, { line: 1, ind: 0, align: 'left', after: 4.2 }));
    return pdf.output('blob');
  };
  Q.newPdf = newPdf; Q.pdfState = pdfState; Q.pdfPara = pdfPara;

  Q.slug = s => String(s || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'arquivo';
})();
