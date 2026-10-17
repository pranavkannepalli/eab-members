import { query } from "@/lib/db";
import { siteAccess, body, err, handle, json } from "@/lib/api";
import { getIdentity, rsvpState } from "@/lib/identity";
export const dynamic = "force-dynamic";

const NO_ACCESS = "Sign in as a member or send Authorization: Bearer <ADMIN_PASSWORD>";

// GET /api/rsvps?event_id=N -> {event_id, going: <count>, me: true|false|null}
export const GET = handle(async (req: Request) => {
  if (!(await siteAccess(req))) return err(401, NO_ACCESS);
  const id = new URL(req.url).searchParams.get("event_id") || "";
  if (!/^\d+$/.test(id)) return err(400, "event_id must be a record id");
  const me = await getIdentity();
  const s = await rsvpState([Number(id)], me?.email);
  return json({ event_id: Number(id), going: s.count(Number(id)), me: s.me(Number(id)) });
});

// POST /api/rsvps {event_id, going} -> set the current identity's answer (going=false un-RSVPs). Bearer may pass {member_email, member_name}.
export const POST = handle(async (req: Request) => {
  const access = await siteAccess(req);
  if (!access) return err(401, NO_ACCESS);
  const b = await body(req);
  if (!b) return err(400, "Body must be a JSON object");
  const me = access === "admin" && b.member_email ? { email: String(b.member_email).trim().toLowerCase(), name: String(b.member_name || b.member_email).trim() } : await getIdentity();
  if (!me?.email) return err(400, "Sign in first (or, with the bearer token, pass member_email)");
  const eventId = Number(b.event_id);
  if (!Number.isInteger(eventId) || eventId <= 0) return err(400, "event_id must be a record id");
  if (typeof b.going !== "boolean") return err(400, "going must be true or false");
  const [ev] = await query("select id from records where id=$1 and type='events'", [eventId]);
  if (!ev) return err(404, "No event with that id");
  await query("insert into rsvps(event_id,member_email,member_name,going) values($1,$2,$3,$4) on conflict (event_id, member_email) do update set going=excluded.going, member_name=excluded.member_name, created_at=now()", [eventId, me.email, me.name, b.going]);
  const s = await rsvpState([eventId], me.email);
  return json({ event_id: eventId, going: s.count(eventId), me: s.me(eventId) });
});
