import Link from "next/link";
import { notFound } from "next/navigation";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { saveRecord, deleteRecord } from "@/app/actions";
import { RecordForm } from "@/components";
export const dynamic = "force-dynamic";

export default async function Detail({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  const cfg = bySlug(type);
  if (!cfg || !/^\d+$/.test(id)) notFound();
  const [rec]: Rec[] = await query("select * from records where id=$1 and type=$2", [Number(id), type]);
  if (!rec) notFound();
  // Cross-links: other records that mention this name (e.g. a PoC named on a VC or deal).
  const related: Rec[] = await query("select * from records where id<>$1 and (data::text ilike $2 or notes ilike $2) order by type, name limit 12", [rec.id, `%${rec.name}%`]);
  return (
    <>
      <p className="small"><Link href={`/${type}`}>← {cfg.label}</Link></p>
      <div className="head"><h1>{rec.name}</h1>
        <form action={deleteRecord.bind(null, type, rec.id)}><button className="btn danger" formNoValidate>Delete</button></form></div>
      <p className="muted small">Updated {new Date(rec.updated_at).toLocaleString()}</p>
      <RecordForm cfg={cfg} rec={rec} action={saveRecord.bind(null, type, rec.id)} />
      {related.length > 0 && (
        <section className="card"><h2>Mentioned elsewhere</h2>
          {related.map((r) => <p key={r.id}><Link href={`/${r.type}/${r.id}`}>{r.name}</Link> <span className="muted">{bySlug(r.type)?.singular}</span></p>)}
        </section>
      )}
    </>
  );
}
