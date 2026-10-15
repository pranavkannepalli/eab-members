import { query } from "@/lib/db";
import { siteAccess, body, err, handle, json } from "@/lib/api";
import { getIdentity, claimState } from "@/lib/identity";
export const dynamic = "force-dynamic";

const NO_ACCESS = "Sign in as a member or send Authorization: Bearer <ADMIN_PASSWORD>";
const NO_IDENTITY = "Sign in with your name and email first (eab_identity cookie)";

// GET /api/claims -> the perks the current identity has claimed
export const GET = handle(async (req: Request) => {
  if (!(await siteAccess(req))) return err(401, NO_ACCESS);
  const me = await getIdentity();
  if (!me) return err(400, NO_IDENTITY);
  const claims = await query("select deal_id, claimed_at from claims where member_email=$1 order by claimed_at desc", [me.email]);
  return json({ email: me.email, count: claims.length, claims });
});

// POST /api/claims {deal_id} -> claim a perk (idempotent). With the bearer token, {member_email, member_name} may claim for someone.
export const POST = handle(async (req: Request) => {
  const access = await siteAccess(req);
  if (!access) return err(401, NO_ACCESS);
  const b = await body(req);
  if (!b) return err(400, "Body must be a JSON object");
  const me = access === "admin" && b.member_email ? { email: String(b.member_email).trim().toLowerCase(), name: String(b.member_name || b.member_email).trim() } : await getIdentity();
  if (!me?.email) return err(400, NO_IDENTITY);
  const dealId = Number(b.deal_id);
  if (!Number.isInteger(dealId) || dealId <= 0) return err(400, "deal_id must be a record id");
  const [deal] = await query("select id from records where id=$1 and type='deals' and status in ('Confirmed','Active')", [dealId]);
  if (!deal) return err(404, "No confirmed perk with that id");
  await query("insert into claims(deal_id,member_email,member_name) values($1,$2,$3) on conflict (deal_id, member_email) do update set member_name=excluded.member_name", [dealId, me.email, me.name]);
  const s = await claimState([dealId], me.email);
  return json({ deal_id: dealId, claimed: true, count: s.count(dealId) }, 201);
});
