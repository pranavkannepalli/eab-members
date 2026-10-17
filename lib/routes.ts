// Where each type lives on the site. Every type is a top-level page; detail pages are <home>/<id> (updates: /updates/<id>, list = the feed).
const HOME: Record<string, string> = {
  members: "/directory", alumni: "/alumni", deals: "/deals", vcs: "/vcs", pocs: "/intros",
  updates: "/", events: "/events", resources: "/resources", finance: "/finances",
};
// Types whose pages are admin-only (members are sent home).
export const ADMIN_ONLY = ["alumni", "vcs", "pocs"];
// Deal statuses that make a deal a perk members can see and claim.
export const PERK_STATUSES = ["Confirmed", "Active"];

export const homeOf = (slug: string) => HOME[slug] ?? "/";
export const recordHref = (slug: string, id: number) => `${slug === "updates" ? "/updates" : homeOf(slug)}/${id}`;
export const newHref = (slug: string) => (slug === "updates" ? "/" : `${homeOf(slug)}/new`);

/** Whether a non-admin may open this record: not an admin-only type, not a draft resource, not a deal that is not a perk yet. */
export const memberCanOpen = (r: { type: string; status: string }) =>
  !ADMIN_ONLY.includes(r.type) && !(r.type === "resources" && r.status !== "Published") && !(r.type === "deals" && !PERK_STATUSES.includes(r.status));
