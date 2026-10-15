"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { bySlug, TYPES } from "@/lib/schema";
import { csvRecords } from "@/lib/csv";
import { requireAdmin, checkPassword, setAdminCookie, clearAdminCookie } from "@/lib/admin";
import { homeOf, recordHref } from "@/lib/routes";

function parse(slug: string, fd: FormData) {
  const cfg = bySlug(slug);
  if (!cfg) throw new Error("That section doesn't exist.");
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
  revalidatePath(homeOf(slug));
  redirect(recordHref(slug, id!));
}

export async function deleteRecord(slug: string, id: number) {
  await requireAdmin();
  await query("delete from records where id=$1 and type=$2", [id, slug]);
  revalidatePath(homeOf(slug));
  redirect(homeOf(slug));
}

// One-click status change from a detail page: confirm a deal (makes it a perk), pin or archive a post.
export async function setStatus(slug: string, id: number, status: string) {
  await requireAdmin();
  if (!bySlug(slug)?.statuses.includes(status)) throw new Error("That status isn't allowed here.");
  await query("update records set status=$1, updated_at=now() where id=$2 and type=$3", [status, id, slug]);
  revalidatePath("/", "layout");
  redirect(recordHref(slug, id));
}

// Home feed composer: one textarea. Its first line is the title (the question, for an Ask); the rest is the body (notes).
export async function postUpdate(fd: FormData) {
  await requireAdmin();
  const get = (k: string) => String(fd.get(k) || "").trim();
  const text = String(fd.get("text") || "").replace(/\r\n/g, "\n").trim();
  if (!text) throw new Error("Write something first");
  const [first, ...rest] = text.split("\n");
  const long = first.trim().length > 140;
  const name = long ? first.trim().slice(0, 137).trimEnd() + "…" : first.trim();
  const notes = long ? text : rest.join("\n").trim();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
  const data = { author: get("author"), date, category: get("category"), link: get("link") };
  await query("insert into records(type,name,status,data,notes) values('updates',$1,$2,$3,$4)", [name, get("status") === "Pinned" ? "Pinned" : "Open", JSON.stringify(data), notes]);
  revalidatePath("/");
}

export async function adminLogin(fd: FormData) {
  if (!checkPassword(String(fd.get("password") || ""))) redirect("/admin/login?error=1");
  await setAdminCookie();
  redirect("/admin");
}
export async function adminLogout() { await clearAdminCookie(); redirect("/login"); }

// CSV columns: name, status, any field keys for the type, notes (same as the Export CSV).
export async function importCsv(fd: FormData) {
  await requireAdmin();
  const slug = String(fd.get("type")); const cfg = bySlug(slug);
  if (!cfg) throw new Error("That section doesn't exist.");
  const rows = csvRecords(cfg, String(fd.get("csv") || ""));
  for (const r of rows)
    await query("insert into records(type,name,status,data,notes) values($1,$2,$3,$4,$5)", [slug, r.name, r.status, JSON.stringify(r.data), r.notes]);
  const n = rows.length;
  revalidatePath("/", "layout");
  redirect(`/admin?msg=${encodeURIComponent(`Added ${n} ${n === 1 ? "entry" : "entries"} to ${cfg.label}.`)}`);
}

export async function clearType(fd: FormData) {
  await requireAdmin();
  const slug = String(fd.get("type"));
  if (!TYPES.some((t) => t.slug === slug)) throw new Error("That section doesn't exist.");
  if (String(fd.get("confirm")) !== "DELETE") redirect("/admin?msg=" + encodeURIComponent("Nothing was deleted. Type DELETE in the box to confirm."));
  await query("delete from records where type=$1", [slug]);
  revalidatePath("/", "layout");
  redirect(`/admin?msg=${encodeURIComponent(`Deleted everything in ${bySlug(slug)!.label}.`)}`);
}

// Intro post -> warm-intro record (pocs) for the pair, unless one already exists that was not dropped.
export async function requestIntro(postId: number) {
  await requireAdmin();
  const [post] = await query("select * from records where id=$1 and type='updates'", [postId]);
  const a = String(post?.data.member_a || "").trim(), b = String(post?.data.member_b || "").trim();
  if (!a || !b) throw new Error("This post does not name two members");
  const existing = await query("select id from records where type='pocs' and status<>'Dropped' and lower(trim(data->>'eab_contact'))=lower($1) and lower(trim(data->>'org'))=lower($2) limit 1", [a, b]);
  if (existing.length === 0)
    await query("insert into records(type,name,status,data,notes) values('pocs',$1,'Reached out',$2,'')", [b, JSON.stringify({ kind: "Other", org: b, eab_contact: a, relationship: post.name })]);
  revalidatePath("/");
}
