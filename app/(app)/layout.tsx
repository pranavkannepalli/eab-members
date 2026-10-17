import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { hasAccess } from "@/lib/access";
import { Nav } from "@/components";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await auth();
  const member = await hasAccess(s?.user?.email);
  if (!member && !(await isAdmin())) redirect("/login");
  return <div className="page"><Nav /><main>{children}</main></div>;
}
