import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { groupBy, isHttp } from "@/lib/feed";
export const dynamic = "force-dynamic";

// Published only; drafts stay in the CRM tab for admins.
export default async function Resources() {
  const rows: Rec[] = await query("select * from records where type='resources' and status='Published' order by name");
  const categories = bySlug("resources")!.fields.find((f) => f.key === "category")!.options!;
  return (
    <>
      <p className="eyebrow">E@B Members</p>
      <h1>Resources</h1>
      <p className="muted">{bySlug("resources")!.blurb}</p>
      {rows.length === 0 && <div className="card"><p className="muted">The execs haven&apos;t added resources yet.</p></div>}
      {groupBy(rows, "category", categories).map(([cat, rs]) => (
        <section key={cat} className="card">
          <p className="eyebrow">{cat}</p>
          {rs.map((r) => (
            <p key={r.id}>
              {isHttp(r.data.url) ? <a href={r.data.url} target="_blank" rel="noreferrer">{r.name}</a> : <b>{r.name}</b>}
              {r.data.owner && <span className="muted small"> · {r.data.owner}</span>}
              {r.notes && <><br /><span className="small">{r.notes}</span></>}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}
