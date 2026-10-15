// List view for one type (server only): head with Add, status / q / field filters, table of the schema list columns.
// Used by the first-class type pages (/alumni, /deals for admins, /vcs, /intros).
import Link from "next/link";
import { lower } from "@/lib/format";
import { query, Rec } from "@/lib/db";
import { TypeCfg } from "@/lib/schema";
import { recordHref, newHref, ADMIN_ONLY } from "@/lib/routes";
import { isAdmin } from "@/lib/admin";

export type ListParams = { q?: string; status?: string; f?: string };

// action: where the filter form submits, i.e. the page it is rendered on.
export async function RecordList({ cfg, params, action }: { cfg: TypeCfg; params: ListParams; action: string }) {
  const { q = "", status = "", f = "" } = params;
  const type = cfg.slug;
  const where = ["type=$1"]; const p: unknown[] = [type];
  if (q) { p.push(`%${q}%`); where.push(`(name ilike $${p.length} or data::text ilike $${p.length} or notes ilike $${p.length})`); }
  if (status) { p.push(status); where.push(`status=$${p.length}`); }
  if (f && cfg.filterField) { p.push(cfg.filterField, f); where.push(`data->>$${p.length - 1}=$${p.length}`); }
  const rows: Rec[] = await query(`select * from records where ${where.join(" and ")} order by name`, p);
  const admin = await isAdmin();
  const filterCfg = cfg.fields.find((x) => x.key === cfg.filterField);
  const cols = cfg.columns.map((k) => cfg.fields.find((x) => x.key === k)!);
  return (
    <>
      <div className="head"><div>{ADMIN_ONLY.includes(type) && <p className="eyebrow">Admin only</p>}<h1>{cfg.label}</h1><p className="muted">{cfg.blurb}</p></div>
        <div><a className="btn ghost" href={`/api/export/${type}`}>Download CSV</a> {admin && <Link className="btn" href={newHref(type)}>+ Add {lower(cfg.singular)}</Link>}</div></div>
      <form className="filters" action={action}>
        <input name="q" defaultValue={q} placeholder={`Search ${lower(cfg.label)}`} />
        <select name="status" defaultValue={status}><option value="">All statuses</option>{cfg.statuses.map((s) => <option key={s}>{s}</option>)}</select>
        {filterCfg?.options && <select name="f" defaultValue={f}><option value="">Any {filterCfg.label.toLowerCase()}</option>{filterCfg.options.map((s) => <option key={s}>{s}</option>)}</select>}
        <button className="btn ghost">Apply</button>
      </form>
      <table>
        <thead><tr><th>{cfg.nameLabel || "Name"}</th><th>Status</th>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td><Link href={recordHref(type, r.id)}>{r.name}</Link></td><td>{r.status && <span className={`pill s-${r.status.replace(/\W/g, "")}`}>{r.status}</span>}</td>
              {cols.map((c) => <td key={c.key}>{r.data[c.key] || ""}</td>)}</tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={2 + cols.length} className="muted">{q || status || f ? "No matches. Try clearing the filters." : `No ${lower(cfg.label)} yet.`}</td></tr>}
        </tbody>
      </table>
      <p className="muted small">{rows.length} {lower(rows.length === 1 ? cfg.singular : cfg.label)}</p>
    </>
  );
}
