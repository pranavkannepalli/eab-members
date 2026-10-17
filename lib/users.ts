import { query } from "@/lib/db";
import { hashPassword } from "@/lib/password";

// Accounts for email + password sign-in (table `users`). Emails are stored trimmed and lowercased.
export type User = { id: number; email: string; password_hash: string; name: string; role: "admin" | "member"; notifications_enabled: boolean; created_at: string };

export const normEmail = (e: unknown) => String(e || "").trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+$/.test(e) && e.length <= 200;
export const MIN_PASSWORD = 8;

export async function userByEmail(email: string): Promise<User | null> {
  const [u] = await query("select * from users where email=$1", [normEmail(email)]);
  return u ?? null;
}

export async function createUser(u: { email: string; name: string; password: string; role?: "admin" | "member" }): Promise<User> {
  const [row] = await query("insert into users(email, password_hash, name, role) values($1,$2,$3,$4) returning *",
    [normEmail(u.email), await hashPassword(u.password), u.name.trim().slice(0, 120), u.role || "member"]);
  return row;
}
