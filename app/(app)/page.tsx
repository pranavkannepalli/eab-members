import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";
import { today, upcomingEvents, isHttp } from "@/lib/feed";
import { Face, personHref } from "@/ui/face";
import { Composer } from "@/ui/composer";
import { PostCard, feedContext } from "@/ui/post";
import { getIdentity, claimState, rsvpState } from "@/lib/identity";
import { ClaimButton, RsvpButton } from "@/ui/toggles";
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Navy date block from a YYYY-MM-DD string (parsed by hand so no timezone shifts the day).
function DateBlock({ date }: { date?: string }) {
  const m = (date || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
  return <div className="dateblock">{m ? <><b>{Number(m[2])}</b>{MONTHS[Number(m[1]) - 1]}</> : <b>TBD</b>}</div>;
}

export default async function Home() {
  const updates: Rec[] = await query(
    `select * from records where type='updates' and status<>'Archived'
     order by (status='Pinned') desc, coalesce(nullif(data->>'date',''), to_char(created_at,'YYYY-MM-DD')) desc, created_at desc limit 30`);
  const events = await upcomingEvents(today(), { limit: 4 });
  const perks: Rec[] = await query("select * from records where type='deals' and status in ('Confirmed','Active') order by updated_at desc, id desc limit 3");
  const allMembers: Rec[] = await query("select * from records where type='members' order by created_at desc, id desc");
  const newest = allMembers.filter((m) => m.status === "Active" || m.status === "Exec").slice(0, 3);
  const admin = await isAdmin();
  const me = await getIdentity();
  const claims = await claimState(perks.map((d) => d.id), me?.email);
  const rsvps = await rsvpState(events.map((e) => e.id), me?.email);
  const { members, ids, comments, thread } = await feedContext(updates, allMembers, admin, me);
  // Questions nobody has answered yet, surfaced under the composer.
  const open = updates.filter((u) => u.data.category === "Ask" && !comments.some((c) => c.post_id === u.id)).slice(0, 3);
  const categories = bySlug("updates")!.fields.find((f) => f.key === "category")!.options!;
  return (
    <div className="home">
      <section className="stream">
        {admin && <Composer author={me?.name || "E@B Exec"} categories={categories} />}
        {open.length > 0 && (
          <nav className="stillopen" aria-label="Unanswered questions">
            <span className="eyebrow">Waiting for an answer</span>
            {open.map((u) => <a key={u.id} href={`#post-${u.id}`}>{u.name}</a>)}
          </nav>
        )}
        {updates.length === 0 && (
          <div className="post empty">
            <h2 className="ptitle">Nothing on the feed yet</h2>
            <p className="muted">{admin ? "Kick it off above: ask a question, share a win, or introduce two members." : "Questions, wins and intros from E@B members will show up here."}</p>
          </div>
        )}
        {updates.map((u) => <PostCard key={u.id} u={u} members={members} ids={ids} thread={thread(u)} />)}
      </section>
      <aside className="rail">
        <section className="card">
          <h3>Upcoming events <Link href="/events">See all →</Link></h3>
          {events.length === 0 && <p className="muted small">No events on the calendar yet.</p>}
          {events.map((e) => (
            <div key={e.id} className="ev">
              <DateBlock date={e.data.date} />
              <div>
                <Link href={`/events/${e.id}`} className="evname">{e.name}</Link>
                <span className="evmeta">{[e.data.time, e.data.location].filter(Boolean).join(" · ")}</span>
                {isHttp(e.data.link) && <a className="evmeta" href={e.data.link} target="_blank" rel="noreferrer">Details ↗</a>}
                <RsvpButton eventId={e.id} me={rsvps.me(e.id)} count={rsvps.count(e.id)} signedIn={!!me} compact />
              </div>
            </div>
          ))}
        </section>
        <section className="card">
          <h3>Deals <Link href="/deals">See all →</Link></h3>
          {perks.length === 0 && <p className="muted small">No deals yet. Check back soon.</p>}
          {perks.map((d) => (
            <div key={d.id} className="perk">
              <div><Link href={`/deals/${d.id}`} className="n">{d.name}</Link>{d.data.value && <span className="v">{d.data.value}</span>}
                <Link href={`/deals/${d.id}`} className="v">How to claim →</Link></div>
              <ClaimButton dealId={d.id} claimed={claims.mine(d.id)} count={claims.count(d.id)} signedIn={!!me} />
            </div>
          ))}
        </section>
        <section className="card">
          <h3>New to E@B <Link href="/directory">Meet everyone →</Link></h3>
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
