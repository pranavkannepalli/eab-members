import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";
import { postUpdate } from "@/app/actions";
export const dynamic = "force-dynamic";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date()); // YYYY-MM-DD
const STATS: [string, string][] = [["members", "Members"], ["alumni", "Alumni"], ["deals", "Deals"], ["pocs", "Warm intros"]];

export default async function Home() {
  const now = today();
  const updates: Rec[] = await query(
    `select * from records where type='updates' and status<>'Archived'
     order by (status='Pinned') desc, coalesce(nullif(data->>'date',''), to_char(created_at,'YYYY-MM-DD')) desc, created_at desc limit 20`);
  const events: Rec[] = await query(
    "select * from records where type='events' and status='Upcoming' and coalesce(data->>'date','')>=$1 order by data->>'date', data->>'time' limit 6", [now]);
  const counts = await query("select type, count(*)::int n from records where type in ('members','alumni','deals','pocs') group by type");
  const admin = await isAdmin();
  const me = admin ? (await auth())?.user : null;
  const categories = bySlug("updates")!.fields.find((f) => f.key === "category")!.options!;
  return (
    <>
      <p className="eyebrow">E@B Members</p>
      <h1>Builders need other builders.</h1>
      <div className="grid four">
        {STATS.map(([t, label]) => <div key={t} className="card stat"><b>{counts.find((c) => c.type === t)?.n ?? 0}</b><span>{label}</span></div>)}
      </div>
      <div className="feed">
        <section>
          {admin && (
            <form action={postUpdate} className="card stack">
              <h2>Share an update</h2>
              <input name="name" placeholder="Title" required />
              <div className="row">
                <select name="category" defaultValue="Announcement">{categories.map((c) => <option key={c}>{c}</option>)}</select>
                <input name="date" type="date" defaultValue={now} />
                <input name="author" placeholder="Author" defaultValue={me?.name || me?.email || ""} />
              </div>
              <textarea name="notes" rows={4} placeholder="What happened? Blank lines start new paragraphs." />
              <input name="link" placeholder="Link (optional)" />
              <div className="row"><button className="btn">Post</button><label className="small muted"><input type="checkbox" name="status" value="Pinned" className="check" /> Pin to top</label></div>
            </form>
          )}
          {updates.length === 0 && <div className="card"><p className="muted">No updates yet.{admin ? " Post the first one above." : ""}</p></div>}
          {updates.map((u) => (
            <article key={u.id} className="card post">
              <div className="head">
                <h2><Link href={`/crm/updates/${u.id}`}>{u.name}</Link></h2>
                <div className="row">{u.status === "Pinned" && <span className="pill s-Pinned">Pinned</span>}{u.data.category && <span className="pill">{u.data.category}</span>}</div>
              </div>
              <p className="muted small">{[u.data.author, u.data.date || new Date(u.created_at).toISOString().slice(0, 10)].filter(Boolean).join(" · ")}</p>
              {u.notes.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
              {u.data.link && /^https?:\/\//i.test(u.data.link) && <p className="small"><a href={u.data.link} target="_blank" rel="noreferrer">{u.data.link}</a></p>}
            </article>
          ))}
        </section>
        <aside>
          <section className="card">
            <h2>Upcoming events</h2>
            {events.length === 0 && <p className="muted small">Nothing scheduled yet.</p>}
            {events.map((e) => (
              <p key={e.id}><Link href={`/crm/events/${e.id}`}>{e.name}</Link><br />
                <span className="muted small">{[e.data.date, e.data.time, e.data.location].filter(Boolean).join(" · ")}</span></p>
            ))}
            <p className="small"><Link href="/crm/events">View all</Link></p>
          </section>
        </aside>
      </div>
    </>
  );
}
