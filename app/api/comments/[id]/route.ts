import { query } from "@/lib/db";
import { siteAccess, body, err, handle, json } from "@/lib/api";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
async function find(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return null;
  const [c] = await query("select * from comments where id=$1", [Number(id)]);
  return c ?? null;
}

// PATCH {hidden?, best?}  (admin). best=true makes this the only best answer on its post.
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  if ((await siteAccess(req)) !== "admin") return err(401, "Moderation is admin-only");
  const c = await find(ctx);
  if (!c) return err(404, "Not found");
  const b = await body(req);
  if (!b) return err(400, "Body must be a JSON object");
  if (b.hidden !== undefined) await query("update comments set hidden=$1, best=best and not $1 where id=$2", [b.hidden === true, c.id]);
  if (b.best === true) await query("update comments set best=(id=$1) where post_id=$2 and (best or id=$1)", [c.id, c.post_id]);
  else if (b.best === false) await query("update comments set best=false where id=$1", [c.id]);
  const [updated] = await query("select * from comments where id=$1", [c.id]);
  return json(updated);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  if ((await siteAccess(req)) !== "admin") return err(401, "Moderation is admin-only");
  const c = await find(ctx);
  if (!c) return err(404, "Not found");
  await query("delete from comments where id=$1", [c.id]);
  return json({ deleted: c.id });
});
