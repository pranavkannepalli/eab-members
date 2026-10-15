// Lightweight identity until Google sign-in ships: the `eab_identity` cookie ({"name","email"}, set by ui/identity.tsx, unverified),
// else the signed-in session. Used for claims, RSVPs, answer authorship and notifications; never for access control.
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { query, Rec } from "@/lib/db";
import { today } from "@/lib/feed";

export const IDENTITY_COOKIE = "eab_identity";
export type Identity = { name: string; email: string; source: "cookie" | "session" };

function parse(raw: string) {
  for (const s of [raw, (() => { try { return decodeURIComponent(raw); } catch { return ""; } })()]) {
    try {
      const j = JSON.parse(s);
      const name = String(j?.name || "").trim().slice(0, 120), email = String(j?.email || "").trim().toLowerCase().slice(0, 200);
      if (name && /^[^\s@]+@[^\s@]+$/.test(email)) return { name, email };
    } catch { /* try the next form */ }
  }
  return null;
}

export async function getIdentity(): Promise<Identity | null> {
  const raw = (await cookies()).get(IDENTITY_COOKIE)?.value;
  const c = raw ? parse(raw) : null;
  if (c) return { ...c, source: "cookie" };
  const u = (await auth())?.user;
  return u?.email ? { name: u.name || u.email, email: u.email.toLowerCase(), source: "session" } : null;
}

export async function memberByEmail(email: string): Promise<Rec | null> {
  const [m] = await query("select * from records where type='members' and lower(trim(data->>'email'))=$1 limit 1", [email.trim().toLowerCase()]);
  return m ?? null;
}

/** Claim counts per deal, and which of them this email has claimed. */
export async function claimState(dealIds: number[], email?: string) {
  const rows: { deal_id: number; n: number; mine: boolean }[] = dealIds.length
    ? await query("select deal_id, count(*)::int n, bool_or(member_email=$2) mine from claims where deal_id = any($1::int[]) group by deal_id", [dealIds, email || ""])
    : [];
  return { count: (id: number) => rows.find((r) => r.deal_id === id)?.n ?? 0, mine: (id: number) => !!rows.find((r) => r.deal_id === id)?.mine };
}

/** Going counts per event, and this email's answer (true/false, null when they have not answered). */
export async function rsvpState(eventIds: number[], email?: string) {
  const rows: { event_id: number; n: number; me: boolean | null }[] = eventIds.length
    ? await query("select event_id, (count(*) filter (where going))::int n, bool_or(going) filter (where member_email=$2) me from rsvps where event_id = any($1::int[]) group by event_id", [eventIds, email || ""])
    : [];
  return { count: (id: number) => rows.find((r) => r.event_id === id)?.n ?? 0, me: (id: number) => rows.find((r) => r.event_id === id)?.me ?? null };
}

export type Notice = { key: string; text: string; href: string };
const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

/** Computed on each request (no table): events they are going to today or tomorrow, and perks from the last 7 days they have not claimed. */
export async function notifications(email: string): Promise<Notice[]> {
  const now = today(), tomorrow = addDays(now, 1);
  const soon: Rec[] = await query(
    `select r.* from rsvps v join records r on r.id=v.event_id
     where v.member_email=$1 and v.going and r.type='events' and r.status='Upcoming' and coalesce(r.data->>'date','') between $2 and $3
     order by r.data->>'date', r.data->>'time'`, [email, now, tomorrow]);
  // A perk is "new" when its deal was confirmed or edited in the last week (promotion bumps updated_at).
  const perks: Rec[] = await query(
    `select * from records where type='deals' and status in ('Confirmed','Active') and updated_at > now() - interval '7 days'
     and id not in (select deal_id from claims where member_email=$1) order by updated_at desc limit 10`, [email]);
  return [
    ...soon.map((e) => ({ key: `event-${e.id}-${e.data.date}`, text: `${e.name} is ${e.data.date === now ? "today" : "tomorrow"}${e.data.time ? ` at ${e.data.time}` : ""}`, href: "/events" })),
    ...perks.map((d) => ({ key: `perk-${d.id}`, text: `New perk: ${d.name}${d.data.value ? ` (${d.data.value})` : ""}`, href: `/deals/${d.id}` })),
  ];
}
