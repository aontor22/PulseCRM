import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { audit } from '../lib/audit.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();
router.use(requireAuth, requireOrg());

const taskInput = z.object({
  title: z.string().min(2).max(150),
  description: z.string().max(3000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().min(10).max(60).optional().nullable(),
  leadId: z.string().min(10).max(60).optional().nullable()
});

router.get('/', async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { organizationId: req.org!.id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, name: true, company: true } }
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }]
  });
  res.json({ tasks });
});

async function checkRelations(organizationId: string, assigneeId?: string | null, leadId?: string | null) {
  if (assigneeId) {
    const member = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: assigneeId, organizationId } } });
    if (!member) return 'Selected assignee is not a workspace member';
  }
  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) return 'Selected lead is not in this workspace';
  }
  return null;
}

router.post('/', async (req, res) => {
  const body = taskInput.parse(req.body);
  const relationError = await checkRelations(req.org!.id, body.assigneeId, body.leadId);
  if (relationError) return res.status(422).json({ message: relationError });
  const task = await prisma.task.create({
    data: {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      organizationId: req.org!.id,
      createdById: req.user!.id
    },
    include: { assignee: { select: { id: true, name: true, email: true } }, lead: { select: { id: true, name: true, company: true } } }
  });
  await audit({ organizationId: req.org!.id, actorId: req.user!.id, action: 'task.created', entityType: 'task', entityId: task.id, metadata: { priority: task.priority } });
  res.status(201).json({ task });
});

router.patch('/:id', async (req, res) => {
  const body = taskInput.partial().parse(req.body);
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
  if (!existing) return res.status(404).json({ message: 'Task not found' });
  const relationError = await checkRelations(req.org!.id, body.assigneeId, body.leadId);
  if (relationError) return res.status(422).json({ message: relationError });
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: { ...body, ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}) },
    include: { assignee: { select: { id: true, name: true, email: true } }, lead: { select: { id: true, name: true, company: true } } }
  });
  await audit({ organizationId: req.org!.id, actorId: req.user!.id, action: 'task.updated', entityType: 'task', entityId: task.id, metadata: { fields: Object.keys(body) } });
  res.json({ task });
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.task.findFirst({ where: { id: req.params.id, organizationId: req.org!.id } });
  if (!existing) return res.status(404).json({ message: 'Task not found' });
  await prisma.task.delete({ where: { id: existing.id } });
  await audit({ organizationId: req.org!.id, actorId: req.user!.id, action: 'task.deleted', entityType: 'task', entityId: existing.id });
  res.status(204).send();
});

export default router;
