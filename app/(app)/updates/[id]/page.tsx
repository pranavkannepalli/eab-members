import Link from "next/link";
import { notFound } from "next/navigation";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";
import { getIdentity } from "@/lib/identity";
import { saveRecord, deleteRecord, setStatus } from "@/app/actions";
import { RecordForm } from "@/components";
import { PostCard, feedContext } from "@/ui/post";
export const dynamic = "force-dynamic";

// One feed post with its answers. Admins pin, archive or edit it here.
export default async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [u]: Rec[] = await query("select * from records where id=$1 and type='updates'", [Number(id)]);
  if (!u) notFound();
  const admin = await isAdmin();
  const me = await getIdentity();
  const allMembers: Rec[] = await query("select * from records where type='members'");
  const { members, ids, thread } = await feedContext([u], allMembers, admin, me);
  const status = (s: string, label: string) => <form action={setStatus.bind(null, "updates", u.id, s)}><button className="btn ghost small">{label}</button></form>;
  return (
    <section className="stream postpage">
      <p className="small"><Link href="/">← Feed</Link></p>
      {u.status === "Archived" && <p className="notice">Archived: hidden from the feed.</p>}
      <PostCard u={u} members={members} ids={ids} thread={thread(u)} />
      {admin && (
        <>
          <div className="row">
            {u.status === "Pinned" ? status("Open", "Unpin") : status("Pinned", "Pin")}
            {u.status === "Archived" ? status("Open", "Restore") : status("Archived", "Archive")}
            <form action={deleteRecord.bind(null, "updates", u.id)}><button className="btn danger small" formNoValidate>Delete</button></form>
          </div>
          <details className="card editprofile">
            <summary>Edit post</summary>
            <RecordForm cfg={bySlug("updates")!} rec={u} action={saveRecord.bind(null, "updates", u.id)} />
          </details>
        </>
      )}
    </section>
  );
}
