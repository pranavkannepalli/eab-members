import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { Nav } from "@/components";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await auth();
  if (!s?.user?.email && !(await isAdmin())) redirect("/login");
  return <div className="page"><Nav /><main>{children}</main></div>;
}
