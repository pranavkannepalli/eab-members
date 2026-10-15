// Shared helpers for the member-facing pages (home feed, perks, events, directory, resources, finances).
import { query, Rec } from "@/lib/db";
export { relTime, postTime, initials, avatarColor, postKind, plural, tags } from "@/lib/format";

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

/** Upcoming events from `from` (YYYY-MM-DD) on, nearest first. Undated ones are left out unless asked for, then listed last. */
export function upcomingEvents(from: string, { limit = 6, undated = false } = {}): Promise<Rec[]> {
  const dated = "coalesce(data->>'date','')>=$1";
  return query(
    `select * from records where type='events' and status='Upcoming' and ${undated ? `(${dated} or coalesce(data->>'date','')='')` : dated}
     order by ${undated ? "(coalesce(data->>'date','')='')," : ""} data->>'date', data->>'time' limit ${Number(limit)}`, [from]);
}
