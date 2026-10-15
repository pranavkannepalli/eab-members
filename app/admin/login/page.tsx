import { adminLogin } from "@/app/actions";
import { adminConfigured } from "@/lib/admin";
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login"><div className="card">
      <h1>Admin</h1>
      <p className="muted">Enter the admin password to manage the site.</p>
      {error && <p className="err">That password didn't work. Try again.</p>}
      {!adminConfigured() && <p className="err">Admin access isn't set up yet. Ask the site maintainer to add an admin password.</p>}
      <form action={adminLogin}><input name="password" type="password" placeholder="Admin password" required autoFocus /><button className="btn">Log in</button></form>
    </div></main>
  );
}
