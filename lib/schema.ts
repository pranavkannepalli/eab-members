export type Field = { key: string; label: string; kind?: "text" | "textarea" | "select" | "url" | "email" | "date"; options?: string[] };
export type TypeCfg = {
  slug: string; label: string; singular: string; blurb: string;
  statuses: string[]; fields: Field[]; columns: string[]; // columns: data keys shown in list
  filterField?: string; // data key (select) to filter on besides status
  defaultStatus?: string; // status for new records when none is given (else statuses[0])
};

export const TYPES: TypeCfg[] = [
  {
    slug: "members", label: "Members", singular: "Member", blurb: "Current E@B members and exec.",
    statuses: ["Active", "Exec", "Pending", "Inactive"],
    fields: [
      { key: "role", label: "Role / team" }, { key: "email", label: "Email", kind: "email" },
      { key: "year", label: "Year", kind: "select", options: ["Freshman", "Sophomore", "Junior", "Senior", "Grad"] },
      { key: "major", label: "Major" }, { key: "cohort", label: "Cohort (e.g. Fall 2026)" },
      { key: "company", label: "Building / company" }, { key: "linkedin", label: "LinkedIn", kind: "url" },
      { key: "avatar", label: "Photo URL", kind: "url" },
    ],
    columns: ["role", "year", "major", "cohort"], filterField: "year",
  },
  {
    slug: "alumni", label: "Alumni", singular: "Alumnus", blurb: "Past members and founders in the network.",
    statuses: ["In touch", "Cold", "Mentor", "Founder"],
    fields: [
      { key: "company", label: "Company" }, { key: "title", label: "Title" },
      { key: "email", label: "Email", kind: "email" }, { key: "grad_year", label: "Grad year" },
      { key: "cohort", label: "E@B cohort" }, { key: "raised", label: "Raised" },
      { key: "can_help", label: "Can help with" }, { key: "linkedin", label: "LinkedIn", kind: "url" },
    ],
    columns: ["company", "title", "cohort", "raised"],
  },
  {
    slug: "deals", label: "Deals", singular: "Deal", blurb: "Confirmed deals only: signed perks, ambassador programs, sponsors and recruiting partners.",
    statuses: ["Confirmed", "Active", "Completed", "Expired"],
    fields: [
      { key: "category", label: "Category", kind: "select", options: ["Perk / credits", "Ambassador", "Event sponsor", "Recruiting", "Sponsorship", "Other"] },
      { key: "tier", label: "Tier / priority" }, { key: "contact_name", label: "Contact name" },
      { key: "contact_email", label: "Contact email", kind: "email" }, { key: "owner", label: "E@B owner" },
      { key: "value", label: "Value (cash / credits)" }, { key: "next_step", label: "Next step" },
      { key: "next_date", label: "Next step date", kind: "date" }, { key: "route", label: "Route / link", kind: "textarea" },
      { key: "caveat", label: "Caveats", kind: "textarea" },
    ],
    columns: ["category", "owner", "next_step", "next_date"], filterField: "category",
  },
  {
    slug: "prospects", label: "Prospects", singular: "Prospect", blurb: "Unconfirmed outreach targets. Nothing here is a deal until it is promoted.",
    statuses: ["Researching", "Drafted", "Contacted", "In conversation", "Dropped"],
    fields: [
      { key: "category", label: "Category", kind: "select", options: ["Perk / credits", "Ambassador", "Event sponsor", "Recruiting", "Sponsorship", "Other"] },
      { key: "tier", label: "Tier / priority" }, { key: "contact_name", label: "Contact name" },
      { key: "contact_email", label: "Contact email", kind: "email" }, { key: "owner", label: "E@B owner" },
      { key: "value", label: "Value (cash / credits)" }, { key: "next_step", label: "Next step" },
      { key: "next_date", label: "Next step date", kind: "date" }, { key: "route", label: "Route / link", kind: "textarea" },
      { key: "caveat", label: "Caveats", kind: "textarea" },
    ],
    columns: ["category", "owner", "next_step", "next_date"], filterField: "category",
  },
  {
    slug: "vcs", label: "VC partners", singular: "VC partner", blurb: "Investors and funds E@B works with.",
    statuses: ["Target", "Contacted", "Warm", "Active partner", "Passed"],
    fields: [
      { key: "firm", label: "Firm" }, { key: "email", label: "Email", kind: "email" },
      { key: "stage", label: "Stage focus", kind: "select", options: ["Pre-seed", "Seed", "Series A", "Growth", "Multi-stage"] },
      { key: "sectors", label: "Sectors" }, { key: "check", label: "Check size" },
      { key: "eab_poc", label: "E@B point of contact" }, { key: "last_contact", label: "Last contact", kind: "date" },
      { key: "linkedin", label: "LinkedIn", kind: "url" },
    ],
    columns: ["firm", "stage", "eab_poc", "last_contact"], filterField: "stage",
  },
  {
    slug: "pocs", label: "Warm intros", singular: "Warm intro", blurb: "Important people, and who at E@B can connect you to them.",
    statuses: ["Warm", "Cold", "Reached out", "Intro made"],
    fields: [
      { key: "kind", label: "Kind", kind: "select", options: ["VC / investor", "Founder", "Recruiter", "Company exec", "Faculty", "Other"] },
      { key: "org", label: "Organization" }, { key: "title", label: "Title" },
      { key: "eab_contact", label: "E@B contact who knows them" },
      { key: "relationship", label: "How they know each other", kind: "textarea" },
      { key: "email", label: "Email", kind: "email" }, { key: "linkedin", label: "LinkedIn", kind: "url" },
    ],
    columns: ["kind", "org", "eab_contact"], filterField: "kind",
  },
  {
    // Post body lives in the record's notes.
    slug: "updates", label: "Updates", singular: "Update", blurb: "Club announcements, wins and news on the member feed.",
    statuses: ["Pinned", "Open", "Archived"], defaultStatus: "Open",
    fields: [
      { key: "author", label: "Author" }, { key: "date", label: "Date", kind: "date" },
      { key: "category", label: "Category", kind: "select", options: ["Announcement", "Win", "Recruiting", "Event", "Other"] },
      { key: "link", label: "Link", kind: "url" },
    ],
    columns: ["author", "date", "category"], filterField: "category",
  },
  {
    // Description lives in the record's notes.
    slug: "events", label: "Events", singular: "Event", blurb: "Dinners, workshops, demo day, recruiting nights.",
    statuses: ["Upcoming", "Past", "Cancelled"],
    fields: [
      { key: "date", label: "Date", kind: "date" }, { key: "time", label: "Time" }, { key: "location", label: "Location" },
      { key: "link", label: "Link", kind: "url" }, { key: "rsvp", label: "RSVP link", kind: "url" },
      { key: "category", label: "Category", kind: "select", options: ["Social", "Workshop", "Recruiting", "Demo day", "Other"] },
    ],
    columns: ["date", "location", "category"], filterField: "category",
  },
  {
    // Description lives in the record's notes.
    slug: "resources", label: "Resources", singular: "Resource", blurb: "Guides, tools, templates and links the club keeps.",
    statuses: ["Published", "Draft"],
    fields: [
      { key: "url", label: "URL", kind: "url" },
      { key: "category", label: "Category", kind: "select", options: ["Guide", "Tool", "Template", "Document", "Link", "Media"] },
      { key: "owner", label: "Maintained by" },
    ],
    columns: ["category", "owner", "url"], filterField: "category",
  },
];

export const bySlug = (s: string) => TYPES.find((t) => t.slug === s);
export const defaultStatus = (t: TypeCfg) => t.defaultStatus ?? t.statuses[0];
