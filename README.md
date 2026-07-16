# Construct Hub

A B2B construction marketplace built with Next.js 16 and Supabase. Buyers (individuals, businesses) post project briefs; artisans, suppliers, and service providers list products and services; orders, payments, and messaging flow through Supabase RLS-protected tables.

## Stack

- **Framework**: Next.js 16.2.7 (App Router, React 18)
- **Database / Auth / Storage**: Supabase (Postgres + RLS + Auth + Storage + Realtime)
- **Payments**: Paystack
- **Styling**: Tailwind 3
- **Tests**: Vitest 4 + happy-dom
- **Validation**: Zod 4
- **Lint**: ESLint 9 (flat config, `eslint.config.mjs`)

## Prerequisites

- Node.js ≥ 20 (Node 20 LTS or 22)
- A Supabase project (free tier is fine for dev)
- A Paystack sandbox account

## Setup

```bash
git clone <repo>
cd construct-connect-web
npm install
cp .env.example .env.local       # then fill in real values
npm run dev
```

### Manual RLS migrations

Migrations live in `supabase/migrations/` and are applied by hand in the Supabase SQL editor in numeric order. There is no `supabase db push` automation. See the auto-memory note in `~/.claude/projects/.../memory/supabase-rls-policies.md` for which migrations are currently applied and what's pending.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server (HMR) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest single run |
| `npm run test:watch` | Vitest watch mode |

## Security

- All sensitive tables have RLS enabled — see `supabase/migrations/`.
- The committed `.env` (if any) is untracked in git; rotate any keys that previously appeared there at the provider. **Action required if you cloned a copy that included `.env`**: rotate `OPENROUTER_API_KEY` and `ANTHROPIC_AUTH_TOKEN`.
- CSP and other security headers are set in `next.config.js`.
- To report a vulnerability, see `SECURITY.md`.

## Project layout

```
app/                     # Next App Router (routes, server actions, API)
  (auth)/                # /login, /register
  api/                   # /api/* route handlers (REST, payments, projects)
  actions/               # server actions ("use server")
  seller-dashboard/      # artisan/seller dashboard
  artisan-dashboard/     # alias of seller-dashboard
  buyer-dashboard/       # buyer dashboard
  projects/              # public + post-project flow
components/              # React components (UI primitives, dashboard widgets)
  dashboard/             # dashboard-specific widgets
  ui/                    # generic UI primitives (Button, Card, Input, Modal)
lib/                     # client/server-side utilities (supabase, rateLimit, validations, storage)
supabase/migrations/     # RLS + schema migrations (apply manually)
```

## Out of scope

- `buyer-dashboard`'s local data loader is a candidate to share the `useDashboardData` hook (currently duplicated). Deferred to a follow-up.
- `LineItem` type lift — pure tidying. Deferred.
