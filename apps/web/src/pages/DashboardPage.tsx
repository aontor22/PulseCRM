import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, CircleDollarSign, Clock3, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { api } from '../lib/api';

type Dashboard = {
  metrics: { leadCount: number; wonCount: number; openTasks: number; overdueTasks: number; pipelineValue: number };
  pipeline: { status: string; count: number; value: number }[];
  recentLeads: any[]; recentAudit: any[];
};

const statusLabel: Record<string,string> = { NEW:'New', QUALIFIED:'Qualified', PROPOSAL:'Proposal', WON:'Won', LOST:'Lost' };

export function DashboardPage() {
  const { activeOrg } = useWorkspace(); const [data, setData] = useState<Dashboard|null>(null); const [error,setError]=useState('');
  useEffect(()=>{ if(activeOrg) api<Dashboard>('/dashboard',{orgId:activeOrg.id}).then(setData).catch(e=>setError(e.message)); },[activeOrg?.id]);
  if(!activeOrg) return null;
  if(!data) return <div className="content-page"><div className="page-loader inline"><div className="spinner"/><p>{error||'Loading dashboard…'}</p></div></div>;
  const max = Math.max(1,...data.pipeline.map(p=>p.count));
  return <div className="content-page">
    <div className="page-head"><div><span className="eyebrow dark">Live workspace overview</span><h1>Good to see you.</h1><p>Here’s what is moving inside <strong>{activeOrg.name}</strong>.</p></div><Link to="/app/leads" className="btn primary">Manage leads <ArrowUpRight size={17}/></Link></div>
    <div className="metric-grid">
      <Metric icon={<BriefcaseBusiness/>} label="Total leads" value={data.metrics.leadCount}/><Metric icon={<Target/>} label="Won deals" value={data.metrics.wonCount}/><Metric icon={<CircleDollarSign/>} label="Pipeline value" value={`$${data.metrics.pipelineValue.toLocaleString()}`}/><Metric icon={<Clock3/>} label="Open tasks" value={data.metrics.openTasks} note={data.metrics.overdueTasks?`${data.metrics.overdueTasks} overdue`:'On track'}/>
    </div>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-head"><div><h2>Pipeline health</h2><p>Deals grouped by current stage.</p></div></div><div className="pipeline-list">{['NEW','QUALIFIED','PROPOSAL','WON','LOST'].map(s=>{const item=data.pipeline.find(p=>p.status===s)||{count:0,value:0};return <div className="pipeline-row" key={s}><span>{statusLabel[s]}</span><div className="bar-track"><div className={`bar-fill s-${s.toLowerCase()}`} style={{width:`${Math.max(4,(item.count/max)*100)}%`}}/></div><strong>{item.count}</strong><small>${item.value.toLocaleString()}</small></div>})}</div></section>
      <section className="panel"><div className="panel-head"><div><h2>Recent leads</h2><p>Latest movement in your pipeline.</p></div><Link to="/app/leads">View all</Link></div><div className="compact-list">{data.recentLeads.map(l=><div className="compact-item" key={l.id}><div className="avatar small">{l.name[0]}</div><div><strong>{l.name}</strong><span>{l.company||'No company'} · {l.owner?.name||'Unassigned'}</span></div><span className={`badge status ${l.status.toLowerCase()}`}>{statusLabel[l.status]}</span></div>)}</div></section>
    </div>
    <section className="panel"><div className="panel-head"><div><h2>Latest activity</h2><p>Server-side audit trail for important changes.</p></div><CheckCircle2 size={19}/></div><div className="activity-grid">{data.recentAudit.map(a=><div className="activity-item" key={a.id}><span className="activity-dot"/><div><strong>{a.action.replaceAll('.',' ')}</strong><p>{a.actor?.name||'System'} · {new Date(a.createdAt).toLocaleString()}</p></div></div>)}</div></section>
  </div>;
}

function Metric({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string|number;note?:string}){return <div className="metric-card"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</div></div>}
