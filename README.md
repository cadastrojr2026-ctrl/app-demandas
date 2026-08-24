# App de Demandas — Estoque · Almoxarifado · Fundição

Sistema interno simples para acompanhar as demandas entre os setores de **Estoque**,
**Almoxarifado** e **Fundição** de uma empresa de semijoias. O Estoque solicita, o
Almoxarifado e a Fundição recebem e atendem — e o chefe acompanha tudo em uma única tela.

## Funcionalidades

- Login por usuário e senha (sem cadastro público).
- Estoque é **administrador**; Almoxarifado e Fundição são usuários comuns.
- Cadastro manual de demandas por qualquer setor.
- Lista com filtros (status, setor responsável, setor solicitante, prioridade, texto, "só as
  minhas" — demandas que você criou ou que seu setor é responsável por atender).
- Cards de resumo para visão rápida (quantas estão pendentes, em andamento, concluídas, por setor).
- Mudança de situação direto na lista (Pendente → Em andamento → Concluída/Cancelada).
- Edição e exclusão (exclusão só para o administrador), sempre com confirmação.
- Botão "Remover dados de exemplo" (só admin) para apagar de uma vez as demandas de demonstração.
- Dados salvos em banco Postgres (Neon) via Prisma.
- Tela de administração de usuários (`/usuarios`, só admin): criar, editar e trocar senha pela
  interface — sem precisar mexer no banco.
- Histórico de alterações por demanda: botão "Histórico" em cada linha (qualquer usuário) mostra
  quem criou/editou/mudou a situação/excluiu aquela demanda e quando; a tela `/historico`
  (só admin) lista tudo, com busca e filtro por tipo.
- Notificação de WhatsApp quando uma demanda de prioridade Alta fica mais de 24h sem mudança de
  situação (veja a seção "Notificação de WhatsApp" abaixo).
- Notificações no sininho 🔔 do menu (não depende de configurar nada): o setor avisado quando
  recebe uma nova demanda (ou quando ela é transferida pra ele) e o admin avisado quando uma
  demanda é concluída — toca um som e, se autorizado, mostra um pop-up do navegador; se o
  WhatsApp também estiver configurado, o aviso de conclusão chega por lá também. Dá pra marcar
  como lida, marcar tudo como lido, remover uma notificação ou limpar todas.

## Regras de permissão

- **Admin (Estoque):** vê, cria, edita e exclui qualquer demanda; único que remove os dados de exemplo.
- **Usuário (Almoxarifado/Fundição):** vê todas as demandas e pode criar novas; só edita/exclui o
  conteúdo das que ele mesmo criou; pode mudar a situação das demandas em que o setor dele é o
  responsável (mesmo que não tenha sido quem criou).

## Como rodar localmente

1. Crie um banco Postgres grátis no [Neon](https://neon.tech) (veja o passo a passo de deploy
   abaixo — os mesmos passos 1 e 2 servem para rodar local).
2. Copie `.env.example` para `.env` e cole a *connection string* do Neon em `DATABASE_URL`.
3. Rode:

```bash
npm install                # instala dependências
npx prisma migrate deploy  # cria as tabelas no banco
npx prisma db seed         # cria os 3 usuários + demandas de exemplo
npm run dev                # inicia em http://localhost:3000
```

Para apagar e recriar as tabelas do zero mais tarde: `npx prisma migrate reset`.

## Como colocar online (Vercel + Neon — gratuito)

### 1. Banco de dados (Neon)

1. Crie uma conta em [neon.tech](https://neon.tech) (tem plano gratuito).
2. Crie um novo projeto/banco (qualquer nome, ex: `app-demandas`).
3. No painel do projeto, copie a **Connection string** (formato
   `postgresql://usuario:senha@algumhost.neon.tech/banco?sslmode=require`).
4. Cole esse valor no seu `.env` local, em `DATABASE_URL`, e rode:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
   Isso cria as tabelas e os 3 usuários já no banco que vai para produção.

### 2. Código no GitHub

O projeto já é um repositório git local. Crie um repositório vazio no GitHub e suba o código:

```bash
git add -A
git commit -m "App de demandas"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/app-demandas.git
git push -u origin main
```

### 3. Deploy (Vercel)

1. Crie uma conta em [vercel.com](https://vercel.com) (pode entrar direto com o GitHub).
2. Clique em **Add New → Project**, escolha o repositório `app-demandas`.
3. Em **Environment Variables**, adicione:
   - `DATABASE_URL` → a mesma connection string do Neon.
   - `SESSION_SECRET` → o valor que está no seu `.env` (ou gere um novo com o comando da seção
     de usuários abaixo).
4. Clique em **Deploy**. Em ~1 minuto o Vercel te dá uma URL pública (tipo
   `https://app-demandas.vercel.app`).

Pronto — a partir daí, todo `git push` na branch principal atualiza o site automaticamente.

> Dica: como o app fica com uma URL pública, vale considerar restringir o acesso (ex: só
> compartilhar o link com a equipe) já que hoje o login é só usuário/senha, sem outra camada de
> proteção.

## Usuários de acesso (dados de exemplo do seed)

| Usuário        | Senha              | Setor         | Papel  |
|----------------|--------------------|---------------|--------|
| `estoque`      | `estoque123`       | Estoque       | Admin  |
| `almoxarifado` | `almoxarifado123`  | Almoxarifado  | Usuário|
| `fundicao`     | `fundicao123`      | Fundição      | Usuário|

**Importante:** troque essas senhas antes de usar em produção. Agora dá pra fazer isso direto
pela interface: entre como `estoque` (admin), abra **Usuários** no topo e use "Editar → Trocar
senha" em cada usuário. Também é possível trocar direto no banco, se preferir:

```bash
node -e "console.log(require('bcryptjs').hashSync('nova-senha', 10))"
```
e atualize o campo `senhaHash` do usuário correspondente na tabela `User`.

## Notificações no app (sininho 🔔)

Não depende de configurar nada — funciona pra qualquer usuário assim que instala/abre o app.
Aparece no menu (desktop: rodapé do menu lateral; mobile: barra superior), com contador de não
lidas. Três eventos geram notificação:

1. **Demanda recebida** — ao criar uma demanda, todos os usuários do setor responsável são
   avisados ("fulano enviou uma nova demanda para o seu setor").
2. **Demanda transferida** — se o setor responsável de uma demanda é trocado depois de criada,
   os usuários do novo setor são avisados.
3. **Demanda concluída** — ao mudar a situação de uma demanda para **Concluída**, todos os
   usuários com papel **ADMIN** são avisados.

Em todos os casos, quem fez a própria ação não recebe aviso de si mesmo (só os outros
envolvidos). Dá pra marcar uma notificação como lida (clicando nela), marcar todas de uma vez,
remover uma notificação (×) ou limpar tudo ("Limpar"). Ao chegar uma notificação nova, toca um
som (bipe curto) e, se o navegador tiver permissão concedida, também mostra um pop-up nativo —
**só funciona enquanto o app está aberto** (numa aba ou no PWA instalado); como o projeto não
tem um service worker com Web Push configurado, não chega notificação com o app fechado/em
background, diferente de um app nativo. A checagem de novidades roda por polling a cada 20s
enquanto o app está aberto, e também ao voltar o foco pra aba.

Implementado em `src/lib/notificacoes.ts`, `src/app/api/notificacoes/` (listar, marcar como
lida, marcar todas, remover uma, limpar tudo) e `src/components/NotificationBell.tsx`.

## Notificação de WhatsApp

Duas notificações usam o mesmo canal de WhatsApp (mesma configuração de provedor) — ambas são
um **complemento opcional** ao aviso in-app acima (que já funciona sem configurar nada):

1. **Demanda concluída** — o mesmo evento que gera o aviso in-app também dispara um WhatsApp
   (`src/app/api/demandas/[id]/route.ts`). Não depende de cron; dispara direto na hora que a
   mudança de situação é salva.
2. **Demandas paradas** — todo dia (por padrão, meio-dia UTC — ajustável em `vercel.json`), a
   rota `/api/cron/demandas-paradas` verifica se existe alguma demanda de prioridade **Alta**,
   ainda não concluída/cancelada, sem mudança de situação há mais de 24h — e envia um alerta de
   WhatsApp para cada uma (no máximo 1 alerta por demanda a cada 24h, mesmo que a checagem rode
   com mais frequência).

**Sem nenhum provedor configurado, os alertas de WhatsApp só são registrados no log do servidor**
(nada é enviado, mas o aviso in-app continua funcionando normalmente) — assim dá pra usar o resto
do app sem pressa e configurar o WhatsApp quando quiser. Tem um botão **"Testar agora"** na tela
**Usuários** (admin) pra rodar a checagem de demandas paradas (item 2) na hora e ver o resultado;
a notificação de demanda concluída (item 1) não precisa de teste separado — é só marcar qualquer
demanda como Concluída.

Para ativar o envio de verdade, escolha um provedor e defina as variáveis de ambiente
correspondentes (local no `.env`, em produção nas *Environment Variables* do Vercel — veja o
aviso sobre variáveis "Sensitive" mais abaixo):

| `WHATSAPP_PROVIDER` | Custo | Como configurar |
|---|---|---|
| `callmebot` | Grátis, sem cartão | Adicione o número `+34 644 42 96 63` nos seus contatos do WhatsApp e mande a mensagem `I allow callmebot to send me messages` para ele. Você vai receber uma API key por mensagem. Defina `CALLMEBOT_PHONE` (seu número, com DDI) e `CALLMEBOT_API_KEY`. |
| `twilio` | Pago | Crie conta em [twilio.com](https://www.twilio.com), ative o WhatsApp Sandbox (ou um número aprovado) e defina `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` e `WHATSAPP_TO` (número que recebe o alerta). |
| `meta` | Cota grátis mensal | Crie um app em [developers.facebook.com](https://developers.facebook.com), configure a WhatsApp Cloud API e defina `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_CLOUD_PHONE_ID` e `WHATSAPP_TO`. |

Detalhes de cada opção estão comentados no `.env.example` e em `src/lib/whatsapp.ts`.

**Frequência da checagem:** o `vercel.json` já vem com um agendamento diário (Vercel Cron,
grátis mesmo no plano Hobby). Se quiser checar com mais frequência (ex: a cada poucas horas),
duas opções:
- Ter o plano **Vercel Pro** e editar o `schedule` em `vercel.json` (ex: `"0 */4 * * *"` para
  checar a cada 4h).
- Continuar no plano grátis e usar um serviço externo como [cron-job.org](https://cron-job.org)
  para chamar `https://app-demandas.vercel.app/api/cron/demandas-paradas` no intervalo desejado,
  enviando o header `Authorization: Bearer <valor de CRON_SECRET>`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma 7 + Postgres (Neon, via `@prisma/adapter-neon`)
- Sessão em cookie assinado (`iron-session`) + senhas com `bcryptjs`

## Estrutura

- `prisma/schema.prisma` — modelos `User`, `Demanda` e `HistoricoEvento`.
- `prisma/seed.ts` — cria os 3 usuários e as demandas de exemplo (marcadas `exemplo: true`).
- `src/app/login` — tela de login.
- `src/app/demandas` — dashboard (resumo, filtros, tabela, modais de criar/editar/histórico).
- `src/app/usuarios` — administração de usuários (só admin).
- `src/app/historico` — histórico completo de eventos (só admin).
- `src/app/api/...` — rotas da API (auth, CRUD de demandas e usuários, histórico, remoção de
  exemplos, checagem de demandas paradas).
- `src/lib/whatsapp.ts` / `src/lib/demandasParadas.ts` — envio de WhatsApp e detecção de
  demandas de alta prioridade paradas.
- `src/lib/notificacoes.ts` / `src/app/api/notificacoes/` / `src/components/NotificationBell.tsx`
  — aviso in-app (sininho) pro admin quando uma demanda é concluída.

## Próximos passos sugeridos (fora do escopo inicial)

- E-mail como canal alternativo/adicional de notificação (hoje WhatsApp + aviso in-app).
- 2FA ou outra camada de proteção além de usuário/senha, já que o site tem URL pública.
