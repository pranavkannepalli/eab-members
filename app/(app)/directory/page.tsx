import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { Avatar } from "@/components";
export const dynamic = "force-dynamic";

export default async function Directory() {
  const members: Rec[] = await query("select * from records where type='members' and status in ('Active','Exec') order by name");
  return (
    <>
      <p className="eyebrow">E@B Members</p>
      <h1>Directory</h1>
      <p className="muted">{members.length} active members and exec.</p>
      {members.length === 0 && <div className="card"><p className="muted">No active members yet.</p></div>}
      <div className="people">
        {members.map((m) => (
          <Link key={m.id} href={`/directory/${m.id}`} className="card person">
            <Avatar rec={m} />
            <div>
              <b>{m.name}</b>
              {m.data.role && <span>{m.data.role}</span>}
              {(m.data.year || m.data.major) && <span className="muted small">{[m.data.year, m.data.major].filter(Boolean).join(" · ")}</span>}
              {m.data.company && <span className="muted small">{m.data.company}</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
