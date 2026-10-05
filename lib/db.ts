import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

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

function seedRows() {
  const rd = (f: string) => JSON.parse(readFileSync(join(process.cwd(), "seed", f), "utf8"));
  const rows: { type: string; name: string; status: string; data: Record<string, string>; notes: string }[] = [];
  const exec: [string, string, string][] = [
    ["Rishi Manjure", "Co-President", "Exec"], ["Shivam Kumar", "Co-President", "Exec"],
    ["Abhinav Kasturi", "External VP", "Exec"], ["Juhi Khetawat", "Internal VP", "Exec"],
    ["Maya Sofer", "Internal VP", "Exec"], ["Neal Malhotra", "Development VP", "Exec"],
    ["Tej Patel", "Development VP", "Exec"], ["Saran Chockalingam", "Projects VP", "Exec"],
    ["Pranav Kannepalli", "Member (external)", "Active"],
  ];
  for (const [name, role, status] of exec) rows.push({ type: "members", name, status, data: { role }, notes: "Seeded from the public E@B site." });
  for (const [c, raised] of [["Naive", "Series A, $28.5M"], ["Lance", ""], ["Human Behavior", ""], ["Arden", ""], ["Lumeria", ""], ["The Context Company", ""]])
    rows.push({ type: "alumni", name: `${c} (founder TBD)`, status: "Founder", data: { company: c, raised }, notes: "Company listed on the E@B site. Replace with the founder's name." });
  for (const d of rd("deals.json")) {
    const cat = /Ambassador/i.test(d.angle) ? "Ambassador" : /hackathon|event/i.test(d.angle) ? "Event sponsor" : "Perk / credits";
    rows.push({ type: "prospects", name: d.name, status: "Researching", data: { category: cat, tier: d.tier, route: d.route, caveat: d.caveat, contact_name: d.roles ? `Find: ${d.roles}` : "" }, notes: "Unconfirmed target from outreach research. " + d.angle + (d.why ? `\n\nWhy: ${d.why}` : "") });
  }
  for (const r of rd("recruit.json")) {
    rows.push({ type: "prospects", name: r.name, status: /not started/i.test(r.status || "") || !r.status ? "Researching" : "Drafted", data: { category: "Recruiting", tier: r.segment, route: r.route, contact_name: r.roles ? `Find: ${r.roles}` : "" }, notes: r.angle || "" });
  }
  return rows;
}

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
  const [{ n }] = await q("select count(*)::int as n from records");
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
