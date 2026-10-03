import { GoogleLogin } from '@react-oauth/google';
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, login, googleLogin } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Demo12345!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  if (user) return <Navigate to="/app" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await login(email, password);
      const from = (location.state as any)?.from || '/app';
      navigate(from, { replace: true });
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <div className="auth-visual-inner">
          <div className="brand light"><span className="brand-mark">P</span><div><strong>PulseCRM</strong><small>Revenue workspace</small></div></div>
          <div className="hero-copy"><span className="eyebrow"><Sparkles size={15}/> Multi-tenant SaaS CRM</span><h1>Turn every sales signal into a next action.</h1><p>A production-ready CRM demo with secure sessions, role-based access, audit trails and isolated workspaces.</p></div>
          <div className="security-note"><ShieldCheck size={22}/><div><strong>Security by design</strong><span>30-day rotating HttpOnly sessions + server-side tenant authorization.</span></div></div>
        </div>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-icon"><LockKeyhole size={22}/></div>
          <h2>Welcome back</h2><p className="muted">Sign in to your workspace.</p>
          {error && <div className="alert error">{error}</div>}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}/></label>
          <button className="btn primary wide" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight size={17}/></>}</button>
          {googleEnabled && <><div className="divider"><span>or</span></div><div className="google-wrap"><GoogleLogin onSuccess={(r) => r.credential && googleLogin(r.credential).then(() => navigate('/app')).catch((e) => setError(e.message))} onError={() => setError('Google sign-in failed')} /></div></>}
          <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
          <div className="demo-credentials"><strong>Demo</strong><span>admin@example.com</span><span>Demo12345!</span></div>
        </form>
      </section>
    </div>
  );
}
