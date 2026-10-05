import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { isMemberEmail } from "@/lib/access";
import { devLogin } from "@/auth";
import { Nav } from "@/components";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await auth();
  const member = !!s?.user?.email && (devLogin || (await isMemberEmail(s.user.email)));
  if (!member && !(await isAdmin())) redirect("/login");
  return <div className="page"><Nav /><main>{children}</main></div>;
}
