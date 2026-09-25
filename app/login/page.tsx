import { login } from "@/lib/actions";
import { passwordConfigured } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const ready = passwordConfigured();
  return (
    <main className="login">
      <form className="card stack" action={login}>
        <img className="word" src="/logo.png" alt="Hearth" />
        <p className="kicker">Circle desk</p>
        <h1>Welcome back.</h1>
        <p className="lede">This desk is for the person running circles. Members never sign in here.</p>
        {params.error ? <p className="banner">That password did not match.</p> : null}
        {!ready ? (
          <p className="banner">Set OPERATOR_PASSWORD in operator/.env.local before anyone can sign in.</p>
        ) : null}
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required disabled={!ready} />
        </label>
        <button className="primary" type="submit" disabled={!ready}>
          Enter
        </button>
      </form>
    </main>
  );
}
