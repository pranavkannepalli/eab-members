import { auth, devLogin } from "@/auth";
import { checkPassword } from "@/lib/admin";
import { isMemberEmail } from "@/lib/access";
import { TypeCfg } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";

// JSON API auth: `Authorization: Bearer <ADMIN_PASSWORD>` = full access. Otherwise a member session may read; nobody else.
export async function apiAccess(req: Request): Promise<"admin" | "member" | null> {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (m) return checkPassword(m[1].trim()) ? "admin" : null;
  const email = (await auth())?.user?.email;
  return email && (devLogin || (await isMemberEmail(email))) ? "member" : null;
}

// For endpoints the site's own pages call (comments, claims, RSVPs): also accept the admin cookie, since admins browse without a member session.
export async function siteAccess(req: Request): Promise<"admin" | "member" | null> {
  if (!req.headers.get("authorization") && (await isAdmin())) return "admin";
  return apiAccess(req);
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
export const err = (status: number, error: string) => json({ error }, status);

// Wrap a handler so failures come back as JSON, never an HTML error page.
export function handle<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A) => {
    try { return await fn(...a); } catch (e) { console.error(e); return err(500, e instanceof Error ? e.message : "Server error"); }
  };
}

export async function body(req: Request): Promise<Record<string, unknown> | null> {
  try { const b = await req.json(); return b && typeof b === "object" && !Array.isArray(b) ? b : null; } catch { return null; }
}

// Validate `data` against the type's fields; values become strings like the forms store them.
export function cleanData(cfg: TypeCfg, data: unknown): Record<string, string> | string {
  if (data == null) return {};
  if (typeof data !== "object" || Array.isArray(data)) return "data must be an object";
  const keys = cfg.fields.map((f) => f.key);
  const bad = Object.keys(data).filter((k) => !keys.includes(k));
  if (bad.length) return `Unknown field(s) for ${cfg.slug}: ${bad.join(", ")}. Allowed: ${keys.join(", ")}`;
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v == null ? "" : String(v).trim()]));
}
