import { query } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { csvRecords } from "@/lib/csv";
import { apiAccess, err, handle, json } from "@/lib/api";
export const dynamic = "force-dynamic";

// POST /api/import/<type> with a CSV body (same columns as /api/export/<type>). Rows are added, nothing is overwritten.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ type: string }> }) => {
  if ((await apiAccess(req)) !== "admin") return err(401, "Writes need Authorization: Bearer <ADMIN_PASSWORD>");
  const cfg = bySlug((await params).type);
  if (!cfg) return err(404, "Unknown type");
  const rows = csvRecords(cfg, await req.text());
  for (const r of rows)
    await query("insert into records(type,name,status,data,notes) values($1,$2,$3,$4,$5)", [cfg.slug, r.name, r.status, JSON.stringify(r.data), r.notes]);
  return json({ imported: rows.length, type: cfg.slug });
});
