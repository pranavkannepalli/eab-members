// CRM list view (server only): type tab bar + head, filters and table for one type. Used by /crm (Members) and /crm/<type>.
import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { TYPES, TypeCfg } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";

export type ListParams = { q?: string; status?: string; f?: string };

export async function CrmTabs({ active }: { active: string }) {
  const counts = await query("select type, count(*)::int n from records group by type");
  const n = (s: string) => counts.find((c) => c.type === s)?.n ?? 0;
  return (
    <nav className="tabs">
      {TYPES.map((t) => (
        <Link key={t.slug} href={`/crm/${t.slug}`} className={t.slug === active ? "on" : undefined}>{t.label} <span>{n(t.slug)}</span></Link>
      ))}
    </nav>
  );
}

// action: where the filter form submits, i.e. the page it is rendered on.
export async function CrmList({ cfg, params, action }: { cfg: TypeCfg; params: ListParams; action: string }) {
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
      <div className="head"><div><p className="eyebrow">CRM</p><h1>{cfg.label}</h1><p className="muted">{cfg.blurb}</p></div>
        <div><Link className="small" href="/crm/overview">Overview</Link> <a className="btn ghost" href={`/api/export/${type}`}>Export CSV</a> {admin && <Link className="btn" href={`/crm/${type}/new`}>+ Add {cfg.singular.toLowerCase()}</Link>}</div></div>
      <form className="filters" action={action}>
        <input name="q" defaultValue={q} placeholder={`Search ${cfg.label.toLowerCase()}`} />
        <select name="status" defaultValue={status}><option value="">All statuses</option>{cfg.statuses.map((s) => <option key={s}>{s}</option>)}</select>
        {filterCfg?.options && <select name="f" defaultValue={f}><option value="">All {filterCfg.label.toLowerCase()}</option>{filterCfg.options.map((s) => <option key={s}>{s}</option>)}</select>}
        <button className="btn ghost">Filter</button>
      </form>
      <table>
        <thead><tr><th>Name</th><th>Status</th>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td><Link href={`/crm/${type}/${r.id}`}>{r.name}</Link></td><td>{r.status && <span className={`pill s-${r.status.replace(/\W/g, "")}`}>{r.status}</span>}</td>
              {cols.map((c) => <td key={c.key}>{r.data[c.key] || ""}</td>)}</tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={2 + cols.length} className="muted">Nothing here yet.</td></tr>}
        </tbody>
      </table>
      <p className="muted small">{rows.length} {rows.length === 1 ? "entry" : "entries"}</p>
    </>
  );
}
