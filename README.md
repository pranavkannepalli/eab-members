# E@B CRM

Simple CRM for Entrepreneurs at Berkeley: members, alumni, deals, VC partners, and warm-intro contacts (who at E@B knows an important person). Next.js 15 (App Router) + Postgres + Auth.js Google sign-in.

## Run locally
    npm install
    npm run dev        # http://localhost:3000
No env needed locally: it uses an embedded Postgres (PGlite) in ./.data, seeds itself on first run, and shows a dev-only login.

## Deploy to Vercel
1. Create a Postgres DB (Neon via Vercel Marketplace, or Supabase). Copy its connection string.
2. Google Cloud Console > Credentials > OAuth client (Web). Redirect URI: `https://YOUR_DOMAIN/api/auth/callback/google`.
3. Push this folder to a GitHub repo and import it in Vercel. Set env vars from `.env.example`:
   `DATABASE_URL`, `ALLOWED_EMAILS`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`.
4. Deploy. Tables are created and seeded automatically on first request.

## Notes
- Access: only emails in `ALLOWED_EMAILS` can sign in. Dev login is disabled when NODE_ENV=production.
- Schema: one `records` table (type, name, status, data jsonb, notes). Fields per type live in `lib/schema.ts`; add a field there and it shows up in forms, lists and CSV export.
- Seed (lib/db.ts, seed/): 9 members/exec from the public site, 6 alumni companies (founder names TBD), 40 deals (deal/perk targets + resume-book recruiting targets from the outreach sheets). No VC partners or warm intros are seeded: nobody's real relationships were invented.
- Transfer: standard Postgres + Next.js, no vendor lock-in. Export CSV per tab at /api/export/<type>.
