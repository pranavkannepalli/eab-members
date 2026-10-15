import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { groupBy } from "@/lib/feed";
import { Claim } from "@/components";
export const dynamic = "force-dynamic";

// Perks are confirmed deals. The CRM deals tab stays the admin surface.
export default async function Perks() {
  const perks: Rec[] = await query("select * from records where type='deals' and status in ('Confirmed','Active') order by coalesce(nullif(data->>'category',''),'Other'), name");
  const categories = bySlug("deals")!.fields.find((f) => f.key === "category")!.options!;
  return (
    <>
      <p className="eyebrow">E@B Members</p>
      <h1>Perks</h1>
      <p className="muted">Credits, discounts and programs E@B has confirmed for members.</p>
      {perks.length === 0 && <div className="card"><p className="muted">No confirmed perks yet. When a deal is confirmed by an admin it appears here.</p></div>}
      {groupBy(perks, "category", categories).map(([cat, rows]) => (
        <section key={cat}>
          <p className="eyebrow section">{cat}</p>
          {rows.map((d) => (
            <article key={d.id} className="card">
              <div className="head">
                <h2><Link href={`/perks/${d.id}`}>{d.name}</Link></h2>
                <div className="row">{d.data.category && <span className="pill">{d.data.category}</span>}</div>
              </div>
              <p className="muted small">{[d.data.tier, d.data.value].filter(Boolean).join(" · ")}</p>
              <Claim rec={d} />
              <p className="small"><Link href={`/crm/deals/${d.id}`}>CRM record</Link></p>
            </article>
          ))}
        </section>
      ))}
    </>
  );
}
