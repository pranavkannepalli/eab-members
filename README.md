# E@B Members site (members.entrepreneursatberkeley.com)
One app: sign in with Berkeley Google, land on a bookcase of tools. CRM is the first shelf (/crm); Finances (/finances) is reserved. Admin password on top for managing data.


Simple CRM for Entrepreneurs at Berkeley: members, alumni, deals, VC partners, and warm-intro contacts (who at E@B knows an important person). Next.js 15 (App Router) + Postgres + Auth.js Google sign-in.

## Run locally
    npm install
    npm run dev        # http://localhost:3000
No env needed locally: it uses an embedded Postgres (PGlite) in ./.data and seeds itself on first run. Dev admin password is `admin` (dev only).

## Deploy to Vercel
1. Create a Postgres DB (Neon via Vercel Marketplace, or Supabase). Copy its connection string.
2. Google Cloud Console > Credentials > OAuth client (Web). Redirect URI: `https://members.entrepreneursatberkeley.com/api/auth/callback/google`. Consent screen "Internal" is not available outside a Workspace org, so keep it External + in production.
3. Push this folder to a GitHub repo and import it in Vercel. Set env vars from `.env.example`:
   `DATABASE_URL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, and optionally `ALLOWED_DOMAIN` (default berkeley.edu), `ALLOWED_EMAILS` (extra exceptions), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
4. Deploy. Tables are created and seeded automatically on first request.

## Notes
- Admin: /admin is protected by the ADMIN_PASSWORD env var. Admin mode is the only way to add, edit, delete, promote or import. Without Google configured, the admin password is the only way into the site.
- Prospects vs Deals: Deals are confirmed only. Outreach targets live in Prospects; an admin promotes one to a Deal explicitly.
- Members: sign in with Google; verified @berkeley.edu accounts (or emails in `ALLOWED_EMAILS`) can view. Set `ALLOWED_DOMAIN=` empty to restrict to the list only.
- Domain: add `members` CNAME in Wix DNS to Vercel, add the domain in Vercel, and use `https://members.entrepreneursatberkeley.com/api/auth/callback/google` as the Google redirect URI.
- (old note) Dev login is disabled when NODE_ENV=production.
- Schema: one `records` table (type, name, status, data jsonb, notes). Fields per type live in `lib/schema.ts`; add a field there and it shows up in forms, lists and CSV export.
- Seed (lib/db.ts, seed/): 9 members/exec from the public site, 6 alumni companies (founder names TBD), 40 Prospects (unconfirmed deal/perk and resume-book recruiting targets from the outreach sheets; Deals starts empty). No VC partners or warm intros are seeded: nobody's real relationships were invented.
- Transfer: standard Postgres + Next.js, no vendor lock-in. Export CSV per tab at /api/export/<type>.
