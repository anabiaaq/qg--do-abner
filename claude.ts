// QG do Abner — função "claude" do Supabase (Edge Functions).
// Cole este código inteiro no editor da função e clique em Deploy.
// Secrets necessários: ANTHROPIC_API_KEY e ALLOWED_EMAILS (e-mails separados por vírgula).
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const reply = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Método não permitido' }, 405);
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const who = await fetch(Deno.env.get('SUPABASE_URL') + '/auth/v1/user', { headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY') || '', authorization: 'Bearer ' + token } });
    if (!who.ok) return reply({ error: 'Sessão expirada. Entre de novo.' }, 401);
    const user = await who.json();
    const allowed = String(Deno.env.get('ALLOWED_EMAILS') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (allowed.length && !allowed.includes(String(user.email || '').toLowerCase())) return reply({ error: 'Conta sem permissão.' }, 403);

    const body = await req.json();
    const messages = (body.messages || []).filter((m: any) => m && m.content).map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));
    const merged: any[] = [];
    messages.forEach((m: any) => { const last = merged[merged.length - 1]; if (last && last.role === m.role) last.content += '\n\n' + m.content; else merged.push({ ...m }); });
    if (merged.length && merged[0].role !== 'user') merged.shift();
    if (!merged.length || merged[merged.length - 1].role !== 'user') return reply({ error: 'Mensagem inválida.' }, 400);
    const images = Array.isArray(body.images) ? body.images.slice(0, 5) : [];
    if (images.length) {
      const last = merged[merged.length - 1];
      last.content = [...images.map((im: any) => ({ type: 'image', source: { type: 'base64', media_type: im.type || 'image/jpeg', data: im.data } })), { type: 'text', text: last.content }];
    }
    const quick = body.tier === 'quick';
    const model = quick ? (Deno.env.get('MODEL_QUICK') || 'claude-haiku-5-5') : (Deno.env.get('MODEL') || 'claude-sonnet-5-5');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: quick ? 1500 : 12000,
        ...(body.json ? { system: 'Responda somente com um único valor JSON válido, sem texto antes ou depois e sem bloco de código.' } : {}),
        messages: merged
      })
    });
    const out = await r.json();
    if (!r.ok) return reply({ error: out?.error?.message || 'A IA não respondeu.' }, r.status === 429 ? 429 : 502);
    const text = (out.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
    return reply({ text, truncated: out.stop_reason === 'max_tokens' });
  } catch (e) {
    return reply({ error: 'Erro no servidor: ' + (e instanceof Error ? e.message : String(e)) }, 500);
  }
});
