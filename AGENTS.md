# AGENTS.md: operating the E@B members site

Instructions for an AI agent working in this repo or managing its data.

## What this is
Private members site for Entrepreneurs at Berkeley (members.entrepreneursatberkeley.com), Bookface-style. Home is a member feed (club updates + upcoming events). Every type is a first-class page (Directory, Deals, Events, Resources for members; Alumni, VCs, Intros, Finances for admins), and admins add and edit records inline on those pages. There is no CRM section. `/search` searches everything; `/admin` imports and clears data.

Stack: Next.js 15 App Router, React 19, NextAuth v5 beta (Google sign-in, members only), Postgres via `DATABASE_URL` in production, embedded PGlite in `./.data` locally. No ORM.

**Invariant: one table.** Every entity is a row in `records(id, type, name, status, data jsonb, notes, created_at, updated_at)`. `type` is a slug from `lib/schema.ts`; `data` holds that type's fields as strings; long text (update body, event description) goes in `notes`. Do not add per-type columns. The only other tables hold per-person activity on records, created in `lib/db.ts` init (one `create table if not exists` call each): `comments` (answers/replies on `updates` posts), `claims` (perk claims: deal_id + member_email, unique) and `rsvps` (event_id + member_email + going, unique). Do not add more without the maintainer's approval.

## Pages
Every page reads the same `records` table. Each type has one home page; detail pages are `<home>/<id>` and add forms `<home>/new` (admin). Members read; admins edit inline: an Add button in the page head, a save form, Delete and status shortcuts on detail pages. Generic list/detail/add views live in `ui/record-list.tsx` and `ui/record-page.tsx`; the slug -> path map (and which types are admin-only) is `lib/routes.ts`.

There is exactly one navbar: the top bar (`Nav` in `components.tsx`) with Directory, Deals, Events, Resources, then Alumni, VCs, Intros and Finances only when the admin cookie is set, a built-in search input (plain GET form to `/search?q=`) and the Admin link. No tab bars, no second nav. Detail pages link back to their list.

| Route | Module | Data |
|---|---|---|
| `/` | Feed: composer (admin), typed post cards, rail with upcoming events, perks, newest members | `updates`, `events`, `deals`, `members` |
| `/updates/<id>` | One post with its answers thread; admins pin/unpin, archive/restore, edit, delete | `updates`, `comments` |
| `/directory`, `/directory/<id>`, `/directory/new` | Member grid (expertise chips); profile: building, expertise, posts, intros they can make, perks claimed; admins edit inline and see Pending/Inactive members below the grid | `members` (grid: Active or Exec) |
| `/deals`, `/deals/<id>`, `/deals/new` | Members: perks (Confirmed/Active deals) with how to claim, Claim button and count. Admins: the full pipeline table with status filter, "Mark confirmed" on detail | `deals` |
| `/events`, `/events/<id>`, `/events/new` | Upcoming (date chip, Going / Not going with count, external RSVP link) and last 12 past; admins Add / edit | `events` (Upcoming / Past) |
| `/resources`, `/resources/<id>`, `/resources/new` | Resources grouped by category; admins also see drafts and get Add / Edit | `resources` (members: Published only) |
| `/finances`, `/finances/<id>`, `/finances/new` | Budget / Spent / Sponsor money / Reimbursed totals + all entries; admins Add / edit | `finance` |
| `/alumni`, `/vcs`, `/intros` (+ `/<id>`, `/new`) | Admin only (members are redirected to `/`): list with filters, detail/edit | `alumni`, `vcs`, `pocs` |
| `/search` | Search results for the top-bar search input (no form of its own); members only get records they can open | every type |
| `/admin` | Admin: type table with counts and Add / Export links, CSV import, clear a tab | every type |

Old URLs redirect (308, `next.config.mjs`): `/crm/*` to the first-class homes (`/crm/prospects` -> `/deals`, `/crm/pocs` -> `/intros`, `/crm/updates/<id>` -> `/updates/<id>`, `/crm/overview` -> `/admin`, `/crm/search` -> `/search`), `/perks` -> `/deals`.

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
    curl -H "$H" "$BASE/api/records?type=deals&status=Researching&q=notion"
    # -> {"count": N, "records": [{id,type,name,status,data,notes,created_at,updated_at}, ...]}

    # Get one
    curl -H "$H" "$BASE/api/records/42"

    # Create (status defaults to the type's default; data keys must be fields of the type, else 400)
    curl -H "$H" -H 'content-type: application/json' -X POST "$BASE/api/records" \
      -d '{"type":"events","name":"Demo day","status":"Upcoming","data":{"date":"2026-12-04","time":"6pm","location":"Haas","category":"Demo day"},"notes":"Description here."}'

    # Update (only the keys you send change; data is merged into existing data)
    curl -H "$H" -H 'content-type: application/json' -X PATCH "$BASE/api/records/42" -d '{"status":"Past","data":{"link":"https://example.com"}}'

    # Move a record to another type (admin). Its status must be valid for the new type unless you send status too.
    # Used to migrate rows of a retired type: the list endpoint still returns them for the bearer token.
    curl -H "$H" "$BASE/api/records?type=prospects"
    curl -H "$H" -H 'content-type: application/json' -X PATCH "$BASE/api/records/42" -d '{"type":"deals"}'

    # Delete
    curl -H "$H" -X DELETE "$BASE/api/records/42"     # -> {"deleted": 42}

    # Export CSV (columns: name, status, <field keys>, notes)
    curl -H "$H" "$BASE/api/export/members" -o members.csv

    # Import CSV (same columns; rows are appended, nothing is overwritten)
    curl -H "$H" -H 'content-type: text/csv' --data-binary @members.csv "$BASE/api/import/members"   # -> {"imported": N}

Feed answers (table `comments`; reads need a member session, the admin cookie or the bearer token):

    curl -H "$H" "$BASE/api/comments?post_id=17"                       # -> {"count": N, "comments": [...]} (hidden ones left out)
    curl -H "$H" -H 'content-type: application/json' -X POST "$BASE/api/comments" -d '{"post_id":17,"author":"Maya Sofer","body":"Tabling worked."}'
    curl -H "$H" -H 'content-type: application/json' -X PATCH "$BASE/api/comments/3" -d '{"best":true}'   # admin; clears best on the post's other answers
    curl -H "$H" -H 'content-type: application/json' -X PATCH "$BASE/api/comments/3" -d '{"hidden":true}' # admin
    curl -H "$H" -X DELETE "$BASE/api/comments/3"                                                        # admin

Claims and RSVPs belong to an identity: the `eab_identity` cookie (`{"name","email"}`, set by the top bar's "Sign in"; unverified, until Google sign-in ships) or else the signed-in session. With the bearer token you may act for someone by adding `member_email`/`member_name` to the body.

    ID="Cookie: eab_identity=%7B%22name%22%3A%22Maya%20Sofer%22%2C%22email%22%3A%22maya%40example.com%22%7D"
    curl -H "$H" -H "$ID" "$BASE/api/claims"                                           # -> {"email", "count", "claims": [{deal_id, claimed_at}]}
    curl -H "$H" -H "$ID" -H 'content-type: application/json' -X POST "$BASE/api/claims" -d '{"deal_id":42}'   # -> {"deal_id","claimed":true,"count"}
    curl -H "$H" -H "$ID" "$BASE/api/rsvps?event_id=7"                                  # -> {"event_id","going":<count>,"me":true|false|null}
    curl -H "$H" -H "$ID" -H 'content-type: application/json' -X POST "$BASE/api/rsvps" -d '{"event_id":7,"going":true}'   # going=false un-RSVPs

The top-bar bell is computed per request (no table): events the identity is going to today or tomorrow, and perks confirmed or edited in the last 7 days they have not claimed. "Read" state is kept in the browser's localStorage.

Types and their fields/statuses: read `lib/schema.ts` (slugs: members, alumni, deals, vcs, pocs, updates, events, resources, finance). A 400 response lists the allowed types, statuses or field keys.

## Data onboarding
Rosters live in `seed/*.json`. Edit those files, then:

    npm run seed:load                  # replace members, alumni, events, updates, resources, finance (never deals)
    npm run seed:load -- --type=members
    npm run seed:load -- --dry-run     # counts only, writes nothing

It replaces every row of each loaded type, so on-site edits to those types are lost. It never touches deals: they are managed on `/deals` (or the API), and re-deriving them would clobber real confirmed deals. Use the API for one-off changes. It uses `DATABASE_URL` (env or `.env`) or the local PGlite DB. Stop `npm run dev` first when targeting PGlite (one process at a time). A fresh local DB also auto-seeds from the same files.

Shapes (every key optional except `name`; values are strings; unknown keys are stored but not shown):

    seed/members.json    [{ "name","status","role","email","year","major","cohort","company","linkedin","avatar","expert_tags","notes" }]   # expert_tags: "Fundraising, Hiring" (up to 3)
    seed/alumni.json     [{ "name","status","company","title","email","grad_year","cohort","raised","can_help","linkedin","notes" }]
    seed/events.json     [{ "name","status","date","time","location","link","rsvp","category","notes" }]
    seed/updates.json    [{ "name","status","author","date","category","link","member_a","member_b","notes" }]   # category Ask|Intro|Update|Announcement|...; name is the title or the question
    seed/resources.json  [{ "name","status","url","category","owner","notes" }]          # status Published|Draft; notes = description
    seed/finance.json    [{ "name","status","kind","amount","period","counterparty","notes" }]  # amount is text, e.g. "$500"; period YYYY-MM-DD
    seed/deals.json, seed/recruit.json   outreach research; a fresh local DB turns them into deals at Researching / Drafted (lib/seed.mjs). Do not reshape.

Dates are `YYYY-MM-DD`. Statuses and select options must match `lib/schema.ts`. `avatar` and `rsvp` are http(s) URLs (others are not rendered as links). Never invent amounts, people or links: `resources.json` and `finance.json` start empty on purpose.

## Conventions
- `lib/schema.ts` is the single source of truth for types, fields, statuses and list columns. Add a field there and forms, lists, search, CSV and the API follow.
- Never fabricate people, companies or relationships in seed files or via the API. Leave a field empty rather than guess.
- Writes are admin-only: the admin cookie in the UI (`requireAdmin` in `app/actions.ts`), the bearer token in the API.
- Site access is `isMemberEmail` (`lib/access.ts`): a Members record with status Active or Exec and a matching email, or an address in `ALLOWED_EMAILS`. Deactivating or deleting the member locks them out.
- Intro posts (category Intro) name `member_a` and `member_b`. An admin's "Request intro" creates a Warm intro (`pocs`: org = member_b, E@B contact = member_a) unless a non-Dropped one exists; then the post shows "Intro made".
- The deal pipeline: Researching, Drafted, Contacted, In conversation, Dropped, Confirmed, Active, Completed, Expired. Before Confirmed nothing is agreed. Promoting is a status change (admin only). Perks are deals at Confirmed/Active.
- Navigation: one top nav: Directory, Deals, Events, Resources, then Alumni, VCs, Intros and Finances (admins only), a search input, Admin. No second nav, no CRM or console. Do not add more nav surfaces.
- Perks are not a type: they are `deals` with status Confirmed or Active, shown to members on `/deals`. Confirm a deal to publish a perk.
- No new npm dependencies without the maintainer's approval.

## Deploy (Vercel)
Env vars: `DATABASE_URL` (Neon/Supabase Postgres), `ADMIN_PASSWORD` (also the API token), `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` (OAuth redirect `https://members.entrepreneursatberkeley.com/api/auth/callback/google`), and optionally `ALLOWED_EMAILS` (bootstrap admins). Tables are created on first request; load real data with `DATABASE_URL=... npm run seed:load`. Dev login is disabled in production.
