import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { bySlug } from "@/lib/schema";
import { groupBy, isHttp } from "@/lib/feed";
export const dynamic = "force-dynamic";

// Members see Published only; admins also see drafts (marked) and get Add / Edit links.
export default async function Resources() {
  const admin = await isAdmin();
  const rows: Rec[] = await query(`select * from records where type='resources' ${admin ? "" : "and status='Published'"} order by name`);
  const categories = bySlug("resources")!.fields.find((f) => f.key === "category")!.options!;
  return (
    <>
      <div className="head"><div><p className="eyebrow">E@B Members</p><h1>Resources</h1>
        <p className="muted">{bySlug("resources")!.blurb}</p></div>
        {admin && <div><a className="btn ghost" href="/api/export/resources">Export CSV</a> <Link className="btn" href="/resources/new">+ Add resource</Link></div>}</div>
      {rows.length === 0 && <div className="card"><p className="muted">The execs haven&apos;t added resources yet.</p></div>}
      {groupBy(rows, "category", categories).map(([cat, rs]) => (
        <section key={cat} className="card">
          <p className="eyebrow">{cat}</p>
          {rs.map((r) => (
            <p key={r.id}>
              {isHttp(r.data.url) ? <a href={r.data.url} target="_blank" rel="noreferrer">{r.name}</a> : <b>{r.name}</b>}
              {r.data.owner && <span className="muted small"> · {r.data.owner}</span>}
              {admin && <>{r.status !== "Published" && <> <span className={`pill s-${r.status}`}>{r.status}</span></>} <Link className="small" href={`/resources/${r.id}`}>Edit</Link></>}
              {r.notes && <><br /><span className="small">{r.notes}</span></>}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}
