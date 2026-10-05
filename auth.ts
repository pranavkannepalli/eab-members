import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { isMemberEmail } from "@/lib/access";

const hasGoogle = !!process.env.AUTH_GOOGLE_ID;
export const devLogin = !hasGoogle && process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(hasGoogle ? [Google({ authorization: { params: { prompt: "select_account" } } })] : []),
    ...(devLogin ? [Credentials({ credentials: { email: {} }, authorize: async (c) => (c?.email ? { id: String(c.email), email: String(c.email), name: String(c.email) } : null) })] : []),
  ],
  callbacks: {
    // Members-only: verified Google email that matches an Active/Exec member (see lib/access.ts).
    signIn: async ({ user, profile }) => {
      if (devLogin) return true;
      if (profile && (profile as { email_verified?: boolean }).email_verified === false) return false;
      return isMemberEmail(user.email);
    },
  },
});

export async function requireUser() {
  const s = await auth();
  if (!s?.user?.email) throw new Error("Not signed in");
  return s.user;
}
