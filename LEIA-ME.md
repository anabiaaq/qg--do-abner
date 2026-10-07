# QG do Abner — como colocar no ar

Você vai usar três serviços:
- **Supabase**: login e banco de dados (grátis).
- **Anthropic Console**: a chave da IA dos agentes (paga por uso).
- **Vercel**: hospedagem do site (grátis), com o código vindo do GitHub.

## 1. Chave da IA (Anthropic)
1. Entre em https://console.anthropic.com e crie a conta.
2. Em **Billing**, adicione créditos e defina um **limite de gasto mensal**.
3. Em **API Keys**, crie uma chave e guarde (começa com `sk-ant-`). Ela só vai na Vercel, nunca nos arquivos.

## 2. Supabase
1. Em https://supabase.com crie um projeto (região São Paulo).
2. Abra o arquivo `supabase.sql`, troque `EMAIL_DA_BIA` pelo seu e-mail (aparece 3 vezes), cole tudo em **SQL Editor → New query** e clique em **Run**.
3. Em **Authentication → Sign In / Providers → Email**, desligue **Allow new users to sign up** (assim ninguém cria conta sozinho).
4. Em **Authentication → Users → Add user → Create new user**, crie a conta do Abner e a sua, marcando **Auto Confirm User**.
5. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
6. Abra o arquivo `config.js` e cole a URL, a anon key e o seu e-mail em `OWNER_EMAIL`.

## 3. GitHub
1. Crie uma conta em https://github.com e um repositório novo e **privado** (ex.: `qg-do-abner`).
2. Clique em **uploading an existing file** e arraste todos os arquivos desta pasta, incluindo a pasta `api`. Clique em **Commit changes**.

## 4. Vercel
1. Em https://vercel.com, entre com o GitHub e clique em **Add New → Project**. Escolha o repositório.
2. Em **Framework Preset**, deixe **Other**. Não precisa de comando de build.
3. Em **Environment Variables**, adicione:
   - `ANTHROPIC_API_KEY` = sua chave `sk-ant-...`
   - `SUPABASE_URL` = a Project URL do Supabase
   - `SUPABASE_ANON_KEY` = a anon public key
   - `ALLOWED_EMAILS` = os e-mails que podem usar a IA, separados por vírgula
4. Clique em **Deploy**. No fim aparece o endereço do site (ex.: `qg-do-abner.vercel.app`).

## 5. Últimos ajustes
1. No Supabase, em **Authentication → URL Configuration**, coloque o endereço da Vercel em **Site URL** e em **Redirect URLs**. Isso faz o "Esqueci a senha" funcionar.
2. Abra o site, entre com a conta do Abner e peça uma aula para testar.

## Bom saber
- Para trocar algo no site, edite o arquivo no GitHub: a Vercel publica sozinha em 1 minuto.
- Se a Vercel reclamar de `maxDuration`, mude 300 para 60 no `vercel.json`.
- Os dados da versão que roda dentro do Claude não vêm junto: no site novo o Abner começa do zero.
- Cada aula ou pedido aos agentes gasta créditos da sua chave da Anthropic. Acompanhe em **Usage** no Console.
