import Link from "next/link";
import { notFound } from "next/navigation";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";
import { isHttp, relTime, postTime, postKind, tags } from "@/lib/feed";
import { saveRecord, deleteRecord } from "@/app/actions";
import { RecordForm, Mentions } from "@/components";
import { Face } from "@/ui/face";
export const dynamic = "force-dynamic";

// Member profile. This static `members` segment wins over /crm/[type]/[id]; admins edit from here with the usual record form.
export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [m]: Rec[] = await query("select * from records where id=$1 and type='members'", [Number(id)]);
  if (!m) notFound();
  const admin = await isAdmin();
  const posts: Rec[] = await query("select * from records where type='updates' and status<>'Archived' and lower(trim(data->>'author'))=lower(trim($1)) order by coalesce(nullif(data->>'date',''), to_char(created_at,'YYYY-MM-DD')) desc, created_at desc limit 20", [m.name]);
  const intros: Rec[] = await query("select * from records where type='pocs' and lower(trim(data->>'eab_contact'))=lower(trim($1)) order by updated_at desc", [m.name]);
  const claimed: Rec[] = m.data.email
    ? await query("select r.* from claims c join records r on r.id=c.deal_id where c.member_email=lower(trim($1)) and r.type='deals' order by c.claimed_at desc", [m.data.email])
    : [];
  const meta = [m.data.year, m.data.major, m.data.cohort].filter(Boolean).join(" · ");
  const expertise = tags(m.data.expert_tags);
  return (
    <div className="profilepage">
      <p className="small"><Link href="/directory">← Directory</Link></p>
      <header className="card profilecard">
        <Face name={m.name} src={m.data.avatar} size={104} />
        <div>
          <h1>{m.name}</h1>
          <p className="row">{m.data.role && <span>{m.data.role}</span>}<span className={`pill s-${m.status}`}>{m.status}</span></p>
          {meta && <p className="muted">{meta}</p>}
          {expertise.length > 0 && <p className="tags">{expertise.map((t) => <span key={t} className="tag">{t}</span>)}</p>}
          <p className="plinks">
            {isHttp(m.data.linkedin) && <a href={m.data.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a>}
            {/* Email is shown on purpose: only signed-in members can see this site. */}
            {m.data.email && <a href={`mailto:${m.data.email}`}>{m.data.email}</a>}
          </p>
        </div>
      </header>
      {m.data.company && <section className="card"><h3 className="eyebrow">What they're building</h3><p className="building">{m.data.company}</p></section>}
      {m.notes && <section className="card"><h3 className="eyebrow">About</h3><p className="pre">{m.notes}</p></section>}
      <section className="card">
        <h3 className="eyebrow">Posts</h3>
        {posts.length === 0 && <p className="muted small">No posts yet.</p>}
        {posts.map((u) => (
          <p key={u.id} className="plist">
            <Link href={`/#post-${u.id}`}>{u.name}</Link>
            <span className="pmeta">{relTime(postTime(u.data.date, u.created_at))}</span>
            {u.data.category && <span className={`badge b-${postKind(u.data.category)}`}>{u.data.category}</span>}
          </p>
        ))}
      </section>
      <section className="card">
        <h3 className="eyebrow">Intros they can make</h3>
        {intros.length === 0 && <p className="muted small">None recorded.</p>}
        {intros.map((p) => (
          <p key={p.id} className="plist">
            <Link href={`/crm/pocs/${p.id}`}>{p.name}</Link>
            <span className="pmeta">{[p.data.title, p.data.org !== p.name && p.data.org].filter(Boolean).join(" · ")}</span>
            <span className={`pill s-${p.status.replace(/\W/g, "")}`}>{p.status}</span>
          </p>
        ))}
      </section>
      <section className="card">
        <h3 className="eyebrow">Perks claimed</h3>
        {claimed.length === 0 && <p className="muted small">{m.data.email ? "None yet." : "Add an email to this member to track claims."}</p>}
        {claimed.map((d) => <p key={d.id} className="plist"><Link href={`/perks/${d.id}`}>{d.name}</Link><span className="pmeta">{d.data.value}</span></p>)}
      </section>
      {admin && (
        <details className="card editprofile">
          <summary>Edit profile</summary>
          <RecordForm cfg={bySlug("members")!} rec={m} action={saveRecord.bind(null, "members", m.id)} />
          <form action={deleteRecord.bind(null, "members", m.id)}><button className="btn danger" formNoValidate>Delete member</button></form>
        </details>
      )}
      <Mentions rec={m} />
    </div>
  );
}
