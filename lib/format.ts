// Pure display helpers (no database imports), safe to use from client components too.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "just now", "5m ago", "2h ago", "3d ago", else "Oct 12" ("Oct 12, 2025" in another year). Date-only strings are whole days. */
export function relTime(when: string | Date, now = new Date()) {
  const s = String(when);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const d = dateOnly ? new Date(`${s}T12:00:00`) : new Date(when);
  if (isNaN(d.getTime())) return "";
  const label = `${MONTHS[d.getMonth()]} ${d.getDate()}${d.getFullYear() === now.getFullYear() ? "" : `, ${d.getFullYear()}`}`;
  if (dateOnly) {
    const days = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    return days === 0 ? "today" : days === 1 ? "yesterday" : days > 1 && days < 7 ? `${days}d ago` : label;
  }
  const mins = Math.floor((now.getTime() - d.getTime()) / 6e4);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  if (mins < 60 * 24 * 7) return `${Math.floor(mins / 1440)}d ago`;
  return label;
}

/** When a post happened: its `date` field if it was backdated, else the exact creation time (so fresh posts say "2h ago"). */
export function postTime(date: string | undefined, createdAt: string | Date) {
  const created = new Date(createdAt);
  const createdDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(created);
  return date && date !== createdDay ? date : created.toISOString();
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

// Six avatar colors from the navy/blue/sky family, all dark enough for white initials.
const FACE_COLORS = ["#01132e", "#134686", "#0f3a6b", "#1d5c9c", "#2a6fb5", "#3a495d"];
/** The same person always gets the same color. */
export function avatarColor(name: string) {
  let h = 0;
  for (const c of name.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FACE_COLORS[h % FACE_COLORS.length];
}

/** Post category -> badge style. Unknown or old categories render neutral. */
export function postKind(category?: string): "ask" | "update" | "intro" | "ann" | "win" | "plain" {
  switch (category) {
    case "Ask": return "ask";
    case "Update": return "update";
    case "Intro": return "intro";
    case "Announcement": return "ann";
    case "Win": return "win";
    default: return "plain";
  }
}

export const firstLine = (s: string) => s.split("\n").map((l) => l.trim()).find(Boolean) || "";
export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/** "Fundraising, Hiring, B2B sales" -> up to 3 tags. */
export const tags = (s?: string) => (s || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3);
