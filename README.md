# E@B Members site (members.entrepreneursatberkeley.com)
One app: sign in with Berkeley Google, land on the member feed (club updates, upcoming events). CRM at /crm, global search at /crm/search. Admin password on top for managing data.


Simple CRM for Entrepreneurs at Berkeley: members, alumni, deals, VC partners, and warm-intro contacts (who at E@B knows an important person). Next.js 15 (App Router) + Postgres + Auth.js Google sign-in.

## Run locally
    npm install
    npm run dev        # http://localhost:3000
No env needed locally: it uses an embedded Postgres (PGlite) in ./.data and seeds itself on first run. Dev admin password is `admin` (dev only).

## Deploy to Vercel
1. Create a Postgres DB (Neon via Vercel Marketplace, or Supabase). Copy its connection string.
2. Google Cloud Console > Credentials > OAuth client (Web). Redirect URI: `https://members.entrepreneursatberkeley.com/api/auth/callback/google`. Consent screen "Internal" is not available outside a Workspace org, so keep it External + in production.
3. Push this folder to a GitHub repo and import it in Vercel. Set env vars from `.env.example`:
   `DATABASE_URL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, and optionally `ALLOWED_EMAILS` (bootstrap), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
4. Deploy. Tables are created and seeded automatically on first request.

## Notes
- Admin: /admin is protected by the ADMIN_PASSWORD env var. Admin mode is the only way to add, edit, delete, promote or import. Without Google configured, the admin password is the only way into the site.
- Reserved areas: Finances (budget, reimbursements, sponsor money, dues), a resume book and a perks directory are planned but not built. They will use the same login and admin password; add them as new record types in `lib/schema.ts` or new routes when scoped.
- Feed: Updates and Events are ordinary record types (body/description in notes). Admins post from the home page composer or the CRM tabs.
- Prospects vs Deals: Deals are confirmed only. Outreach targets live in Prospects; an admin promotes one to a Deal explicitly.
- Access: Google sign-in, members only. A person gets in if a Member record (status Active or Exec) has their Google email. Checked on every page load, so setting a member to Inactive or deleting them locks them out. `ALLOWED_EMAILS` is only a bootstrap list for the first admins. The seeded members have no emails yet: add them in /admin (or CSV import) before inviting anyone.
- Domain: add `members` CNAME in Wix DNS to Vercel, add the domain in Vercel, and use `https://members.entrepreneursatberkeley.com/api/auth/callback/google` as the Google redirect URI.
- (old note) Dev login is disabled when NODE_ENV=production.
- Schema: one `records` table (type, name, status, data jsonb, notes). Fields per type live in `lib/schema.ts`; add a field there and it shows up in forms, lists and CSV export.
- Data: real rosters live in `seed/*.json` (members, alumni, events, updates; prospects are derived from `seed/deals.json` + `seed/recruit.json`). Load them with `npm run seed:load` (`--type=members` for one type, `--dry-run` to preview), or let a fresh local DB auto-seed on first request. Never hand-edit the database for onboarding. The current seed is placeholder: 9 members/exec from the public site (no emails yet), 6 alumni companies (founder names TBD), 40 Prospects (unconfirmed targets from the outreach sheets; Deals starts empty). No VC partners or warm intros are seeded: nobody's real relationships were invented.
- Agents / API: see AGENTS.md. `/api/records` is a JSON API (list, get, create, update, delete) authenticated with `Authorization: Bearer <ADMIN_PASSWORD>`.
- Transfer: standard Postgres + Next.js, no vendor lock-in. Export CSV per tab at /api/export/<type>.
