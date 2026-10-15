import Link from "next/link";
import { TypeCfg, TYPES, bySlug, defaultStatus } from "@/lib/schema";
import { query, Rec } from "@/lib/db";
import { isHttp } from "@/lib/feed";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";

export async function Nav({ admin }: { admin?: boolean }) {
  const a = admin ?? (await isAdmin());
  const s = await auth();
  return (
    <header className="top">
      <Link href="/" className="brand"><img src="/logo.png" alt="" width={34} height={34} /><span>Entrepreneurs at Berkeley <b>Members</b></span></Link>
      <nav>
        <Link href="/perks">Perks</Link>
        <Link href="/events">Events</Link>
        <Link href="/directory">Directory</Link>
        <Link href="/resources">Resources</Link>
        <Link href="/finances">Finances</Link>
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
        <label>Status<select name="status" defaultValue={rec?.status || defaultStatus(cfg)}>{cfg.statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
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

// "How to claim" block for a perk (a confirmed deal): the route, then any caveats.
export function Claim({ rec }: { rec: Rec }) {
  return (
    <div className="claim">
      <p className="eyebrow">How to claim</p>
      <p className="pre">{rec.data.route || "Ask the E@B owner of this perk."}</p>
      {rec.data.caveat && <p className="muted small pre">{rec.data.caveat}</p>}
    </div>
  );
}

// Cross-links: other records that mention this record's name (e.g. a PoC named on a VC or deal).
export async function Mentions({ rec }: { rec: Rec }) {
  const related: Rec[] = await query("select * from records where id<>$1 and (data::text ilike $2 or notes ilike $2) order by type, name limit 12", [rec.id, `%${rec.name}%`]);
  if (related.length === 0) return null;
  return (
    <section className="card"><h2>Mentioned elsewhere</h2>
      {related.map((r) => <p key={r.id}><Link href={`/crm/${r.type}/${r.id}`}>{r.name}</Link> <span className="muted">{bySlug(r.type)?.singular}</span></p>)}
    </section>
  );
}

// Member photo, or their initials when there is no (http) photo URL.
export function Avatar({ rec, size = 64 }: { rec: Rec; size?: number }) {
  const initials = rec.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return isHttp(rec.data.avatar)
    ? <img className="avatar" src={rec.data.avatar} alt="" width={size} height={size} />
    : <div className="avatar initials" style={{ width: size, height: size, fontSize: Math.round(size / 2.6) }}>{initials}</div>;
}
