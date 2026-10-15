import { query } from "@/lib/db";
import { bySlug } from "@/lib/schema";
import { apiAccess } from "@/lib/api";

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  if (!(await apiAccess(req))) return new Response("Unauthorized", { status: 401 });
  const { type } = await params;
  const cfg = bySlug(type);
  if (!cfg) return new Response("Not found", { status: 404 });
  const rows = await query("select * from records where type=$1 order by name", [type]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["name", "status", ...cfg.fields.map((f) => f.key), "notes"];
  const lines = [head.join(",")].concat(rows.map((r) => [r.name, r.status, ...cfg.fields.map((f) => r.data[f.key]), r.notes].map(esc).join(",")));
  return new Response(lines.join("\n"), { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename=${type}.csv` } });
}
