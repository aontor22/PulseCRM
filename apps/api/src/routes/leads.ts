import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();
router.use(requireAuth, requireOrg());

const leadInput = z.object({
  name: z.string().min(2).max(100),
  company: z.string().max(120).optional().nullable(),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  source: z.string().max(80).optional().nullable(),
  notes: z.string().max(3000).optional().nullable(),
  status: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).default('NEW'),
  value: z.coerce.number().min(0).max(1_000_000_000).default(0),
  ownerId: z.string().min(10).max(60).optional().nullable()
});

async function validMember(userId: string | null | undefined, organizationId: string) {
  if (!userId) return true;
  return Boolean(await prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId } } }));
}

router.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' && ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'].includes(req.query.status) ? req.query.status as any : undefined;
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: req.org!.id,
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { company: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {})
    },
    include: { owner: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: 'desc' }
  });
  res.json({ leads });
});

router.post('/', async (req, res) => {
  const body = leadInput.parse(req.body);
  if (!(await validMember(body.ownerId, req.org!.id))) return res.status(422).json({ message: 'Selected owner is not a workspace member' });
  const lead = await prisma.lead.create({
    data: { ...body, email: body.email || null, organizationId: req.org!.id, createdById: req.user!.id },
    include: { owner: { select: { id: true, name: true, email: true } } }
  });
  await audit({ organizationId: req.org!.id, actorId: req.user!.id, action: 'lead.created', entityType: 'lead', entityId: lead.id, metadata: { status: lead.status } });
  res.status(201).json({ lead });
});

router.patch('/:id', async (req, res) => {
  const body = leadInput.partial().parse(req.body);
  const existing = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
  if (!existing) return res.status(404).json({ message: 'Lead not found' });
  if (body.ownerId !== undefined && !(await validMember(body.ownerId, req.org!.id))) return res.status(422).json({ message: 'Selected owner is not a workspace member' });
  const lead = await prisma.lead.update({ where: { id: existing.id }, data: { ...body, email: body.email === '' ? null : body.email }, include: { owner: { select: { id: true, name: true, email: true } } } });
  await audit({ organizationId: req.org!.id, actorId: req.user!.id, action: 'lead.updated', entityType: 'lead', entityId: lead.id, metadata: { fields: Object.keys(body) } });
  res.json({ lead });
});

router.delete('/:id', requireOrg('MANAGER'), async (req, res) => {
  const existing = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
  if (!existing) return res.status(404).json({ message: 'Lead not found' });
  await prisma.lead.delete({ where: { id: existing.id } });
  await audit({ organizationId: req.org!.id, actorId: req.user!.id, action: 'lead.deleted', entityType: 'lead', entityId: existing.id });
  res.status(204).send();
});

export default router;
