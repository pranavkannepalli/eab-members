import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { hasAccess } from "@/lib/access";
import { userByEmail, normEmail } from "@/lib/users";
import { verifyPassword } from "@/lib/password";

// Email + password sign-in against the `users` table. Sessions stay NextAuth JWT cookies.
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (c) => {
        const email = normEmail(c?.email), password = String(c?.password || "");
        const u = email && password ? await userByEmail(email) : null;
        if (!u || !(await verifyPassword(password, u.password_hash))) return null;
        // Members-only: admins, or an Active/Exec member with this email (see lib/access.ts).
        if (!(await hasAccess(u.email))) return null;
        return { id: String(u.id), email: u.email, name: u.name };
      },
    }),
  ],
});

export async function requireUser() {
  const s = await auth();
  if (!s?.user?.email) throw new Error("Not signed in");
  return s.user;
}
