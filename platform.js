/* QG do Abner — ponte para rodar fora do Claude: login e banco no Supabase, IA via função do Supabase, downloads no navegador.
   Ele recria a mesma interface que o QG usava dentro do Claude (window.claude.use), então o resto do código não muda. */
(function () {
  'use strict';
  const CFG = window.QG_CONFIG || {};
  if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) {
    console.error('Configure o arquivo config.js com SUPABASE_URL e SUPABASE_ANON_KEY.');
  }
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  let resolveAuthed; const authed = new Promise(r => { resolveAuthed = r; });
  let currentUser = null;
  const P = (window.QGPlatform = { sb, authed, user: () => currentUser });

  P.session = async () => { const { data } = await sb.auth.getSession(); return data.session || null; };
  P.markAuthed = (user) => { currentUser = user; resolveAuthed(user); };
  P.signIn = async (email, password) => {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };
  P.sendReset = (email) => sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  P.updatePassword = (password) => sb.auth.updateUser({ password });
  P.signOut = () => sb.auth.signOut();
  P.onRecovery = (fn) => sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') fn(); });

  /* ---------- banco: mesma interface do db do Claude ---------- */
  function ref(path) {
    const parts = path.split('/');
    const priv = parts[0] === 'data' && parts[1] === 'users';
    const key = priv ? parts.slice(3).join('/') : path;
    const table = priv ? 'qg_dados' : 'qg_mural';
    return {
      async get() {
        let q = sb.from(table).select('valor');
        q = priv ? q.eq('user_id', currentUser.id).eq('chave', key) : q.eq('chave', key);
        const { data, error } = await q.maybeSingle();
        if (error) throw { code: 'unavailable', message: error.message };
        return { id: parts[parts.length - 1], exists: !!data, data: () => data ? data.valor : undefined, metadata: { fromCache: false, hasPendingWrites: false } };
      },
      async set(valor) {
        const row = priv ? { user_id: currentUser.id, chave: key, valor, atualizado_em: new Date().toISOString() } : { chave: key, valor, atualizado_em: new Date().toISOString() };
        const { error } = await sb.from(table).upsert(row);
        if (error) throw { code: /row-level security|permission/i.test(error.message) ? 'invalid_argument' : 'unavailable', message: error.message };
      },
      async delete() {
        let q = sb.from(table).delete();
        q = priv ? q.eq('user_id', currentUser.id).eq('chave', key) : q.eq('chave', key);
        await q;
      }
    };
  }
  const db = { doc: ref };
  const user = {
    id: async () => currentUser ? currentUser.id : null,
    isOwner: async () => !!(currentUser && CFG.OWNER_EMAIL && currentUser.email.toLowerCase() === CFG.OWNER_EMAIL.toLowerCase()),
    canEdit: async () => true,
    can: async () => true
  };

  /* ---------- IA: chama a função /api/claude ---------- */
  async function shrink(file) {
    const img = await createImageBitmap(file);
    const k = Math.min(1, 1568 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', .85);
    return { type: 'image/jpeg', data: url.split(',')[1] };
  }
  async function call(input, opts, asJson) {
    const s = await P.session();
    if (!s) throw { code: 'session_expired', message: 'sem sessão' };
    const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input.map(m => ({ role: m.role, content: m.content }));
    const files = opts.images ? Array.from(opts.images.length != null ? opts.images : [opts.images]) : [];
    const images = await Promise.all(files.slice(0, 5).map(shrink));
    let r;
    try {
      r = await fetch(CFG.API_URL || (CFG.SUPABASE_URL + '/functions/v1/claude'), {
        method: 'POST', signal: opts.signal,
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.access_token, apikey: CFG.SUPABASE_ANON_KEY },
        body: JSON.stringify({ messages, images, tier: opts.modelTier || 'default', json: !!asJson })
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw { code: 'cancelled', message: 'cancelado' };
      throw { code: 'upstream_error', message: String(e) };
    }
    const out = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: r.status === 401 ? 'session_expired' : r.status === 403 ? 'not_granted' : r.status === 429 ? 'rate_limited' : 'upstream_error', message: out.error || r.statusText };
    if (opts.onText) { try { opts.onText({ text: out.text, delta: out.text }); } catch (e) { } }
    return { text: out.text || '', truncated: !!out.truncated, modelTierApplied: opts.modelTier || 'default' };
  }
  function parseJson(t) {
    try { return JSON.parse(t); } catch (e) { }
    const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) { try { return JSON.parse(f[1]); } catch (e) { } }
    const a = Math.min(...['{', '['].map(c => { const i = t.indexOf(c); return i < 0 ? 1e9 : i; })), b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (a < 1e9 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { } }
    throw { code: 'invalid_json', message: 'JSON inválido', text: t };
  }
  const sample = (input, opts) => call(input, opts || {}, false);
  sample.json = async (input, opts) => { const r = await call(input, opts || {}, true); if (r.truncated) throw { code: 'invalid_json', message: 'resposta cortada', text: r.text }; return parseJson(r.text); };
  sample.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 5, maxInputBytes: 20 * 1024 * 1024, mediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] } });

  /* ---------- downloads ---------- */
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { status: 'saved' };
    }
  };

  const caps = { db, user, sample, downloads };
  window.claude = { use: (name) => caps[name] ? authed.then(() => caps[name]) : Promise.resolve(null) };
})();
