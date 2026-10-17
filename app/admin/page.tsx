import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import { TYPES } from "@/lib/schema";
import { homeOf, newHref } from "@/lib/routes";
import { importCsv, clearType, adminLogout } from "@/app/actions";
import { Nav } from "@/components";
export const dynamic = "force-dynamic";

export default async function Admin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { msg } = await searchParams;
  const counts = await query("select type, count(*)::int n, max(updated_at) last from records group by type");
  const [{ withEmail, total }] = await query("select count(*) filter (where coalesce(data->>'email','')<>'' and status in ('Active','Exec'))::int withEmail, count(*)::int total from records where type='members'");
  return (
    <div className="page"><Nav admin />
      <main>
        <div className="head"><div><h1>Admin</h1><p className="muted">You're in admin mode: you can add, edit and delete anything on the site. Lock it when you're done.</p></div>
          <form action={adminLogout}><button className="btn ghost">Lock admin / sign out</button></form></div>
        {msg && <p className="notice">{msg}</p>}
        <p className="notice">{withEmail} of {total} members can create an account. Only active members and exec with an email on file can sign up (at /signup, with that email). To let someone in, add their email to their <Link href="/directory">Directory</Link> profile.</p>
        <p className="notice"><Link href="/admin/blasts">Email blasts</Link>: write an email to members and see who received past ones.</p>
        <table><thead><tr><th>Section</th><th>Count</th><th>Last updated</th><th></th></tr></thead><tbody>
          {TYPES.map((t) => { const c = counts.find((x) => x.type === t.slug); return (
            <tr key={t.slug}><td><Link href={homeOf(t.slug)}>{t.label}</Link></td><td>{c?.n ?? 0}</td><td className="muted">{c ? new Date(c.last).toLocaleString() : "-"}</td>
              <td><Link href={newHref(t.slug)}>Add</Link> · <a href={`/api/export/${t.slug}`}>Download CSV</a></td></tr>); })}
        </tbody></table>
        <section className="card"><h2>Add from a spreadsheet</h2>
          <p className="muted small">Add many entries at once. Click Download CSV next to the section to get the right column headers, fill in rows in Sheets or Excel, then paste it here (header row first). New rows are added; nothing already on the site is changed.</p>
          <form action={importCsv} className="stack">
            <select name="type">{TYPES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}</select>
            <textarea name="csv" rows={8} placeholder="Paste CSV here, starting with the header row" required />
            <div><button className="btn">Add rows</button></div>
          </form></section>
        <section className="card"><h2>Delete everything in a section</h2>
          <p className="muted small">This permanently deletes every entry in the section you pick. It can&apos;t be undone. Download a CSV first if you might need it.</p>
          <form action={clearType} className="filters">
            <select name="type">{TYPES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}</select>
            <input name="confirm" placeholder="Type DELETE to confirm" />
            <button className="btn danger">Delete all</button>
          </form></section>
        <p className="muted small">To change the admin password, ask whoever manages the site's hosting. It's set in the hosting settings (ADMIN_PASSWORD) and takes effect after a redeploy. The admin account (ADMIN_EMAIL, same password) can also sign in on the normal login page.</p>
      </main></div>
  );
}
