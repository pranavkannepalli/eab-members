import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { TYPES } from "@/lib/schema";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await auth();
  if (!s?.user?.email) redirect("/login");
  return (
    <div className="shell">
      <aside>
        <Link href="/" className="brand">E@B <span>CRM</span></Link>
        <nav>
          <Link href="/">Dashboard</Link>
          {TYPES.map((t) => <Link key={t.slug} href={`/${t.slug}`}>{t.label}</Link>)}
        </nav>
        <form action="/search" className="sideSearch"><input name="q" placeholder="Search everything" /></form>
        <div className="me">
          <div className="small muted">{s.user.email}</div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="link">Sign out</button></form>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}
