import { ArrowRight, BadgeCheck, Building2, UsersRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { user, register } = useAuth();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  if (user) return <Navigate to="/app" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await register(name, email, password); navigate('/onboarding', { replace: true }); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="auth-page reverse">
    <section className="auth-visual"><div className="auth-visual-inner">
      <div className="brand light"><span className="brand-mark">P</span><div><strong>PulseCRM</strong><small>Revenue workspace</small></div></div>
      <div className="hero-copy"><span className="eyebrow"><BadgeCheck size={15}/> Built for real teams</span><h1>One account. Multiple secure workspaces.</h1><p>Create a company workspace or join an existing team using its invite code.</p></div>
      <div className="feature-mini"><div><Building2/><span><strong>Tenant isolation</strong>Every query is scoped to a verified organization membership.</span></div><div><UsersRound/><span><strong>Role controls</strong>Owner, admin, manager and member permissions.</span></div></div>
    </div></section>
    <section className="auth-panel"><form className="auth-card" onSubmit={submit}>
      <h2>Create your account</h2><p className="muted">Start your first workspace in under a minute.</p>
      {error && <div className="alert error">{error}</div>}
      <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2}/></label>
      <label>Work email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Minimum 8 characters"/></label>
      <button className="btn primary wide" disabled={busy}>{busy ? 'Creating…' : <>Create account <ArrowRight size={17}/></>}</button>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </form></section>
  </div>;
}
