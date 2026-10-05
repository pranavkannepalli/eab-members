"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { bySlug, TYPES } from "@/lib/schema";
import { requireAdmin, checkPassword, setAdminCookie, clearAdminCookie } from "@/lib/admin";

function parse(slug: string, fd: FormData) {
  const cfg = bySlug(slug);
  if (!cfg) throw new Error("bad type");
  const name = String(fd.get("name") || "").trim();
  if (!name) throw new Error("Name is required");
  const data: Record<string, string> = {};
  for (const f of cfg.fields) data[f.key] = String(fd.get(f.key) || "").trim();
  return { name, status: String(fd.get("status") || ""), data, notes: String(fd.get("notes") || "") };
}

export async function saveRecord(slug: string, id: number | null, fd: FormData) {
  await requireAdmin();
  const r = parse(slug, fd);
  if (id) {
    await query("update records set name=$1,status=$2,data=$3,notes=$4,updated_at=now() where id=$5 and type=$6", [r.name, r.status, JSON.stringify(r.data), r.notes, id, slug]);
  } else {
    const [row] = await query("insert into records(type,name,status,data,notes) values($1,$2,$3,$4,$5) returning id", [slug, r.name, r.status, JSON.stringify(r.data), r.notes]);
    id = row.id;
  }
  revalidatePath(`/crm/${slug}`);
  redirect(`/crm/${slug}/${id}`);
}

export async function deleteRecord(slug: string, id: number) {
  await requireAdmin();
  await query("delete from records where id=$1 and type=$2", [id, slug]);
  revalidatePath(`/crm/${slug}`);
  redirect(`/crm/${slug}`);
}

// Prospect -> confirmed deal. Only an admin can do this, and it is the only way something becomes a "Deal".
export async function promoteProspect(id: number) {
  await requireAdmin();
  await query("update records set type='deals', status='Confirmed', updated_at=now() where id=$1 and type='prospects'", [id]);
  revalidatePath("/crm", "layout");
  redirect(`/crm/deals/${id}`);
}

export async function adminLogin(fd: FormData) {
  if (!checkPassword(String(fd.get("password") || ""))) redirect("/admin/login?error=1");
  await setAdminCookie();
  redirect("/admin");
}
export async function adminLogout() { await clearAdminCookie(); redirect("/login"); }

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

// CSV columns: name, status, any field keys for the type, notes (same as the Export CSV).
export async function importCsv(fd: FormData) {
  await requireAdmin();
  const slug = String(fd.get("type")); const cfg = bySlug(slug);
  if (!cfg) throw new Error("bad type");
  const rows = parseCsv(String(fd.get("csv") || ""));
  const head = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  let n = 0;
  for (const r of rows) {
    const get = (k: string) => (r[head.indexOf(k)] ?? "").trim();
    const name = get("name"); if (!name) continue;
    const data: Record<string, string> = {}; for (const f of cfg.fields) data[f.key] = get(f.key);
    await query("insert into records(type,name,status,data,notes) values($1,$2,$3,$4,$5)", [slug, name, get("status") || cfg.statuses[0], JSON.stringify(data), get("notes")]);
    n++;
  }
  revalidatePath("/", "layout");
  redirect(`/admin?msg=${encodeURIComponent(`Imported ${n} into ${cfg.label}`)}`);
}

export async function clearType(fd: FormData) {
  await requireAdmin();
  const slug = String(fd.get("type"));
  if (!TYPES.some((t) => t.slug === slug)) throw new Error("bad type");
  if (String(fd.get("confirm")) !== "DELETE") redirect("/admin?msg=" + encodeURIComponent("Type DELETE to confirm clearing a tab"));
  await query("delete from records where type=$1", [slug]);
  revalidatePath("/", "layout");
  redirect(`/admin?msg=${encodeURIComponent("Cleared " + slug)}`);
}
