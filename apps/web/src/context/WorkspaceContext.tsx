import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import type { Organization } from '../types';

type WorkspaceContextValue = {
  organizations: Organization[];
  activeOrg: Organization | null;
  loading: boolean;
  refresh: () => Promise<Organization[]>;
  select: (id: string) => void;
  create: (name: string) => Promise<Organization>;
  join: (inviteCode: string) => Promise<Organization>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);

  const select = useCallback((id: string) => {
    const org = organizations.find((item) => item.id === id);
    if (org) {
      setActiveOrg(org);
      localStorage.setItem('crm_active_org', org.id);
    }
  }, [organizations]);

  const refresh = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setActiveOrg(null);
      return [];
    }
    setLoading(true);
    try {
      const data = await api<{ organizations: Organization[] }>('/orgs');
      setOrganizations(data.organizations);
      const savedId = localStorage.getItem('crm_active_org');
      const next = data.organizations.find((org) => org.id === savedId) || data.organizations[0] || null;
      setActiveOrg(next);
      if (next) localStorage.setItem('crm_active_org', next.id);
      return data.organizations;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function create(name: string) {
    const data = await api<{ organization: Organization }>('/orgs', { method: 'POST', body: JSON.stringify({ name }) });
    await refresh();
    localStorage.setItem('crm_active_org', data.organization.id);
    setActiveOrg(data.organization);
    return data.organization;
  }

  async function join(inviteCode: string) {
    const data = await api<{ organization: Organization }>('/orgs/join', { method: 'POST', body: JSON.stringify({ inviteCode }) });
    await refresh();
    localStorage.setItem('crm_active_org', data.organization.id);
    setActiveOrg(data.organization);
    return data.organization;
  }

  const value = useMemo(() => ({ organizations, activeOrg, loading, refresh, select, create, join }), [organizations, activeOrg, loading, refresh, select]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return value;
}
