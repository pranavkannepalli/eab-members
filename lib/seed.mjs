// Seed rows from seed/*.json. Plain JS so both the app (lib/db.ts) and scripts/seed-load.mjs use the same code.
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Types loaded straight from seed/<type>.json. Prospects are derived from deals.json + recruit.json below.
export const SEED_TYPES = ["members", "alumni", "events", "updates", "resources", "finance"];
const DEFAULT_STATUS = { members: "Active", alumni: "In touch", events: "Upcoming", updates: "Open", resources: "Published", finance: "Planned" };

const read = (dir, f) => JSON.parse(readFileSync(join(dir, f), "utf8"));

/** Rows for one seed type: every key except name/status/notes goes into data. */
export function typeRows(type, dir = join(process.cwd(), "seed")) {
  return read(dir, `${type}.json`).filter((e) => e && String(e.name || "").trim()).map(({ name, status, notes, ...rest }) => ({
    type, name: String(name).trim(), status: status || DEFAULT_STATUS[type] || "",
    data: Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, String(v ?? "")])), notes: notes || "",
  }));
}

/** Unconfirmed outreach targets from the outreach sheets (seed/deals.json, seed/recruit.json). */
export function prospectRows(dir = join(process.cwd(), "seed")) {
  const rows = [];
  for (const d of read(dir, "deals.json")) {
    const cat = /Ambassador/i.test(d.angle) ? "Ambassador" : /hackathon|event/i.test(d.angle) ? "Event sponsor" : "Perk / credits";
    rows.push({ type: "prospects", name: d.name, status: "Researching", data: { category: cat, tier: d.tier, route: d.route, caveat: d.caveat, contact_name: d.roles ? `Find: ${d.roles}` : "" }, notes: "Unconfirmed target from outreach research. " + d.angle + (d.why ? `\n\nWhy: ${d.why}` : "") });
  }
  for (const r of read(dir, "recruit.json")) {
    rows.push({ type: "prospects", name: r.name, status: /not started/i.test(r.status || "") || !r.status ? "Researching" : "Drafted", data: { category: "Recruiting", tier: r.segment, route: r.route, contact_name: r.roles ? `Find: ${r.roles}` : "" }, notes: r.angle || "" });
  }
  return rows;
}

export function seedRows(dir = join(process.cwd(), "seed")) {
  return [...SEED_TYPES.flatMap((t) => typeRows(t, dir)), ...prospectRows(dir)];
}
