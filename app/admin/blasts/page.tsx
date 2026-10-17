import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { eligibleRecipients, listBlasts, NOT_CONFIGURED } from "@/lib/blasts";
import { resendConfigured, resendFrom } from "@/lib/resend";
import { sendBlastAction } from "@/app/actions";
import { Nav } from "@/components";
export const dynamic = "force-dynamic";

export default async function Blasts({ searchParams }: { searchParams: Promise<{ msg?: string; q?: string; role?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { msg, q = "", role = "" } = await searchParams;
  const [recipients, blasts] = await Promise.all([eligibleRecipients({ q, role }), listBlasts()]);
  const ready = resendConfigured();
  return (
    <div className="page"><Nav admin />
      <main>
        <div className="head"><div><h1>Email blasts</h1><p className="muted">Email every member who has blasts turned on. Each person gets their own copy, from {resendFrom()}.</p></div>
          <Link href="/admin" className="btn ghost">Back to Admin</Link></div>
        {msg && <p className="notice">{msg}</p>}
        {!ready && <p className="err">{NOT_CONFIGURED}</p>}

        <section className="card"><h2>Compose</h2>
          <form method="get" className="filters">
            <input name="q" defaultValue={q} placeholder="Filter by name or email" />
            <select name="role" defaultValue={role}><option value="">Everyone</option><option value="member">Members</option><option value="admin">Admins</option></select>
            <button className="btn ghost">Filter recipients</button>
          </form>
          <form action={sendBlastAction} className="stack">
            <input name="subject" placeholder="Subject" required maxLength={200} />
            <textarea name="body" rows={8} placeholder="Message (plain text)" required />
            <details open={recipients.length <= 20}>
              <summary>{recipients.length} recipient{recipients.length === 1 ? "" : "s"} with blasts on{q || role ? " (filtered)" : ""}; untick to leave someone out</summary>
              <div className="stack">
                {recipients.map((r) => <label key={r.email} className="small"><input type="checkbox" name="to" value={r.email} defaultChecked /> {r.name} <span className="muted">{r.email}{r.role === "admin" ? " · admin" : ""}</span></label>)}
              </div>
            </details>
            <div><button className="btn" disabled={!ready || recipients.length === 0}>Send blast</button></div>
          </form></section>

        <section className="card"><h2>History</h2>
          {blasts.length === 0 && <p className="muted small">No blasts sent yet.</p>}
          {blasts.map((b) => (
            <details key={b.id}>
              <summary><b>{b.subject}</b> <span className="muted small">· {b.status} · {b.recipients.filter((r) => r.status === "sent").length}/{b.recipient_count} sent{b.sent_at ? ` · ${new Date(b.sent_at).toLocaleString()}` : ""}</span></summary>
              <p className="pre small">{b.body}</p>
              <table><thead><tr><th>To</th><th>Status</th><th>Error</th><th>Sent</th></tr></thead><tbody>
                {b.recipients.map((r) => <tr key={r.to_email}><td>{r.to_email}</td><td>{r.status}</td><td className="muted small">{r.error || ""}</td><td className="muted">{r.sent_at ? new Date(r.sent_at).toLocaleString() : "-"}</td></tr>)}
              </tbody></table>
            </details>
          ))}
        </section>
      </main></div>
  );
}
