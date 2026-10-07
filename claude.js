// Função da Vercel que conversa com a IA (Anthropic). A chave fica só aqui no servidor.
// Só responde para quem está logado no Supabase (e, se configurado, só para os e-mails liberados).
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Faça login.' });
    const who = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', { headers: { apikey: process.env.SUPABASE_ANON_KEY, authorization: 'Bearer ' + token } });
    if (!who.ok) return res.status(401).json({ error: 'Sessão expirada. Entre de novo.' });
    const user = await who.json();
    const allowed = String(process.env.ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (allowed.length && !allowed.includes(String(user.email || '').toLowerCase())) return res.status(403).json({ error: 'Conta sem permissão.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const messages = (body.messages || []).filter(m => m && m.content).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') return res.status(400).json({ error: 'Mensagem inválida.' });
    // junta mensagens seguidas do mesmo papel (a API exige alternância)
    const merged = [];
    messages.forEach(m => { const last = merged[merged.length - 1]; if (last && last.role === m.role) last.content += '\n\n' + m.content; else merged.push({ ...m }); });
    if (merged[0].role !== 'user') merged.shift();
    const images = Array.isArray(body.images) ? body.images.slice(0, 5) : [];
    if (images.length) {
      const last = merged[merged.length - 1];
      last.content = [...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.type || 'image/jpeg', data: im.data } })), { type: 'text', text: last.content }];
    }
    const quick = body.tier === 'quick';
    const model = quick ? (process.env.MODEL_QUICK || 'claude-haiku-5-5') : (process.env.MODEL || 'claude-sonnet-5-5');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: quick ? 1500 : 12000,
        system: body.json ? 'Responda somente com um único valor JSON válido, sem texto antes ou depois e sem bloco de código.' : undefined,
        messages: merged
      })
    });
    const out = await r.json();
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: (out && out.error && out.error.message) || 'A IA não respondeu.' });
    const text = (out.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return res.status(200).json({ text, truncated: out.stop_reason === 'max_tokens' });
  } catch (e) {
    return res.status(500).json({ error: 'Erro no servidor: ' + (e && e.message) });
  }
};
