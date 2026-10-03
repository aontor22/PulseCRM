import { Building2, LogIn, Plus, Sparkles } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';

export function OnboardingPage() {
  const { organizations, loading, create, join } = useWorkspace();
  const [mode, setMode] = useState<'create'|'join'>('create');
  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  if (!loading && organizations.length > 0) return <Navigate to="/app" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try { mode === 'create' ? await create(name) : await join(code); navigate('/app', { replace: true }); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="onboarding-page"><div className="onboarding-card">
    <div className="onboarding-badge"><Sparkles size={18}/></div><h1>Set up your workspace</h1><p>Keep each company's customers, tasks and team data completely separate.</p>
    <div className="mode-tabs"><button className={mode==='create'?'active':''} onClick={()=>setMode('create')}><Building2 size={18}/>Create workspace</button><button className={mode==='join'?'active':''} onClick={()=>setMode('join')}><LogIn size={18}/>Join with code</button></div>
    <form onSubmit={submit}>
      {error && <div className="alert error">{error}</div>}
      {mode==='create' ? <label>Company / workspace name<input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. Acme Growth Lab" required/></label> : <label>Invite code<input value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} placeholder="e.g. ACME2026" required/></label>}
      <button className="btn primary wide" disabled={busy}>{busy?'Working…':<>{mode==='create'?<Plus size={17}/>:<LogIn size={17}/>} {mode==='create'?'Create workspace':'Join workspace'}</>}</button>
    </form>
  </div></div>;
}
