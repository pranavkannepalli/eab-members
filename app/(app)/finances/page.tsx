import Link from "next/link";
export default function Finances() {
  return (
    <>
      <p className="eyebrow">E@B Members</p>
      <h1>Finances</h1>
      <div className="card"><p>Coming soon. This shelf is reserved for club finances.</p>
        <p className="muted small">Scope still to be decided (budget, reimbursements, sponsor money, dues). It will use the same login and admin password as the rest of this site.</p>
        <Link className="btn ghost" href="/">Back to the bookcase</Link></div>
    </>
  );
}
