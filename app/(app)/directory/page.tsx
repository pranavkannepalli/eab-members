import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { Avatar } from "@/components";
import { tags } from "@/lib/feed";
import { plural } from "@/lib/format";
import { isAdmin } from "@/lib/admin";
export const dynamic = "force-dynamic";

export default async function Directory() {
  const members: Rec[] = await query("select * from records where type='members' and status in ('Active','Exec') order by name");
  const admin = await isAdmin();
  // Admins also need the members the grid leaves out (Pending, Inactive) to edit or reactivate them.
  const others: Rec[] = admin ? await query("select * from records where type='members' and status not in ('Active','Exec') order by name") : [];
  return (
    <>
      <div className="head"><div><h1>Directory</h1>
        <p className="muted">{plural(members.length, "member", "members")} building at Berkeley.</p></div>
        {admin && <div><a className="btn ghost" href="/api/export/members">Export CSV</a> <Link className="btn" href="/directory/new">+ Add member</Link></div>}</div>
      {members.length === 0 && <div className="card"><p className="muted">No one's here yet. Check back soon.</p></div>}
      <div className="people">
        {members.map((m) => (
          <Link key={m.id} href={`/directory/${m.id}`} className="card person">
            <Avatar rec={m} />
            <div>
              <b>{m.name}</b>
              {m.data.role && <span>{m.data.role}</span>}
              {(m.data.year || m.data.major) && <span className="muted small">{[m.data.year, m.data.major].filter(Boolean).join(" · ")}</span>}
              {m.data.company && <span className="muted small">{m.data.company}</span>}
              {tags(m.data.expert_tags).length > 0 && <span className="tags">{tags(m.data.expert_tags).slice(0, 2).map((t) => <span key={t} className="tag">{t}</span>)}</span>}
            </div>
          </Link>
        ))}
      </div>
      {others.length > 0 && (
        <section className="card"><p className="eyebrow">Hidden from the directory: pending or inactive</p>
          {others.map((m) => <p key={m.id}><Link href={`/directory/${m.id}`}>{m.name}</Link> <span className={`pill s-${m.status}`}>{m.status}</span></p>)}
        </section>
      )}
    </>
  );
}
