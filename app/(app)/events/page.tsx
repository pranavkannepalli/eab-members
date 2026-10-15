import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { today, upcomingEvents, isHttp } from "@/lib/feed";
import { getIdentity, rsvpState } from "@/lib/identity";
import { RsvpButton } from "@/ui/toggles";
import { isAdmin } from "@/lib/admin";
import { bySlug } from "@/lib/schema";
export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Calendar chip from a YYYY-MM-DD string (parsed by hand so no timezone shifts the day).
function DateChip({ date }: { date?: string }) {
  const m = (date || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
  return <div className="datechip">{m ? <><b>{Number(m[2])}</b><span>{MONTHS[Number(m[1]) - 1]}</span></> : <span>TBD</span>}</div>;
}
const firstLine = (s: string) => s.split("\n").map((l) => l.trim()).find(Boolean) || "";

export default async function Events() {
  const upcoming = await upcomingEvents(today(), { limit: 100, undated: true });
  const me = await getIdentity();
  const rsvps = await rsvpState(upcoming.map((e) => e.id), me?.email);
  const past: Rec[] = await query("select * from records where type='events' and status='Past' order by data->>'date' desc nulls last, created_at desc limit 12");
  const admin = await isAdmin();
  return (
    <>
      <div className="head"><div><h1>Events</h1><p className="muted">{bySlug("events")!.blurb}</p></div>
        {admin && <div><a className="btn ghost" href="/api/export/events">Export CSV</a> <Link className="btn" href="/events/new">+ Add event</Link></div>}</div>
      <h2 className="eyebrow section">Upcoming</h2>
      {upcoming.length === 0 && <div className="card"><p className="muted">Nothing on the calendar yet. Check back soon.</p></div>}
      {upcoming.map((e) => (
        <article key={e.id} className="card event">
          <DateChip date={e.data.date} />
          <div>
            <div className="head">
              <h2><Link href={`/events/${e.id}`}>{e.name}</Link></h2>
              {e.data.category && <span className="pill">{e.data.category}</span>}
            </div>
            <p className="muted small">{[e.data.time, e.data.location].filter(Boolean).join(" · ")}</p>
            {e.notes && <p className="oneline">{firstLine(e.notes)}</p>}
            <div className="evactions">
              <RsvpButton eventId={e.id} me={rsvps.me(e.id)} count={rsvps.count(e.id)} signedIn={!!me} />
              {isHttp(e.data.rsvp) && <a className="btn ghost small" href={e.data.rsvp} target="_blank" rel="noreferrer">RSVP on the event page ↗</a>}
            </div>
          </div>
        </article>
      ))}
      <h2 className="eyebrow section">Past</h2>
      {past.length === 0 && <p className="muted small">No past events yet.</p>}
      {past.length > 0 && (
        <table><tbody>
          {past.map((e) => (
            <tr key={e.id}><td className="muted">{e.data.date}</td><td><Link href={`/events/${e.id}`}>{e.name}</Link></td><td className="muted">{e.data.location}</td><td>{e.data.category && <span className="pill">{e.data.category}</span>}</td></tr>
          ))}
        </tbody></table>
      )}
    </>
  );
}
