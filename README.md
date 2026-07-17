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

Migrations live in `supabase/migrations/` and are applied by hand in the Supabase SQL editor in numeric order. There is no `supabase db push` automation. The most recent migration is `0018_profiles_category_check.sql` (CHECK constraint pinning `profiles.category` to the product-categories vocabulary so the artisan directory's filter never returns rows the form layer wouldn't have produced). See the auto-memory note in `~/.claude/projects/.../memory/supabase-rls-policies.md` for which migrations are currently applied and what's pending.

### Manual Edge Function deploys

The project ships a `notify-saved-searches` Supabase Edge Function (`supabase/functions/notify-saved-searches/index.ts`) that listens for new-project events on the `new_project` pg_notify channel (the trigger is in migration `0016`) and dispatches one `savedSearchMatchEmail` per matching saved search via Resend. The trigger is durable — it fires on every insert, including direct-DB ones — but the function itself needs to be deployed once per environment.

```bash
# One-time per project: install the Supabase CLI and link the project.
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>

# Set the function's secrets. The RESEND_API_KEY is the
# outbound mailer; SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are
# the database connection. EMAIL_FROM is the From: header.
supabase secrets set \
  RESEND_API_KEY=... \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  EMAIL_FROM="Construct Hub <noreply@construct-hub.example.com>"

# Deploy.
supabase functions deploy notify-saved-searches --no-verify-jwt
```

`--no-verify-jwt` is intentional: the function is invoked by the database trigger, not by an end user. The pg_notify payload is the only input. To test locally:

```bash
supabase functions serve notify-saved-searches --no-verify-jwt
# In another shell, simulate a notification:
psql "$DATABASE_URL" -c "select pg_notify('new_project', json_build_object('id', gen_random_uuid(), 'title', 'Test', 'category', '', 'state', '', 'budget', 0, 'created_at', now())::text);"
```

If the Edge Function deploy is infeasible in your environment, the trigger body in migration `0016` can be swapped to call `pg_net.http_post` to a Next.js API route — see the comment at the top of that migration.

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
- The `/artisans` directory's filter pills (`Electricians`, `Plumbers`, `Carpenters`, … in `app/artisans/page.tsx`) use a different vocabulary from the seller-side `PRODUCT_CATEGORIES` list. After sellers started picking from the product vocabulary at registration, a seller who chose `HVAC` or `Building Materials` at signup won't surface when a buyer clicks a specific pill — the pill filter is `category: "Plumbers"` strict equality. Aligning the two lists (or generalizing the pill filter to a mapping) is a follow-up.
