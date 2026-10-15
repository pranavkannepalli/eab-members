import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { TYPES, bySlug } from "@/lib/schema";
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const counts = await query("select type, count(*)::int n from records group by type");
  const recent: Rec[] = await query("select * from records order by updated_at desc limit 8");
  const due: Rec[] = await query("select * from records where type in ('deals','prospects') and coalesce(data->>'next_date','')<>'' and status not in ('Dropped','Expired','Completed') order by data->>'next_date' limit 6");
  const n = (s: string) => counts.find((c) => c.type === s)?.n ?? 0;
  return (
    <>
      <p className="eyebrow">CRM</p><h1>Overview</h1><p className="muted">Admin console. Member-facing views live in the top bar.</p>
      <div className="grid">
        {TYPES.map((t) => (
          <Link key={t.slug} href={`/crm/${t.slug}`} className="card stat"><b>{n(t.slug)}</b><span>{t.label}</span></Link>
        ))}
      </div>
      <div className="two">
        <section className="card"><h2>Next steps due</h2>
          {due.length === 0 && <p className="muted">No dated next steps yet. Add a date on a deal.</p>}
          {due.map((r) => <p key={r.id}><Link href={`/crm/${r.type}/${r.id}`}>{r.name}</Link> <span className="muted">{r.data.next_date} - {r.data.next_step}</span></p>)}
        </section>
        <section className="card"><h2>Recently updated</h2>
          {recent.map((r) => <p key={r.id}><Link href={`/crm/${r.type}/${r.id}`}>{r.name}</Link> <span className="muted">{bySlug(r.type)?.singular}</span></p>)}
        </section>
      </div>
    </>
  );
}
