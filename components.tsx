import Link from "next/link";
import { TypeCfg, TYPES } from "@/lib/schema";
import { Rec } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";

export async function Nav({ admin }: { admin?: boolean }) {
  const a = admin ?? (await isAdmin());
  const s = await auth();
  return (
    <header className="top">
      <Link href="/" className="brand"><img src="/logo.png" alt="" width={34} height={34} /><span>Entrepreneurs at Berkeley <b>Members</b></span></Link>
      <nav>
        <Link href="/crm">CRM</Link>
        <Link href="/crm/search">Search</Link>
        <Link href={a ? "/admin" : "/admin/login"} className="adminlink">{a ? "Admin" : s?.user?.email ? "Admin login" : "Admin"}</Link>
      </nav>
    </header>
  );
}

export async function RecordForm({ cfg, rec, action }: { cfg: TypeCfg; rec?: Rec; action: (fd: FormData) => Promise<void> }) {
  const admin = await isAdmin();
  return (
    <form action={action} className="card form">
      <fieldset disabled={!admin}>
        <label>Name<input name="name" defaultValue={rec?.name} required /></label>
        <label>Status<select name="status" defaultValue={rec?.status || cfg.statuses[0]}>{cfg.statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
        {cfg.fields.map((f) => (
          <label key={f.key}>{f.label}
            {f.kind === "select" ? (
              <select name={f.key} defaultValue={rec?.data[f.key] || ""}><option value=""></option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
            ) : f.kind === "textarea" ? (
              <textarea name={f.key} rows={3} defaultValue={rec?.data[f.key] || ""} />
            ) : (
              <input name={f.key} type={f.kind === "date" ? "date" : f.kind === "email" ? "email" : "text"} defaultValue={rec?.data[f.key] || ""} />
            )}
          </label>
        ))}
        <label className="wide">Notes<textarea name="notes" rows={5} defaultValue={rec?.notes} /></label>
        {admin ? <div className="wide"><button className="btn">{rec ? "Save changes" : "Add"}</button></div>
          : <p className="wide muted small">Read-only. <Link href="/admin/login">Unlock admin</Link> to edit.</p>}
      </fieldset>
    </form>
  );
}

export function CrmTabs() {
  return (
    <div className="tabs">
      {TYPES.map((t) => <Link key={t.slug} href={`/crm/${t.slug}`}>{t.label}</Link>)}
    </div>
  );
}
