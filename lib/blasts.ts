import { query } from "@/lib/db";
import { resendConfigured, resendFrom, sendEach } from "@/lib/resend";

// Admin email blasts (tables `blasts`, `blast_recipients`), sent through Resend (lib/resend.ts).
export const NOT_CONFIGURED = "Resend is not configured: set RESEND_API_KEY (and RESEND_FROM for a verified sender) to send email blasts.";
const FOOTER = "\n\n--\nYou get this because email blasts are on for your E@B Members account. Turn them off from your name in the top bar of the members site.";

export type Recipient = { email: string; name: string; role: string };
export type Filter = { q?: string; role?: string };

/** Accounts that can receive a blast: notifications on, and still allowed in (admin, Active/Exec member, or ALLOWED_EMAILS). */
export async function eligibleRecipients(f: Filter = {}): Promise<Recipient[]> {
  const boot = (process.env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const q = (f.q || "").trim(), role = f.role === "admin" || f.role === "member" ? f.role : "";
  return query(
    `select u.email, u.name, u.role from users u
     where u.notifications_enabled
       and (u.role='admin' or u.email = any($1::text[])
            or exists (select 1 from records r where r.type='members' and r.status in ('Active','Exec') and lower(trim(r.data->>'email'))=u.email))
       and ($2='' or u.name ilike '%'||$2||'%' or u.email ilike '%'||$2||'%')
       and ($3='' or u.role=$3)
     order by u.name, u.email`, [boot, q, role]);
}

export type SendResult = { ok: true; blast_id: number; recipient_count: number; sent: number; failed: number; status: string } | { ok: false; status: number; error: string };

/** Send a blast. `emails` narrows the eligible list (addresses that are not eligible, e.g. notifications off, are dropped). */
export async function sendBlast(input: { subject: string; body: string; emails?: string[] }): Promise<SendResult> {
  if (!resendConfigured()) return { ok: false, status: 503, error: NOT_CONFIGURED };
  const subject = input.subject.trim(), body = input.body.trim();
  if (!subject || !body) return { ok: false, status: 400, error: "subject and body are required" };
  let to = (await eligibleRecipients()).map((r) => r.email);
  if (input.emails) { const pick = new Set(input.emails.map((e) => e.trim().toLowerCase())); to = to.filter((e) => pick.has(e)); }
  if (to.length === 0) return { ok: false, status: 400, error: "No eligible recipients (accounts with email blasts turned on)" };

  const [{ id }] = await query("insert into blasts(subject, body, recipient_count, status) values($1,$2,$3,'sending') returning id", [subject, body, to.length]);
  await query("insert into blast_recipients(blast_id, to_email) select $1, unnest($2::text[])", [id, to]);
  const results = await sendEach(to, { subject, text: body + FOOTER }, { apiKey: process.env.RESEND_API_KEY!, from: resendFrom() });
  for (const r of results)
    await query("update blast_recipients set status=$3, error=$4, sent_at=case when $3='sent' then now() end where blast_id=$1 and to_email=$2",
      [id, r.to, r.ok ? "sent" : "failed", r.error ?? null]);
  const sent = results.filter((r) => r.ok).length, failed = results.length - sent;
  const status = failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";
  await query("update blasts set status=$2, sent_at=now() where id=$1", [id, status]);
  return { ok: true, blast_id: id, recipient_count: to.length, sent, failed, status };
}

export type BlastRow = { id: number; subject: string; body: string; recipient_count: number; status: string; sent_at: string | null; recipients: { to_email: string; status: string; error: string | null; sent_at: string | null }[] };

export async function listBlasts(limit = 50): Promise<BlastRow[]> {
  const blasts = await query("select * from blasts order by id desc limit $1", [limit]);
  const recs = blasts.length ? await query("select * from blast_recipients where blast_id = any($1::int[]) order by status, to_email", [blasts.map((b) => b.id)]) : [];
  return blasts.map((b) => ({ ...b, recipients: recs.filter((r) => r.blast_id === b.id) }));
}
