# E@B Members site (members.entrepreneursatberkeley.com)
One app: sign in with email + password, land on the member feed (club updates, upcoming events). Admin password on top for managing data.

Page map:
- `/` member feed: composer (admin), typed posts (Ask, Intro, Update, Announcement...), rail with upcoming events, perks and newest members
- `/updates/<id>` one post with its answers
- `/directory` active members; profiles at `/directory/<id>` (expertise, posts, intros)
- `/deals` the deals pipeline: members see perks (confirmed deals) with how to claim them; admins see every status
- `/events` upcoming and past events with RSVP links
- `/resources` published guides, tools, templates and links
- `/finances` budget, spending, sponsor money and reimbursements (visible to all members)
- `/alumni`, `/vcs`, `/intros` admin only
- `/search` global search results, `/admin` import and cleanup

Every type is a first-class page; there is no CRM section. Admins add and edit inline on each page (Add button, edit form on detail pages). Old `/crm/*` and `/perks` URLs redirect.

One navbar: the top bar holds Directory, Deals, Events and Resources (plus Alumni, VCs, Intros and Finances for admins), a built-in search input (Enter searches every record type), Sign in / your name with a notifications bell and sign-out menu, and Admin.


Members site for Entrepreneurs at Berkeley: members, alumni, deals, VC partners, and warm-intro contacts (who at E@B knows an important person). Next.js 15 (App Router) + Postgres + Auth.js email/password sign-in, email blasts via Resend.

## Run locally
    npm install
    npm run dev        # http://localhost:3000
No env needed locally: it uses an embedded Postgres (PGlite) in ./.data and seeds itself on first run. Dev admin password is `admin` (dev only).

## Deploy to Vercel
1. Create a Postgres DB (Neon via Vercel Marketplace, or Supabase). Copy its connection string.
2. Optional, for email blasts: create a Resend API key (resend.com). Verify the sending domain there before setting `RESEND_FROM`.
3. Push this folder to a GitHub repo and import it in Vercel. Set env vars from `.env.example`:
   `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `AUTH_SECRET`, and optionally `ALLOWED_EMAILS` (bootstrap), `RESEND_API_KEY`, `RESEND_FROM`.
4. Deploy. Tables are created and seeded automatically on first request.

## Notes
- Admin: /admin is protected by the ADMIN_PASSWORD env var. Admin mode is the only way to add, edit, delete or import. The `ADMIN_EMAIL` account (password `ADMIN_PASSWORD`, created on first request) can also sign in on the normal login page with admin rights.
- Reserved areas: a resume book is planned but not built. It will use the same login and admin password; add it as a new record type in `lib/schema.ts` or a new route when scoped. (Finances and perks are built: `/finances` reads the `finance` type, `/deals` shows members the confirmed `deals`.)
- Feed: Updates and Events are ordinary record types (body/description in notes). Admins post from the home page composer and edit a post on `/updates/<id>`.
- Deals: one pipeline (Researching, Drafted, Contacted, In conversation, Dropped, Confirmed, Active, Completed, Expired). Before Confirmed nothing is agreed; an admin confirms a deal with a status change, and Confirmed/Active deals are the perks members see.
- Access: email + password, members only. A person can sign up at /signup, and keep getting in, if a Member record (status Active or Exec) has their email. Checked on every page load, so setting a member to Inactive or deleting them locks them out. `ALLOWED_EMAILS` is only a bootstrap list for the first admins. The seeded members have no emails yet: add them in /admin (or CSV import) before inviting anyone.
- Domain: add `members` CNAME in Wix DNS to Vercel, and add the domain in Vercel.
- Email blasts: /admin/blasts (compose, pick recipients, history with per-recipient status). Only accounts with blasts turned on receive them. Without `RESEND_API_KEY` sending is disabled (the API returns 503).
- Schema: one `records` table (type, name, status, data jsonb, notes). Fields per type live in `lib/schema.ts`; add a field there and it shows up in forms, lists and CSV export.
- Data: real rosters live in `seed/*.json` (members, alumni, events, updates, resources, finance). Load them with `npm run seed:load` (`--type=members` for one type, `--dry-run` to preview), or let a fresh local DB auto-seed on first request. `seed:load` never touches deals; only a fresh local DB derives pipeline deals from `seed/deals.json` + `seed/recruit.json`. Never hand-edit the database for onboarding. The current seed is placeholder: 9 members/exec from the public site (no emails yet), 6 alumni companies (founder names TBD), 40 pipeline deals at Researching (unconfirmed targets from the outreach research; none confirmed yet). 4 sample feed posts (`seed/updates.json`) show each post type and can be deleted once real posts exist. No VC partners, warm intros, events, resources or finance entries are seeded: nobody's real relationships, links or dollar amounts were invented. Member photos (`avatar`) and event RSVP links (`rsvp`) are optional URL fields.
- Agents / API: see AGENTS.md. `/api/records` is a JSON API (list, get, create, update, delete) authenticated with `Authorization: Bearer <ADMIN_PASSWORD>`.
- Transfer: standard Postgres + Next.js, no vendor lock-in. Export CSV per tab at /api/export/<type>.
