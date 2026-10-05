import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const domain = () => (process.env.ALLOWED_DOMAIN ?? "berkeley.edu").trim().toLowerCase();
const allowed = () => (process.env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const hasGoogle = !!process.env.AUTH_GOOGLE_ID;
export const devLogin = !hasGoogle && process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(hasGoogle ? [Google({ authorization: { params: { hd: domain() || undefined, prompt: "select_account" } } })] : []),
    ...(devLogin ? [Credentials({ credentials: { email: {} }, authorize: async (c) => (c?.email ? { id: String(c.email), email: String(c.email), name: String(c.email) } : null) })] : []),
  ],
  callbacks: {
    // Berkeley sign-in: verified Google email on ALLOWED_DOMAIN (default berkeley.edu), or listed in
    // ALLOWED_EMAILS (exceptions, e.g. alumni). Set ALLOWED_DOMAIN="" to require the list only.
    signIn: async ({ user, profile }) => {
      if (devLogin) return true;
      const email = (user.email || "").toLowerCase();
      if (profile && (profile as { email_verified?: boolean }).email_verified === false) return false;
      const d = domain();
      return allowed().includes(email) || (!!d && email.endsWith("@" + d));
    },
  },
});

export async function requireUser() {
  const s = await auth();
  if (!s?.user?.email) throw new Error("Not signed in");
  return s.user;
}
