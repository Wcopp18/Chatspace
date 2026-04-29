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

## Monetization strategy
Read `.claude/MONETIZATION_PLAN.md` before working on monetization, offers,
moments, subscriptions, or persona dialog. It documents:
- The "mood-crack" gameplay loop (hidden daily mood + user must read it)
- Pricing ($9.99/mo single tier, $2.99/$4.99 unlocks, bundles, customs)
- Hard caps and timing rules
- The persona's absolute rule: she never speaks transactionally
- 8 phases of work, what's already built vs what's missing
- Build order, file paths, verification steps
