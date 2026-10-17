import { query } from "@/lib/db";

// Who may view the site: a Members record with this email and status Active or Exec,
// or an email in ALLOWED_EMAILS (bootstrap for the first admins). Checked at sign-in and on every page load,
// so removing or deactivating a member locks them out immediately.
export async function isMemberEmail(email: string | null | undefined) {
  const e = (email || "").trim().toLowerCase();
  if (!e) return false;
  const boot = (process.env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (boot.includes(e)) return true;
  const rows = await query("select 1 from records where type='members' and status in ('Active','Exec') and lower(trim(data->>'email'))=$1 limit 1", [e]);
  return rows.length > 0;
}

// Who may use a session: an account in `users` that is an admin, or whose email passes isMemberEmail.
// Deleting the account or deactivating the member locks them out on the next request.
export async function hasAccess(email: string | null | undefined) {
  const e = (email || "").trim().toLowerCase();
  if (!e) return false;
  const [u] = await query("select role from users where email=$1", [e]);
  if (!u) return false;
  return u.role === "admin" || isMemberEmail(e);
}

export async function isAdminEmail(email: string | null | undefined) {
  const e = (email || "").trim().toLowerCase();
  if (!e) return false;
  return (await query("select 1 from users where email=$1 and role='admin'", [e])).length > 0;
}
