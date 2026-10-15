import Link from "next/link";
import { signIn, devLogin } from "@/auth";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="card">
        <h1>E@B Members</h1>
        <p className="muted">Home base for Entrepreneurs at Berkeley members: people, deals and events.</p>
        {error && <p className="err">We couldn't find that Google account on the member list. Try the email you gave E@B, or ask an exec to add you.</p>}
        {devLogin ? (
          <form action={async (fd) => { "use server"; await signIn("credentials", { email: String(fd.get("email")), redirectTo: "/" }); }}>
            <input name="email" type="email" placeholder="Any email (local testing)" required />
            <button className="btn">Dev sign in</button>
            <p className="muted small">Local testing only. Google sign-in is off here.</p>
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
