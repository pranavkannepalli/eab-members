import { TypeCfg, defaultStatus } from "@/lib/schema";

// Minimal RFC 4180-ish CSV parser (quotes, escaped quotes, CRLF). Used by the admin import and /api/import.
export function parseCsv(text: string): string[][] {
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

// CSV columns: name, status, any field keys for the type, notes (same as the Export CSV). Rows without a name are skipped.
export function csvRecords(cfg: TypeCfg, text: string) {
  const rows = parseCsv(text);
  const head = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
  return rows.flatMap((r) => {
    const get = (k: string) => (r[head.indexOf(k)] ?? "").trim();
    const name = get("name"); if (!name) return [];
    const data: Record<string, string> = {}; for (const f of cfg.fields) data[f.key] = get(f.key);
    return [{ name, status: get("status") || defaultStatus(cfg), data, notes: get("notes") }];
  });
}
