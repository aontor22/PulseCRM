import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();
router.use(requireAuth, requireOrg());

router.get('/', async (req, res) => {
  const organizationId = req.org!.id;
  const canSeeAudit = ['OWNER', 'ADMIN', 'MANAGER'].includes(req.org!.role);
  const [leadCount, wonCount, openTasks, overdueTasks, pipeline, recentLeads, recentAudit] = await Promise.all([
    prisma.lead.count({ where: { organizationId } }),
    prisma.lead.count({ where: { organizationId, status: 'WON' } }),
    prisma.task.count({ where: { organizationId, status: { not: 'DONE' } } }),
    prisma.task.count({ where: { organizationId, status: { not: 'DONE' }, dueDate: { lt: new Date() } } }),
    prisma.lead.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true }, _sum: { value: true } }),
    prisma.lead.findMany({
      where: { organizationId },
      include: { owner: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5
    }),
    canSeeAudit
      ? prisma.auditLog.findMany({
          where: { organizationId },
          include: { actor: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 8
        })
      : Promise.resolve([])
  ]);

  const pipelineValue = pipeline.reduce((sum, row) => sum + (row._sum.value || 0), 0);
  res.json({
    metrics: { leadCount, wonCount, openTasks, overdueTasks, pipelineValue },
    pipeline: pipeline.map((row) => ({ status: row.status, count: row._count._all, value: row._sum.value || 0 })),
    recentLeads,
    recentAudit
  });
});

export default router;
