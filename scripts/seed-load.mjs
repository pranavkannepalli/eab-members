// Load seed/*.json into the database (replaces rows of each loaded type).
//   node scripts/seed-load.mjs                 members, alumni, events, updates, resources, finance
// Deals are never touched: they are managed on the site (/deals), and re-deriving them would clobber real confirmed deals.
//   node scripts/seed-load.mjs --type=members  one type only
//   node scripts/seed-load.mjs --dry-run       print counts, write nothing
// Uses DATABASE_URL (env or .env) for Postgres, else the local PGlite DB in LOCAL_DB_DIR or ./.data/pg.
// Stop `npm run dev` first when using the local DB: PGlite allows one process at a time.
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { SEED_TYPES, typeRows } from "../lib/seed.mjs";

// Minimal .env parsing (no dependencies). Real env vars win.
if (existsSync(".env")) for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
}

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const only = args.find((a) => a.startsWith("--type="))?.slice(7);
if (only && !SEED_TYPES.includes(only)) { console.error(`Unknown --type=${only}. Use one of: ${SEED_TYPES.join(", ")}`); process.exit(1); }
const types = only ? [only] : SEED_TYPES;
const plan = types.map((t) => [t, typeRows(t)]);

if (dry) {
  for (const [t, rows] of plan) console.log(`${t.padEnd(10)} ${rows.length} rows (dry run, not written)`);
  process.exit(0);
}

let q, close;
if (process.env.DATABASE_URL) {
  const { default: pg } = await import("pg");
  const url = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false } });
  const client = await pool.connect(); // one connection so begin/commit wrap every write
  q = async (s, p) => (await client.query(s, p)).rows;
  close = async () => { client.release(); await pool.end(); };
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.LOCAL_DB_DIR || "./.data/pg";
  mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  q = async (s, p) => (await db.query(s, p)).rows;
  close = () => db.close();
}

// Same table as lib/db.ts, so a brand-new database works too.
await q(`create table if not exists records (id serial primary key, type text not null, name text not null, status text not null default '',
  data jsonb not null default '{}', notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now())`);
await q("create index if not exists records_type_idx on records(type)");

await q("begin");
try {
  for (const [t, rows] of plan) {
    const [{ n }] = await q("select count(*)::int as n from records where type=$1", [t]);
    await q("delete from records where type=$1", [t]);
    for (const r of rows)
      await q("insert into records(type,name,status,data,notes) values($1,$2,$3,$4,$5)", [r.type, r.name, r.status, JSON.stringify(r.data), r.notes]);
    console.log(`${t.padEnd(10)} ${n} removed, ${rows.length} loaded`);
  }
  await q("commit");
} catch (e) {
  await q("rollback");
  console.error(e);
  process.exitCode = 1;
}
await close();
