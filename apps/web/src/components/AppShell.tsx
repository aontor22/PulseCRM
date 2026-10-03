import { BarChart3, BriefcaseBusiness, ClipboardCheck, LogOut, Menu, ScrollText, Settings, Users, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';

const links = [
  { to: '/app', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/app/leads', label: 'Leads', icon: BriefcaseBusiness },
  { to: '/app/tasks', label: 'Tasks', icon: ClipboardCheck },
  { to: '/app/team', label: 'Team', icon: Users },
  { to: '/app/audit', label: 'Audit log', icon: ScrollText },
  { to: '/app/settings', label: 'Settings', icon: Settings }
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { organizations, activeOrg, select } = useWorkspace();
  const navigate = useNavigate();

  async function doLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand"><span className="brand-mark">P</span><div><strong>PulseCRM</strong><small>Revenue workspace</small></div></div>
        <button className="mobile-close icon-btn" onClick={() => setMobileOpen(false)}><X size={18}/></button>
        <div className="workspace-select-wrap">
          <label>Workspace</label>
          <select value={activeOrg?.id || ''} onChange={(e) => select(e.target.value)}>
            {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
          {activeOrg && <span className="role-pill">{activeOrg.role}</span>}
        </div>
        <nav className="side-nav">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon size={18}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">{user?.name?.slice(0, 1).toUpperCase()}</div>
          <div className="user-meta"><strong>{user?.name}</strong><small>{user?.email}</small></div>
          <button className="icon-btn" onClick={doLogout} title="Sign out"><LogOut size={18}/></button>
        </div>
      </aside>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      <main className="main-area">
        <header className="mobile-header"><button className="icon-btn" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><strong>PulseCRM</strong><span /></header>
        <Outlet />
      </main>
    </div>
  );
}
