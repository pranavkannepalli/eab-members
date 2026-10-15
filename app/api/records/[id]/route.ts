import { query, Rec } from "@/lib/db";
import { bySlug, TYPES } from "@/lib/schema";
import { apiAccess, body, cleanData, err, handle, json } from "@/lib/api";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
async function find(ctx: Ctx): Promise<Rec | null> {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return null;
  const [rec] = await query("select * from records where id=$1", [Number(id)]);
  return rec ?? null;
}

export const GET = handle(async (req: Request, ctx: Ctx) => {
  if (!(await apiAccess(req))) return err(401, "Sign in as a member or send Authorization: Bearer <ADMIN_PASSWORD>");
  const rec = await find(ctx);
  return rec ? json(rec) : err(404, "Not found");
});

// PATCH {type?, name?, status?, data?, notes?}. data is merged into the existing data, not replaced.
// type moves the record to another type (e.g. a retired type's rows into its replacement); its status must be valid there unless status is sent too.
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  if ((await apiAccess(req)) !== "admin") return err(401, "Writes need Authorization: Bearer <ADMIN_PASSWORD>");
  const rec = await find(ctx);
  if (!rec) return err(404, "Not found");
  const b = await body(req);
  if (!b) return err(400, "Body must be a JSON object");
  const type = b.type === undefined ? rec.type : String(b.type);
  const cfg = bySlug(type);
  if (!cfg) return err(400, `${b.type === undefined ? `Record has retired type ${rec.type}; send type` : "Unknown type"}. Use one of: ${TYPES.map((t) => t.slug).join(", ")}`);
  const name = b.name === undefined ? rec.name : String(b.name).trim();
  if (!name) return err(400, "name cannot be empty");
  const status = b.status === undefined ? rec.status : String(b.status);
  // An unchanged status is kept even if no longer listed, so old rows can still be edited; a type change re-checks it.
  if (!cfg.statuses.includes(status) && !(status === rec.status && type === rec.type)) return err(400, `Bad status for ${cfg.slug}. Use one of: ${cfg.statuses.join(", ")}`);
  const data = cleanData(cfg, b.data);
  if (typeof data === "string") return err(400, data);
  const notes = b.notes === undefined ? rec.notes : String(b.notes);
  const [updated] = await query("update records set type=$1,name=$2,status=$3,data=data || $4::jsonb,notes=$5,updated_at=now() where id=$6 returning *", [cfg.slug, name, status, JSON.stringify(data), notes, rec.id]);
  return json(updated);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  if ((await apiAccess(req)) !== "admin") return err(401, "Writes need Authorization: Bearer <ADMIN_PASSWORD>");
  const rec = await find(ctx);
  if (!rec) return err(404, "Not found");
  await query("delete from records where id=$1", [rec.id]);
  return json({ deleted: rec.id });
});
