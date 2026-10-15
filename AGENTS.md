# AGENTS.md: operating the E@B members site

Instructions for an AI agent working in this repo or managing its data.

## What this is
Private members site for Entrepreneurs at Berkeley (members.entrepreneursatberkeley.com), Bookface-style. Home is a member feed (club updates + upcoming events); member pages for Perks, Events, Directory, Resources and Finances; `/crm` holds every type (members, alumni, deals, prospects, VC partners, warm intros, updates, events, resources, finance); `/crm/search` searches all of them; `/admin` manages data.

Stack: Next.js 15 App Router, React 19, NextAuth v5 beta (Google sign-in, members only), Postgres via `DATABASE_URL` in production, embedded PGlite in `./.data` locally. No ORM.

**Invariant: one table.** Every entity is a row in `records(id, type, name, status, data jsonb, notes, created_at, updated_at)`. `type` is a slug from `lib/schema.ts`; `data` holds that type's fields as strings; long text (update body, event description) goes in `notes`. Do not add tables or per-type columns.

## Pages
Every page reads the same `records` table. Member pages are read-only; editing happens in `/crm` (admin) or the API.

There is exactly one navbar: the top bar (`Nav` in `components.tsx`) with the module links, a built-in search input (plain GET form to `/crm/search?q=`) and the Admin link. The CRM has no tab bar of its own: `/crm` is a grid of per-type cards, list pages link back with "← CRM", detail pages link back to their list.

| Route | Module | Data |
|---|---|---|
| `/` | Feed: updates, upcoming-events rail, Explore links | `updates`, `events` |
| `/perks`, `/perks/<id>` | Perks: how to claim each confirmed deal | `deals` with status Confirmed or Active |
| `/events` | Events: upcoming (date chip, RSVP) and last 12 past | `events` (Upcoming / Past) |
| `/directory`, `/directory/<id>` | Directory: member grid and profiles | `members` with status Active or Exec |
| `/resources` | Resources grouped by category | `resources` with status Published (drafts only in CRM) |
| `/finances` | Finances: Budget / Spent / Sponsor money / Reimbursed totals + all entries | `finance` |
| `/crm`, `/crm/<type>`, `/crm/<type>/<id>` | CRM: lists, filters, edit forms (admin) | every type |
| `/crm/search` | Search results for the top-bar search input (no form of its own) | every type |
| `/admin` | Admin: CSV import, clear a tab | every type |

Finance totals parse the leading number of `amount` (`"$1,200"` -> 1200). Entries without a number are skipped and shown as "n uncounted" on their card. Totals count: Budget = Budget line in Planned/Committed/Paid; Spent = Expense Paid; Sponsor money = Sponsorship Committed/Paid; Reimbursed = Reimbursement Reimbursed.

## Run it
    npm install
    npm run dev          # http://localhost:3000, auto-creates and seeds ./.data/pg on first request
    npm run build        # typecheck + production build

- Admin password locally is `admin` (when `ADMIN_PASSWORD` is unset and NODE_ENV is not production). Unlock at `/admin/login`.
- Dev login: without `AUTH_GOOGLE_ID`, `/login` shows a "Dev sign in" box that accepts any email (dev only). Set `AUTH_SECRET` (any string) in `.env` or Auth.js refuses to sign anyone in.

## Manage data without a browser (JSON API)
Auth: `Authorization: Bearer <token>` where the token is the `ADMIN_PASSWORD` (locally `admin`). The bearer token grants full read/write. Without it, reads need a signed-in member session cookie and writes return 401. All responses are JSON (`{"error": "..."}` on failure).

    export BASE=http://localhost:3000 API_TOKEN=admin
    H="Authorization: Bearer $API_TOKEN"

    # List (filters optional; q matches name, any field, or notes)
    curl -H "$H" "$BASE/api/records?type=members"
    curl -H "$H" "$BASE/api/records?type=prospects&status=Researching&q=notion"
    # -> {"count": N, "records": [{id,type,name,status,data,notes,created_at,updated_at}, ...]}

    # Get one
    curl -H "$H" "$BASE/api/records/42"

    # Create (status defaults to the type's default; data keys must be fields of the type, else 400)
    curl -H "$H" -H 'content-type: application/json' -X POST "$BASE/api/records" \
      -d '{"type":"events","name":"Demo day","status":"Upcoming","data":{"date":"2026-12-04","time":"6pm","location":"Haas","category":"Demo day"},"notes":"Description here."}'

    # Update (only the keys you send change; data is merged into existing data)
    curl -H "$H" -H 'content-type: application/json' -X PATCH "$BASE/api/records/42" -d '{"status":"Past","data":{"link":"https://example.com"}}'

    # Delete
    curl -H "$H" -X DELETE "$BASE/api/records/42"     # -> {"deleted": 42}

    # Export CSV (columns: name, status, <field keys>, notes)
    curl -H "$H" "$BASE/api/export/members" -o members.csv

    # Import CSV (same columns; rows are appended, nothing is overwritten)
    curl -H "$H" -H 'content-type: text/csv' --data-binary @members.csv "$BASE/api/import/members"   # -> {"imported": N}

Types and their fields/statuses: read `lib/schema.ts` (slugs: members, alumni, deals, prospects, vcs, pocs, updates, events, resources, finance). A 400 response lists the allowed types, statuses or field keys.

## Data onboarding
Rosters live in `seed/*.json`. Edit those files, then:

    npm run seed:load                  # replace members, alumni, events, updates, resources, finance; re-derive prospects
    npm run seed:load -- --type=members
    npm run seed:load -- --dry-run     # counts only, writes nothing

It replaces every row of each loaded type, so CRM edits to those types are lost. Use the API for one-off changes. It uses `DATABASE_URL` (env or `.env`) or the local PGlite DB. Stop `npm run dev` first when targeting PGlite (one process at a time). A fresh local DB also auto-seeds from the same files.

Shapes (every key optional except `name`; values are strings; unknown keys are stored but not shown):

    seed/members.json    [{ "name","status","role","email","year","major","cohort","company","linkedin","avatar","notes" }]
    seed/alumni.json     [{ "name","status","company","title","email","grad_year","cohort","raised","can_help","linkedin","notes" }]
    seed/events.json     [{ "name","status","date","time","location","link","rsvp","category","notes" }]
    seed/updates.json    [{ "name","status","author","date","category","link","notes" }]
    seed/resources.json  [{ "name","status","url","category","owner","notes" }]          # status Published|Draft; notes = description
    seed/finance.json    [{ "name","status","kind","amount","period","counterparty","notes" }]  # amount is text, e.g. "$500"; period YYYY-MM-DD
    seed/deals.json, seed/recruit.json   outreach research; turned into Prospects (lib/seed.mjs). Do not reshape.

Dates are `YYYY-MM-DD`. Statuses and select options must match `lib/schema.ts`. `avatar` and `rsvp` are http(s) URLs (others are not rendered as links). Never invent amounts, people or links: `resources.json` and `finance.json` start empty on purpose.

## Conventions
- `lib/schema.ts` is the single source of truth for types, fields, statuses and list columns. Add a field there and forms, lists, search, CSV and the API follow.
- Never fabricate people, companies or relationships in seed files or via the API. Leave a field empty rather than guess.
- Writes are admin-only: the admin cookie in the UI (`requireAdmin` in `app/actions.ts`), the bearer token in the API.
- Site access is `isMemberEmail` (`lib/access.ts`): a Members record with status Active or Exec and a matching email, or an address in `ALLOWED_EMAILS`. Deactivating or deleting the member locks them out.
- Prospects are unconfirmed. Only an admin promotes one to a Deal.
- Navigation: one top nav: Perks, Events, Directory, Resources, Finances, CRM, a search input, Admin. No CRM tab bar or other second nav. The home page's "Explore" line is plain text links, not a second nav. Do not add more nav surfaces.
- Perks are not a type: they are `deals` with status Confirmed or Active. Confirm a deal (or promote a prospect) to publish a perk.
- No new npm dependencies without the maintainer's approval.

## Deploy (Vercel)
Env vars: `DATABASE_URL` (Neon/Supabase Postgres), `ADMIN_PASSWORD` (also the API token), `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` (OAuth redirect `https://members.entrepreneursatberkeley.com/api/auth/callback/google`), and optionally `ALLOWED_EMAILS` (bootstrap admins). Tables are created on first request; load real data with `DATABASE_URL=... npm run seed:load`. Dev login is disabled in production.
