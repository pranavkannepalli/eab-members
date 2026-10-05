import Link from "next/link";
import { signIn, devLogin } from "@/auth";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="card">
        <h1>E@B Members</h1>
        <p className="muted">Entrepreneurs at Berkeley members site.</p>
        {error && <p className="err">That Google account is not on the E@B members list. Sign in with the email an exec has on file for you.</p>}
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
