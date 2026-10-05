import Link from "next/link";
import { signIn, devLogin } from "@/auth";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="card">
        <h1>E@B CRM</h1>
        <p className="muted">Entrepreneurs at Berkeley. Members only.</p>
        {error && <p className="err">That account isn't on the allowlist. Ask an exec to add your email.</p>}
        {devLogin ? (
          <form action={async (fd) => { "use server"; await signIn("credentials", { email: String(fd.get("email")), redirectTo: "/" }); }}>
            <input name="email" type="email" placeholder="dev email (local only)" required />
            <button className="btn">Dev sign in</button>
            <p className="muted small">Local dev login. Set AUTH_GOOGLE_ID to use Google sign-in.</p>
          </form>
        ) : process.env.AUTH_GOOGLE_ID ? (
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
            <button className="btn">Sign in with Google</button>
          </form>
        ) : null}
        <p className="small"><Link href="/admin/login">Admin login</Link></p>
      </div>
    </main>
  );
}
