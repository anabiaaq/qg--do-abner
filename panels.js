/* QG do Abner — painéis de cada sala */
(function () {
  'use strict';
  const Q = QG, { h, $, inline, md, toast, Store, AI } = Q;
  const { ROOMS, GRADE, LOOKS, AGENTS } = QGData;
  const P = (window.Panels = {});
  P.asks = {};
  let body = null, renderToken = 0;

  /* ---------- auxiliares ---------- */
  function drawHead(cv, look, bg) { Avatar.portrait(cv, look, { bg }); }
  P.drawHead = drawHead;
  function headCanvas(look, size, bg) { const c = h('canvas', { width: (size || 44) * 2, height: (size || 44) * 2, 'aria-hidden': 'true' }); drawHead(c, look, bg); return c; }
  const sel = (id, opts, val) => h('select', { id }, opts.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: String(v) === String(val) ? true : null }, t); }));
  function seg(id, opts, val, onChange) {
    const wrap = h('div', { class: 'seg', role: 'group', id });
    wrap.value = val;
    wrap.set = v => { wrap.value = v; Array.from(wrap.children).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === String(v)))); };
    opts.forEach(o => {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      const b = h('button', { type: 'button', 'data-v': v, 'aria-pressed': String(v === val), onclick: () => { wrap.set(v); onChange && onChange(v); } }, t);
      wrap.append(b);
    });
    return wrap;
  }
  function field(label, input, id) { if (id) input.id = input.id || id; return h('div', { class: 'field' }, h('label', { for: input.id }, label), input); }
  function card(title, ...kids) { return h('section', { class: 'card' }, title ? h('h2', null, title) : null, ...kids); }
  async function withLoading(host, label, task) {
    const ctl = new AbortController();
    const ld = Q.loading(label, () => ctl.abort());
    host.replaceChildren(ld);
    ld.scrollIntoView && ld.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    try { const r = await task(ctl.signal, t => ld.progress((t || '').length)); ld.remove(); return r; }
    catch (e) {
      ld.remove();
      if (e && e.code === 'cancelled') { host.replaceChildren(h('p', { class: 'fine' }, 'Pedido interrompido.')); return null; }
      host.replaceChildren(h('div', { class: 'err' }, AI.msg(e))); return null;
    }
  }
  function fmtWhen(ts) { const d = new Date(ts); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function chatBox(o) {
    const turns = [];
    const msgs = h('div', { class: 'msgs' });
    const ta = h('textarea', { id: 'chat-' + o.id, rows: 2, placeholder: o.placeholder || 'Escreva sua pergunta…', 'aria-label': 'Mensagem para ' + o.name });
    const btn = h('button', { class: 'btn sm', type: 'button' }, 'Enviar');
    if (o.intro) msgs.append(h('div', { class: 'msg ag' }, h('div', { class: 'prose', html: md(o.intro) })));
    async function send() {
      const t = ta.value.trim(); if (!t) return;
      ta.value = ''; turns.push({ role: 'user', content: t });
      msgs.append(h('div', { class: 'msg me' }, t));
      const pr = h('div', { class: 'prose' }, 'Pensando…');
      msgs.append(h('div', { class: 'msg ag' }, pr)); msgs.scrollTop = msgs.scrollHeight;
      btn.disabled = true;
      try {
        const { text } = await AI.text([{ role: 'user', content: o.rules() }].concat(turns.slice(-12)), { onText: ({ text }) => { pr.innerHTML = md(text); msgs.scrollTop = msgs.scrollHeight; } });
        turns.push({ role: 'assistant', content: text });
        if (o.agent) World.say(o.agent, text);
      } catch (e) {
        turns.pop();
        if (e && e.text) pr.innerHTML = md(e.text) + '<p class="fine">(resposta interrompida)</p>';
        else { pr.innerHTML = ''; pr.append(h('span', { class: 'fine' }, AI.msg(e))); }
      } finally { btn.disabled = false; }
    }
    btn.onclick = send;
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    return h('div', { class: 'chat' }, msgs, h('div', { class: 'chat-in' }, ta, btn));
  }
  function histList(items, onOpen, empty, meta) {
    if (!items.length) return h('div', { class: 'empty' }, empty);
    return h('ul', { class: 'list-plain' }, items.map(it => h('li', null, h('button', { class: 'hist-item', type: 'button', onclick: () => onOpen(it) },
      h('div', null, h('div', { class: 't' }, it.titulo || 'Sem título'), h('div', { class: 's' }, meta(it))),
      h('span', { class: 'chip' }, 'Abrir')))));
  }
  function scrollTo(el) { setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }

  /* ---------- montagem ---------- */
  const HEADS = { hall: 'abner', academia: 'marcha', lab: 'ignicao', agencia: 'drift', fabrica: 'faisca', conta: 'cambio', garagem: 'abner', toca: 'ratinha', eclipse: 'abner' };
  P.render = function (id) {
    body = $('#pbody'); const tok = ++renderToken;
    const r = ROOMS[id];
    $('#ptitle').textContent = r.nome; $('#psub').textContent = r.desc;
    const ph = $('.panel-head'); ph.style.background = r.cor; ph.style.color = r.ink;
    const cv = $('#phead'); cv.width = 88; cv.height = 88; drawHead(cv, LOOKS[HEADS[id]]);
    body.replaceChildren(); body.scrollTop = 0;
    P.asks[id] = null;
    const fn = P[id] || P.hall;
    Promise.resolve(fn(body, () => tok === renderToken)).catch(e => { console.error(e); body.append(h('div', { class: 'err' }, 'Esta sala não abriu direito. Volte ao saguão e entre de novo.')); });
  };
  P.ask = function (room, agentId, text) {
    const fn = P.asks[room];
    if (fn) fn(agentId, text); else toast('Esta sala ainda está carregando. Tente de novo em um segundo.', 'warn');
  };
  P.onFurni = function (room, f) {
    if (f.act === 'jogo') App.openGame();
    else if (f.act === 'cofre') World.say('cambio', 'Seu cofre está aqui. Me diga um gasto ou mande a foto de uma conta.');
    else if (f.act === 'ideia') World.say('faisca', 'Essa lâmpada acende a cada ideia nova!');
    else if (f.act === 'telefone') { const t = $('#biaPhone'); t && t.scrollIntoView({ behavior: 'smooth' }); }
  };

  /* ---------- MAPA ---------- */
  P.hall = async function (b, alive) {
    const hr = new Date().getHours();
    const saud = hr < 5 ? 'Boa madrugada' : hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
    const tiles = h('div', { class: 'tiles' });
    b.append(h('div', null, h('div', { class: 'kicker' }, new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })), h('h2', { class: 'doc-t', style: { marginTop: '4px', fontSize: '24px' } }, saud + ', Abner!')), tiles);
    const rooms = h('div', { class: 'rooms' });
    Object.keys(ROOMS).filter(k => k !== 'hall').forEach(k => {
      const r = ROOMS[k];
      rooms.append(h('button', { class: 'room-card', type: 'button', style: { '--c': r.cor, '--ci': r.ink }, onclick: () => App.go(k) }, h('b', null, r.nome), h('span', null, r.desc)));
    });
    b.append(h('div', { class: 'lbl' }, 'Salas do QG'), rooms);
    const [aulas, fin, gar, ideias] = await Promise.all([Store.get('aulas'), Store.get('fin-' + Q.monthKey()), Store.get('garagem'), Store.get('ideias')]);
    if (!alive()) return;
    const la = (aulas && aulas.lista) || [];
    const feitas = la.filter(x => x.nota != null);
    const media = feitas.length ? feitas.reduce((s, x) => s + x.nota / (x.total || 5), 0) / feitas.length * 10 : null;
    const it = (fin && fin.itens) || [];
    const saldo = it.reduce((s, x) => s + (x.tipo === 'entrada' ? 1 : -1) * (+x.valor || 0), 0);
    const t = (lbl, v, cls) => h('div', { class: 'tile' }, h('span', { class: 'lbl' }, lbl), h('span', { class: 'v ' + (cls || '') }, v));
    tiles.append(
      t('Aulas assistidas', String(la.length)),
      t('Média nos quizzes', media == null ? '—' : media.toFixed(1).replace('.', ',')),
      t('Saldo de ' + Q.MESES[new Date().getMonth()], it.length ? Q.fmtBRL(saldo) : '—', it.length ? (saldo >= 0 ? 'pos' : 'neg') : ''),
      t('Recorde Fuga Nitro', gar && gar.recorde ? gar.recorde.toLocaleString('pt-BR') : '—'));
    if (ideias && ideias.lista && ideias.lista.length) tiles.append(t('Ideias na fábrica', String(ideias.lista.length)), t('Em execução', String(ideias.lista.filter(i => i.status === 'executando').length)));
  };

  /* ---------- ACADEMIA PSIQUÊ ---------- */
  function lessonPrompt(disc, periodo, tema, nivel, anteriores) {
    return `Você é a Profª Marcha, professora de Psicologia que ensina de forma prática e didática. ${Q.CTX}
Prepare UMA aula da disciplina "${disc}" (${periodo === 'opt' ? 'optativa' : periodo + 'º período'} do Bacharelado em Psicologia da UNINASSAU)${tema ? `, com foco em: ${tema}` : ''}. Profundidade: ${nivel === 'aprofundada' ? 'aprofundada, com nuances teóricas e debates atuais' : 'essencial, clara e direta'}.
${anteriores.length ? 'Aulas que ele já teve nesta disciplina (avance para outro tema): ' + anteriores.join('; ') + '.' : ''}
Ensine de forma entendível: linguagem acessível, analogias do cotidiano, exemplos clínicos e do dia a dia, conexão com a prática profissional e com o estágio.
Responda APENAS com um objeto JSON neste formato:
{"titulo":"...","resumo":"2 ou 3 frases","objetivos":["3 a 4 objetivos"],"blocos":[...],"referencias":["..."],"quiz":[{"pergunta":"...","opcoes":["...","...","...","..."],"correta":0,"explicacao":"..."}]}
Blocos: entre 8 e 12, aproximadamente nesta ordem: "texto" de introdução; 2 a 3 "texto" de conteúdo; uma "analogia"; um "exemplo" (caso prático); uma "tabela" comparativa; um "grafico" (só com números reais e a fonte indicada; se forem didáticos, escreva "Ilustrativo" na fonte); um "mapa" conceitual com 4 a 6 ramos e até 3 itens curtos por ramo; um "texto" chamado "Na prática profissional"; e um "destaque" chamado "Para não esquecer".
${Q.BLOCKS}
Quiz: exatamente 5 questões de múltipla escolha com 4 opções; "correta" é o índice da opção certa (0 a 3), variando a posição; "explicacao" diz por que está certa.
${Q.REFS_RULE} Traga de 3 a 6 referências.`;
  }
  function quizEl(quiz, saved, onDone) {
    const wrap = h('section', { class: 'card quiz' }, h('h2', null, 'Questionário da aula'), h('p', { class: 'fine' }, 'Responda e toque em corrigir para ver se acertou.'));
    const qs = (quiz || []).filter(q => q && Array.isArray(q.opcoes));
    const name = 'q' + Q.uid();
    const res = h('div', { class: 'row' });
    qs.forEach((q, i) => {
      const box = h('div', { class: 'q' }, h('div', { class: 'q-p' }, (i + 1) + '. ', h('span', { html: inline(q.pergunta) })));
      q.opcoes.forEach((op, j) => box.append(h('label', { class: 'opt' }, h('input', { type: 'radio', name: name + i, value: j, checked: saved && saved[i] === j ? true : null }), h('span', { html: inline(op) }))));
      wrap.append(box);
    });
    const btn = h('button', { class: 'btn gold', type: 'button' }, 'Corrigir');
    function grade(show) {
      const resp = qs.map((q, i) => { const c = wrap.querySelector(`input[name="${name + i}"]:checked`); return c ? +c.value : null; });
      if (!show && resp.some(r => r == null)) { toast('Responda todas as questões antes de corrigir.', 'warn'); return; }
      let ok = 0;
      wrap.querySelectorAll('.q').forEach((box, i) => {
        const q = qs[i], right = +q.correta;
        box.classList.remove('right', 'wrong'); box.classList.add(resp[i] === right ? 'right' : 'wrong');
        if (resp[i] === right) ok++;
        box.querySelectorAll('.opt').forEach((o, j) => { o.classList.toggle('is-right', j === right); o.classList.toggle('is-wrong', j === resp[i] && j !== right); o.querySelector('input').disabled = true; });
        if (!box.querySelector('.q-exp')) box.append(h('div', { class: 'q-exp' }, h('b', null, resp[i] === right ? 'Certo! ' : 'Resposta certa: ' + String.fromCharCode(65 + right) + '. '), h('span', { html: inline(q.explicacao || '') })));
      });
      btn.hidden = true;
      const pct = ok / qs.length;
      res.replaceChildren(h('span', { class: 'score' }, ok + ' de ' + qs.length), h('span', { class: 'chip ' + (pct >= .8 ? 'good' : pct >= .6 ? 'warn' : 'bad') }, pct >= .8 ? 'Mandou muito bem' : pct >= .6 ? 'Quase lá' : 'Vale revisar'));
      if (!show) onDone && onDone(resp, ok);
    }
    btn.onclick = () => grade(false);
    wrap.append(h('div', { class: 'row' }, btn, res));
    if (saved && saved.every(v => v != null)) setTimeout(() => grade(true), 0);
    return wrap;
  }
  P.academia = async function (b, alive) {
    const st = (await Store.get('aulas')) || { lista: [] };
    if (!alive()) return;
    const per = sel('aPer', Object.keys(GRADE).map(k => [k, k === 'opt' ? 'Optativas' : k + 'º período']), '6');
    const disc = h('select', { id: 'aDisc' });
    const fillDisc = () => { disc.replaceChildren(...GRADE[per.value].map(d => h('option', { value: d }, d))); };
    per.onchange = fillDisc; fillDisc();
    const tema = h('input', { type: 'text', id: 'aTema', placeholder: 'Ex.: manejo da transferência na clínica' });
    const nivel = seg('aNivel', [['essencial', 'Essencial'], ['aprofundada', 'Aprofundada']], 'essencial');
    const go = h('button', { class: 'btn gold', type: 'button' }, 'Começar aula');
    const out = h('div', { class: 'doc-host', style: { display: 'flex', flexDirection: 'column', gap: '16px' } });
    const hist = h('div');
    b.append(card('Monte sua aula',
      h('div', { class: 'grid2' }, field('Período', per), field('Disciplina', disc)),
      field('Tema específico (opcional)', tema),
      h('div', { class: 'field' }, h('label', null, 'Profundidade'), nivel),
      go), out, card('Suas aulas', hist));

    const renderHist = () => hist.replaceChildren(histList(st.lista, async it => {
      const d = await Store.get('aula-' + it.id); if (!d) { toast('Não encontrei essa aula.', 'warn'); return; }
      show(it, d.lesson, d.respostas);
    }, 'Nenhuma aula ainda. Escolha uma disciplina do 6º período e comece pela primeira.', it => it.disciplina + ' · ' + fmtWhen(it.data) + (it.nota != null ? ' · nota ' + it.nota + '/' + it.total : '')));
    renderHist();

    function show(rec, lesson, respostas) {
      const pdfBtn = h('button', { class: 'btn ghost sm', type: 'button' }, 'Baixar apostila (PDF)');
      pdfBtn.onclick = async () => {
        try {
          const qz = (lesson.quiz || []);
          const doc = Object.assign({}, lesson, { blocos: (lesson.blocos || []).concat(qz.length ? [
            { tipo: 'lista', titulo: 'Questionário', itens: qz.map((q, i) => (i + 1) + '. ' + q.pergunta + ' ' + q.opcoes.map((o, j) => '(' + String.fromCharCode(65 + j) + ') ' + o).join(' ')) },
            { tipo: 'lista', titulo: 'Gabarito', itens: qz.map((q, i) => (i + 1) + ' – ' + String.fromCharCode(65 + (+q.correta)) + ': ' + (q.explicacao || '')) }] : []) });
          const blob = Q.pdfABNT(Q.toPaper(doc, { instituicao: 'UNINASSAU', setor: 'Bacharelado em Psicologia', subtitulo: rec.disciplina }));
          await Q.save('aula-' + Q.slug(lesson.titulo) + '.pdf', blob);
        } catch (e) { console.error(e); toast('Não consegui montar o PDF.', 'warn'); }
      };
      out.replaceChildren(
        h('div', { class: 'row' }, h('span', { class: 'chip' }, rec.periodo === 'opt' ? 'Optativa' : rec.periodo + 'º período'), h('span', { class: 'chip' }, rec.disciplina)),
        Q.renderDoc(lesson),
        quizEl(lesson.quiz, respostas, async (resp, ok) => {
          rec.nota = ok; rec.total = (lesson.quiz || []).length;
          const i = st.lista.findIndex(x => x.id === rec.id); if (i >= 0) st.lista[i] = rec;
          await Store.set('aulas', st); Store.set('aula-' + rec.id, { lesson, respostas: resp }); renderHist();
          World.say('marcha', ok >= 4 ? 'Excelente! ' + ok + ' de 5. Partiu próxima aula?' : ok + ' de 5. Revise as explicações e me chame se tiver dúvida.');
        }),
        h('div', { class: 'row' }, pdfBtn, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { scrollTo(b.firstChild); } }, 'Nova aula')),
        card('Tirar dúvida com a Profª Marcha', chatBox({
          id: 'marcha', name: 'Profª Marcha', agent: 'marcha', placeholder: 'Não entendi a parte de…',
          rules: () => `Você é a Profª Marcha, professora de Psicologia. ${Q.CTX} Você acabou de dar a aula "${lesson.titulo}" (${rec.disciplina}). Resumo: ${lesson.resumo}. Responda dúvidas do Abner de forma didática, curta (até 3 parágrafos), com exemplo ou analogia. Se citar autor, cite obra real.`
        })));
      scrollTo(out);
    }

    go.onclick = async () => {
      const d = disc.value, p = per.value;
      const anteriores = st.lista.filter(x => x.disciplina === d).slice(0, 8).map(x => x.titulo);
      World.say('marcha', 'Bora! Preparando a aula de ' + d + '…');
      go.disabled = true;
      const lesson = await withLoading(out, 'A Profª Marcha está preparando a aula…', (signal, prog) => AI.json(lessonPrompt(d, p, tema.value.trim(), nivel.value, anteriores), { signal, onProgress: prog }));
      go.disabled = false;
      if (!lesson || typeof lesson !== 'object') return;
      const rec = { id: Q.uid(), titulo: lesson.titulo || d, disciplina: d, periodo: p, data: Date.now(), nota: null, total: (lesson.quiz || []).length };
      st.lista.unshift(rec); st.lista = st.lista.slice(0, 80);
      Store.set('aulas', st); Store.set('aula-' + rec.id, { lesson, respostas: null }); renderHist();
      show(rec, lesson, null);
      World.say('marcha', 'Aula pronta: ' + rec.titulo + '. No final tem questionário!');
    };
    P.asks.academia = (id, text) => { tema.value = text; go.click(); };
  };

  /* ---------- LABORATÓRIO SINAPSE ---------- */
  const LAB_MODES = {
    conceito: ['Entender um conceito', 'Explique como pesquisadora: definição operacional; bases neurais (estruturas, circuitos, neurotransmissores); principais evidências e os métodos que as produziram (fMRI, EEG, lesão, estudos com animais, farmacologia); controvérsias atuais; aplicações clínicas e educacionais. Inclua uma tabela de estruturas/funções e um mapa conceitual.'],
    projeto: ['Planejar uma pesquisa', 'Monte um pré-projeto: problema de pesquisa, justificativa, objetivo geral e específicos (em lista), hipóteses, método (desenho, participantes e critérios, instrumentos validados no Brasil quando houver, procedimentos, análise estatística), aspectos éticos (Resolução CNS 466/2012 e 510/2016, submissão ao CEP via Plataforma Brasil), cronograma em tabela e resultados esperados.'],
    revisao: ['Revisão de literatura', 'Faça uma revisão narrativa: estratégia de busca (bases PubMed, SciELO, PsycINFO, LILACS; descritores DeCS/MeSH em tabela com termos em português e inglês e operadores booleanos), síntese dos achados organizada por eixos, lacunas e agenda de pesquisa.'],
    artigo: ['Analisar um artigo', 'Analise criticamente o artigo ou resumo colado: pergunta, desenho, amostra, medidas, resultados principais, limitações, possíveis vieses, nível de evidência e como apresentar o artigo na liga. Use tabela para a ficha do estudo.'],
    apresentacao: ['Apresentação na liga', 'Prepare uma apresentação de 15 minutos para a Neuroliga: introdução ao tema, roteiro por slides em tabela (Slide | Conteúdo | Tempo), conceitos-chave explicados, um caso ou estudo marcante e 3 perguntas para debate.']
  };
  function labPrompt(mode, texto) {
    return `Você é a Drª Ignição, pesquisadora sênior em neurociência e orientadora da Neuroliga da UFBA. Um pesquisador em neurociências estuda o sistema nervoso (cérebro, medula espinhal e nervos) para entender como ele controla comportamento, emoções, aprendizagem e funções do corpo. Aja como uma pesquisadora profissional de verdade: rigor metodológico, linguagem científica clara, citações no corpo do texto no formato autor-data da ABNT NBR 10520 (ex.: (KANDEL et al., 2014)). ${Q.CTX}
Tarefa (${LAB_MODES[mode][0]}): ${LAB_MODES[mode][1]}
Pedido do Abner: """${texto}"""
Responda APENAS com um objeto JSON:
{"titulo":"título acadêmico","resumo":"resumo de 100 a 250 palavras em parágrafo único, conforme ABNT NBR 6028","palavras_chave":["3 a 5"],"blocos":[...],"referencias":["..."],"proximos_passos":["..."]}
Organize os blocos como seções de trabalho acadêmico, cada "texto" com "titulo" (ex.: Introdução, Fundamentação teórica, Método, Discussão, Considerações finais). Use também tabela, lista ou passos quando ajudarem. Entre 6 e 11 blocos.
${Q.BLOCKS}
${Q.REFS_RULE} Traga de 5 a 10 referências, incluindo artigos clássicos ou revisões amplamente citadas na área.`;
  }
  P.lab = async function (b, alive) {
    const st = (await Store.get('pesquisas')) || { lista: [] };
    const capa = (await Store.get('lab-capa')) || { autor: 'Abner', instituicao: 'Universidade Federal da Bahia', setor: 'Neuroliga', cidade: 'Vitória da Conquista' };
    if (!alive()) return;
    const modo = seg('lModo', Object.keys(LAB_MODES).map(k => [k, LAB_MODES[k][0]]), 'conceito', v => { txt.placeholder = v === 'artigo' ? 'Cole aqui o resumo ou trechos do artigo, com autores e ano.' : v === 'projeto' ? 'Ex.: efeito da privação de sono na memória de trabalho em universitários' : 'Ex.: neuroplasticidade e aprendizagem'; });
    const txt = h('textarea', { id: 'lTxt', rows: 4, placeholder: 'Ex.: neuroplasticidade e aprendizagem' });
    const go = h('button', { class: 'btn gold', type: 'button' }, 'Investigar');
    const out = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });
    const hist = h('div');
    const cAutor = h('input', { type: 'text', id: 'cAutor', value: capa.autor });
    const cInst = h('input', { type: 'text', id: 'cInst', value: capa.instituicao });
    const cSetor = h('input', { type: 'text', id: 'cSetor', value: capa.setor });
    const cCid = h('input', { type: 'text', id: 'cCid', value: capa.cidade });
    const saveCapa = () => { Object.assign(capa, { autor: cAutor.value, instituicao: cInst.value, setor: cSetor.value, cidade: cCid.value }); Store.set('lab-capa', capa); };
    [cAutor, cInst, cSetor, cCid].forEach(i => i.addEventListener('change', saveCapa));
    b.append(card('Bancada de pesquisa', h('div', { class: 'field' }, h('label', null, 'O que vamos fazer'), modo), field('Tema, pergunta ou texto', txt), go,
      h('details', null, h('summary', { class: 'fine', style: { cursor: 'pointer' } }, 'Dados da capa ABNT'), h('div', { class: 'grid2', style: { marginTop: '8px' } }, field('Autor', cAutor), field('Cidade', cCid), field('Instituição', cInst), field('Liga / curso', cSetor)))),
      out, card('Estudos salvos', hist));
    const renderHist = () => hist.replaceChildren(histList(st.lista, async it => { const d = await Store.get('pesq-' + it.id); if (d) show(it, d.doc); }, 'Seus estudos para a Neuroliga aparecem aqui.', it => LAB_MODES[it.modo][0] + ' · ' + fmtWhen(it.data)));
    renderHist();
    function show(rec, doc) {
      const dl = (fmt) => async () => {
        try {
          const paper = Q.toPaper(doc, { autor: capa.autor, instituicao: capa.instituicao.toUpperCase(), setor: capa.setor, cidade: capa.cidade });
          if (fmt === 'docx') { const blob = await Q.docxABNT(paper); await Q.save(Q.slug(doc.titulo) + '-abnt.docx', blob); }
          else { await Q.save(Q.slug(doc.titulo) + '-abnt.pdf', Q.pdfABNT(paper)); }
        } catch (e) { console.error(e); toast('Não consegui montar o arquivo.', 'warn'); }
      };
      out.replaceChildren(
        h('div', { class: 'row' }, h('span', { class: 'chip' }, LAB_MODES[rec.modo][0]), ...(doc.palavras_chave || []).map(k => h('span', { class: 'chip' }, k))),
        Q.renderDoc(doc),
        doc.proximos_passos && doc.proximos_passos.length ? Q.block({ tipo: 'lista', titulo: 'Próximos passos de pesquisador', itens: doc.proximos_passos }) : null,
        card('Arquivo em ABNT', h('p', { class: 'fine' }, 'Capa, resumo com palavras-chave, seções numeradas, tabelas no padrão IBGE e referências em ordem alfabética (NBR 6023). Times 12, espaço 1,5, margens 3 e 2 cm.'),
          h('div', { class: 'row' }, h('button', { class: 'btn gold sm', type: 'button', onclick: dl('docx') }, 'Baixar Word (.docx)'), h('button', { class: 'btn ghost sm', type: 'button', onclick: dl('pdf') }, 'Baixar PDF'))),
        card('Conversar com a Drª Ignição', chatBox({
          id: 'ignicao', name: 'Drª Ignição', agent: 'ignicao', placeholder: 'Ex.: como eu operacionalizo essa variável?',
          rules: () => `Você é a Drª Ignição, pesquisadora sênior em neurociência e orientadora da Neuroliga da UFBA. ${Q.CTX} Vocês estão trabalhando no estudo "${doc.titulo}". Resumo: ${doc.resumo}. Responda como pesquisadora profissional, com rigor, em até 3 parágrafos. Cite apenas obras reais no formato (SOBRENOME, ano) e diga quando algo é incerto ou controverso.`
        })));
      scrollTo(out);
    }
    go.onclick = async () => {
      const t = txt.value.trim(); if (!t) { toast('Escreva o tema ou cole o texto primeiro.', 'warn'); txt.focus(); return; }
      World.say('ignicao', 'Hipótese anotada. Vou levantar a literatura…');
      go.disabled = true;
      const doc = await withLoading(out, 'A Drª Ignição está pesquisando…', (signal, prog) => AI.json(labPrompt(modo.value, t), { signal, onProgress: prog }));
      go.disabled = false;
      if (!doc || typeof doc !== 'object') return;
      const rec = { id: Q.uid(), titulo: doc.titulo || t.slice(0, 60), modo: modo.value, data: Date.now() };
      st.lista.unshift(rec); st.lista = st.lista.slice(0, 60);
      Store.set('pesquisas', st); Store.set('pesq-' + rec.id, { doc }); renderHist();
      show(rec, doc);
      World.say('ignicao', 'Estudo pronto! O arquivo em ABNT está no fim da página.');
    };
    P.asks.lab = (id, text) => { txt.value = text; go.click(); };
  };

  /* ---------- AGÊNCIA PROPÓSITO ---------- */
  const TEAM = {
    drift: { nome: 'Drift', cargo: 'Copywriter', pede: 'O que você quer comunicar?', ex: 'Ex.: ansiedade e fé — como pedir ajuda sem culpa' },
    turbo: { nome: 'Turbo', cargo: 'Designer', pede: 'Assunto da arte', ex: 'Ex.: carrossel "5 sinais de esgotamento emocional"' },
    largada: { nome: 'Largada', cargo: 'Roteirista', pede: 'Tema do vídeo', ex: 'Ex.: a diferença entre tristeza e depressão' },
    vacuo: { nome: 'Vácuo', cargo: 'Social media', pede: 'Objetivo do perfil agora', ex: 'Ex.: crescer o perfil falando de saúde mental e fé' },
    pitstop: { nome: 'Pit Stop', cargo: 'Projetos', pede: 'Que projeto você imagina?', ex: 'Ex.: algo para jovens da igreja sobre emoções' }
  };
  const PILARES = [['integracao', 'Integração'], ['psicologia', 'Psicologia'], ['fe', 'Fé'], ['politica', 'Política']];
  const PIL_TXT = { integracao: 'integrando psicologia, fé cristã e cidadania', psicologia: 'psicologia e saúde mental', fe: 'fé cristã e vida emocional', politica: 'política, cidadania e saúde mental coletiva (de forma apartidária e respeitosa)' };
  const ETICA = 'Cuidados obrigatórios: Abner é ESTUDANTE de Psicologia, nunca o apresente como psicólogo nem ofereça atendimento; não prometa cura nem resultados; respeite o Código de Ética Profissional do Psicólogo (Resolução CFP nº 010/2005), que veda induzir convicções religiosas ou políticas na prática profissional — por isso, conteúdo de fé entra como testemunho e visão de mundo pessoal dele, separado de orientação psicológica; em política, foque em ideias e direitos, sem ataques pessoais; quando tocar em sofrimento intenso, indique procurar um profissional e o CVV (188).';
  function agencyPrompt(m, pilar, brief, opt) {
    const base = `Você é ${TEAM[m].nome}, ${TEAM[m].cargo} da Agência Propósito, a agência de marketing pessoal do Abner. ${Q.CTX} Pilar de conteúdo: ${PIL_TXT[pilar]}. ${ETICA}\nBriefing do Abner: """${brief}"""\n`;
    if (m === 'drift') return base + `Formato principal: ${opt.formato}. Crie copys que param o scroll, com voz autêntica, jovem e respeitosa.
Responda APENAS com JSON: {"titulo":"...","resumo":"estratégia da copy em 2 frases","blocos":[
{"tipo":"lista","titulo":"10 ganchos","itens":["..."]},
{"tipo":"lista","titulo":"3 legendas prontas","itens":["legenda completa com quebras de linha \\n e CTA"]},
{"tipo":"lista","titulo":"5 CTAs","itens":["..."]},
{"tipo":"lista","titulo":"Hashtags","itens":["#... #... (8 a 12 em uma linha)"]},
{"tipo":"destaque","titulo":"Por que funciona","texto":"..."}]}`;
    if (m === 'largada') return base + `Plataforma: ${opt.plataforma}. Duração alvo: ${opt.duracao}. Escreva um roteiro gravável com celular.
Responda APENAS com JSON: {"titulo":"...","resumo":"ideia do vídeo em 2 frases","blocos":[
{"tipo":"destaque","titulo":"Gancho (primeiros 3 segundos)","texto":"..."},
{"tipo":"tabela","titulo":"Roteiro cena a cena","colunas":["Tempo","Fala","Câmera e visual","Texto na tela"],"linhas":[["..."]]},
{"tipo":"lista","titulo":"Takes extras (B-roll)","itens":["..."]},
{"tipo":"destaque","titulo":"Legenda do post","texto":"..."},
{"tipo":"lista","titulo":"Dicas de gravação","itens":["..."]}]}
${Q.BLOCKS}`;
    if (m === 'vacuo') return base + `Período do planejamento: ${opt.periodo}. Frequência: ${opt.freq}.
Responda APENAS com JSON: {"titulo":"...","resumo":"...","blocos":[
{"tipo":"texto","titulo":"Estratégia","texto":"..."},
{"tipo":"grafico","forma":"pizza","titulo":"Mix de pilares","rotulos":["..."],"valores":[n],"unidade":"%","fonte":"Ilustrativo"},
{"tipo":"tabela","titulo":"Calendário","colunas":["Dia","Formato","Tema","Objetivo","Pilar"],"linhas":[["..."]]},
{"tipo":"lista","titulo":"Opções de bio","itens":["..."]},
{"tipo":"tabela","titulo":"Métricas para acompanhar","colunas":["Métrica","Meta","Por quê"],"linhas":[["..."]]}]}`;
    if (m === 'pitstop') return base + `Tipo de projeto: ${opt.tipo}. Proponha algo que ele consiga lançar sendo estudante (conteúdo educativo, grupo de estudos, e-book, workshop, comunidade), sempre dentro da ética.
Responda APENAS com JSON: {"titulo":"nome do produto","resumo":"...","blocos":[
{"tipo":"texto","titulo":"A ideia","texto":"..."},
{"tipo":"tabela","titulo":"Ficha do produto","colunas":["Item","Definição"],"linhas":[["Público","..."],["Promessa","..."],["Formato","..."],["Preço sugerido","..."],["Entrega","..."]]},
{"tipo":"passos","titulo":"Estrutura do conteúdo","itens":[{"titulo":"Módulo 1 ...","texto":"..."}]},
{"tipo":"tabela","titulo":"Funil de lançamento","colunas":["Etapa","Ação","Canal"],"linhas":[["..."]]},
{"tipo":"passos","titulo":"Cronograma de 4 semanas","itens":[{"titulo":"...","texto":"...","prazo":"Semana 1"}]},
{"tipo":"lista","titulo":"Cuidados éticos e legais","itens":["..."]},
{"tipo":"destaque","titulo":"Primeiro passo hoje","texto":"..."}]}
${Q.BLOCKS}`;
    return base + `Crie ${opt.telas === '1' ? 'um card único' : 'um carrossel de ' + opt.telas + ' cards'} para Instagram com cara de designer profissional atual: a primeira tela é a capa (manchete que para o scroll), as do meio entregam uma ideia por card e a última fecha com convite para salvar e compartilhar.
Regras de texto: "titulo" com no máximo 10 palavras, tom de manchete; marque 1 a 3 palavras de impacto entre asteriscos, ex.: "A morte do *gosto pessoal*"; "apoio" com no máximo 24 palavras; "etiqueta" com 1 a 3 palavras (ex.: SAÚDE MENTAL); "rodape" curto (ex.: Arrasta pro lado).
Sugira também o estilo visual escolhendo entre estas opções: paleta (bordo, rosa, noite, creme, oliva, eletrico, preto, lavanda), fonte (moderna, impacto, editorial, classica, arrojada, manuscrita), fundo (solido, degrade, foto, vidro, recorte, reticula), destaque (cor, marca, italico, sublinhado).
Responda APENAS com JSON: {"conceito":"ideia visual em 1 frase","estilo":{"paleta":"...","fonte":"...","fundo":"...","destaque":"..."},"telas":[{"etiqueta":"...","titulo":"...","apoio":"...","rodape":"..."}],"legenda":"legenda do post com CTA","dica_foto":"que foto combinaria (para ele fotografar ou escolher)"}`;
  }

  /* ---- Estúdio do Turbo: cards profissionais ---- */
  const PALETAS = {
    bordo: { nome: 'Bordô', fundo: '#5E0B18', texto: '#F7EDE4', destaque: '#F2B705' },
    rosa: { nome: 'Rosa', fundo: '#F6D6CF', texto: '#B3122E', destaque: '#1A1416' },
    noite: { nome: 'Noite', fundo: '#0F1020', texto: '#F2F0EA', destaque: '#8C9BFF' },
    creme: { nome: 'Creme', fundo: '#EFE8DC', texto: '#161314', destaque: '#E2461C' },
    oliva: { nome: 'Oliva', fundo: '#2F3A24', texto: '#EEF0E2', destaque: '#D7E36B' },
    eletrico: { nome: 'Elétrico', fundo: '#1238FF', texto: '#FFFFFF', destaque: '#FFE14D' },
    preto: { nome: 'Preto', fundo: '#0B0B0C', texto: '#F5F5F5', destaque: '#FF4A1C' },
    lavanda: { nome: 'Lavanda', fundo: '#E6E1FF', texto: '#26215C', destaque: '#FF5C93' }
  };
  const FONTES = {
    moderna: { nome: 'Moderna', t: '800 {s}px "Bricolage Grotesque", "Archivo", sans-serif', it: 'italic 400 {s}px "Instrument Serif", Georgia, serif', up: false, ls: -.035, lh: 1.0, max: 1 },
    impacto: { nome: 'Impacto', t: '400 {s}px "Anton", Impact, sans-serif', it: '400 {s}px "Anton", Impact, sans-serif', up: true, ls: 0, lh: 1.02, max: 1.12 },
    editorial: { nome: 'Editorial', t: '400 {s}px "Instrument Serif", Georgia, serif', it: 'italic 400 {s}px "Instrument Serif", Georgia, serif', up: false, ls: -.01, lh: .98, max: 1.18 },
    classica: { nome: 'Clássica', t: '600 {s}px "Fraunces", Georgia, serif', it: 'italic 600 {s}px "Fraunces", Georgia, serif', up: false, ls: -.025, lh: 1.04, max: .98 },
    arrojada: { nome: 'Arrojada', t: '800 {s}px "Syne", "Archivo", sans-serif', it: 'italic 400 {s}px "Instrument Serif", Georgia, serif', up: true, ls: -.02, lh: 1.02, max: .86 },
    manuscrita: { nome: 'Manuscrita', t: '700 {s}px "Caveat", cursive', it: '700 {s}px "Caveat", cursive', up: false, ls: 0, lh: 1.0, max: 1.25 }
  };
  const FUNDOS = [['solido', 'Cor sólida'], ['degrade', 'Degradê'], ['foto', 'Foto'], ['vidro', 'Vidro'], ['recorte', 'Foto em quadro'], ['reticula', 'Retícula']];
  const DESTAQUES = [['cor', 'Cor'], ['marca', 'Marca-texto'], ['italico', 'Itálico'], ['sublinhado', 'Sublinhado']];
  const BODY = '500 {s}px "Archivo", "Atkinson Hyperlegible", sans-serif';

  function hexRgb(hx) { const c = hx.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); }
  function lum(hx) { const v = hexRgb(hx).map(x => x / 255).map(x => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  const rgba = (hx, a) => { const [r, g2, b] = hexRgb(hx); return `rgba(${r},${g2},${b},${a})`; };
  const isHex = s => /^#[0-9a-f]{6}$/i.test(s || '');

  let noiseC = null;
  function grain(g, W, H, a) {
    if (!noiseC) { noiseC = document.createElement('canvas'); noiseC.width = noiseC.height = 256; const ng = noiseC.getContext('2d'), im = ng.createImageData(256, 256); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } ng.putImageData(im, 0, 0); }
    g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(noiseC, 'repeat'); g.fillRect(0, 0, W, H); g.restore();
  }
  function cover(g, img, x, y, w, h, blur) {
    const r = Math.max(w / img.width, h / img.height), iw = img.width * r, ih = img.height * r;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); if (blur) g.filter = 'blur(' + blur + 'px)';
    g.drawImage(img, x + (w - iw) / 2 - (blur ? blur : 0), y + (h - ih) / 2 - (blur ? blur : 0), iw + (blur ? blur * 2 : 0), ih + (blur ? blur * 2 : 0));
    g.restore();
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function mesh(g, W, H, P, seed) {
    g.fillStyle = P.fundo; g.fillRect(0, 0, W, H);
    const dark = lum(P.fundo) < .35;
    const blobs = [[.15, .12, .75, P.destaque, .55], [.95, .35, .7, dark ? '#FFFFFF' : P.texto, dark ? .14 : .1], [.3, .95, .8, P.destaque, .35], [.85, .9, .6, P.fundo, .9]];
    blobs.forEach(([bx, by, br, c, a], i) => {
      const x = W * ((bx + seed * .13 * (i % 2 ? 1 : -1)) % 1.1), y = H * by, r = Math.max(W, H) * br * .7;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
  }
  function halftone(g, src, x, y, w, h, ink, step, P) {
    step = step || 12;
    const c = document.createElement('canvas'); c.width = Math.ceil(w / step); c.height = Math.ceil(h / step);
    const cg = c.getContext('2d');
    if (src) { const r = Math.max(c.width / src.width, c.height / src.height); cg.drawImage(src, (c.width - src.width * r) / 2, (c.height - src.height * r) / 2, src.width * r, src.height * r); }
    else { const gr = cg.createRadialGradient(c.width * .6, c.height * .4, 1, c.width * .6, c.height * .4, c.width * .7); gr.addColorStop(0, '#000'); gr.addColorStop(.5, '#777'); gr.addColorStop(1, '#fff'); cg.fillStyle = gr; cg.fillRect(0, 0, c.width, c.height); }
    const d = cg.getImageData(0, 0, c.width, c.height).data;
    g.fillStyle = ink;
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
      const k = (j * c.width + i) * 4, l = (d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11) / 255, rad = (1 - l) * step * .6;
      if (rad < .5) continue;
      g.beginPath(); g.arc(x + i * step + step / 2, y + j * step + step / 2, rad, 0, 7); g.fill();
    }
  }
  // texto rico: *palavras* em destaque
  function runs(s) { const out = []; String(s || '').split(/(\*[^*]+\*)/g).forEach(p => { if (!p) return; const hi = /^\*[^*]+\*$/.test(p); (hi ? p.slice(1, -1) : p).split(/\s+/).filter(Boolean).forEach(w => out.push({ w, hi })); }); return out; }
  function layout(g, text, F, size, maxW, hiStyle) {
    const fN = F.t.replace('{s}', size), fH = (hiStyle === 'italico' ? F.it : F.t).replace('{s}', size);
    const ls = F.ls * size;
    if ('letterSpacing' in g) g.letterSpacing = ls + 'px';
    g.font = fN; const sp = g.measureText(' ').width * .9;
    const lines = [[]]; let cur = 0;
    runs(text).forEach(r => {
      const word = F.up ? r.w.toUpperCase() : r.w;
      g.font = r.hi ? fH : fN; const w = g.measureText(word).width;
      if (cur + w > maxW && lines[lines.length - 1].length) { lines.push([]); cur = 0; }
      lines[lines.length - 1].push({ word, hi: r.hi, w }); cur += w + sp;
    });
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    return { lines, sp, fN, fH, size, ls, lh: F.lh };
  }
  function fitTitle(g, text, F, maxSize, minSize, maxW, maxH, hiStyle) {
    let s = Math.round(maxSize * F.max), L;
    while (true) { L = layout(g, text, F, s, maxW, hiStyle); if (L.lines.length * s * F.lh <= maxH || s <= minSize) break; s -= 4; }
    return L;
  }
  function drawTitle(g, L, x, y, maxW, align, col, acc, hiStyle, fundo) {
    if ('letterSpacing' in g) g.letterSpacing = L.ls + 'px';
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    L.lines.forEach((ln, i) => {
      const tw = ln.reduce((a, r) => a + r.w, 0) + L.sp * (ln.length - 1);
      let xx = align === 'centro' ? x + (maxW - tw) / 2 : x;
      const by = y + i * L.size * L.lh;
      // marca-texto atrás de sequências destacadas
      if (hiStyle === 'marca') {
        let k = 0;
        while (k < ln.length) {
          if (!ln[k].hi) { k++; continue; }
          let x0 = xx + ln.slice(0, k).reduce((a, r) => a + r.w + L.sp, 0), e = k;
          while (e + 1 < ln.length && ln[e + 1].hi) e++;
          const x1 = xx + ln.slice(0, e + 1).reduce((a, r) => a + r.w + L.sp, 0) - L.sp;
          g.fillStyle = acc; g.fillRect(x0 - L.size * .08, by - L.size * .82, x1 - x0 + L.size * .16, L.size * .98);
          k = e + 1;
        }
      }
      ln.forEach(r => {
        g.font = r.hi ? L.fH : L.fN;
        let c = col;
        if (r.hi) c = hiStyle === 'marca' ? (contrast(acc, fundo) > contrast(acc, col) ? fundo : col) : hiStyle === 'sublinhado' ? col : acc;
        g.fillStyle = c; g.fillText(r.word, xx, by);
        if (r.hi && hiStyle === 'sublinhado') { g.fillStyle = acc; g.fillRect(xx, by + L.size * .1, r.w, Math.max(6, L.size * .07)); }
        xx += r.w + L.sp;
      });
    });
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    return L.lines.length * L.size * L.lh;
  }
  function wrapBody(g, text, size, maxW) { g.font = BODY.replace('{s}', size); const out = []; let cur = ''; String(text || '').split(/\s+/).filter(Boolean).forEach(w => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }); if (cur) out.push(cur); return out; }
  function pill(g, txt, x, y, col, fill, align) {
    g.font = '700 23px "Archivo", sans-serif'; if ('letterSpacing' in g) g.letterSpacing = '2.5px';
    const t = String(txt || '').toUpperCase(), w = g.measureText(t).width + 40, h = 46;
    const x0 = align === 'centro' ? x - w / 2 : align === 'direita' ? x - w : x;
    rrect(g, x0, y - h / 2, w, h, h / 2); if (fill) { g.fillStyle = fill; g.fill(); } else { g.strokeStyle = col; g.lineWidth = 2.5; g.stroke(); }
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t, x0 + 20, y + 1); g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    return w;
  }
  function icon(g, kind, x, y, s, col) {
    g.save(); g.translate(x, y); g.strokeStyle = col; g.lineWidth = s * .09; g.lineJoin = 'round'; g.beginPath();
    if (kind === 'coracao') { g.moveTo(0, s * .35); g.bezierCurveTo(-s * .6, -s * .05, -s * .35, -s * .55, 0, -s * .22); g.bezierCurveTo(s * .35, -s * .55, s * .6, -s * .05, 0, s * .35); }
    else if (kind === 'salvar') { g.moveTo(-s * .3, -s * .45); g.lineTo(s * .3, -s * .45); g.lineTo(s * .3, s * .45); g.lineTo(0, s * .2); g.lineTo(-s * .3, s * .45); g.closePath(); }
    else { g.moveTo(-s * .45, -s * .05); g.lineTo(s * .45, -s * .42); g.lineTo(s * .15, s * .45); g.lineTo(-s * .02, s * .08); g.closePath(); g.moveTo(-s * .02, s * .08); g.lineTo(s * .45, -s * .42); }
    g.stroke(); g.restore();
  }

  function renderCard(cv, t, i, n, S) {
    const W = 1080, H = S.fmt === '9:16' ? 1920 : 1350; cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const P = Object.assign({}, S.paleta), F = FONTES[S.fonte] || FONTES.moderna;
    if (contrast(P.fundo, P.texto) < 3.2) P.texto = lum(P.fundo) > .4 ? '#141414' : '#FFFFFF';
    const top = S.fmt === '9:16' ? 220 : 76, bot = S.fmt === '9:16' ? 330 : 76, X = 92, MW = W - 2 * X;
    const role = n === 1 || i === 0 ? 'capa' : i === n - 1 ? 'fim' : 'meio';
    const img = t._img || S.foto || null;
    let mode = S.fundo;
    if ((mode === 'foto' || mode === 'vidro' || mode === 'recorte') && !img) mode = mode === 'recorte' ? 'reticula' : 'degrade';
    let fg = P.texto, acc = P.destaque, base = P.fundo;
    const align = S.alinhamento === 'centro' || role === 'fim' ? 'centro' : 'esquerda';
    // ---- fundo
    if (mode === 'degrade') mesh(g, W, H, P, i * .7);
    else if (mode === 'foto') {
      cover(g, img, 0, 0, W, H);
      const sc = g.createLinearGradient(0, 0, 0, H); sc.addColorStop(0, 'rgba(8,6,8,.55)'); sc.addColorStop(.35, 'rgba(8,6,8,.15)'); sc.addColorStop(.6, 'rgba(8,6,8,.55)'); sc.addColorStop(1, 'rgba(8,6,8,.9)');
      g.fillStyle = sc; g.fillRect(0, 0, W, H); fg = '#FFFFFF'; base = '#0A0809';
    } else if (mode === 'vidro') {
      cover(g, img, 0, 0, W, H, 34); g.fillStyle = rgba(P.fundo, .35); g.fillRect(0, 0, W, H);
    } else { g.fillStyle = P.fundo; g.fillRect(0, 0, W, H); }
    grain(g, W, H, mode === 'foto' ? .08 : .13);

    // ---- topo: perfil + contador
    const topY = top + 34;
    g.fillStyle = acc; g.beginPath(); g.arc(X + 26, topY, 26, 0, 7); g.fill();
    g.fillStyle = contrast(acc, '#111') > contrast(acc, '#fff') ? '#111' : '#fff'; g.font = '800 28px "Archivo", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText((S.nome || 'A').trim().charAt(0).toUpperCase(), X + 26, topY + 1);
    g.textAlign = 'left'; g.fillStyle = fg; g.font = '700 27px "Archivo", sans-serif'; g.fillText(S.nome || '', X + 66, topY - 13);
    g.globalAlpha = .7; g.font = '500 23px "Archivo", sans-serif'; g.fillText(S.handle || '', X + 66, topY + 17); g.globalAlpha = 1;
    if (n > 1) { g.textAlign = 'right'; g.font = '700 24px "Archivo", sans-serif'; g.globalAlpha = .75; g.fillText(String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0'), W - X, topY + 1); g.globalAlpha = 1; g.textAlign = 'left'; }
    g.textBaseline = 'alphabetic';

    // ---- área de conteúdo
    let y0 = top + 120, y1 = H - bot - 120;
    if (mode === 'recorte' || mode === 'reticula') {
      const ih = Math.round((H - top - bot) * (role === 'capa' ? .42 : .34)), iy = y0;
      if (mode === 'recorte') { g.save(); rrect(g, X, iy, MW, ih, 26); g.clip(); cover(g, img, X, iy, MW, ih); g.restore(); }
      else { halftone(g, img, X, iy, MW, ih, fg, 12, P); }
      y0 = iy + ih + 56;
    }
    let pad = 0;
    const tSize = role === 'capa' ? 150 : role === 'fim' ? 112 : 92;
    const bSize = role === 'meio' ? 40 : 34;
    const innerW = MW - (mode === 'vidro' ? 96 : 0);
    const L = fitTitle(g, t.titulo, F, tSize, 54, innerW, (y1 - y0) * (role === 'meio' ? .48 : .62), S.destaque);
    const body = wrapBody(g, t.apoio, bSize, innerW - (align === 'centro' ? 60 : 30)).slice(0, role === 'meio' ? 6 : 4);
    const numH = role === 'meio' ? 150 : 0;
    const tagH = t.etiqueta && role !== 'fim' ? 74 : 0;
    const blockH = tagH + numH + L.lines.length * L.size * L.lh + (body.length ? 44 + body.length * bSize * 1.42 : 0);
    let y;
    if (role === 'meio' || mode === 'recorte' || mode === 'reticula') y = y0;
    else if (role === 'capa') y = Math.max(y0, y1 - blockH);
    else y = y0 + Math.max(0, (y1 - y0 - blockH) / 2);
    if (mode === 'vidro') {
      pad = 48;
      const px = X - 6, pw = MW + 12, ph = blockH + pad * 2, py = y - pad;
      g.save(); rrect(g, px, py, pw, ph, 36); g.clip(); cover(g, img, 0, 0, W, H, 60); g.fillStyle = lum(P.fundo) > .45 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.14)'; g.fillRect(px, py, pw, ph); g.restore();
      rrect(g, px, py, pw, ph, 36); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.stroke();
      fg = lum(P.fundo) > .45 ? P.texto : '#FFFFFF';
    }
    const tx = X + (mode === 'vidro' ? pad : 0);
    if (tagH) { pill(g, t.etiqueta, align === 'centro' ? tx + innerW / 2 : tx, y + 23, fg, null, align); y += tagH; }
    if (numH) { g.font = F.t.replace('{s}', 140); g.fillStyle = acc; g.textAlign = align === 'centro' ? 'center' : 'left'; g.fillText(String(i + 1).padStart(2, '0'), align === 'centro' ? tx + innerW / 2 : tx - 4, y + 116); g.textAlign = 'left'; y += numH; }
    y += L.size * .86;
    const th = drawTitle(g, L, tx, y, innerW, align, fg, acc, S.destaque, base);
    y += th - L.size * .86;
    const maxLines = Math.max(0, Math.floor((y1 + 60 - y - 44) / (bSize * 1.42)));
    if (body.length > maxLines) body.length = maxLines;
    if (body.length) {
      g.font = BODY.replace('{s}', bSize); g.fillStyle = fg; g.globalAlpha = .86; g.textAlign = align === 'centro' ? 'center' : 'left';
      body.forEach((l, k) => g.fillText(l, align === 'centro' ? tx + innerW / 2 : tx, y + 44 + bSize + k * bSize * 1.42));
      g.globalAlpha = 1; g.textAlign = 'left';
    }

    // ---- rodapé
    const fy = H - bot - 30;
    if (role === 'capa' && n > 1) { pill(g, (t.rodape || 'Arrasta pro lado') + '  →', X, fy, mode === 'foto' ? '#111' : base, acc, 'esquerda'); }
    else if (role === 'meio') {
      const dw = 14, gap = 12, tot = n * dw + (n - 1) * gap; let dx = align === 'centro' ? W / 2 - tot / 2 : X;
      for (let k = 0; k < n; k++) { g.fillStyle = k === i ? acc : rgba(fg === '#FFFFFF' ? '#FFFFFF' : fg, .25); rrect(g, dx, fy - 7, k === i ? dw * 2.4 : dw, dw, 7); g.fill(); dx += (k === i ? dw * 2.4 : dw) + gap; }
      if (t.rodape) { g.font = '600 24px "Archivo", sans-serif'; g.fillStyle = fg; g.globalAlpha = .7; g.textAlign = 'right'; g.fillText(t.rodape, W - X, fy + 8); g.globalAlpha = 1; g.textAlign = 'left'; }
    } else if (role === 'fim') {
      const items = [['coracao', 'Curte'], ['salvar', 'Salva'], ['enviar', 'Envia']], sp = 210, sx = W / 2 - sp;
      items.forEach(([k, lab], j) => { icon(g, k, sx + j * sp, fy - 70, 64, fg); g.font = '700 24px "Archivo", sans-serif'; g.fillStyle = fg; g.textAlign = 'center'; g.fillText(lab.toUpperCase(), sx + j * sp, fy + 4); });
      g.textAlign = 'left';
    } else if (t.rodape) { g.font = '600 24px "Archivo", sans-serif'; g.fillStyle = fg; g.globalAlpha = .7; g.fillText(t.rodape, X, fy + 8); g.globalAlpha = 1; }
  }
  async function fontsReady() { try { await Promise.all(['800 40px "Bricolage Grotesque"', '400 40px "Anton"', '400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"', '600 40px "Fraunces"', 'italic 600 40px "Fraunces"', '800 40px "Syne"', '700 40px "Caveat"', '500 30px "Archivo"', '700 30px "Archivo"', '800 30px "Archivo"'].map(f => document.fonts.load(f))); } catch (e) { } }

  function designView(res, opt, onChange) {
    const telas = (res.telas || []).filter(Boolean).map(t => Object.assign({ etiqueta: '', titulo: '', apoio: '', rodape: '' }, t, { apoio: t.apoio || t.texto || '' }));
    const sug = res.estilo || {};
    const S = {
      fmt: opt.fmt || '4:5',
      paletaId: opt.paletaId || (PALETAS[sug.paleta] ? sug.paleta : 'bordo'),
      fonte: opt.fonte || (FONTES[sug.fonte] ? sug.fonte : 'moderna'),
      fundo: opt.fundo || (FUNDOS.some(f => f[0] === sug.fundo) ? sug.fundo : 'degrade'),
      destaque: opt.destaque || (DESTAQUES.some(d => d[0] === sug.destaque) ? sug.destaque : 'cor'),
      alinhamento: opt.alinhamento || 'esquerda',
      nome: opt.nome || 'Abner', handle: opt.handle || '@abner.psi', foto: null
    };
    S.paleta = Object.assign({}, opt.paleta && isHex(opt.paleta.fundo) ? opt.paleta : PALETAS[S.paletaId]);
    const grid = h('div', { class: 'posts' });
    const cvs = telas.map(() => h('canvas', { width: 1080, height: 1350 }));
    let raf = 0;
    const draw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => cvs.forEach((cv, i) => renderCard(cv, telas[i], i, telas.length, S))); };
    const save = () => { const o = Object.assign({}, opt, { fmt: S.fmt, paletaId: S.paletaId, paleta: S.paleta, fonte: S.fonte, fundo: S.fundo, destaque: S.destaque, alinhamento: S.alinhamento, nome: S.nome, handle: S.handle }); onChange && onChange(telas.map(t => { const c = Object.assign({}, t); delete c._img; return c; }), o); };
    const setAll = () => { draw(); save(); };

    // paleta
    const colorInputs = {};
    const custom = h('div', { class: 'row', style: { gap: '10px' } }, ...['fundo', 'texto', 'destaque'].map(k => { const c = h('input', { type: 'color', id: 'cc-' + k, value: S.paleta[k], 'aria-label': 'Cor de ' + k }); colorInputs[k] = c; c.oninput = () => { S.paleta[k] = c.value; S.paletaId = 'custom'; marks(); draw(); }; c.onchange = save; return h('label', { class: 'swatch-in' }, c, h('span', null, k)); }));
    const pals = h('div', { class: 'pals', role: 'group', 'aria-label': 'Paleta' }, Object.keys(PALETAS).map(k => { const p = PALETAS[k]; return h('button', { type: 'button', class: 'pal', 'data-k': k, title: p.nome, onclick: () => { S.paletaId = k; S.paleta = Object.assign({}, p); ['fundo', 'texto', 'destaque'].forEach(c => colorInputs[c].value = p[c]); marks(); setAll(); } }, h('i', { style: { background: p.fundo } }, h('b', { style: { background: p.texto } }), h('b', { style: { background: p.destaque } })), h('span', null, p.nome)); }));
    const marks = () => pals.querySelectorAll('.pal').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === S.paletaId)));
    marks();
    const fontes = h('div', { class: 'fonts', role: 'group', 'aria-label': 'Fonte' }, Object.keys(FONTES).map(k => h('button', { type: 'button', class: 'fontbtn', 'data-k': k, 'aria-pressed': String(k === S.fonte), style: { fontFamily: FONTES[k].t.match(/"([^"]+)"/)[1] + ', sans-serif', fontWeight: FONTES[k].t.split(' ')[0], textTransform: FONTES[k].up ? 'uppercase' : 'none' }, onclick: e => { S.fonte = k; fontes.querySelectorAll('.fontbtn').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); setAll(); } }, h('span', null, 'Aa'), h('small', null, FONTES[k].nome))));
    const fundoSeg = seg('st-fundo', FUNDOS, S.fundo, v => { S.fundo = v; setAll(); if ((v === 'foto' || v === 'vidro' || v === 'recorte') && !S.foto && !telas.some(t => t._img)) toast('Adicione uma foto para esse fundo aparecer completo.'); });
    const hiSeg = seg('st-hi', DESTAQUES, S.destaque, v => { S.destaque = v; setAll(); });
    const alSeg = seg('st-al', [['esquerda', 'Esquerda'], ['centro', 'Centro']], S.alinhamento, v => { S.alinhamento = v; setAll(); });
    const fmtSeg = seg('st-fmt', [['4:5', '4:5 feed'], ['9:16', '9:16 stories']], S.fmt, v => { S.fmt = v; setAll(); });
    const nome = h('input', { type: 'text', id: 'st-nome', value: S.nome }), handle = h('input', { type: 'text', id: 'st-handle', value: S.handle });
    nome.oninput = () => { S.nome = nome.value; draw(); }; handle.oninput = () => { S.handle = handle.value; draw(); }; nome.onchange = save; handle.onchange = save;
    const fotoIn = h('input', { type: 'file', accept: 'image/*', id: 'st-foto', class: 'sr-only' });
    const fotoRow = h('div', { class: 'row' });
    const paintFoto = () => fotoRow.replaceChildren(...[h('label', { class: 'btn ghost sm', for: 'st-foto' }, S.foto ? 'Trocar foto de fundo' : 'Adicionar foto de fundo'), fotoIn, S.foto ? h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { S.foto = null; paintFoto(); draw(); } }, 'Tirar foto') : null].filter(Boolean));
    fotoIn.onchange = () => { const f = fotoIn.files && fotoIn.files[0]; if (!f) return; const im = new Image(); im.onload = () => { S.foto = im; if (S.fundo === 'solido' || S.fundo === 'degrade') { S.fundo = 'foto'; fundoSeg.set('foto'); } paintFoto(); setAll(); }; im.src = URL.createObjectURL(f); fotoIn.value = ''; };
    paintFoto();

    const editor = h('div', { class: 'post-edit', hidden: true });
    function edit(i) {
      const t = telas[i];
      const mk = (k, lab, area) => { const inp = h(area ? 'textarea' : 'input', { type: 'text', id: 'pe-' + k, rows: 2 }); inp.value = t[k] || ''; inp.oninput = () => { t[k] = inp.value; draw(); }; inp.onchange = save; return field(lab, inp); };
      const file = h('input', { type: 'file', accept: 'image/*', id: 'pe-foto', class: 'sr-only' });
      file.onchange = () => { const f = file.files && file.files[0]; if (!f) return; const im = new Image(); im.onload = () => { t._img = im; draw(); edit(i); }; im.src = URL.createObjectURL(f); };
      editor.hidden = false;
      editor.replaceChildren(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, 'Card ' + (i + 1) + (i === 0 ? ' · capa' : i === telas.length - 1 && telas.length > 1 ? ' · fechamento' : '')), h('button', { class: 'btn ghost xs', type: 'button', onclick: () => editor.hidden = true }, 'Fechar')),
        mk('etiqueta', 'Etiqueta'), mk('titulo', 'Título (coloque *asteriscos* nas palavras de destaque)', true), mk('apoio', 'Texto de apoio', true), mk('rodape', 'Chamada do rodapé'),
        h('div', { class: 'row' }, h('label', { class: 'btn ghost sm', for: 'pe-foto' }, t._img ? 'Trocar foto deste card' : 'Foto só neste card'), file, t._img ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { delete t._img; draw(); edit(i); } }, 'Tirar') : null));
      editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const dl = async i => { const blob = await new Promise(r => cvs[i].toBlob(r, 'image/png')); if (blob) await Q.save('card-' + String(i + 1).padStart(2, '0') + '-' + S.fmt.replace(':', 'x') + '.png', blob); };
    cvs.forEach((cv, i) => grid.append(h('div', { class: 'post' }, cv, h('div', { class: 'row' }, h('button', { class: 'btn ghost xs', type: 'button', onclick: () => edit(i) }, 'Editar texto'), h('button', { class: 'btn xs', type: 'button', onclick: () => dl(i) }, 'Baixar PNG')))));
    fontsReady().then(draw); draw();
    const ctl = (lab, el) => h('div', { class: 'field' }, h('span', { class: 'lbl' }, lab), el);
    return h('div', { class: 'studio' },
      res.conceito ? h('p', { class: 'doc-lead' }, res.conceito) : null,
      grid, editor,
      card('Estúdio', ctl('Paleta de cores', pals), h('details', null, h('summary', { class: 'fine', style: { cursor: 'pointer' } }, 'Personalizar cores'), custom),
        ctl('Fundo', fundoSeg), fotoRow, ctl('Fonte do título', fontes), ctl('Estilo do destaque', hiSeg),
        h('div', { class: 'grid2' }, ctl('Alinhamento', alSeg), ctl('Medida', fmtSeg)),
        h('div', { class: 'grid2' }, field('Nome no topo', nome), field('@ do perfil', handle)),
        h('button', { class: 'btn gold', type: 'button', onclick: async () => { for (let i = 0; i < cvs.length; i++) await dl(i); } }, 'Baixar todos os cards')),
      res.legenda ? Q.block({ tipo: 'destaque', titulo: 'Legenda sugerida', texto: res.legenda }, { copiavel: true }) : null,
      res.dica_foto ? Q.block({ tipo: 'exemplo', titulo: 'Foto que combina', texto: res.dica_foto }) : null);
  }

  P.agencia = async function (b, alive) {
    const st = (await Store.get('agencia')) || { lista: [] };
    if (!alive()) return;
    let cur = P._agSel || 'drift';
    const team = h('div', { class: 'team', role: 'group', 'aria-label': 'Equipe' });
    const opts = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
    const pilar = seg('agPilar', PILARES, 'integracao');
    const brief = h('textarea', { id: 'agBrief', rows: 3 });
    const go = h('button', { class: 'btn gold', type: 'button' }, 'Pedir para a equipe');
    const out = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });
    const hist = h('div');
    const briefLbl = h('label', { for: 'agBrief' });
    let optEls = {};
    function pick(m) {
      cur = m; P._agSel = m;
      Array.from(team.children).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.m === m)));
      briefLbl.textContent = TEAM[m].pede; brief.placeholder = TEAM[m].ex;
      optEls = {};
      const s = (k, lab, list, v) => { optEls[k] = seg('ag-' + k, list, v); return h('div', { class: 'field' }, h('span', { class: 'lbl' }, lab), optEls[k]); };
      opts.replaceChildren(...({
        drift: [s('formato', 'Formato', ['Reels', 'Carrossel', 'Post único', 'Stories', 'Anúncio'], 'Carrossel')],
        turbo: [s('telas', 'Quantos cards', [['1', '1'], ['3', '3'], ['5', '5'], ['7', '7']], '5'), s('fmt', 'Medida', [['4:5', '4:5 feed'], ['9:16', '9:16 stories']], '4:5')],
        largada: [s('plataforma', 'Plataforma', ['Instagram Reels', 'YouTube Shorts', 'YouTube (vídeo longo)'], 'Instagram Reels'), s('duracao', 'Duração', ['30 segundos', '60 segundos', '8 a 12 minutos'], '60 segundos')],
        vacuo: [s('periodo', 'Período', ['1 semana', '2 semanas', '1 mês'], '2 semanas'), s('freq', 'Frequência', ['3 posts por semana', '5 posts por semana', 'Todo dia'], '3 posts por semana')],
        pitstop: [s('tipo', 'Tipo', ['Curso', 'Mentoria em grupo', 'E-book', 'Workshop', 'Comunidade', 'Me surpreenda'], 'Me surpreenda')]
      })[m]);
    }
    Object.keys(TEAM).forEach(m => team.append(h('button', { type: 'button', class: 'member', 'data-m': m, 'aria-pressed': 'false', onclick: () => { pick(m); World.say(m, 'Comigo! ' + TEAM[m].pede); } }, headCanvas(LOOKS[m], 48), h('b', null, TEAM[m].nome), h('span', null, TEAM[m].cargo))));
    b.append(card('Sua equipe', team, h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Pilar do conteúdo'), pilar), h('div', { class: 'field' }, briefLbl, brief), opts, go),
      h('aside', { class: 'callout note' }, h('div', { class: 'co-t' }, 'Bússola da agência'), h('div', { class: 'prose', html: md('Enquanto estudante, você aparece como **estudante de Psicologia**. Fé entra como testemunho pessoal, nunca como conduta clínica (Código de Ética do Psicólogo, Res. CFP 010/2005). Política com ideias, sem ataques.') })),
      out, card('Entregas da agência', hist));
    pick(cur);
    const renderHist = () => hist.replaceChildren(histList(st.lista, async it => { const d = await Store.get('ag-' + it.id); if (d) show(it, d.res, d.opt); }, 'As entregas da equipe ficam guardadas aqui.', it => (TEAM[it.membro] ? TEAM[it.membro].nome + ' · ' + TEAM[it.membro].cargo : 'Equipe') + ' · ' + fmtWhen(it.data)));
    renderHist();
    function show(rec, res, opt) {
      const m = TEAM[rec.membro] ? rec.membro : 'drift';
      const el = m === 'turbo' ? designView(res, opt || {}, (telas, o) => { res.telas = telas; Store.set('ag-' + rec.id, { res, opt: o }); }) : Q.renderDoc(res, { copiavel: m === 'drift' });
      out.replaceChildren(h('div', { class: 'row' }, headCanvas(LOOKS[m], 30), h('b', null, TEAM[m].nome + ' entregou'), h('span', { class: 'chip' }, (PILARES.find(p => p[0] === rec.pilar) || [, ''])[1])), el);
      scrollTo(out);
    }
    async function run() {
      const br = brief.value.trim(); if (!br) { toast('Conte o briefing primeiro.', 'warn'); brief.focus(); return; }
      const m = cur, o = {}; Object.keys(optEls).forEach(k => o[k] = optEls[k].value);
      World.say(m, 'Recebido! Já estou trabalhando nisso.');
      go.disabled = true;
      const res = await withLoading(out, TEAM[m].nome + ' está criando…', (signal, prog) => AI.json(agencyPrompt(m, pilar.value, br, o), { signal, onProgress: prog }));
      go.disabled = false;
      if (!res || typeof res !== 'object') return;
      const rec = { id: Q.uid(), membro: m, pilar: pilar.value, titulo: res.titulo || (res.telas && res.telas[0] && String(res.telas[0].titulo).replace(/\*/g, '')) || br.slice(0, 60), data: Date.now() };
      st.lista.unshift(rec); st.lista = st.lista.slice(0, 80);
      Store.set('agencia', st); Store.set('ag-' + rec.id, { res, opt: o }); renderHist();
      show(rec, res, o);
      World.say(m, 'Prontinho! Dá uma olhada no painel.');
    }
    go.onclick = run;
    P.asks.agencia = (id, text) => { if (TEAM[id]) pick(id); brief.value = text; run(); };
    P._designTest = (res, o) => show({ id: 'teste', membro: 'turbo', pilar: 'integracao' }, res, o || {});
  };

  /* ---------- FÁBRICA DE FAÍSCAS ---------- */
  const CRIT = ['Demanda real', 'Custo para começar', 'Tempo até o primeiro resultado', 'Alinhamento com seus valores', 'Ética e riscos', 'Habilidades que você já tem'];
  const STATUS = [['nova', 'Nova'], ['teste', 'Em teste'], ['executando', 'Executando'], ['engavetada', 'Engavetada']];
  function ideaPrompt(t, d) {
    return `Você é o Faísca, inventor e estrategista da Fábrica de Faíscas: acolhe qualquer ideia (mesmo mirabolante) com entusiasmo, mas avalia com honestidade e pé no chão. ${Q.CTX}
Ideia: "${t}". Detalhes: """${d || 'sem detalhes'}"""
Avalie se pode dar certo considerando a realidade dele (estudante, orçamento curto, tempo dividido com faculdade, liga e estágio). Se for viável, monte um passo a passo executável; se não for, proponha ajustes que a tornem viável.
Responda APENAS com JSON:
{"titulo":"nome curto da ideia","resumo":"a ideia explicada em 2 frases","nota":7.5,"veredito":"Vai dar bom" | "Promissora com ajustes" | "Arriscada" | "Melhor engavetar por agora","criterios":[{"nome":"...","nota":0-10,"comentario":"..."}],"pontos_fortes":["..."],"riscos":["..."],"viavel":true,"passos":[{"titulo":"...","texto":"...","prazo":"Semana 1"}],"primeiro_passo_hoje":"uma ação de até 30 minutos","custo_inicial":"faixa em reais","blocos":[]}
Critérios: exatamente estes 6, nesta ordem: ${CRIT.join('; ')}. Em "Custo para começar" e "Tempo até o primeiro resultado", nota alta significa custo baixo e tempo curto. Passos: 6 a 10 se viável; 3 ajustes se não for. Em "blocos", opcionalmente inclua 1 tabela ou grafico útil.
${Q.BLOCKS}`;
  }
  P.fabrica = async function (b, alive) {
    const st = (await Store.get('ideias')) || { lista: [] };
    if (!alive()) return;
    const tit = h('input', { type: 'text', id: 'ideaTitle', placeholder: 'Ex.: app de devocional com check-in emocional' });
    const det = h('textarea', { id: 'ideaDet', rows: 3, placeholder: 'Conte como imagina, pra quem é, por que pensou nisso…' });
    const go = h('button', { class: 'btn gold', type: 'button' }, 'Analisar ideia');
    const out = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });
    const board = h('div');
    b.append(card('Solte a ideia', field('Ideia', tit), field('Detalhes (opcional)', det), go), out, card('Quadro de ideias', board));
    const renderBoard = () => {
      if (!st.lista.length) { board.replaceChildren(h('div', { class: 'empty' }, 'Cada ideia analisada vira um post-it aqui, com status para você acompanhar.')); return; }
      board.replaceChildren(h('ul', { class: 'list-plain' }, st.lista.map(it => {
        const s = sel('st-' + it.id, STATUS, it.status || 'nova');
        s.style.width = 'auto'; s.setAttribute('aria-label', 'Status de ' + it.titulo);
        s.onchange = () => { it.status = s.value; Store.set('ideias', st); };
        return h('li', { class: 'hist-item', style: { cursor: 'default' } },
          h('div', null, h('div', { class: 't' }, it.titulo), h('div', { class: 's' }, (it.analise ? 'Nota ' + String(it.analise.nota).replace('.', ',') + ' · ' + it.analise.veredito : 'Sem análise') + ' · ' + fmtWhen(it.data))),
          h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, s, h('button', { class: 'btn ghost xs', type: 'button', onclick: () => it.analise && show(it) }, 'Ver')));
      })));
    };
    renderBoard();
    function show(it) {
      const a = it.analise;
      const n = Math.max(0, Math.min(10, +a.nota || 0));
      const cls = n >= 7.5 ? 'good' : n >= 5 ? 'warn' : 'bad';
      const crit = Array.isArray(a.criterios) ? a.criterios : [];
      out.replaceChildren(
        h('div', { class: 'gauge' }, h('div', { class: 'n' }, String(n).replace('.', ','), h('small', null, '/10')), h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 } }, h('h2', { class: 'doc-t' }, a.titulo || it.titulo), h('span', { class: 'chip ' + cls, style: { alignSelf: 'flex-start' } }, a.veredito || ''))),
        a.resumo ? h('p', { class: 'doc-lead' }, a.resumo) : null,
        crit.length ? Q.chart({ forma: 'barras', titulo: 'Raio-x da ideia (0 a 10)', rotulos: crit.map(c => c.nome), valores: crit.map(c => +c.nota || 0), unidade: '' }) : null,
        crit.length ? Q.table({ titulo: 'Comentários do Faísca', colunas: ['Critério', 'Nota', 'Comentário'], linhas: crit.map(c => [c.nome, String(c.nota), c.comentario || '']) }) : null,
        h('div', { class: 'grid2' }, Q.block({ tipo: 'lista', titulo: 'Pontos fortes', itens: a.pontos_fortes || [] }), Q.block({ tipo: 'lista', titulo: 'Riscos', itens: a.riscos || [] })),
        a.custo_inicial ? h('p', null, h('span', { class: 'lbl' }, 'Custo inicial estimado  '), h('b', null, a.custo_inicial)) : null,
        Q.block({ tipo: 'passos', titulo: a.viavel === false ? 'Ajustes para ficar viável' : 'Passo a passo para executar', itens: a.passos || [] }),
        a.primeiro_passo_hoje ? Q.block({ tipo: 'destaque', titulo: 'Primeiro passo, hoje', texto: a.primeiro_passo_hoje }) : null,
        ...(a.blocos || []).map(x => Q.block(x)));
      scrollTo(out);
    }
    go.onclick = async () => {
      const t = tit.value.trim(); if (!t) { toast('Dê um nome para a ideia.', 'warn'); tit.focus(); return; }
      World.say('faisca', 'Uau! Deixa eu ligar as máquinas…');
      go.disabled = true;
      const a = await withLoading(out, 'O Faísca está testando a ideia…', (signal, prog) => AI.json(ideaPrompt(t, det.value.trim()), { signal, onProgress: prog }));
      go.disabled = false;
      if (!a || typeof a !== 'object') return;
      const it = { id: Q.uid(), titulo: a.titulo || t, texto: det.value.trim(), data: Date.now(), status: 'nova', analise: a };
      st.lista.unshift(it); st.lista = st.lista.slice(0, 60);
      Store.set('ideias', st); renderBoard(); show(it);
      tit.value = ''; det.value = '';
      World.say('faisca', (+a.nota >= 7 ? 'Tem futuro! ' : 'Dá pra lapidar. ') + 'Nota ' + String(a.nota).replace('.', ',') + '.');
    };
    P.asks.fabrica = (id, text) => { tit.value = text; go.click(); };
  };

  /* ---------- CONTA-GOTAS ---------- */
  const CATS_OUT = ['Moradia', 'Alimentação', 'Transporte', 'Faculdade', 'Saúde', 'Lazer', 'Igreja e ofertas', 'Assinaturas', 'Contas da casa', 'Compras', 'Investimentos', 'Outros'];
  const CATS_IN = ['Salário ou bolsa', 'Freelas', 'Vendas', 'Presente', 'Outros'];
  function finSummary(itens) {
    const ent = itens.filter(i => i.tipo === 'entrada').reduce((s, i) => s + (+i.valor || 0), 0);
    const sai = itens.filter(i => i.tipo !== 'entrada').reduce((s, i) => s + (+i.valor || 0), 0);
    const cats = {}; itens.filter(i => i.tipo !== 'entrada').forEach(i => { cats[i.categoria || 'Outros'] = (cats[i.categoria || 'Outros'] || 0) + (+i.valor || 0); });
    const catList = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    return { ent, sai, saldo: ent - sai, guard: ent > 0 ? (ent - sai) / ent : null, catList };
  }
  function shiftMonth(k, d) { const [y, m] = k.split('-').map(Number); const dt = new Date(y, m - 1 + d, 1); return Q.monthKey(dt); }
  function finPdf(key, data, s) {
    const pdf = Q.newPdf(); const st = Q.pdfState(pdf, false); st.L = 20; st.W = 170;
    const safe = Q.pdfSafe;
    pdf.setFillColor(46, 125, 87); pdf.rect(0, 0, 210, 30, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.text('Relatório financeiro', 20, 14);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.text(safe('Abner · ' + Q.monthLabel(key) + ' · Cartão Black'), 20, 22);
    pdf.setTextColor(22, 32, 42);
    const boxes = [['Entradas', Q.fmtBRL(s.ent)], ['Saídas', Q.fmtBRL(s.sai)], ['Saldo', Q.fmtBRL(s.saldo)], ['Guardado', s.guard == null ? '-' : Math.round(s.guard * 100) + '%']];
    boxes.forEach(([l, v], i) => { const x = 20 + i * 43; pdf.setDrawColor(195, 206, 215); pdf.setFillColor(240, 244, 247); pdf.roundedRect(x, 38, 40, 20, 2, 2, 'FD'); pdf.setFontSize(8); pdf.setTextColor(111, 126, 140); pdf.text(safe(l.toUpperCase()), x + 3, 44); pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(i === 2 ? (s.saldo >= 0 ? 31 : 184) : 22, i === 2 ? (s.saldo >= 0 ? 122 : 58) : 32, i === 2 ? (s.saldo >= 0 ? 53 : 50) : 42); pdf.text(safe(v), x + 3, 53); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(22, 32, 42); });
    st.y = 70;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text(safe('Saídas por categoria'), 20, st.y); st.y += 6;
    const max = s.catList.length ? s.catList[0][1] : 1;
    s.catList.forEach(([c, v]) => {
      if (st.y > 270) st.addPage();
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.text(safe(c), 20, st.y + 3.5);
      pdf.setFillColor(42, 120, 214); pdf.roundedRect(70, st.y, Math.max(1, 85 * v / max), 4.5, 1, 1, 'F');
      pdf.text(safe(Q.fmtBRL(v) + '  (' + Math.round(v / (s.sai || 1) * 100) + '%)'), 158, st.y + 3.5);
      st.y += 7;
    });
    if (!s.catList.length) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.text('Sem saídas registradas.', 20, st.y + 4); st.y += 8; }
    st.y += 6;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text(safe('Lançamentos do mês'), 20, st.y); st.y += 4;
    const rows = data.itens.slice().sort((a, b) => (a.data || '').localeCompare(b.data || '')).map(i => [Q.fmtDate(i.data), i.descricao || '', i.categoria || '', i.tipo === 'entrada' ? 'Entrada' : 'Saída', (i.tipo === 'entrada' ? '+ ' : '- ') + Q.fmtBRL(i.valor)]);
    Q.pdfTable(pdf, st, { colunas: ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'], linhas: rows.length ? rows : [['-', 'Nenhum lançamento', '', '', '']], fonte: false }, null, 'helvetica');
    if (data.analise) {
      const a = data.analise;
      st.y += 4; if (st.y > 240) st.addPage();
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text(safe('Análise do Câmbio'), 20, st.y); st.y += 7;
      const para = (t, o) => Q.pdfPara(pdf, st, t, Object.assign({ font: 'helvetica', size: 10, line: 1.35, ind: 0, align: 'left', after: 2 }, o));
      if (a.resumo) para(a.resumo);
      if (a.gastar_menos && a.gastar_menos.length) { para('Onde gastar menos', { bold: true }); a.gastar_menos.forEach(g => para('• ' + g.categoria + ': ' + g.motivo + (g.economia ? ' (economia estimada: ' + g.economia + ')' : ''))); }
      if (a.pode_gastar_mais && a.pode_gastar_mais.length) { para('Onde vale investir mais', { bold: true }); a.pode_gastar_mais.forEach(g => para('• ' + g.categoria + ': ' + g.motivo)); }
      if (a.alertas && a.alertas.length) { para('Alertas', { bold: true }); a.alertas.forEach(g => para('• ' + g)); }
      if (a.meta_sugerida) para('Meta para o próximo mês: ' + a.meta_sugerida, { bold: true });
    }
    const n = pdf.getNumberOfPages();
    for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(111, 126, 140); pdf.text(safe('Gerado no QG do Abner em ' + new Date().toLocaleDateString('pt-BR') + ' · página ' + i + ' de ' + n), 20, 290); }
    return pdf.output('blob');
  }
  P.conta = async function (b, alive) {
    let key = P._finKey || Q.monthKey();
    let data = { itens: [] };
    const nav = h('div', { class: 'fin-nav' });
    const tiles = h('div', { class: 'tiles' });
    const charts = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } });
    const listHost = h('div');
    const advHost = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
    // formulário manual
    const tipo = seg('fTipo', [['saida', 'Saída'], ['entrada', 'Entrada']], 'saida', v => fillCats(v));
    const desc = h('input', { type: 'text', id: 'fDesc', placeholder: 'Ex.: mercado, Uber, conta de luz' });
    const val = h('input', { type: 'number', id: 'fVal', min: '0', step: '0.01', inputmode: 'decimal', placeholder: '0,00' });
    const cat = h('select', { id: 'fCat' });
    const dt = h('input', { type: 'date', id: 'fData' });
    const fillCats = v => cat.replaceChildren(...(v === 'entrada' ? CATS_IN : CATS_OUT).map(c => h('option', { value: c }, c)));
    fillCats('saida');
    const add = h('button', { class: 'btn', type: 'button' }, 'Lançar');
    // scanner
    const file = h('input', { type: 'file', id: 'fFoto', accept: 'image/jpeg,image/png,image/webp', multiple: true, class: 'sr-only' });
    const thumbs = h('div', { class: 'thumbs' });
    const scanBtn = h('button', { class: 'btn gold', type: 'button', disabled: true }, 'Ler com o Câmbio');
    const scanOut = h('div');
    const scanCard = card('Escanear conta ou nota', h('p', { class: 'fine' }, 'Tire foto de notas fiscais, boletos, faturas ou comprovantes. O Câmbio lê os valores e você confere antes de lançar.'),
      h('label', { class: 'btn ghost', for: 'fFoto', style: { alignSelf: 'flex-start' } }, 'Escolher fotos'), file, thumbs, scanBtn, scanOut);
    b.append(nav, tiles,
      card('Lançar manualmente', tipo, h('div', { class: 'grid2' }, field('Descrição', desc), field('Valor (R$)', val), field('Categoria', cat), field('Data', dt)), add),
      scanCard, charts, card('Lançamentos', listHost), advHost);

    const lim = await AI.limits();
    if (!lim || !lim.images) { scanCard.querySelector('p').textContent = 'A leitura de fotos não está disponível nesta visualização. Lance os gastos manualmente acima.'; scanCard.querySelector('label').hidden = true; scanBtn.hidden = true; }

    async function load() {
      data = (await Store.get('fin-' + key)) || { itens: [] };
      if (!alive()) return;
      dt.value = key === Q.monthKey() ? Q.todayISO() : key + '-01';
      render();
    }
    const persist = () => Store.set('fin-' + key, data);
    function render() {
      nav.replaceChildren(h('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Mês anterior', onclick: () => { key = shiftMonth(key, -1); P._finKey = key; load(); } }, '‹'), h('b', null, Q.monthLabel(key).replace(/^./, c => c.toUpperCase())), h('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Próximo mês', onclick: () => { key = shiftMonth(key, 1); P._finKey = key; load(); } }, '›'));
      const s = finSummary(data.itens);
      const t = (l, v, c) => h('div', { class: 'tile' }, h('span', { class: 'lbl' }, l), h('span', { class: 'v ' + (c || '') }, v));
      tiles.replaceChildren(t('Entradas', Q.fmtBRL(s.ent)), t('Saídas', Q.fmtBRL(s.sai)), t('Saldo', Q.fmtBRL(s.saldo), s.saldo >= 0 ? 'pos' : 'neg'), t('Guardado', s.guard == null ? '—' : Math.round(s.guard * 100) + '%'));
      // gráficos
      charts.replaceChildren();
      if (s.catList.length) charts.append(card(null, Q.chart({ forma: 'barras', titulo: 'Para onde foi o dinheiro', rotulos: s.catList.map(c => c[0]), valores: s.catList.map(c => +c[1].toFixed(2)), unidade: 'R$' })));
      const days = {}; data.itens.forEach(i => { const d = (i.data || '').slice(8, 10) || '01'; days[d] = (days[d] || 0) + (i.tipo === 'entrada' ? 1 : -1) * (+i.valor || 0); });
      const dk = Object.keys(days).sort();
      if (dk.length > 1) { let acc = 0; charts.append(card(null, Q.chart({ forma: 'linha', titulo: 'Saldo acumulado no mês', rotulos: dk.map(d => d + '/' + key.slice(5)), valores: dk.map(d => +(acc += days[d]).toFixed(2)), unidade: 'R$' }))); }
      // lista
      if (!data.itens.length) listHost.replaceChildren(h('div', { class: 'empty' }, 'Nenhum lançamento em ' + Q.monthLabel(key) + '. Lance o primeiro gasto acima ou envie a foto de uma conta.'));
      else {
        const rows = data.itens.slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
        listHost.replaceChildren(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl fin-table' }, h('thead', null, h('tr', null, h('th', null, 'Data'), h('th', null, 'Descrição'), h('th', null, 'Valor'))),
          h('tbody', null, rows.map(i => h('tr', null, h('td', null, Q.fmtDate(i.data).slice(0, 5)), h('td', null, i.descricao || '—', h('div', { class: 'fine' }, i.categoria + (i.origem === 'foto' ? ' · via foto' : ''))),
            h('td', null, h('span', { class: 'amt ' + (i.tipo === 'entrada' ? 'in' : 'out') }, (i.tipo === 'entrada' ? '+' : '−') + Q.fmtBRL(i.valor)), h('button', { class: 'del', type: 'button', 'aria-label': 'Apagar ' + (i.descricao || 'lançamento'), onclick: () => { data.itens = data.itens.filter(x => x.id !== i.id); persist(); render(); } }, '×'))))))));
      }
      renderAdv();
    }
    function renderAdv() {
      const askBtn = h('button', { class: 'btn gold', type: 'button', disabled: !data.itens.length }, data.analise ? 'Atualizar análise' : 'Pedir análise do Câmbio');
      const pdfBtn = h('button', { class: 'btn ghost', type: 'button', disabled: !data.itens.length }, 'Baixar relatório do mês (PDF)');
      const res = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } });
      if (data.analise) res.append(advView(data.analise));
      askBtn.onclick = async () => {
        World.say('cambio', 'Deixa eu passar a régua nesse mês…');
        askBtn.disabled = true;
        const s = finSummary(data.itens);
        const resumo = { mes: Q.monthLabel(key), entradas: s.ent, saidas: s.sai, saldo: s.saldo, por_categoria: Object.fromEntries(s.catList.map(c => [c[0], +c[1].toFixed(2)])), lancamentos: data.itens.slice(0, 150).map(i => ({ data: i.data, descricao: i.descricao, valor: i.valor, tipo: i.tipo, categoria: i.categoria })) };
        const a = await withLoading(res, 'O Câmbio está analisando suas contas…', (signal, prog) => AI.json(`Você é o Câmbio, consultor financeiro do Cartão Black, a sala de finanças do Abner. ${Q.CTX}
Analise as finanças do mês e oriente onde gastar mais e onde gastar menos, com tom amigo, prático e sem julgamento. Considere que ele é estudante. Valores em reais.
Dados: ${JSON.stringify(resumo)}
Responda APENAS com JSON: {"resumo":"2 a 3 frases","nota_saude":0-10,"gastar_menos":[{"categoria":"...","motivo":"...","economia":"R$ ..."}],"pode_gastar_mais":[{"categoria":"...","motivo":"..."}],"alertas":["..."],"meta_sugerida":"meta concreta para o próximo mês","dica":"uma dica prática"}`, { signal, onProgress: prog }));
        askBtn.disabled = false;
        if (!a || typeof a !== 'object') return;
        data.analise = Object.assign(a, { em: Date.now() }); persist();
        res.replaceChildren(advView(a));
        World.say('cambio', a.resumo || 'Análise pronta!');
      };
      pdfBtn.onclick = async () => { try { await Q.save('relatorio-' + key + '.pdf', finPdf(key, data, finSummary(data.itens))); } catch (e) { console.error(e); toast('Não consegui gerar o relatório.', 'warn'); } };
      advHost.replaceChildren(card('Conselho do Câmbio', h('p', { class: 'fine' }, 'O Câmbio lê o mês inteiro e diz onde apertar e onde vale investir.'), h('div', { class: 'row' }, askBtn, pdfBtn), res));
    }
    function advView(a) {
      const n = Math.max(0, Math.min(10, +a.nota_saude || 0));
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('div', { class: 'gauge' }, h('div', { class: 'n' }, String(n).replace('.', ','), h('small', null, '/10')), h('div', null, h('div', { class: 'lbl' }, 'Saúde financeira do mês'), h('p', { style: { margin: '4px 0 0' } }, a.resumo || ''))),
        (a.gastar_menos || []).length ? Q.table({ titulo: 'Onde gastar menos', colunas: ['Categoria', 'Por quê', 'Economia'], linhas: a.gastar_menos.map(g => [g.categoria, g.motivo, g.economia || '']) }) : null,
        (a.pode_gastar_mais || []).length ? Q.table({ titulo: 'Onde vale investir mais', colunas: ['Categoria', 'Por quê'], linhas: a.pode_gastar_mais.map(g => [g.categoria, g.motivo]) }) : null,
        (a.alertas || []).length ? Q.block({ tipo: 'lista', titulo: 'Alertas', itens: a.alertas }) : null,
        a.meta_sugerida ? Q.block({ tipo: 'destaque', titulo: 'Meta para o próximo mês', texto: a.meta_sugerida }) : null,
        a.dica ? Q.block({ tipo: 'exemplo', titulo: 'Dica do Câmbio', texto: a.dica }) : null);
    }
    add.onclick = () => {
      const v = parseFloat(String(val.value).replace(',', '.'));
      if (!desc.value.trim() || !(v > 0)) { toast('Preencha descrição e valor.', 'warn'); return; }
      const d = dt.value || Q.todayISO();
      const k = d.slice(0, 7);
      const item = { id: Q.uid(), data: d, descricao: desc.value.trim(), valor: Math.round(v * 100) / 100, tipo: tipo.value, categoria: cat.value, origem: 'manual' };
      if (k !== key) { (async () => { const o = (await Store.get('fin-' + k)) || { itens: [] }; o.itens.push(item); await Store.set('fin-' + k, o); toast('Lançado em ' + Q.monthLabel(k) + '.'); })(); }
      else { data.itens.push(item); persist(); render(); toast('Lançado!'); }
      desc.value = ''; val.value = ''; desc.focus();
    };
    let files = [];
    file.onchange = () => {
      files = Array.from(file.files || []).slice(0, (lim && lim.images && lim.images.maxCount) || 5);
      thumbs.replaceChildren(...files.map(f => h('img', { src: URL.createObjectURL(f), alt: 'Foto selecionada' })));
      scanBtn.disabled = !files.length;
    };
    scanBtn.onclick = async () => {
      if (!files.length) return;
      scanBtn.disabled = true;
      World.say('cambio', 'Lendo a conta com a lupa…');
      const r = await withLoading(scanOut, 'O Câmbio está lendo as fotos…', (signal, prog) => AI.json(`As imagens são fotos de contas, notas fiscais, boletos, faturas ou comprovantes do Abner. Extraia os lançamentos financeiros.
Para nota fiscal de mercado ou loja, use UM lançamento com o valor total (não liste item por item). Para fatura de cartão, liste cada compra. Para comprovante de Pix ou transferência recebida, use tipo "entrada".
Categorias de saída permitidas: ${CATS_OUT.join(', ')}. Categorias de entrada: ${CATS_IN.join(', ')}.
Datas no formato AAAA-MM-DD (se não houver data legível, use null). Hoje é ${Q.todayISO()}.
Responda APENAS com JSON: {"itens":[{"data":"AAAA-MM-DD"|null,"descricao":"curta","valor":123.45,"tipo":"saida"|"entrada","categoria":"..."}],"observacao":"algo que ficou ilegível, se houver"}`, { signal, onProgress: prog, images: files }));
      scanBtn.disabled = false;
      if (!r || !Array.isArray(r.itens)) return;
      const its = r.itens.filter(i => i && +i.valor > 0).map(i => ({ id: Q.uid(), data: /^\d{4}-\d{2}-\d{2}$/.test(i.data || '') ? i.data : (key === Q.monthKey() ? Q.todayISO() : key + '-01'), descricao: String(i.descricao || 'Conta'), valor: Math.round(+i.valor * 100) / 100, tipo: i.tipo === 'entrada' ? 'entrada' : 'saida', categoria: i.categoria || 'Outros', origem: 'foto' }));
      if (!its.length) { scanOut.replaceChildren(h('div', { class: 'err' }, 'Não encontrei valores nessas fotos. Tente uma foto mais nítida e bem iluminada.')); return; }
      const checks = its.map(() => h('input', { type: 'checkbox', checked: true }));
      const addSel = h('button', { class: 'btn', type: 'button' }, 'Lançar selecionados');
      addSel.onclick = async () => {
        const chosen = its.filter((_, i) => checks[i].checked);
        const other = {};
        chosen.forEach(i => { const k = i.data.slice(0, 7); if (k === key) data.itens.push(i); else (other[k] = other[k] || []).push(i); });
        for (const k of Object.keys(other)) { const o = (await Store.get('fin-' + k)) || { itens: [] }; o.itens.push(...other[k]); await Store.set('fin-' + k, o); }
        persist(); render(); scanOut.replaceChildren(h('p', { class: 'fine' }, chosen.length + ' lançamento(s) adicionado(s).' + (Object.keys(other).length ? ' Alguns foram para outro mês, conforme a data da conta.' : '')));
        files = []; thumbs.replaceChildren(); file.value = ''; scanBtn.disabled = true;
      };
      scanOut.replaceChildren(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Data'), h('th', null, 'Descrição'), h('th', null, 'Valor'))),
        h('tbody', null, its.map((i, k) => h('tr', null, h('td', null, checks[k]), h('td', null, Q.fmtDate(i.data).slice(0, 5)), h('td', null, i.descricao, h('div', { class: 'fine' }, i.categoria)), h('td', null, h('span', { class: 'amt ' + (i.tipo === 'entrada' ? 'in' : 'out') }, Q.fmtBRL(i.valor)))))))),
        r.observacao ? h('p', { class: 'fine' }, r.observacao) : null, addSel);
    };
    P.asks.conta = async (id, text) => {
      World.say('cambio', 'Anotando…');
      let itens = null, resp = '';
      try {
        const r = await AI.json(`Transforme a frase do Abner em lançamentos financeiros. Frase: """${text}"""
Hoje é ${Q.todayISO()}. Categorias de saída: ${CATS_OUT.join(', ')}. Categorias de entrada: ${CATS_IN.join(', ')}.
Responda APENAS com JSON: {"itens":[{"descricao":"curta","valor":12.5,"tipo":"saida"|"entrada","categoria":"...","data":"AAAA-MM-DD"}],"resposta":"frase curta e simpática confirmando o que anotou"}`, { tier: 'quick' });
        itens = Array.isArray(r && r.itens) ? r.itens : null; resp = (r && r.resposta) || '';
      } catch (e) {
        const m = String(text).match(/(\d+[\d.]*,?\d*)/);
        if (m) itens = [{ descricao: String(text).replace(m[0], '').replace(/gastei|paguei|no|na|com|reais|r\$/gi, ' ').replace(/\s+/g, ' ').trim() || 'Gasto', valor: parseFloat(m[0].replace(/\./g, '').replace(',', '.')), tipo: /recebi|ganhei|entrou/i.test(text) ? 'entrada' : 'saida', categoria: 'Outros' }];
      }
      if (!itens || !itens.length) { toast('Não entendi o valor. Tente algo como "gastei 32 no almoço".', 'warn'); return; }
      const add = itens.filter(i => +i.valor > 0).map(i => ({ id: Q.uid(), data: /^\d{4}-\d{2}-\d{2}$/.test(i.data || '') ? i.data : Q.todayISO(), descricao: String(i.descricao || 'Lançamento'), valor: Math.round(+i.valor * 100) / 100, tipo: i.tipo === 'entrada' ? 'entrada' : 'saida', categoria: (i.tipo === 'entrada' ? CATS_IN : CATS_OUT).includes(i.categoria) ? i.categoria : 'Outros', origem: 'conversa' }));
      for (const it of add) { const k = it.data.slice(0, 7); if (k === key) data.itens.push(it); else { const o2 = (await Store.get('fin-' + k)) || { itens: [] }; o2.itens.push(it); await Store.set('fin-' + k, o2); } }
      persist(); render();
      World.say('cambio', resp || ('Anotado: ' + add.map(i => i.descricao + ' ' + Q.fmtBRL(i.valor)).join(', ')));
      toast(add.length + ' lançamento(s) anotado(s).');
    };
    await load();
  };

  /* ---------- GARAGEM NITRO ---------- */
  P.saveRun = async function (r) {
    const g = (await Store.get('garagem')) || { recorde: 0, corridas: [], total: 0 };
    const novo = r.score > (g.recorde || 0);
    g.recorde = Math.max(g.recorde || 0, r.score); g.total = (g.total || 0) + 1;
    g.ultima = Object.assign({ data: Date.now() }, r);
    g.corridas = (g.corridas || []).concat([g.ultima]).sort((a, b) => b.score - a.score).slice(0, 10);
    await Store.set('garagem', g);
    if (App.room === 'garagem') P.render('garagem');
    return { novo, recorde: g.recorde };
  };
  P.garagem = async function (b, alive) {
    const g = (await Store.get('garagem')) || { recorde: 0, corridas: [], total: 0 };
    if (!alive()) return;
    const t = (l, v) => h('div', { class: 'tile' }, h('span', { class: 'lbl' }, l), h('span', { class: 'v' }, v));
    b.append(card('Fuga Nitro',
      h('p', { style: { margin: 0 } }, 'Você no volante do GTR prata de faixas azuis. Desvie do trânsito, cones e óleo na pista, pegue cápsulas de nitro e não deixe a viatura encostar.'),
      h('div', { class: 'tiles' }, t('Recorde', (g.recorde || 0).toLocaleString('pt-BR')), t('Corridas', String(g.total || 0))),
      h('button', { class: 'btn gold', type: 'button', onclick: () => App.openGame() }, 'Ligar o motor')),
      card('Como jogar', Q.block({ tipo: 'lista', itens: ['Setas ou A/D viram o carro. No celular, toque nos botões ou nos lados da pista.', 'Espaço (ou o botão NITRO) acelera, gastando a barra azul.', 'Cada batida faz a polícia chegar mais perto. Se a barra da polícia zerar, você foi pego.', 'Passar raspando por um carro vale +50. Cápsula de nitro vale +100.'] })),
      card('Melhores corridas', g.corridas && g.corridas.length
        ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, 'Pontos'), h('th', null, 'Distância'), h('th', null, 'Quando'))),
          h('tbody', null, g.corridas.map((c, i) => h('tr', null, h('td', null, String(i + 1)), h('td', null, h('b', null, c.score.toLocaleString('pt-BR'))), h('td', null, (c.dist || 0).toLocaleString('pt-BR') + ' m'), h('td', null, fmtWhen(c.data)))))))
        : h('div', { class: 'empty' }, 'Nenhuma corrida ainda. O primeiro recorde está esperando por você.')));
  };

  /* ---------- TOCA DA RATINHA ---------- */
  const PHONE = '(77) 99991-4119', WA = '5577999914119';
  P.WA = WA;
  P.toca = async function (b, alive) {
    const cv = h('canvas', { width: 264, height: 264, 'aria-label': 'Ratinha' });
    Avatar.portrait(cv, LOOKS.ratinha, {});
    const msgs = ['Tô com saudade de você', 'Bora sair hoje?', 'Me liga quando puder?', 'Passando pra dizer que te amo'];
    b.append(h('div', { class: 'bia-card' }, cv, h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 } },
      h('span', { class: 'kicker' }, 'Contato da Ratinha'), h('span', { class: 'phone', id: 'biaPhone' }, PHONE),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: e => Q.copy(PHONE, e.currentTarget) }, 'Copiar número'),
        h('a', { class: 'btn sm', href: 'https://wa.me/' + WA, target: '_blank', rel: 'noopener' }, 'Abrir no WhatsApp')),
      h('p', { class: 'fine' }, 'Se o WhatsApp não abrir por aqui, copie o número.'))));
    b.append(card('Mensagem rápida', h('div', { class: 'row' }, msgs.map(m => h('a', { class: 'btn ghost sm', href: 'https://wa.me/' + WA + '?text=' + encodeURIComponent(m), target: '_blank', rel: 'noopener' }, m)))));
    const rec = h('div');
    b.append(card('Recado da Ratinha', rec));
    await Store.init();
    if (!alive()) return;
    const db = Store.mode === 'db' ? Store.db : null;
    let owner = false; try { owner = Store.user ? await Store.user.isOwner() : false; } catch (e) { }
    let atual = null;
    if (db) { try { const s = await db.doc('ninho/recado').get(); if (s.exists) atual = s.data(); } catch (e) { } }
    if (!alive()) return;
    if (owner && db) {
      const ta = h('textarea', { id: 'recado', rows: 3, placeholder: 'Escreva um recadinho para o Abner…' }); ta.value = (atual && atual.texto) || '';
      const sv = h('button', { class: 'btn sm', type: 'button' }, 'Salvar recado');
      sv.onclick = async () => { try { await db.doc('ninho/recado').set({ texto: ta.value.trim(), em: Date.now() }); toast('Recado salvo! O Abner vai ver aqui.'); } catch (e) { toast('Não consegui salvar o recado agora.', 'warn'); } };
      rec.replaceChildren(h('p', { class: 'fine' }, 'Só você (a dona do QG) vê esta caixa. O Abner vê o recado pronto.'), ta, sv);
    } else if (atual && atual.texto) {
      rec.replaceChildren(h('p', { class: 'recado' }, '“' + atual.texto + '”'), h('p', { class: 'fine' }, '— Ratinha, ' + fmtWhen(atual.em)));
    } else rec.replaceChildren(h('div', { class: 'empty' }, 'A Ratinha ainda não deixou recado hoje. Que tal mandar uma mensagem pra ela?'));
  };

  /* ---------- QUARTO ECLIPSE ---------- */
  P.eclipse = function (b) {
    b.append(card('Modo dormir', h('p', { style: { margin: 0 } }, 'As luzes estão apagadas e o QG está offline. Os agentes não respondem enquanto você estiver aqui.'), h('button', { class: 'btn gold', type: 'button', onclick: () => App.wake() }, 'Acordar e sair do quarto')));
  };
})();
