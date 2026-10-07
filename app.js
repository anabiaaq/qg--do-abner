/* QG do Abner — inicialização, login, navegação, barra do agente, modo dormir e jogo */
(function () {
  'use strict';
  const Q = QG, { $, h, toast, Store } = Q;
  const { ROOMS, SCENES, AGENTS, LOOKS } = QGData;
  const App = (window.App = { room: null, sleeping: false, estado: {}, entered: false });
  let sleepTimer = 0, near = null, dismissed = null;

  function saveEstado() { if (App.entered) Store.set('estado', { sala: App.room, dormindo: App.sleeping, desde: App.estado.desde || null }); }
  const touch = () => window.matchMedia && matchMedia('(pointer: coarse)').matches;

  App.go = function (id, opts) {
    opts = opts || {};
    if (!ROOMS[id]) id = 'hall';
    if (App.sleeping && id !== 'eclipse' && !opts.force) { toast('Você está dormindo. Acorde para sair do quarto.'); return; }
    if (window.Nitro && Nitro.running()) App.closeGame();
    const prev = App.room;
    App.room = id;
    hideComposer();
    let spawn;
    if (id === 'hall' && prev && prev !== 'hall') { const d = SCENES.hall.doors.find(x => x.to === prev); if (d) spawn = d.side === 'L' ? [1, d.a] : [d.a, 1]; }
    World.load(SCENES[id], { spawn, playerLook: LOOKS.abner });
    $('#roomNow').innerHTML = 'Sala: <b>' + Q.esc(ROOMS[id].nome) + '</b>';
    $('#hint').textContent = id === 'hall' ? 'Clique no chão ou use as setas para andar · entre pelas portas' : (SCENES[id].npcs || []).length ? 'Chegue perto de um agente para conversar · setas também andam' : 'Clique no chão ou use as setas para andar';
    document.querySelectorAll('#dock button').forEach(b => b.setAttribute('aria-current', String(b.dataset.room === id)));
    Panels.render(id);
    if (id === 'eclipse') setSleep(true); else if (App.sleeping) setSleep(false);
    if (id !== 'eclipse' && App.entered) {
      const first = (SCENES[id].npcs || [])[0];
      if (first) setTimeout(() => World.say(first.id, AGENTS[first.id] ? AGENTS[first.id].pede : 'Oi!'), 500);
    }
    saveEstado();
  };

  /* ---------- barra do agente ---------- */
  const cmp = $('#composer'), inp = $('#cmpInput'), link = $('#cmpLink'), send = $('#cmpSend');
  function showComposer(a) {
    const ag = AGENTS[a.id]; if (!ag) return;
    near = a;
    cmp.style.setProperty('--c', ROOMS[App.room].cor);
    $('#cmpName').textContent = ag.nome; $('#cmpRole').textContent = ag.papel;
    Avatar.portrait($('#cmpHead'), LOOKS[a.id], {});
    inp.placeholder = ag.pede; inp.value = '';
    const wa = a.id === 'ratinha';
    send.hidden = wa; link.hidden = !wa;
    if (wa) link.href = 'https://wa.me/' + Panels.WA;
    cmp.hidden = false;
    if (!touch()) setTimeout(() => inp.focus({ preventScroll: true }), 30);
  }
  function hideComposer() { cmp.hidden = true; near = null; }
  inp.addEventListener('input', () => { if (near && near.id === 'ratinha') link.href = 'https://wa.me/' + Panels.WA + (inp.value.trim() ? '?text=' + encodeURIComponent(inp.value.trim()) : ''); });
  $('#cmpForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!near || near.id === 'ratinha') return;
    const t = inp.value.trim(); if (!t) { inp.focus(); return; }
    if (App.sleeping) return;
    Panels.ask(App.room, near.id, t);
    inp.value = '';
    if (touch()) setTimeout(() => $('#pbody').scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  });
  $('#cmpClose').onclick = () => { dismissed = near; hideComposer(); };

  /* ---------- dormir ---------- */
  function setSleep(on) {
    App.sleeping = on;
    World.setLights(!on);
    $('#sleep').hidden = !on;
    $('#app').setAttribute('aria-hidden', String(on));
    const s = $('#status'); s.textContent = on ? '☾ Off' : '● Online'; s.classList.toggle('off', on);
    clearInterval(sleepTimer);
    if (on) {
      if (!App.estado.desde) App.estado.desde = Date.now();
      const tick = () => { const m = Math.floor((Date.now() - App.estado.desde) / 60000); $('#sleepTimer').textContent = 'Offline há ' + (m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'min'); };
      tick(); sleepTimer = setInterval(tick, 30000);
      setTimeout(() => $('#wake').focus(), 50);
    } else App.estado.desde = null;
    saveEstado();
  }
  App.wake = function () { setSleep(false); App.go('hall', { force: true }); };
  $('#wake').onclick = () => App.wake();

  /* ---------- jogo ---------- */
  let gameMounted = false;
  App.openGame = async function () {
    if (App.sleeping) return;
    $('#nitro').hidden = false; World.keysOff = true;
    Nitro.mount($('#nitroCanvas'), { onEnd: endGame });
    if (!gameMounted) { Nitro.bindButton($('#padL'), 'l'); Nitro.bindButton($('#padR'), 'r'); Nitro.bindButton($('#padN'), 'n'); gameMounted = true; }
    const g = (await Store.get('garagem')) || {};
    showOver(h('h3', null, 'Fuga Nitro'), h('p', null, 'Desvie do trânsito, pegue nitro e não deixe a polícia te alcançar.'),
      h('p', null, 'Recorde: ', h('b', null, (g.recorde || 0).toLocaleString('pt-BR'))),
      h('button', { class: 'btn gold', type: 'button', id: 'nitroGo', onclick: startGame }, 'Ligar o motor'),
      h('p', { style: { fontSize: '12px' } }, 'Setas ou A/D para virar · Espaço para nitro · P para pausar'));
    setTimeout(() => { const b = $('#nitroGo'); b && b.focus(); }, 30);
  };
  function showOver(...kids) { const o = $('#nitroOver'); o.replaceChildren(...kids); o.hidden = false; }
  function startGame() { $('#nitroOver').hidden = true; Nitro.start(); }
  async function endGame(r) {
    showOver(h('h3', null, 'Pego!'), h('p', null, 'A viatura te alcançou.'), h('div', { class: 'big' }, r.score.toLocaleString('pt-BR')), h('p', null, 'pontos · ' + r.dist.toLocaleString('pt-BR') + ' m · ' + r.near + ' quase-batidas'), h('p', { id: 'nitroRec' }, 'Salvando…'),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { class: 'btn gold', type: 'button', id: 'nitroAgain', onclick: startGame }, 'Correr de novo'), h('button', { class: 'btn ghost', type: 'button', style: { color: '#fff', boxShadow: 'inset 0 0 0 1.5px #fff' }, onclick: App.closeGame }, 'Sair da pista')));
    setTimeout(() => { const b = $('#nitroAgain'); b && b.focus(); }, 30);
    const res = await Panels.saveRun(r);
    const el = $('#nitroRec'); if (el) el.replaceChildren(res.novo ? h('b', { style: { color: '#F2B705' } }, 'NOVO RECORDE!') : 'Recorde: ' + res.recorde.toLocaleString('pt-BR'));
  }
  App.closeGame = function () { Nitro.stop(); $('#nitro').hidden = true; World.keysOff = false; };
  $('#nitroClose').onclick = App.closeGame;

  /* ---------- navegação ---------- */
  const dock = $('#dock');
  Object.keys(ROOMS).forEach(k => dock.append(h('button', { type: 'button', 'data-room': k, 'aria-current': 'false', onclick: () => App.go(k) }, h('span', { class: 'sq', style: { background: ROOMS[k].cor } }), ROOMS[k].curto)));

  /* ---------- login (Supabase) ---------- */
  const PF = window.QGPlatform;
  let mode = 'loading';
  function setMode(m) {
    mode = m;
    $('#loginFields').hidden = m === 'loading';
    $('#loginBtn').hidden = m === 'loading';
    $('#lgUser').closest('.field').hidden = m === 'newpass';
    $('#lgPass').closest('.field').hidden = m === 'forgot';
    $('#lgPass2Wrap').hidden = m !== 'newpass';
    $('#lgResetWrap').hidden = true;
    $('#forgot').hidden = m !== 'login';
    $('#forgot').textContent = 'Esqueci a senha';
    $('#loginErr').hidden = true;
    const H = $('#loginH'), P = $('#loginP'), B = $('#loginBtn');
    if (m === 'login') { H.textContent = 'Bem-vindo ao QG'; P.textContent = 'Entre com seu e-mail e senha.'; B.textContent = 'Entrar'; }
    else if (m === 'forgot') { H.textContent = 'Recuperar senha'; P.textContent = 'Vamos mandar um link para o seu e-mail.'; B.textContent = 'Enviar link'; }
    else if (m === 'newpass') { H.textContent = 'Nova senha'; P.textContent = 'Escolha uma senha nova para entrar no QG.'; B.textContent = 'Salvar nova senha'; }
    $('#loginNote').textContent = m === 'loading' ? '' : 'Acesso protegido. Só quem tem conta criada entra.';
    if (m !== 'loading') setTimeout(() => (m === 'newpass' ? $('#lgPass') : $('#lgUser')).focus(), 30);
  }
  function err(t) { const e = $('#loginErr'); e.textContent = t; e.hidden = false; }
  $('#forgot').onclick = () => setMode('forgot');
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const u = $('#lgUser').value.trim(), p = $('#lgPass').value, p2 = $('#lgPass2').value;
    $('#loginBtn').disabled = true;
    try {
      if (mode === 'login') {
        if (!u || !p) return err('Preencha e-mail e senha.');
        try { const user = await PF.signIn(u, p); PF.markAuthed(user); enter(); }
        catch (x) { err('E-mail ou senha incorretos.'); $('#lgPass').value = ''; $('#lgPass').focus(); }
      } else if (mode === 'forgot') {
        if (!u) return err('Digite seu e-mail.');
        await PF.sendReset(u); toast('Se esse e-mail tiver conta, o link chega em instantes.'); setMode('login');
      } else if (mode === 'newpass') {
        if (p.length < 6) return err('A senha precisa ter pelo menos 6 caracteres.');
        if (p !== p2) return err('As senhas não são iguais.');
        const { error } = await PF.updatePassword(p);
        if (error) return err('Não consegui salvar a senha. Peça um novo link.');
        const s = await PF.session(); PF.markAuthed(s.user); toast('Senha nova salva!'); enter();
      }
    } finally { $('#loginBtn').disabled = false; }
  });
  $('#logout').onclick = async () => { await PF.signOut(); location.reload(); };

  async function enter() {
    World.keysOff = false;
    $('#login').hidden = true; $('#app').setAttribute('aria-hidden', 'false');
    await Store.init();
    const est = (await Store.get('estado')) || {};
    App.estado = { desde: est.desde || null };
    App.entered = true;
    if (est.dormindo) App.go('eclipse');
    else App.go(est.sala && ROOMS[est.sala] && est.sala !== 'eclipse' ? est.sala : 'hall');
  }
  Q.onStoreDegraded = () => toast('Não consegui salvar no banco agora. Seus dados ficaram guardados neste navegador.', 'warn');

  async function boot() {
    World.init($('#world'), {
      door: d => App.go(d.to),
      npc: a => { if (dismissed === a) { dismissed = null; showComposer(a); } },
      near: a => { if (a && dismissed !== a) showComposer(a); else if (!a) { dismissed = null; hideComposer(); } },
      furni: f => Panels.onFurni(App.room, f)
    });
    World.drawPortrait($('#loginAvatar'), LOOKS.abner, 2);
    App.go('hall');
    $('#app').setAttribute('aria-hidden', 'true'); World.keysOff = true;
    setMode('loading');
    $('#lgUser').type = 'email'; $('#lgUser').autocomplete = 'email'; $('#lgUser').previousElementSibling.textContent = 'E-mail';
    let recovering = false;
    PF.onRecovery(() => { recovering = true; setMode('newpass'); });
    const s = await PF.session();
    if (recovering || /type=recovery/.test(location.hash)) { setMode('newpass'); return; }
    if (s) { PF.markAuthed(s.user); return enter(); }
    setMode('login');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
