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
