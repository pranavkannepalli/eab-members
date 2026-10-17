import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import { TYPES } from "@/lib/schema";
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
        <div className="head"><div><h1>Admin</h1><p className="muted">Manage what is on this site. Admin mode lets you add, edit, delete and promote entries everywhere.</p></div>
          <form action={adminLogout}><button className="btn ghost">Lock / sign out</button></form></div>
        {msg && <p className="notice">{msg}</p>}
        <p className="notice">Site access: {withEmail} of {total} members can create an account (Active/Exec with an email on file); they sign up at /signup with that email. Add emails on the <Link href="/crm/members">Members</Link> records to let people in.</p>
        <p className="notice"><Link href="/admin/blasts">Email blasts</Link>: compose and send an email to members, and see who received past blasts.</p>
        <table><thead><tr><th>Tab</th><th>Entries</th><th>Last change</th><th></th></tr></thead><tbody>
          {TYPES.map((t) => { const c = counts.find((x) => x.type === t.slug); return (
            <tr key={t.slug}><td><Link href={`/crm/${t.slug}`}>{t.label}</Link></td><td>{c?.n ?? 0}</td><td className="muted">{c ? new Date(c.last).toLocaleString() : "-"}</td>
              <td><Link href={`/crm/${t.slug}/new`}>Add</Link> · <a href={`/api/export/${t.slug}`}>Export CSV</a></td></tr>); })}
        </tbody></table>
        <section className="card"><h2>Import CSV</h2>
          <p className="muted small">Paste a CSV with a header row: name, status, then any field keys for that tab (use Export CSV for the exact columns), notes. Rows are added, nothing is overwritten.</p>
          <form action={importCsv} className="stack">
            <select name="type">{TYPES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}</select>
            <textarea name="csv" rows={8} placeholder="name,status,email,notes" required />
            <div><button className="btn">Import</button></div>
          </form></section>
        <section className="card"><h2>Clear a tab</h2>
          <form action={clearType} className="filters">
            <select name="type">{TYPES.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}</select>
            <input name="confirm" placeholder="Type DELETE to confirm" />
            <button className="btn danger">Clear tab</button>
          </form></section>
        <p className="muted small">Admin password is the ADMIN_PASSWORD env var. Change it in the host settings and redeploy. Admin accounts (role admin in the users table, seeded from ADMIN_EMAIL) can also sign in on the normal login page.</p>
      </main></div>
  );
}
