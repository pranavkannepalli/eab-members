import { mkdirSync } from "node:fs";
import { seedRows } from "./seed.mjs";
import { hashPassword } from "./password";

type Q = (sql: string, params?: unknown[]) => Promise<any[]>;
let ready: Promise<Q> | null = null;

const SCHEMA = `
create table if not exists records (
  id serial primary key,
  type text not null,
  name text not null,
  status text not null default '',
  data jsonb not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists records_type_idx on records(type);`;

async function init(): Promise<Q> {
  let q: Q;
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? undefined : { rejectUnauthorized: false } });
    q = async (s, p) => (await pool.query(s, p as any[])).rows;
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.LOCAL_DB_DIR || "./.data/pg";
    mkdirSync(dir, { recursive: true });
    const db = new PGlite(dir);
    q = async (s, p) => (await db.query(s, p as any[])).rows as any[];
  }
  await q(SCHEMA.split(";")[0]);
  await q("create index if not exists records_type_idx on records(type)");
  // Feed answers/replies on `updates` records. One statement per call so each table is created on a cold start.
  await q("create table if not exists comments (id serial primary key, post_id integer not null, author text not null, body text not null, created_at timestamptz not null default now(), hidden boolean not null default false, best boolean not null default false)");
  await q("create index if not exists comments_post_idx on comments(post_id)");
  // Perk claims and event RSVPs, keyed by the visitor's identity email (lib/identity.ts).
  await q("create table if not exists claims (id serial primary key, deal_id integer not null, member_email text not null, member_name text not null, claimed_at timestamptz not null default now(), unique (deal_id, member_email))");
  await q("create table if not exists rsvps (id serial primary key, event_id integer not null, member_email text not null, member_name text not null, going boolean not null, created_at timestamptz not null default now(), unique (event_id, member_email))");
  // Email + password accounts (lib/users.ts) and admin email blasts (lib/blasts.ts).
  await q("create table if not exists users (id serial primary key, email text not null unique, password_hash text not null, name text not null, role text not null default 'member' check (role in ('admin','member')), notifications_enabled boolean not null default true, created_at timestamptz not null default now())");
  await q("create table if not exists blasts (id serial primary key, subject text not null, body text not null, recipient_count integer not null default 0, status text not null default 'sending', sent_at timestamptz)");
  await q("create table if not exists blast_recipients (blast_id integer not null references blasts(id) on delete cascade, to_email text not null, status text not null default 'queued', error text, sent_at timestamptz, primary key (blast_id, to_email))");
  // Admin account for the normal sign-in form: ADMIN_EMAIL + ADMIN_PASSWORD (locally admin@eab.local / admin).
  // Created once if missing; later password or role changes are never overwritten.
  const adminEmail = (process.env.ADMIN_EMAIL || (process.env.NODE_ENV !== "production" ? "admin@eab.local" : "")).trim().toLowerCase();
  const adminPw = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== "production" ? "admin" : "");
  if (adminEmail && adminPw && (await q("select 1 from users where email=$1", [adminEmail])).length === 0)
    await q("insert into users(email, password_hash, name, role) values($1,$2,'Admin','admin') on conflict (email) do nothing", [adminEmail, await hashPassword(adminPw)]);
  const [{ n }] = await q("select count(*)::int as n from records");
  // Fresh local DB: auto-seed from seed/*.json. For real onboarding use `npm run seed:load`.
  if (n === 0) {
    for (const r of seedRows())
      await q("insert into records(type,name,status,data,notes) values($1,$2,$3,$4,$5)", [r.type, r.name, r.status, JSON.stringify(r.data), r.notes]);
  }
  return q;
}

export async function query(sql: string, params: unknown[] = []) {
  ready ??= init();
  return (await ready)(sql, params);
}

export type Rec = { id: number; type: string; name: string; status: string; data: Record<string, string>; notes: string; created_at: string; updated_at: string };
