"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { requireUser } from "@/auth";

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
  await requireUser();
  const r = parse(slug, fd);
  if (id) {
    await query("update records set name=$1,status=$2,data=$3,notes=$4,updated_at=now() where id=$5 and type=$6", [r.name, r.status, JSON.stringify(r.data), r.notes, id, slug]);
  } else {
    const [row] = await query("insert into records(type,name,status,data,notes) values($1,$2,$3,$4,$5) returning id", [slug, r.name, r.status, JSON.stringify(r.data), r.notes]);
    id = row.id;
  }
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/${id}`);
}

export async function deleteRecord(slug: string, id: number) {
  await requireUser();
  await query("delete from records where id=$1 and type=$2", [id, slug]);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}
