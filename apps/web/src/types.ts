export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
export type User = { id: string; name: string; email: string; avatarUrl?: string | null };
export type Organization = { id: string; name: string; slug: string; inviteCode?: string; role: Role; membershipId?: string };
export type Member = { id: string; role: Role; user: User & { createdAt?: string } };
export type LeadStatus = 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
export type Lead = {
  id: string; name: string; company?: string | null; email?: string | null; phone?: string | null;
  source?: string | null; notes?: string | null; status: LeadStatus; value: number;
  ownerId?: string | null; owner?: Pick<User, 'id' | 'name' | 'email'> | null; createdAt: string; updatedAt: string;
};
export type Task = {
  id: string; title: string; description?: string | null; status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH'; dueDate?: string | null; assigneeId?: string | null; leadId?: string | null;
  assignee?: Pick<User, 'id' | 'name' | 'email'> | null; lead?: Pick<Lead, 'id' | 'name' | 'company'> | null;
};
