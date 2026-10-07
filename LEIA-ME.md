# QG do Abner — publicar só com GitHub + Supabase

## 1. Função da IA no Supabase
1. No Supabase, abra **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nome da função: `claude` (exatamente assim).
3. Apague o código de exemplo, cole todo o conteúdo de `supabase-funcao/claude.ts` e clique em **Deploy function**.
4. Em **Edge Functions → Secrets**, adicione:
   - `ANTHROPIC_API_KEY` = sua chave `sk-ant-...`
   - `ALLOWED_EMAILS` = seu e-mail e o do Abner, separados por vírgula

## 2. Site no GitHub Pages
1. Suba para o repositório tudo o que está nesta pasta, **menos** a pasta `supabase-funcao` (ela não precisa ir).
2. No repositório: **Settings → Pages**. Em **Source**, escolha **Deploy from a branch**; em **Branch**, `main` e `/ (root)`. Clique em **Save**.
3. Em 1 ou 2 minutos aparece o endereço: `https://SEU-USUARIO.github.io/qg-do-abner/`.
   - Na conta grátis do GitHub, o Pages só funciona com o repositório **público**. Nenhuma senha ou chave secreta fica no código: a chave da IA está nos Secrets do Supabase e os dados só abrem com login.

## 3. Ajuste final no Supabase
**Authentication → URL Configuration**: em **Site URL**, cole o endereço do GitHub Pages; em **Redirect URLs**, adicione o mesmo endereço com `**` no fim.
