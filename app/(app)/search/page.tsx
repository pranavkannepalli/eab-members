import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { isAdmin } from "@/lib/admin";
import { recordHref, memberCanOpen } from "@/lib/routes";
export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const admin = await isAdmin();
  // Members only get results they can open (no admin-only types, drafts or unconfirmed deals).
  const rows: Rec[] = (q ? await query("select * from records where name ilike $1 or data::text ilike $1 or notes ilike $1 order by type, name limit 100", [`%${q}%`]) : [])
    .filter((r: Rec) => admin || memberCanOpen(r));
  return (
    <>
      <h1>Search</h1>
      {q ? <p className="muted">{rows.length} {rows.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;</p>
        : <p className="muted">Use the search bar at the top to find people, companies, events and more.</p>}
      <table><tbody>
        {rows.map((r) => <tr key={r.id}><td><Link href={recordHref(r.type, r.id)}>{r.name}</Link></td><td className="muted">{bySlug(r.type)?.singular}</td><td>{r.status}</td></tr>)}
        {q && rows.length === 0 && <tr><td className="muted">Nothing found for &ldquo;{q}&rdquo;. Try a shorter word or a different spelling.</td></tr>}
      </tbody></table>
    </>
  );
}
