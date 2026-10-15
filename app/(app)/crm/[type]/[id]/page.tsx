import Link from "next/link";
import { notFound } from "next/navigation";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { saveRecord, deleteRecord, promoteProspect } from "@/app/actions";
import { isAdmin } from "@/lib/admin";
import { RecordForm, Mentions } from "@/components";
export const dynamic = "force-dynamic";

export default async function Detail({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  const cfg = bySlug(type);
  if (!cfg || !/^\d+$/.test(id)) notFound();
  const [rec]: Rec[] = await query("select * from records where id=$1 and type=$2", [Number(id), type]);
  if (!rec) notFound();
  const admin = await isAdmin();
  return (
    <>
      <p className="small"><Link href={`/crm/${type}`}>← {cfg.label}</Link></p>
      <div className="head"><h1>{rec.name}</h1>
        {admin && <div className="row">
          {type === "prospects" && <form action={promoteProspect.bind(null, rec.id)}><button className="btn">Promote to confirmed deal</button></form>}
          <form action={deleteRecord.bind(null, type, rec.id)}><button className="btn danger" formNoValidate>Delete</button></form></div>}</div>
      {type === "prospects" && <p className="notice">Prospect: not a confirmed deal. Nothing has been agreed with this company.</p>}
      <p className="muted small">Updated {new Date(rec.updated_at).toLocaleString()}</p>
      <RecordForm cfg={cfg} rec={rec} action={saveRecord.bind(null, type, rec.id)} />
      <Mentions rec={rec} />
    </>
  );
}
