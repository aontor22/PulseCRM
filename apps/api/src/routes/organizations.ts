import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { randomCode, slugify } from '../lib/utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const roleRank = { MEMBER: 1, MANAGER: 2, ADMIN: 3, OWNER: 4 } as const;

async function membershipFor(userId: string, organizationId: string) {
  return prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
}

router.get('/', async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user!.id },
    include: { organization: true },
    orderBy: { createdAt: 'asc' }
  });
  res.json({
    organizations: memberships.map((m) => {
      const { inviteCode, ...organization } = m.organization;
      return {
        ...organization,
        ...(m.role === 'OWNER' || m.role === 'ADMIN' ? { inviteCode } : {}),
        role: m.role,
        membershipId: m.id
      };
    })
  });
});

router.post('/', async (req, res) => {
  const { name } = z.object({ name: z.string().min(2).max(80) }).parse(req.body);
  const base = slugify(name) || 'workspace';
  const slug = `${base}-${randomCode(5).toLowerCase()}`;
  const inviteCode = randomCode(10);

  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      inviteCode,
      memberships: { create: { userId: req.user!.id, role: 'OWNER' } }
    }
  });
  await audit({ organizationId: organization.id, actorId: req.user!.id, action: 'workspace.created', entityType: 'organization', entityId: organization.id });
  res.status(201).json({ organization: { ...organization, role: 'OWNER' } });
});

router.post('/join', async (req, res) => {
  const { inviteCode } = z.object({ inviteCode: z.string().min(5).max(30).transform((v) => v.toUpperCase().trim()) }).parse(req.body);
  const organization = await prisma.organization.findUnique({ where: { inviteCode } });
  if (!organization) return res.status(404).json({ message: 'Invite code is invalid' });

  const existing = await membershipFor(req.user!.id, organization.id);
  if (existing) return res.status(409).json({ message: 'You already belong to this workspace' });

  await prisma.membership.create({ data: { userId: req.user!.id, organizationId: organization.id, role: 'MEMBER' } });
  await audit({ organizationId: organization.id, actorId: req.user!.id, action: 'member.joined', entityType: 'membership', metadata: { via: 'invite_code' } });
  const { inviteCode: _inviteCode, ...safeOrganization } = organization;
  res.status(201).json({ organization: { ...safeOrganization, role: 'MEMBER' } });
});

router.get('/:id/members', async (req, res) => {
  const mine = await membershipFor(req.user!.id, req.params.id);
  if (!mine) return res.status(403).json({ message: 'Workspace access denied' });
  const members = await prisma.membership.findMany({
    where: { organizationId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } } },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
  });
  res.json({ members });
});

router.patch('/:id', async (req, res) => {
  const mine = await membershipFor(req.user!.id, req.params.id);
  if (!mine || roleRank[mine.role] < roleRank.ADMIN) return res.status(403).json({ message: 'Admin permission required' });
  const { name } = z.object({ name: z.string().min(2).max(80) }).parse(req.body);
  const organization = await prisma.organization.update({ where: { id: req.params.id }, data: { name } });
  await audit({ organizationId: organization.id, actorId: req.user!.id, action: 'workspace.updated', entityType: 'organization', entityId: organization.id, metadata: { name } });
  res.json({ organization });
});

router.post('/:id/rotate-invite', async (req, res) => {
  const mine = await membershipFor(req.user!.id, req.params.id);
  if (!mine || roleRank[mine.role] < roleRank.ADMIN) return res.status(403).json({ message: 'Admin permission required' });
  const organization = await prisma.organization.update({ where: { id: req.params.id }, data: { inviteCode: randomCode(10) } });
  await audit({ organizationId: organization.id, actorId: req.user!.id, action: 'workspace.invite_rotated', entityType: 'organization', entityId: organization.id });
  res.json({ inviteCode: organization.inviteCode });
});

router.patch('/:id/members/:membershipId', async (req, res) => {
  const mine = await membershipFor(req.user!.id, req.params.id);
  if (!mine || roleRank[mine.role] < roleRank.ADMIN) return res.status(403).json({ message: 'Admin permission required' });
  const { role } = z.object({ role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']) }).parse(req.body);
  const target = await prisma.membership.findFirst({ where: { id: req.params.membershipId, organizationId: req.params.id } });
  if (!target) return res.status(404).json({ message: 'Member not found' });
  if (target.role === 'OWNER') return res.status(400).json({ message: 'Owner role cannot be changed here' });
  if (mine.role !== 'OWNER' && (target.role === 'ADMIN' || role === 'ADMIN')) return res.status(403).json({ message: 'Only owner can manage admin roles' });

  const updated = await prisma.membership.update({ where: { id: target.id }, data: { role } });
  await audit({ organizationId: req.params.id, actorId: req.user!.id, action: 'member.role_changed', entityType: 'membership', entityId: target.id, metadata: { role } });
  res.json({ membership: updated });
});

router.delete('/:id/members/:membershipId', async (req, res) => {
  const mine = await membershipFor(req.user!.id, req.params.id);
  if (!mine || roleRank[mine.role] < roleRank.ADMIN) return res.status(403).json({ message: 'Admin permission required' });
  const target = await prisma.membership.findFirst({ where: { id: req.params.membershipId, organizationId: req.params.id } });
  if (!target) return res.status(404).json({ message: 'Member not found' });
  if (target.role === 'OWNER') return res.status(400).json({ message: 'Workspace owner cannot be removed' });
  if (target.role === 'ADMIN' && mine.role !== 'OWNER') return res.status(403).json({ message: 'Only owner can remove an admin' });
  await prisma.membership.delete({ where: { id: target.id } });
  await audit({ organizationId: req.params.id, actorId: req.user!.id, action: 'member.removed', entityType: 'membership', entityId: target.id });
  res.status(204).send();
});

export default router;
