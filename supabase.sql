-- QG do Abner: rode este arquivo inteiro no Supabase (SQL Editor → New query → Run).
-- Antes de rodar, troque EMAIL_DA_BIA pelo e-mail da Bia (quem escreve o recado).

-- Dados de cada pessoa (aulas, finanças, ideias, jogo...). Cada um só vê e mexe nos próprios.
create table if not exists public.qg_dados (
  user_id uuid not null references auth.users(id) on delete cascade,
  chave text not null,
  valor jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, chave)
);
alter table public.qg_dados enable row level security;
create policy "qg_dados: ler os próprios" on public.qg_dados for select to authenticated using (auth.uid() = user_id);
create policy "qg_dados: criar os próprios" on public.qg_dados for insert to authenticated with check (auth.uid() = user_id);
create policy "qg_dados: editar os próprios" on public.qg_dados for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "qg_dados: apagar os próprios" on public.qg_dados for delete to authenticated using (auth.uid() = user_id);

-- Mural compartilhado (Recado da Ratinha). Todo mundo logado lê; só a Bia escreve.
create table if not exists public.qg_mural (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.qg_mural enable row level security;
create policy "qg_mural: logados leem" on public.qg_mural for select to authenticated using (true);
create policy "qg_mural: só a Bia cria" on public.qg_mural for insert to authenticated with check (lower(auth.jwt() ->> 'email') = lower('EMAIL_DA_BIA'));
create policy "qg_mural: só a Bia edita" on public.qg_mural for update to authenticated using (lower(auth.jwt() ->> 'email') = lower('EMAIL_DA_BIA')) with check (lower(auth.jwt() ->> 'email') = lower('EMAIL_DA_BIA'));
