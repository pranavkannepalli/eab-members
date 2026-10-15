// Generic detail and add pages for any type (server only), mounted by thin route files at each type's home (/alumni/<id>, /deals/new, ...).
import Link from "next/link";
import { lower } from "@/lib/format";
import { notFound, redirect } from "next/navigation";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";
import { homeOf, ADMIN_ONLY, PERK_STATUSES, memberCanOpen } from "@/lib/routes";
import { saveRecord, deleteRecord, setStatus } from "@/app/actions";
import { RecordForm, RecordView, Mentions, Claim } from "@/components";
import { getIdentity, claimState, rsvpState } from "@/lib/identity";
import { ClaimButton, RsvpButton } from "@/ui/toggles";

/** Admin-only pages (alumni, VCs, intros) send members back to the feed. */
export async function guard(slug: string) {
  if (ADMIN_ONLY.includes(slug) && !(await isAdmin())) redirect("/");
}

export async function RecordDetail({ slug, id }: { slug: string; id: string }) {
  const cfg = bySlug(slug);
  if (!cfg || !/^\d+$/.test(id)) notFound();
  await guard(slug);
  const [rec]: Rec[] = await query("select * from records where id=$1 and type=$2", [Number(id), slug]);
  const admin = await isAdmin();
  if (!rec || (!admin && !memberCanOpen(rec))) notFound();
  const perk = slug === "deals" && PERK_STATUSES.includes(rec.status);
  const me = perk || slug === "events" ? await getIdentity() : null;
  const claims = perk ? await claimState([rec.id], me?.email) : null;
  const rsvps = slug === "events" ? await rsvpState([rec.id], me?.email) : null;
  return (
    <>
      <p className="small"><Link href={homeOf(slug)}>← {cfg.label}</Link></p>
      <div className="head"><h1>{rec.name}</h1>
        <div className="row">
          {claims && <ClaimButton dealId={rec.id} claimed={claims.mine(rec.id)} count={claims.count(rec.id)} signedIn={!!me} />}
          {rsvps && rec.status === "Upcoming" && <RsvpButton eventId={rec.id} me={rsvps.me(rec.id)} count={rsvps.count(rec.id)} signedIn={!!me} />}
          {admin && slug === "deals" && !perk && <form action={setStatus.bind(null, "deals", rec.id, "Confirmed")}><button className="btn">Confirm deal</button></form>}
          {admin && <form action={deleteRecord.bind(null, slug, rec.id)}><button className="btn danger" formNoValidate>Delete</button></form>}
        </div></div>
      {slug === "deals" && !perk && rec.status !== "Completed" && rec.status !== "Expired" && <p className="notice">Not confirmed yet ({rec.status}). Nothing has been agreed with this company, and members can't see it until you confirm it.</p>}
      {perk && <Claim rec={rec} />}
      {slug === "events" && rec.status !== "Upcoming" && <p><span className={`pill s-${rec.status}`}>{rec.status}</span></p>}
      {admin ? <>
        <p className="muted small">Last edited {new Date(rec.updated_at).toLocaleString()}</p>
        <RecordForm cfg={cfg} rec={rec} action={saveRecord.bind(null, slug, rec.id)} />
      </> : <RecordView cfg={cfg} rec={rec} skip={perk ? ["route", "caveat"] : []} />}
      <Mentions rec={rec} />
    </>
  );
}

export async function RecordNew({ slug }: { slug: string }) {
  const cfg = bySlug(slug);
  if (!cfg) notFound();
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <>
      <p className="small"><Link href={homeOf(slug)}>← {cfg.label}</Link></p>
      <h1>Add {lower(cfg.singular)}</h1>
      <RecordForm cfg={cfg} action={saveRecord.bind(null, slug, null)} />
    </>
  );
}
