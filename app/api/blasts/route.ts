import { siteAccess, body, err, handle, json } from "@/lib/api";
import { listBlasts, sendBlast, eligibleRecipients } from "@/lib/blasts";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // big lists take a few seconds per 100 recipients

const ADMIN_ONLY = "Admin only: send Authorization: Bearer <ADMIN_PASSWORD> or sign in as an admin";

// GET /api/blasts -> past blasts with per-recipient statuses. GET /api/blasts?recipients=1&q=&role= -> who would get one
export const GET = handle(async (req: Request) => {
  if ((await siteAccess(req)) !== "admin") return err(401, ADMIN_ONLY);
  const p = new URL(req.url).searchParams;
  if (p.get("recipients")) {
    const recipients = await eligibleRecipients({ q: p.get("q") || "", role: p.get("role") || "" });
    return json({ count: recipients.length, recipients });
  }
  const blasts = await listBlasts();
  return json({ count: blasts.length, blasts });
});

// POST /api/blasts {subject, body, emails?} -> send now. 503 when RESEND_API_KEY is unset.
export const POST = handle(async (req: Request) => {
  if ((await siteAccess(req)) !== "admin") return err(401, ADMIN_ONLY);
  const b = await body(req);
  if (!b) return err(400, "Body must be a JSON object");
  if (b.emails != null && !(Array.isArray(b.emails) && b.emails.every((e) => typeof e === "string"))) return err(400, "emails must be an array of strings");
  const r = await sendBlast({ subject: String(b.subject ?? ""), body: String(b.body ?? ""), emails: b.emails as string[] | undefined });
  return r.ok ? json(r, 201) : err(r.status, r.error);
});
