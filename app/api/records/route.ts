import { query } from "@/lib/db";
import { bySlug, defaultStatus, TYPES } from "@/lib/schema";
import { apiAccess, body, cleanData, err, handle, json } from "@/lib/api";
export const dynamic = "force-dynamic";

// GET /api/records?type=&q=&status=  (same matching as the list page)
export const GET = handle(async (req: Request) => {
  if (!(await apiAccess(req))) return err(401, "Sign in as a member or send Authorization: Bearer <ADMIN_PASSWORD>");
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") || "", q = sp.get("q") || "", status = sp.get("status") || "";
  if (type && !bySlug(type)) return err(400, `Unknown type. Use one of: ${TYPES.map((t) => t.slug).join(", ")}`);
  const where = ["true"]; const p: unknown[] = [];
  if (type) { p.push(type); where.push(`type=$${p.length}`); }
  if (q) { p.push(`%${q}%`); where.push(`(name ilike $${p.length} or data::text ilike $${p.length} or notes ilike $${p.length})`); }
  if (status) { p.push(status); where.push(`status=$${p.length}`); }
  const records = await query(`select * from records where ${where.join(" and ")} order by type, name`, p);
  return json({ count: records.length, records });
});

// POST /api/records  {type, name, status?, data?, notes?}
export const POST = handle(async (req: Request) => {
  if ((await apiAccess(req)) !== "admin") return err(401, "Writes need Authorization: Bearer <ADMIN_PASSWORD>");
  const b = await body(req);
  if (!b) return err(400, "Body must be a JSON object");
  const cfg = bySlug(String(b.type || ""));
  if (!cfg) return err(400, `Bad type. Use one of: ${TYPES.map((t) => t.slug).join(", ")}`);
  const name = String(b.name ?? "").trim();
  if (!name) return err(400, "name is required");
  const status = b.status == null || b.status === "" ? defaultStatus(cfg) : String(b.status);
  if (!cfg.statuses.includes(status)) return err(400, `Bad status for ${cfg.slug}. Use one of: ${cfg.statuses.join(", ")}`);
  const data = cleanData(cfg, b.data);
  if (typeof data === "string") return err(400, data);
  const [rec] = await query("insert into records(type,name,status,data,notes) values($1,$2,$3,$4,$5) returning *", [cfg.slug, name, status, JSON.stringify(data), String(b.notes ?? "")]);
  return json(rec, 201);
});
