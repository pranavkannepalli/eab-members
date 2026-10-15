// Shared helpers for the member-facing pages (home feed, perks, events, directory, resources, finances).
import { Rec } from "@/lib/db";

export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date()); // YYYY-MM-DD
export const isHttp = (u?: string) => !!u && /^https?:\/\//i.test(u);

/** Group rows by a data key, keeping the order of `order` first; blank values go under `fallback`. */
export function groupBy(rows: Rec[], key: string, order: string[] = [], fallback = "Other") {
  const groups = new Map<string, Rec[]>();
  for (const o of order) groups.set(o, []);
  for (const r of rows) {
    const g = r.data[key] || fallback;
    groups.set(g, [...(groups.get(g) ?? []), r]);
  }
  return [...groups].filter(([, rs]) => rs.length > 0);
}
