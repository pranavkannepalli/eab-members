import Link from "next/link";
import { notFound } from "next/navigation";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";
import { Claim } from "@/components";
import { getIdentity, claimState } from "@/lib/identity";
import { ClaimButton } from "@/ui/toggles";
export const dynamic = "force-dynamic";

export default async function Perk({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [d]: Rec[] = await query("select * from records where id=$1 and type='deals' and status in ('Confirmed','Active')", [Number(id)]);
  if (!d) notFound();
  const admin = await isAdmin();
  const me = await getIdentity();
  const claims = await claimState([d.id], me?.email);
  // Everything except the claim fields, which get their own block.
  const fields = bySlug("deals")!.fields.filter((f) => !["route", "caveat"].includes(f.key) && d.data[f.key]);
  return (
    <>
      <p className="small"><Link href="/perks">← Perks</Link></p>
      <div className="head"><h1>{d.name}</h1>
        <div className="row">{d.data.category && <span className="pill">{d.data.category}</span>}<span className={`pill s-${d.status}`}>{d.status}</span>
          <ClaimButton dealId={d.id} claimed={claims.mine(d.id)} count={claims.count(d.id)} signedIn={!!me} /></div></div>
      <Claim rec={d} />
      <section className="card two">
        {fields.map((f) => <p key={f.key}><span className="eyebrow">{f.label}</span><br />{d.data[f.key]}</p>)}
        {fields.length === 0 && <p className="muted">No other details.</p>}
      </section>
      {d.notes && <section className="card post"><h2>Notes</h2><p>{d.notes}</p></section>}
      <p className="small"><Link href={`/crm/deals/${d.id}`}>{admin ? "Edit in CRM" : "CRM record"}</Link></p>
    </>
  );
}
