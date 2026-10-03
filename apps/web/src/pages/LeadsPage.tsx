import { Edit3, Mail, Phone, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { useWorkspace } from '../context/WorkspaceContext';
import { api } from '../lib/api';
import type { Lead, LeadStatus, Member } from '../types';

const labels: Record<LeadStatus, string> = {
  NEW: 'New',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  LOST: 'Lost'
};

const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  source: '',
  notes: '',
  status: 'NEW' as LeadStatus,
  value: '0',
  ownerId: ''
};

export function LeadsPage() {
  const { activeOrg } = useWorkspace();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canDelete = Boolean(activeOrg && ['OWNER', 'ADMIN', 'MANAGER'].includes(activeOrg.role));

  async function load() {
    if (!activeOrg) return;
    const [leadData, memberData] = await Promise.all([
      api<{ leads: Lead[] }>('/leads', { orgId: activeOrg.id }),
      api<{ members: Member[] }>(`/orgs/${activeOrg.id}/members`)
    ]);
    setLeads(leadData.leads);
    setMembers(memberData.members);
  }

  useEffect(() => {
    void load();
  }, [activeOrg?.id]);

  const filtered = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (status === 'ALL' || lead.status === status) &&
          (!search || `${lead.name} ${lead.company || ''} ${lead.email || ''}`.toLowerCase().includes(search.toLowerCase()))
      ),
    [leads, search, status]
  );

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  }

  function startEdit(lead: Lead) {
    setEditing(lead);
    setForm({
      name: lead.name,
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || '',
      notes: lead.notes || '',
      status: lead.status,
      value: String(lead.value),
      ownerId: lead.ownerId || ''
    });
    setError('');
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activeOrg) return;
    setBusy(true);
    setError('');
    try {
      const payload = { ...form, value: Number(form.value || 0), ownerId: form.ownerId || null };
      if (editing) {
        await api(`/leads/${editing.id}`, { method: 'PATCH', orgId: activeOrg.id, body: JSON.stringify(payload) });
      } else {
        await api('/leads', { method: 'POST', orgId: activeOrg.id, body: JSON.stringify(payload) });
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(lead: Lead) {
    if (!activeOrg || !confirm(`Delete ${lead.name}?`)) return;
    try {
      await api(`/leads/${lead.id}`, { method: 'DELETE', orgId: activeOrg.id });
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="content-page">
      <div className="page-head">
        <div>
          <span className="eyebrow dark">Sales pipeline</span>
          <h1>Leads</h1>
          <p>Track prospects from first contact to closed business.</p>
        </div>
        <button className="btn primary" onClick={startCreate}><Plus size={17} />Add lead</button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={17} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company or email…" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All stages</option>
          {Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select>
      </div>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Lead</th><th>Stage</th><th>Owner</th><th>Source</th><th>Value</th><th /></tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div className="person-cell">
                      <div className="avatar small">{lead.name[0]}</div>
                      <div>
                        <strong>{lead.name}</strong>
                        <span>{lead.company || 'Independent'}</span>
                        <small>
                          {lead.email && <><Mail size={12} />{lead.email}</>}
                          {lead.phone && <><Phone size={12} />{lead.phone}</>}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge status ${lead.status.toLowerCase()}`}>{labels[lead.status as LeadStatus]}</span></td>
                  <td>{lead.owner?.name || <span className="muted">Unassigned</span>}</td>
                  <td>{lead.source || '—'}</td>
                  <td><strong>${lead.value.toLocaleString()}</strong></td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => startEdit(lead)} title="Edit"><Edit3 size={16} /></button>
                      {canDelete && <button className="icon-btn danger" onClick={() => remove(lead)} title="Delete"><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty-state"><UserRound size={30} /><h3>No leads found</h3><p>Adjust your filter or add a new prospect.</p></div>
        )}
      </section>

      <Modal open={open} title={editing ? 'Edit lead' : 'Add lead'} onClose={() => setOpen(false)}>
        <form className="modal-form" onSubmit={submit}>
          {error && <div className="alert error">{error}</div>}
          <div className="form-grid">
            <label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Company<input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Stage<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
            <label>Deal value<input type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label>
            <label>Source<input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Website, LinkedIn…" /></label>
            <label>Owner<select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}><option value="">Unassigned</option>{members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select></label>
          </div>
          <label>Notes<textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save lead'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
