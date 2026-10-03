import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';

const router = Router();
router.use(requireAuth, requireOrg('MANAGER'));

router.get('/', async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: req.org!.id },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 150
  });
  res.json({ logs });
});

export default router;
