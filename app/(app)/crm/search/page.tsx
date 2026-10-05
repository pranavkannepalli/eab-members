import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows: Rec[] = q ? await query("select * from records where name ilike $1 or data::text ilike $1 or notes ilike $1 order by type, name limit 100", [`%${q}%`]) : [];
  return (
    <>
      <h1>Search</h1>
      <form className="filters"><input name="q" defaultValue={q} placeholder="Name, company, E@B contact..." autoFocus /><button className="btn ghost">Search</button></form>
      <p className="muted small">Tip: search a person or company to see members, alumni, VCs and warm-intro contacts who know them.</p>
      <table><tbody>
        {rows.map((r) => <tr key={r.id}><td><Link href={`/crm/${r.type}/${r.id}`}>{r.name}</Link></td><td className="muted">{bySlug(r.type)?.singular}</td><td>{r.status}</td></tr>)}
        {q && rows.length === 0 && <tr><td className="muted">No matches.</td></tr>}
      </tbody></table>
    </>
  );
}
