import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";
import { today, upcomingEvents, isHttp, relTime, postTime, postKind } from "@/lib/feed";
import { Face, personHref } from "@/ui/face";
import { Composer } from "@/ui/composer";
import { Answers, Answer } from "@/ui/answers";
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Navy date block from a YYYY-MM-DD string (parsed by hand so no timezone shifts the day).
function DateBlock({ date }: { date?: string }) {
  const m = (date || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
  return <div className="dateblock">{m ? <><b>{Number(m[2])}</b>{MONTHS[Number(m[1]) - 1]}</> : <b>TBD</b>}</div>;
}
const paragraphs = (s: string) => s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

type Thread = { answers: Answer[]; admin: boolean; viewer: string | null; profiles: Record<string, string> };

function PostCard({ u, members, ids, thread }: { u: Rec; members: Map<string, Rec>; ids: Map<string, number>; thread: Thread }) {
  const author = u.data.author || "E@B";
  const who = members.get(author.toLowerCase());
  const href = personHref(author, ids);
  const kind = postKind(u.data.category);
  return (
    <article id={`post-${u.id}`} className={`post${u.status === "Pinned" ? " pinned" : ""}`}>
      {u.status === "Pinned" && <p className="pin">Pinned</p>}
      <header className="phead">
        <Face name={author} src={who?.data.avatar} href={href} />
        <div className="pwho">
          <Link href={href} className="pname">{author}</Link>
          <span className="pmeta">{[who?.data.role, relTime(postTime(u.data.date, u.created_at))].filter(Boolean).join(" · ")}</span>
        </div>
        {u.data.category && <span className={`badge b-${kind}`}>{u.data.category}</span>}
      </header>
      <h2 className={kind === "ask" ? "askq" : "ptitle"}><Link href={`/crm/updates/${u.id}`}>{u.name}</Link></h2>
      {u.notes && <div className="pbody">{paragraphs(u.notes).map((p, i) => <p key={i}>{p}</p>)}</div>}
      {isHttp(u.data.link) && <a className="linkchip" href={u.data.link} target="_blank" rel="noreferrer">↗ {u.data.link.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}</a>}
      <Answers postId={u.id} ask={kind === "ask"} initial={thread.answers} admin={thread.admin} viewer={thread.viewer} profiles={thread.profiles} />
    </article>
  );
}

export default async function Home() {
  const updates: Rec[] = await query(
    `select * from records where type='updates' and status<>'Archived'
     order by (status='Pinned') desc, coalesce(nullif(data->>'date',''), to_char(created_at,'YYYY-MM-DD')) desc, created_at desc limit 30`);
  const events = await upcomingEvents(today(), { limit: 4 });
  const perks: Rec[] = await query("select * from records where type='deals' and status in ('Confirmed','Active') order by updated_at desc, id desc limit 3");
  const allMembers: Rec[] = await query("select * from records where type='members' order by created_at desc, id desc");
  const members = new Map(allMembers.map((m) => [m.name.trim().toLowerCase(), m]));
  const ids = new Map(allMembers.map((m) => [m.name.trim().toLowerCase(), m.id]));
  const newest = allMembers.filter((m) => m.status === "Active" || m.status === "Exec").slice(0, 3);
  const admin = await isAdmin();
  const me = (await auth())?.user;
  const viewer = me?.name || me?.email || (admin ? "E@B Exec" : null);
  const comments: (Answer & { post_id: number })[] = updates.length
    ? await query("select id, post_id, author, body, created_at, best from comments where not hidden and post_id = any($1::int[]) order by created_at, id", [updates.map((u) => u.id)])
    : [];
  const answersFor = (id: number) => comments.filter((c) => c.post_id === id).map((c) => ({ ...c, created_at: new Date(c.created_at).toISOString() }));
  const profiles = Object.fromEntries([...ids.keys()].map((k) => [k, personHref(k, ids)]));
  // Questions nobody has answered yet, surfaced under the composer.
  const open = updates.filter((u) => u.data.category === "Ask" && !comments.some((c) => c.post_id === u.id)).slice(0, 3);
  const categories = bySlug("updates")!.fields.find((f) => f.key === "category")!.options!;
  return (
    <div className="home">
      <section className="stream">
        {admin && <Composer author={me?.name || me?.email || "E@B Exec"} categories={categories} />}
        {open.length > 0 && (
          <nav className="stillopen" aria-label="Unanswered questions">
            <span className="eyebrow">Still open</span>
            {open.map((u) => <a key={u.id} href={`#post-${u.id}`}>{u.name}</a>)}
          </nav>
        )}
        {updates.length === 0 && (
          <div className="post empty">
            <h2 className="ptitle">Nothing on the feed yet</h2>
            <p className="muted">{admin ? "Kick it off above: ask a question, share a win, or introduce two members." : "Questions, wins and intros from E@B members will show up here."}</p>
          </div>
        )}
        {updates.map((u) => <PostCard key={u.id} u={u} members={members} ids={ids} thread={{ answers: answersFor(u.id), admin, viewer, profiles }} />)}
      </section>
      <aside className="rail">
        <section className="card">
          <h3>Upcoming events <Link href="/events">all →</Link></h3>
          {events.length === 0 && <p className="muted small">Nothing scheduled yet.</p>}
          {events.map((e) => (
            <div key={e.id} className="ev">
              <DateBlock date={e.data.date} />
              <div>
                <Link href={`/crm/events/${e.id}`} className="evname">{e.name}</Link>
                <span className="evmeta">{[e.data.time, e.data.location].filter(Boolean).join(" · ")}</span>
                {isHttp(e.data.link) && <a className="evmeta" href={e.data.link} target="_blank" rel="noreferrer">Details ↗</a>}
              </div>
            </div>
          ))}
        </section>
        <section className="card">
          <h3>Perks <Link href="/perks">all →</Link></h3>
          {perks.length === 0 && <p className="muted small">No perks confirmed yet.</p>}
          {perks.map((d) => (
            <div key={d.id} className="perk">
              <div><Link href={`/perks/${d.id}`} className="n">{d.name}</Link>{d.data.value && <span className="v">{d.data.value}</span>}</div>
              <Link href={`/perks/${d.id}`} className="small">How to claim →</Link>
            </div>
          ))}
        </section>
        <section className="card">
          <h3>New to E@B <Link href="/directory">directory →</Link></h3>
          {newest.length === 0 && <p className="muted small">No members yet.</p>}
          {newest.map((m) => (
            <div key={m.id} className="mem">
              <Face name={m.name} src={m.data.avatar} size={34} href={personHref(m.name, ids)} />
              <div><Link href={personHref(m.name, ids)} className="n">{m.name}</Link><span className="s">{m.data.company || m.data.role}</span></div>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}
