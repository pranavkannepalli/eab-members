# AGENTS.md: operating the E@B members site

Instructions for an AI agent working in this repo or managing its data.

## What this is
Private members site for Entrepreneurs at Berkeley (members.entrepreneursatberkeley.com), Bookface-style. Home is a member feed (club updates + upcoming events); member pages for Perks, Events, Directory, Resources and Finances; `/crm` holds every type (members, alumni, deals, prospects, VC partners, warm intros, updates, events, resources, finance); `/crm/search` searches all of them; `/admin` manages data.

Stack: Next.js 15 App Router, React 19, NextAuth v5 beta (email + password via the Credentials provider, members only), Postgres via `DATABASE_URL` in production, embedded PGlite in `./.data` locally. No ORM.

**Invariant: one table.** Every entity is a row in `records(id, type, name, status, data jsonb, notes, created_at, updated_at)`. `type` is a slug from `lib/schema.ts`; `data` holds that type's fields as strings; long text (update body, event description) goes in `notes`. Do not add per-type columns. The only other tables hold per-person activity on records, created in `lib/db.ts` init (one `create table if not exists` call each): `comments` (answers/replies on `updates` posts), `claims` (perk claims: deal_id + member_email, unique) and `rsvps` (event_id + member_email + going, unique). Plus accounts and mail: `users` (email unique, scrypt `password_hash`, name, role admin|member, notifications_enabled) and `blasts` / `blast_recipients` (admin email blasts and per-recipient delivery status). Do not add more without the maintainer's approval.

## Pages
Every page reads the same `records` table. Member pages are read-only; editing happens in `/crm` (admin) or the API.

There is exactly one navbar: the top bar (`Nav` in `components.tsx`) with Directory, Events, Perks, Resources (CRM and Finances only when the admin cookie is set; the pages stay reachable by URL), a built-in search input (plain GET form to `/crm/search?q=`) and the Admin link. Inside the CRM, one row of type tabs (with counts) sits above the list pages: `/crm` lands on the Members table, `/crm/<type>` shows that type, and the old overview dashboard is at `/crm/overview` (linked from the list head). Detail pages link back to their list.

| Route | Module | Data |
|---|---|---|
| `/` | Feed: composer (admin), typed post cards, rail with upcoming events, perks, newest members | `updates`, `events`, `deals`, `members` |
| `/perks`, `/perks/<id>` | Perks: how to claim each confirmed deal, Claim button and claim count | `deals` with status Confirmed or Active |
| `/events` | Events: upcoming (date chip, Going / Not going with count, external RSVP link) and last 12 past | `events` (Upcoming / Past) |
| `/directory` | Directory: member grid (expertise chips); cards open the member profile (`/directory/<id>` redirects there) | `members` with status Active or Exec |
| `/resources` | Resources grouped by category | `resources` with status Published (drafts only in CRM) |
| `/finances` | Finances: Budget / Spent / Sponsor money / Reimbursed totals + all entries | `finance` |
| `/crm/members/<id>` | Member profile: building, expertise, posts, intros they can make, perks claimed; admins edit here | `members`, `updates`, `pocs` |
| `/crm`, `/crm/<type>`, `/crm/<type>/<id>` | CRM: type tabs + lists with filters (`/crm` = Members), edit forms (admin) | every type |
| `/crm/overview` | CRM dashboard: counts, next steps due, recently updated | every type |
| `/crm/search` | Search results for the top-bar search input (no form of its own) | every type |
| `/admin` | Admin: CSV import, clear a tab | every type |
| `/admin/blasts` | Email blasts: compose, pick recipients, send, history with per-recipient status | `users`, `blasts`, `blast_recipients` |
| `/login`, `/signup` | Email + password sign-in and member sign-up | `users` |

Finance totals parse the leading number of `amount` (`"$1,200"` -> 1200). Entries without a number are skipped and shown as "n uncounted" on their card. Totals count: Budget = Budget line in Planned/Committed/Paid; Spent = Expense Paid; Sponsor money = Sponsorship Committed/Paid; Reimbursed = Reimbursement Reimbursed.

## Run it
    npm install
    npm run dev          # http://localhost:3000, auto-creates and seeds ./.data/pg on first request
    npm run build        # typecheck + production build

- Admin password locally is `admin` (when `ADMIN_PASSWORD` is unset and NODE_ENV is not production). Unlock at `/admin/login`.
- Sign-in is email + password at `/login`; `/signup` (name, email, password, 8+ chars) creates a member account and signs you in. Sign-up only accepts emails on the member list (Active/Exec Members record with that email, or `ALLOWED_EMAILS`); locally the seeded members have no emails, so set `ALLOWED_EMAILS=you@example.com` to try it. Set `AUTH_SECRET` (any string) or Auth.js refuses to sign anyone in.
- Admin account: on first request an admin row is created in `users` from `ADMIN_EMAIL` + `ADMIN_PASSWORD` if it does not exist yet (locally `admin@eab.local` / `admin`). It signs in on the normal `/login` form and has admin rights everywhere, same as the admin-password cookie. It is never overwritten later; to promote someone else: `update users set role='admin' where email='...'`.
- Passwords are hashed with `node:crypto` scrypt (`lib/password.ts`). Every session is re-checked per request: deleting the `users` row or deactivating the member locks them out.

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

Feed answers (table `comments`; reads need a member session, the admin cookie or the bearer token):

    curl -H "$H" "$BASE/api/comments?post_id=17"                       # -> {"count": N, "comments": [...]} (hidden ones left out)
    curl -H "$H" -H 'content-type: application/json' -X POST "$BASE/api/comments" -d '{"post_id":17,"author":"Maya Sofer","body":"Tabling worked."}'
    curl -H "$H" -H 'content-type: application/json' -X PATCH "$BASE/api/comments/3" -d '{"best":true}'   # admin; clears best on the post's other answers
    curl -H "$H" -H 'content-type: application/json' -X PATCH "$BASE/api/comments/3" -d '{"hidden":true}' # admin
    curl -H "$H" -X DELETE "$BASE/api/comments/3"                                                        # admin

Claims and RSVPs belong to the signed-in account (the NextAuth session cookie). With the bearer token you may act for someone by adding `member_email`/`member_name` to the body.

    ID="Cookie: authjs.session-token=<from a signed-in browser>"   # or drop it and pass member_email with the bearer token
    curl -H "$H" -H "$ID" "$BASE/api/claims"                                           # -> {"email", "count", "claims": [{deal_id, claimed_at}]}
    curl -H "$H" -H "$ID" -H 'content-type: application/json' -X POST "$BASE/api/claims" -d '{"deal_id":42}'   # -> {"deal_id","claimed":true,"count"}
    curl -H "$H" -H "$ID" "$BASE/api/rsvps?event_id=7"                                  # -> {"event_id","going":<count>,"me":true|false|null}
    curl -H "$H" -H "$ID" -H 'content-type: application/json' -X POST "$BASE/api/rsvps" -d '{"event_id":7,"going":true}'   # going=false un-RSVPs

The top-bar bell is computed per request (no table): events the identity is going to today or tomorrow, and perks confirmed or edited in the last 7 days they have not claimed. "Read" state is kept in the browser's localStorage.

Email blasts (admin: bearer token, admin cookie or admin account; UI at `/admin/blasts`). Sent through the Resend HTTP API, one email per recipient, in batch calls of at most 100 (`lib/resend.ts`; test with `npm run test:resend`). Recipients are accounts with `notifications_enabled` (members toggle it in their top-bar menu) that still have access; `emails` narrows that list and never adds to it. Without `RESEND_API_KEY` the send returns 503 and nothing is written. From address is `RESEND_FROM`, default Resend's test sender `onboarding@resend.dev` (which only delivers to the Resend account owner's address until a domain is verified).

    curl -H "$H" "$BASE/api/blasts?recipients=1&q=maya&role=member"   # -> {"count","recipients":[{email,name,role}]}
    curl -H "$H" -H 'content-type: application/json' -X POST "$BASE/api/blasts" -d '{"subject":"Demo day Friday","body":"...","emails":["maya@example.com"]}'
    # -> 201 {"blast_id","recipient_count","sent","failed","status":"sent|partial|failed"}; 503 {"error":"Resend is not configured..."}
    curl -H "$H" "$BASE/api/blasts"                                    # -> history with per-recipient status/error

Types and their fields/statuses: read `lib/schema.ts` (slugs: members, alumni, deals, prospects, vcs, pocs, updates, events, resources, finance). A 400 response lists the allowed types, statuses or field keys.

## Data onboarding
Rosters live in `seed/*.json`. Edit those files, then:

    npm run seed:load                  # replace members, alumni, events, updates, resources, finance; re-derive prospects
    npm run seed:load -- --type=members
    npm run seed:load -- --dry-run     # counts only, writes nothing

It replaces every row of each loaded type, so CRM edits to those types are lost. Use the API for one-off changes. It uses `DATABASE_URL` (env or `.env`) or the local PGlite DB. Stop `npm run dev` first when targeting PGlite (one process at a time). A fresh local DB also auto-seeds from the same files.

Shapes (every key optional except `name`; values are strings; unknown keys are stored but not shown):

    seed/members.json    [{ "name","status","role","email","year","major","cohort","company","linkedin","avatar","expert_tags","notes" }]   # expert_tags: "Fundraising, Hiring" (up to 3)
    seed/alumni.json     [{ "name","status","company","title","email","grad_year","cohort","raised","can_help","linkedin","notes" }]
    seed/events.json     [{ "name","status","date","time","location","link","rsvp","category","notes" }]
    seed/updates.json    [{ "name","status","author","date","category","link","member_a","member_b","notes" }]   # category Ask|Intro|Update|Announcement|...; name is the title or the question
    seed/resources.json  [{ "name","status","url","category","owner","notes" }]          # status Published|Draft; notes = description
    seed/finance.json    [{ "name","status","kind","amount","period","counterparty","notes" }]  # amount is text, e.g. "$500"; period YYYY-MM-DD
    seed/deals.json, seed/recruit.json   outreach research; turned into Prospects (lib/seed.mjs). Do not reshape.

Dates are `YYYY-MM-DD`. Statuses and select options must match `lib/schema.ts`. `avatar` and `rsvp` are http(s) URLs (others are not rendered as links). Never invent amounts, people or links: `resources.json` and `finance.json` start empty on purpose.

## Conventions
- `lib/schema.ts` is the single source of truth for types, fields, statuses and list columns. Add a field there and forms, lists, search, CSV and the API follow.
- Never fabricate people, companies or relationships in seed files or via the API. Leave a field empty rather than guess.
- Writes are admin-only: the admin cookie or an admin account in the UI (`requireAdmin` in `app/actions.ts`), the bearer token in the API.
- Site access is `hasAccess` (`lib/access.ts`): a `users` account that is an admin, or whose email passes `isMemberEmail` (a Members record with status Active or Exec and a matching email, or an address in `ALLOWED_EMAILS`). Deactivating or deleting the member, or deleting the account, locks them out.
- Intro posts (category Intro) name `member_a` and `member_b`. An admin's "Request intro" creates a Warm intro (`pocs`: org = member_b, E@B contact = member_a) unless a non-Dropped one exists; then the post shows "Intro made".
- Prospects are unconfirmed. Only an admin promotes one to a Deal.
- Navigation: one top nav: Directory, Events, Perks, Resources, CRM and Finances (admins only), a search input, Admin. Inside `/crm` list pages only, the type tab bar. No other second nav. Do not add more nav surfaces.
- Perks are not a type: they are `deals` with status Confirmed or Active. Confirm a deal (or promote a prospect) to publish a perk.
- No new npm dependencies without the maintainer's approval.

## Deploy (Vercel)
Env vars: `DATABASE_URL` (Neon/Supabase Postgres), `ADMIN_PASSWORD` (also the API token), `AUTH_SECRET`, `ADMIN_EMAIL` (seeds the admin account), `RESEND_API_KEY` and `RESEND_FROM` (email blasts; optional, sending is off without the key), and optionally `ALLOWED_EMAILS` (bootstrap emails allowed to sign up). Tables are created on first request; load real data with `DATABASE_URL=... npm run seed:load`.
