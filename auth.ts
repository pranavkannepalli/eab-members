import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const allowed = () => (process.env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const hasGoogle = !!process.env.AUTH_GOOGLE_ID;
export const devLogin = !hasGoogle && process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(hasGoogle ? [Google] : []),
    ...(devLogin ? [Credentials({ credentials: { email: {} }, authorize: async (c) => (c?.email ? { id: String(c.email), email: String(c.email), name: String(c.email) } : null) })] : []),
  ],
  callbacks: {
    // Only emails on the ALLOWED_EMAILS list get in. Dev login (local only) is open.
    signIn: async ({ user }) => devLogin || allowed().includes((user.email || "").toLowerCase()),
  },
});

export async function requireUser() {
  const s = await auth();
  if (!s?.user?.email) throw new Error("Not signed in");
  return s.user;
}
