import Link from "next/link";
import { query, Rec } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
export const dynamic = "force-dynamic";

// Leading number of an amount string: "$1,200" -> 1200. null when there is none ("$fifty", "").
const parseAmount = (s = "") => { const m = s.match(/-?\d[\d,]*(?:\.\d+)?/); return m ? Number(m[0].replace(/,/g, "")) : null; };
const money = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });

const CARDS: { label: string; kind: string; statuses: string[] }[] = [
  { label: "Budget", kind: "Budget line", statuses: ["Planned", "Committed", "Paid"] },
  { label: "Spent", kind: "Expense", statuses: ["Paid"] },
  { label: "Sponsor money", kind: "Sponsorship", statuses: ["Committed", "Paid"] },
  { label: "Reimbursed", kind: "Reimbursement", statuses: ["Reimbursed"] },
];

export default async function Finances() {
  const rows: Rec[] = await query(
    "select * from records where type='finance' order by coalesce(nullif(data->>'period',''), to_char(created_at,'YYYY-MM-DD')) desc, created_at desc");
  const admin = await isAdmin();
  const totals = CARDS.map((c) => {
    const amounts = rows.filter((r) => r.data.kind === c.kind && c.statuses.includes(r.status)).map((r) => parseAmount(r.data.amount));
    return { ...c, sum: amounts.reduce<number>((a, n) => a + (n ?? 0), 0), uncounted: amounts.filter((n) => n === null).length };
  });
  return (
    <>
      <div className="head"><div><p className="eyebrow">E@B Members</p><h1>Finances</h1></div>
        {admin && <div><a className="btn ghost" href="/api/export/finance">Export CSV</a> <Link className="btn" href="/finances/new">+ Add entry</Link></div>}</div>
      <div className="grid four">
        {totals.map((t) => (
          <div key={t.label} className="card stat"><b>{money(t.sum)}</b><span>{t.label}</span>
            {t.uncounted > 0 && <span className="small">{t.uncounted} uncounted</span>}</div>
        ))}
      </div>
      <table>
        <thead><tr><th>Kind</th><th>Name</th><th>Amount</th><th>Period</th><th>Counterparty</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.data.kind && <span className="pill">{r.data.kind}</span>}</td>
              <td><Link href={`/finances/${r.id}`}>{r.name}</Link></td>
              <td>{r.data.amount}</td><td>{r.data.period}</td><td>{r.data.counterparty}</td>
              <td>{r.status && <span className={`pill s-${r.status}`}>{r.status}</span>}</td>
              <td className="muted small">{r.notes.length > 80 ? r.notes.slice(0, 80) + "…" : r.notes}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="muted">No finance entries yet.</td></tr>}
        </tbody>
      </table>
      <p className="muted small">Finances are visible to all members. Amounts are managed by the development team; correct them via the admin page.</p>
    </>
  );
}
