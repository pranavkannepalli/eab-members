import Link from "next/link";
import { userSignIn } from "@/app/actions";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="card">
        <h1>E@B Members</h1>
        <p className="muted">Home base for Entrepreneurs at Berkeley members: people, deals and events.</p>
        {error && <p className="err">That email and password didn't match, or the email isn't on the member list anymore. Ask an exec if you think it should be.</p>}
        <form action={userSignIn}>
          <input name="email" type="email" placeholder="you@berkeley.edu" autoComplete="email" required autoFocus />
          <input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
          <button className="btn">Sign in</button>
        </form>
        <p className="small">New here? <Link href="/signup">Create an account</Link> · <Link href="/admin/login">Admin login</Link></p>
      </div>
    </main>
  );
}
