import path from "node:path";
export default {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  webpack: (config) => { config.resolve.alias["@"] = path.resolve("."); return config; },
};
