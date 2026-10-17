"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { bySlug, TYPES } from "@/lib/schema";
import { csvRecords } from "@/lib/csv";
import { requireAdmin, checkPassword, setAdminCookie, clearAdminCookie } from "@/lib/admin";
import { AuthError } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { isMemberEmail } from "@/lib/access";
import { sendBlast } from "@/lib/blasts";
import { createUser, userByEmail, normEmail, validEmail, MIN_PASSWORD } from "@/lib/users";

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
export async function adminLogout() {
  await clearAdminCookie();
  if ((await auth())?.user) await signOut({ redirectTo: "/login" });
  redirect("/login");
}

// --- Email + password accounts ---
async function signInOr(email: string, password: string, failUrl: string) {
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) redirect(failUrl);
    throw e; // includes the NEXT_REDIRECT from a successful sign-in
  }
}

export async function userSignIn(fd: FormData) {
  await signInOr(normEmail(fd.get("email")), String(fd.get("password") || ""), "/login?error=1");
}

// Sign-up is open to emails on the member list (Active/Exec Members record, or ALLOWED_EMAILS). New accounts are members.
export async function userSignUp(fd: FormData) {
  const name = String(fd.get("name") || "").trim(), email = normEmail(fd.get("email")), password = String(fd.get("password") || "");
  const fail = (m: string) => redirect(`/signup?error=${encodeURIComponent(m)}`);
  if (!name) fail("Enter your name.");
  if (!validEmail(email)) fail("Enter a valid email.");
  if (password.length < MIN_PASSWORD) fail(`Use at least ${MIN_PASSWORD} characters for your password.`);
  if (await userByEmail(email)) fail("An account with that email already exists. Sign in instead.");
  if (!(await isMemberEmail(email))) fail("That email is not on the E@B members list. Use the email an exec has on file for you.");
  await createUser({ name, email, password });
  await signInOr(email, password, "/login?error=1");
}

export async function userSignOut() { await signOut({ redirectTo: "/login" }); }

export async function setNotifications(on: boolean) {
  const email = (await auth())?.user?.email;
  if (!email) throw new Error("Not signed in");
  await query("update users set notifications_enabled=$1 where email=$2", [on, normEmail(email)]);
  revalidatePath("/", "layout");
}

// CSV columns: name, status, any field keys for the type, notes (same as the Export CSV).
export async function importCsv(fd: FormData) {
  await requireAdmin();
  const slug = String(fd.get("type")); const cfg = bySlug(slug);
  if (!cfg) throw new Error("bad type");
  const rows = csvRecords(cfg, String(fd.get("csv") || ""));
  for (const r of rows)
    await query("insert into records(type,name,status,data,notes) values($1,$2,$3,$4,$5)", [slug, r.name, r.status, JSON.stringify(r.data), r.notes]);
  const n = rows.length;
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

// --- Email blasts (admin) ---
export async function sendBlastAction(fd: FormData) {
  await requireAdmin();
  const r = await sendBlast({ subject: String(fd.get("subject") || ""), body: String(fd.get("body") || ""), emails: fd.getAll("to").map(String) });
  const msg = r.ok ? `Blast ${r.status}: ${r.sent} sent${r.failed ? `, ${r.failed} failed` : ""} of ${r.recipient_count}` : r.error;
  redirect(`/admin/blasts?msg=${encodeURIComponent(msg)}`);
}
