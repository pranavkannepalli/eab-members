import Link from "next/link";
import { userSignIn } from "@/app/actions";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="card">
        <h1>E@B Members</h1>
        <p className="muted">Entrepreneurs at Berkeley members site.</p>
        {error && <p className="err">Wrong email or password, or that email is no longer on the E@B members list.</p>}
        <form action={userSignIn}>
          <input name="email" type="email" placeholder="you@berkeley.edu" autoComplete="email" required autoFocus />
          <input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
          <button className="btn">Sign in</button>
        </form>
        <p className="small">New here? <Link href="/signup">Create an account</Link> · <Link href="/admin/login">Admin password</Link></p>
      </div>
    </main>
  );
}
