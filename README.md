# App de Demandas — Estoque · Almoxarifado · Fundição

Sistema interno simples para acompanhar as demandas entre os setores de **Estoque**,
**Almoxarifado** e **Fundição** de uma empresa de semijoias. O Estoque solicita, o
Almoxarifado e a Fundição recebem e atendem — e o chefe acompanha tudo em uma única tela.

## Funcionalidades

- Login por usuário e senha (sem cadastro público).
- Estoque é **administrador**; Almoxarifado e Fundição são usuários comuns.
- Cadastro manual de demandas por qualquer setor.
- Lista com filtros (status, setor responsável, setor solicitante, prioridade, texto, "só as minhas").
- Cards de resumo para visão rápida (quantas estão pendentes, em andamento, concluídas, por setor).
- Mudança de situação direto na lista (Pendente → Em andamento → Concluída/Cancelada).
- Edição e exclusão (exclusão só para o administrador), sempre com confirmação.
- Botão "Remover dados de exemplo" (só admin) para apagar de uma vez as demandas de demonstração.
- Dados salvos em banco Postgres (Neon) via Prisma.

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

**Importante:** troque essas senhas antes de usar em produção — hoje a única forma de trocar é
direto no banco (não há tela de "alterar senha" ainda). Para gerar um novo hash rapidamente:

```bash
node -e "console.log(require('bcryptjs').hashSync('nova-senha', 10))"
```
e atualize o campo `senhaHash` do usuário correspondente na tabela `User`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma 7 + Postgres (Neon, via `@prisma/adapter-neon`)
- Sessão em cookie assinado (`iron-session`) + senhas com `bcryptjs`

## Estrutura

- `prisma/schema.prisma` — modelos `User` e `Demanda`.
- `prisma/seed.ts` — cria os 3 usuários e as demandas de exemplo (marcadas `exemplo: true`).
- `src/app/login` — tela de login.
- `src/app/demandas` — dashboard (resumo, filtros, tabela, modais de criar/editar).
- `src/app/api/...` — rotas da API (auth, CRUD de demandas, remoção de exemplos).

## Próximos passos sugeridos (fora do escopo inicial)

- Tela para o admin cadastrar/gerenciar usuários e trocar senhas pela interface.
- Histórico de alterações por demanda (quem mudou o quê e quando).
- Notificação (e-mail/WhatsApp) quando uma demanda de alta prioridade fica parada.
