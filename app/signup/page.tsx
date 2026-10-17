import Link from "next/link";
import { userSignUp } from "@/app/actions";
import { MIN_PASSWORD } from "@/lib/users";
export default async function SignUp({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="card">
        <h1>Create your account</h1>
        <p className="muted">Use the email E@B has on file for you.</p>
        {error && <p className="err">{error}</p>}
        <form action={userSignUp}>
          <input name="name" placeholder="Your name" autoComplete="name" required autoFocus />
          <input name="email" type="email" placeholder="you@berkeley.edu" autoComplete="email" required />
          <input name="password" type="password" placeholder={`Password (${MIN_PASSWORD}+ characters)`} autoComplete="new-password" minLength={MIN_PASSWORD} required />
          <button className="btn">Create account</button>
        </form>
        <p className="small">Have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </main>
  );
}
