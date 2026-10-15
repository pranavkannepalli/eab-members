export type Field = { key: string; label: string; kind?: "text" | "textarea" | "select" | "url" | "email" | "date"; options?: string[];
  internal?: boolean; // admin working info: never shown to members
};
export type TypeCfg = {
  slug: string; label: string; singular: string; blurb: string;
  statuses: string[]; fields: Field[]; columns: string[]; // columns: data keys shown in list
  filterField?: string; // data key (select) to filter on besides status
  defaultStatus?: string; // status for new records when none is given (else statuses[0])
  nameLabel?: string; notesLabel?: string; // form labels for name / notes (default "Name" / "Notes")
  internalNotes?: boolean; // notes are admin working notes, hidden from members
};

export const TYPES: TypeCfg[] = [
  {
    slug: "members", label: "Members", singular: "Member", blurb: "Founders, builders and operators in E@B.",
    statuses: ["Active", "Exec", "Pending", "Inactive"],
    fields: [
      { key: "role", label: "Role / team" }, { key: "email", label: "Email", kind: "email" },
      { key: "year", label: "Year", kind: "select", options: ["Freshman", "Sophomore", "Junior", "Senior", "Grad"] },
      { key: "major", label: "Major" }, { key: "cohort", label: "Cohort (e.g. Fall 2026)" },
      { key: "company", label: "Building / company" }, { key: "linkedin", label: "LinkedIn", kind: "url" },
      { key: "avatar", label: "Photo URL", kind: "url" },
      { key: "expert_tags", label: "Expertise (comma-separated, up to 3)" },
    ],
    columns: ["role", "year", "major", "cohort"], filterField: "year",
  },
  {
    slug: "alumni", label: "Alumni", singular: "Alum", blurb: "Past E@B members: what they're building and how they can help.",
    statuses: ["In touch", "Cold", "Mentor", "Founder"],
    fields: [
      { key: "company", label: "Company" }, { key: "title", label: "Title" },
      { key: "email", label: "Email", kind: "email" }, { key: "grad_year", label: "Grad year" },
      { key: "cohort", label: "E@B cohort" }, { key: "raised", label: "Funding raised" },
      { key: "can_help", label: "Can help with" }, { key: "linkedin", label: "LinkedIn", kind: "url" },
    ],
    columns: ["company", "title", "cohort", "raised"],
  },
  {
    slug: "deals", label: "Deals", singular: "Deal", blurb: "Exclusive deals to help you keep building.", nameLabel: "Company", internalNotes: true,
    // Pipeline order. Researching..Dropped: nothing agreed yet. Confirmed/Active deals are perks members can claim.
    statuses: ["Researching", "Drafted", "Contacted", "In conversation", "Dropped", "Confirmed", "Active", "Completed", "Expired"], defaultStatus: "Researching",
    fields: [
      { key: "category", label: "Category", kind: "select", options: ["Perk / credits", "Ambassador", "Event sponsor", "Recruiting", "Sponsorship", "Other"] },
      { key: "tier", label: "Tier or priority", internal: true }, { key: "contact_name", label: "Their contact", internal: true },
      { key: "contact_email", label: "Their contact's email", kind: "email", internal: true }, { key: "owner", label: "E@B lead", internal: true },
      { key: "value", label: "Value (cash or credits)" }, { key: "next_step", label: "Next step", internal: true },
      { key: "next_date", label: "Next step due", kind: "date", internal: true }, { key: "route", label: "How to claim (steps or link)", kind: "textarea" },
      { key: "caveat", label: "Fine print", kind: "textarea" },
    ],
    columns: ["category", "owner", "next_step", "next_date"], filterField: "category",
  },
  {
    slug: "vcs", label: "VCs", singular: "VC", blurb: "Investors and funds E@B works with or is reaching out to.",
    statuses: ["Target", "Contacted", "Warm", "Active partner", "Passed"],
    fields: [
      { key: "firm", label: "Firm" }, { key: "email", label: "Email", kind: "email" },
      { key: "stage", label: "Stage focus", kind: "select", options: ["Pre-seed", "Seed", "Series A", "Growth", "Multi-stage"] },
      { key: "sectors", label: "Sectors" }, { key: "check", label: "Check size" },
      { key: "eab_poc", label: "E@B contact" }, { key: "last_contact", label: "Last contact", kind: "date" },
      { key: "linkedin", label: "LinkedIn", kind: "url" },
    ],
    columns: ["firm", "stage", "eab_poc", "last_contact"], filterField: "stage",
  },
  {
    slug: "pocs", label: "Intros", singular: "Intro", blurb: "Important people outside the club, and who at E@B can introduce you.",
    statuses: ["Warm", "Cold", "Reached out", "Intro made"],
    fields: [
      { key: "kind", label: "Role", kind: "select", options: ["VC / investor", "Founder", "Recruiter", "Company exec", "Faculty", "Other"] },
      { key: "org", label: "Organization" }, { key: "title", label: "Title" },
      { key: "eab_contact", label: "Who at E@B knows them" },
      { key: "relationship", label: "How they know each other", kind: "textarea" },
      { key: "email", label: "Email", kind: "email" }, { key: "linkedin", label: "LinkedIn", kind: "url" },
    ],
    columns: ["kind", "org", "eab_contact"], filterField: "kind",
  },
  {
    // Post body lives in the record's notes.
    slug: "updates", label: "Updates", singular: "Update", blurb: "Club announcements, wins and news on the member feed.",
    statuses: ["Pinned", "Open", "Archived"], defaultStatus: "Open", nameLabel: "Title", notesLabel: "Post",
    fields: [
      { key: "author", label: "Author" }, { key: "date", label: "Date", kind: "date" },
      { key: "category", label: "Category", kind: "select", options: ["Announcement", "Ask", "Intro", "Update", "Win", "Recruiting", "Event", "Other"] },
      { key: "link", label: "Link", kind: "url" },
      { key: "member_a", label: "Intro: E@B member who knows them" }, { key: "member_b", label: "Intro: person to meet" },
    ],
    columns: ["author", "date", "category"], filterField: "category",
  },
  {
    // Description lives in the record's notes.
    slug: "events", label: "Events", singular: "Event", blurb: "Workshops, socials, recruiting nights and demo day.",
    statuses: ["Upcoming", "Past", "Cancelled"], notesLabel: "Description",
    fields: [
      { key: "date", label: "Date", kind: "date" }, { key: "time", label: "Time" }, { key: "location", label: "Location" },
      { key: "link", label: "Event page", kind: "url" }, { key: "rsvp", label: "RSVP link", kind: "url" },
      { key: "category", label: "Category", kind: "select", options: ["Social", "Workshop", "Recruiting", "Demo day", "Other"] },
    ],
    columns: ["date", "location", "category"], filterField: "category",
  },
  {
    // Description lives in the record's notes.
    slug: "resources", label: "Resources", singular: "Resource", blurb: "Guides, tools and templates to help you build.",
    statuses: ["Published", "Draft"], notesLabel: "Description",
    fields: [
      { key: "url", label: "Link", kind: "url" },
      { key: "category", label: "Category", kind: "select", options: ["Guide", "Tool", "Template", "Document", "Link", "Media"] },
      { key: "owner", label: "Maintained by" },
    ],
    columns: ["category", "owner", "url"], filterField: "category",
  },
  {
    slug: "finance", label: "Finances", singular: "Finance entry", blurb: "Where the club's money comes from and where it goes.",
    statuses: ["Planned", "Committed", "Paid", "Reimbursed"],
    fields: [
      { key: "kind", label: "Type", kind: "select", options: ["Budget line", "Expense", "Sponsorship", "Reimbursement"] },
      { key: "amount", label: "Amount (e.g. $500)" }, { key: "period", label: "Date", kind: "date" },
      { key: "counterparty", label: "Paid to / from" },
    ],
    columns: ["kind", "amount", "period", "counterparty"], filterField: "kind",
  },
];

export const bySlug = (s: string) => TYPES.find((t) => t.slug === s);
export const defaultStatus = (t: TypeCfg) => t.defaultStatus ?? t.statuses[0];
