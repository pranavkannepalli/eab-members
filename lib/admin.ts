import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/access";

const COOKIE = "eab_admin";
const secret = () => process.env.AUTH_SECRET || "dev-secret";
const token = () => createHmac("sha256", secret()).update("admin:" + (process.env.ADMIN_PASSWORD || "")).digest("hex");

export function adminConfigured() {
  return !!process.env.ADMIN_PASSWORD || process.env.NODE_ENV !== "production";
}
export function checkPassword(pw: string) {
  const want = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== "production" ? "admin" : "");
  if (!want) return false;
  const a = Buffer.from(pw), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function setAdminCookie() {
  const t = createHmac("sha256", secret()).update("admin:" + (process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== "production" ? "admin" : ""))).digest("hex");
  (await cookies()).set(COOKIE, t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
}
export async function clearAdminCookie() { (await cookies()).delete(COOKIE); }
// Admin = the admin-password cookie, or a signed-in account with role admin.
export async function isAdmin() {
  return (await hasAdminCookie()) || isAdminEmail((await auth())?.user?.email);
}
export async function hasAdminCookie() {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const want = createHmac("sha256", secret()).update("admin:" + (process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== "production" ? "admin" : ""))).digest("hex");
  return v.length === want.length && timingSafeEqual(Buffer.from(v), Buffer.from(want));
}
export async function requireAdmin() { if (!(await isAdmin())) throw new Error("Admin password required"); }
void token;
