import Link from "next/link";
import { notFound } from "next/navigation";
import { query, Rec } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { isHttp } from "@/lib/feed";
import { Avatar, Mentions } from "@/components";
export const dynamic = "force-dynamic";

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [m]: Rec[] = await query("select * from records where id=$1 and type='members' and status in ('Active','Exec')", [Number(id)]);
  if (!m) notFound();
  const admin = await isAdmin();
  // Email is shown on purpose: only signed-in members can see this site.
  const rows: [string, React.ReactNode][] = [
    ["Email", m.data.email && <a href={`mailto:${m.data.email}`}>{m.data.email}</a>],
    ["Year", m.data.year], ["Major", m.data.major], ["Cohort", m.data.cohort], ["Building", m.data.company],
    ["LinkedIn", isHttp(m.data.linkedin) && <a href={m.data.linkedin} target="_blank" rel="noreferrer">{m.data.linkedin}</a>],
  ];
  const details = rows.filter(([, v]) => v);
  return (
    <>
      <p className="small"><Link href="/directory">← Directory</Link></p>
      <div className="profile">
        <Avatar rec={m} size={112} />
        <div>
          <h1>{m.name}</h1>
          <p className="row">{m.data.role && <span className="muted">{m.data.role}</span>}<span className={`pill s-${m.status}`}>{m.status}</span></p>
          {admin && <p className="small"><Link href={`/crm/members/${m.id}`}>Edit in CRM</Link></p>}
        </div>
      </div>
      {details.length > 0 && <section className="card two">
        {details.map(([k, v]) => <p key={k}><span className="eyebrow">{k}</span><br />{v}</p>)}
      </section>}
      {m.notes && <section className="card post"><h2>About</h2><p>{m.notes}</p></section>}
      <Mentions rec={m} />
    </>
  );
}
