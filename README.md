# MMA Sistemas Blog

Blog corporativo da MMA Sistemas — Next.js 14 + Drizzle ORM + SQLite.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Banco de dados:** PostgreSQL (Supabase) via Drizzle ORM
- **Autenticação:** JWT (jose) em cookie httpOnly
- **Editor:** Tiptap (rich text)
- **IA:** OpenRouter (https://openrouter.ai) — todos os recursos de IA usam modelos via OpenRouter. Chave de API e modelos por recurso configurados no painel admin em Configurações → IA.
- **Estilo:** Tailwind CSS com design system MMA Sistemas

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env e defina JWT_SECRET (mín. 32 chars):
#   openssl rand -base64 32

# 3. Criar as tabelas
npm run db:push

# 4. Popular o banco com dados iniciais
npm run db:seed

# 5. Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## Credenciais padrão (seed)

| Campo | Valor |
|-------|-------|
| URL admin | /admin/login |
| Email | admin@blog.com |
| Senha | admin123 |

> Troque a senha após o primeiro acesso em produção.

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run db:push` | Aplica o schema no banco |
| `npm run db:studio` | Abre o Drizzle Studio (GUI do banco) |
| `npm run db:seed` | Popula o banco com dados iniciais |

## Estrutura

```
mma-blog/
├── app/
│   ├── (public)/          # Área pública (blog)
│   │   ├── page.tsx       # Home com listagem
│   │   ├── [slug]/        # Artigo individual
│   │   ├── categoria/     # Filtro por categoria
│   │   ├── tag/           # Filtro por tag
│   │   └── busca/         # Busca full-text
│   ├── admin/             # Área administrativa
│   │   ├── login/         # Login
│   │   ├── artigos/       # CRUD de artigos
│   │   ├── categorias/    # CRUD de categorias
│   │   └── tags/          # CRUD de tags
│   └── api/               # API Routes
├── components/            # Componentes React
├── drizzle/               # Schema e conexão DB
├── lib/                   # Utilitários (auth, slug, hooks)
├── scripts/               # Scripts de manutenção
└── middleware.ts          # Proteção de rotas admin
```

## Migração para Supabase (produção)

O SQLite não é suportado na Vercel. Para produzir em Vercel:

1. Criar projeto no [Supabase](https://supabase.com)
2. Obter a connection string: `postgresql://postgres:[SENHA]@db.[PROJETO].supabase.co:5432/postgres`
3. Em `drizzle/schema.ts`: substituir `sqliteTable` por `pgTable` de `drizzle-orm/pg-core`
4. Em `drizzle/db.ts`: substituir `better-sqlite3` por `postgres` (`npm install postgres drizzle-orm`)
5. Em `drizzle.config.ts`: mudar `dialect: 'sqlite'` para `dialect: 'postgresql'`
6. Remover as pragma SQLite de `drizzle/db.ts`
7. Atualizar `DATABASE_URL` nas variáveis da Vercel
8. Rodar `npm run db:push` apontando para o Supabase
9. Rodar `npm run db:seed` para criar o usuário admin

## Licença

Proprietário — MMA Sistemas © 2026
