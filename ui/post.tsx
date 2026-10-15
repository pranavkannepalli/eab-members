// A feed post card with its answers thread, used by the home feed and /updates/<id>. Server only.
import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { isHttp, relTime, postTime, postKind } from "@/lib/feed";
import { Face, personHref } from "@/ui/face";
import { Answers, Answer } from "@/ui/answers";
import { requestIntro } from "@/app/actions";

const paragraphs = (s: string) => s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

type Thread = { answers: Answer[]; admin: boolean; viewer: string | null; profiles: Record<string, string>; introMade: boolean };

function MemberChip({ name, members, ids }: { name: string; members: Map<string, Rec>; ids: Map<string, number> }) {
  return <Link href={personHref(name, ids)} className="mchip"><Face name={name} src={members.get(name.trim().toLowerCase())?.data.avatar} size={22} />{name}</Link>;
}

export function PostCard({ u, members, ids, thread }: { u: Rec; members: Map<string, Rec>; ids: Map<string, number>; thread: Thread }) {
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
      <h2 className={kind === "ask" ? "askq" : "ptitle"}><Link href={`/updates/${u.id}`}>{u.name}</Link></h2>
      {kind === "intro" && u.data.member_a && u.data.member_b && (
        <div className="introrow">
          <MemberChip name={u.data.member_a} members={members} ids={ids} /><span className="muted">↔</span><MemberChip name={u.data.member_b} members={members} ids={ids} />
          {thread.introMade ? <span className="madepill">Intro made ✓</span>
            : thread.admin && <form action={requestIntro.bind(null, u.id)}><button className="btn small">Request intro</button></form>}
        </div>
      )}
      {u.notes && <div className="pbody">{paragraphs(u.notes).map((p, i) => <p key={i}>{p}</p>)}</div>}
      {isHttp(u.data.link) && <a className="linkchip" href={u.data.link} target="_blank" rel="noreferrer">↗ {u.data.link.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}</a>}
      <Answers postId={u.id} ask={kind === "ask"} initial={thread.answers} admin={thread.admin} viewer={thread.viewer} profiles={thread.profiles} />
    </article>
  );
}

/** Everything PostCard needs for these posts: member lookups, visible answers, and which intro pairs already have a warm intro. */
export async function feedContext(posts: Rec[], allMembers: Rec[], admin: boolean, me: { name: string } | null) {
  const members = new Map(allMembers.map((m) => [m.name.trim().toLowerCase(), m]));
  const ids = new Map(allMembers.map((m) => [m.name.trim().toLowerCase(), m.id]));
  const viewer = me?.name || (admin ? "E@B Exec" : null);
  const comments: (Answer & { post_id: number })[] = posts.length
    ? await query("select id, post_id, author, body, created_at, best from comments where not hidden and post_id = any($1::int[]) order by created_at, id", [posts.map((u) => u.id)])
    : [];
  const answersFor = (id: number) => comments.filter((c) => c.post_id === id).map((c) => ({ ...c, created_at: new Date(c.created_at).toISOString() }));
  // Intro pairs that already have a warm-intro record (E@B contact = member_a, org = member_b).
  const pairs = new Set((await query("select data from records where type='pocs' and status<>'Dropped'")).map((p: Rec) => `${(p.data.eab_contact || "").trim().toLowerCase()}|${(p.data.org || "").trim().toLowerCase()}`));
  const introMade = (u: Rec) => pairs.has(`${(u.data.member_a || "").trim().toLowerCase()}|${(u.data.member_b || "").trim().toLowerCase()}`);
  const profiles = Object.fromEntries([...ids.keys()].map((k) => [k, personHref(k, ids)]));
  const thread = (u: Rec): Thread => ({ answers: answersFor(u.id), admin, viewer, profiles, introMade: introMade(u) });
  return { members, ids, comments, thread };
}
