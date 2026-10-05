import Link from "next/link";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";

type Book = { title: string; blurb: string; href?: string; stat?: string; tone: string };

export default async function Bookcase() {
  const [c] = await query("select count(*)::int n from records where type<>'prospects'");
  const shelves: Book[][] = [
    [
      { title: "CRM", blurb: "Members, alumni, deals, VC partners and warm intros.", href: "/crm", stat: `${c?.n ?? 0} contacts`, tone: "navy" },
      { title: "Finances", blurb: "Budget, reimbursements, sponsor money.", href: "/finances", stat: "Coming soon", tone: "blue" },
      { title: "Resume book", blurb: "Member profiles for recruiters.", stat: "Planned", tone: "sky" },
    ],
    [
      { title: "Perks", blurb: "E@B-exclusive deals and credits.", stat: "Planned", tone: "sky" },
      { title: "Events", blurb: "Dinners, demo day, recruiting nights.", stat: "Planned", tone: "blue" },
    ],
  ];
  return (
    <>
      <p className="eyebrow">E@B Members</p>
      <h1>Builders need other builders.</h1>
      <p className="muted">Everything the club runs on, on one shelf.</p>
      <div className="case">
        {shelves.map((row, i) => (
          <div className="shelf" key={i}>
            <div className="books">
              {row.map((b) => {
                const inner = (<><span className="tag">{b.stat}</span><strong>{b.title}</strong><span className="blurb">{b.blurb}</span></>);
                return b.href
                  ? <Link key={b.title} href={b.href} className={`book ${b.tone}`}>{inner}</Link>
                  : <div key={b.title} className={`book soon ${b.tone}`}>{inner}</div>;
              })}
            </div>
            <div className="plank" />
          </div>
        ))}
      </div>
    </>
  );
}
