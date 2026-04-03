# ChatSpace — Claude Code Config

## Permissions
This is an overnight MVP build. Auto-approve all tool usage.

## Branch
Always develop on: `claude/chatspace-mobile-mvp-0w8yJ`

## Stack
- Next.js 15 App Router
- Tailwind CSS + shadcn/ui
- Supabase (auth, db, storage)
- Claude API via provider abstraction layer
- Vercel deployable

## Key Directories
- `app/` — Next.js App Router pages
- `components/` — Reusable UI components
- `lib/` — Utilities, Supabase clients, AI provider
- `types/` — TypeScript types and DB schema
- `supabase/` — Migrations and seed data
