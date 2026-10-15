import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { groupBy } from "@/lib/feed";
import { Claim } from "@/components";
import { getIdentity, claimState } from "@/lib/identity";
import { ClaimButton } from "@/ui/toggles";
import { isAdmin } from "@/lib/admin";
import { RecordList, ListParams } from "@/ui/record-list";
export const dynamic = "force-dynamic";

// One deals pipeline. Admins get the full table (every status); members see the perks: Confirmed/Active deals with how to claim.
export default async function Deals({ searchParams }: { searchParams: Promise<ListParams> }) {
  if (await isAdmin()) return <RecordList cfg={bySlug("deals")!} params={await searchParams} action="/deals" />;
  const perks: Rec[] = await query("select * from records where type='deals' and status in ('Confirmed','Active') order by coalesce(nullif(data->>'category',''),'Other'), name");
  const me = await getIdentity();
  const claims = await claimState(perks.map((d) => d.id), me?.email);
  const categories = bySlug("deals")!.fields.find((f) => f.key === "category")!.options!;
  return (
    <>
      <h1>Deals</h1>
      <p className="muted">{bySlug("deals")!.blurb}</p>
      {perks.length === 0 && <div className="card"><p className="muted">No deals yet. New ones show up here as soon as they're live.</p></div>}
      {groupBy(perks, "category", categories).map(([cat, rows]) => (
        <section key={cat}>
          <p className="eyebrow section">{cat}</p>
          {rows.map((d) => (
            <article key={d.id} className="card">
              <div className="head">
                <h2><Link href={`/deals/${d.id}`}>{d.name}</Link></h2>
                <ClaimButton dealId={d.id} claimed={claims.mine(d.id)} count={claims.count(d.id)} signedIn={!!me} />
              </div>
              <p className="muted small">{d.data.value}</p>
              <Claim rec={d} />
            </article>
          ))}
        </section>
      ))}
    </>
  );
}
