import { mkdirSync } from "node:fs";
import { seedRows } from "./seed.mjs";

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
