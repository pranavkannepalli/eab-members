import path from "node:path";

// Old URLs -> first-class homes (308). There is no /crm section any more; prospects are deals; perks live on /deals.
const moved = { members: "/directory", alumni: "/alumni", deals: "/deals", prospects: "/deals", vcs: "/vcs", pocs: "/intros", events: "/events", resources: "/resources", finance: "/finances" };

export default {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  webpack: (config) => { config.resolve.alias["@"] = path.resolve("."); return config; },
  async redirects() {
    const r = (source, destination) => ({ source, destination, permanent: true });
    return [
      r("/crm", "/directory"), r("/crm/overview", "/admin"), r("/crm/search", "/search"),
      r("/crm/updates", "/"), r("/crm/updates/new", "/"), r("/crm/updates/:id", "/updates/:id"),
      ...Object.entries(moved).flatMap(([t, home]) => [r(`/crm/${t}`, home), r(`/crm/${t}/:rest*`, `${home}/:rest*`)]),
      r("/crm/:rest*", "/directory"),
      r("/perks", "/deals"), r("/perks/:id", "/deals/:id"),
    ];
  },
};
