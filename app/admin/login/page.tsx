import { adminLogin } from "@/app/actions";
import { adminConfigured } from "@/lib/admin";
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login"><div className="card">
      <h1>Admin</h1>
      <p className="muted">Enter the admin password to manage data.</p>
      {error && <p className="err">Wrong password.</p>}
      {!adminConfigured() && <p className="err">ADMIN_PASSWORD is not set on this deployment.</p>}
      <form action={adminLogin}><input name="password" type="password" placeholder="Admin password" required autoFocus /><button className="btn">Unlock</button></form>
    </div></main>
  );
}
