import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const rank = { MEMBER: 1, MANAGER: 2, ADMIN: 3, OWNER: 4 } as const;

type Role = keyof typeof rank;

export function requireOrg(minimumRole: Role = 'MEMBER') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const organizationId = String(req.header('x-organization-id') || '');
    if (!organizationId) return res.status(400).json({ message: 'x-organization-id header is required' });

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: req.user.id, organizationId } }
    });
    if (!membership) return res.status(403).json({ message: 'You do not belong to this workspace' });
    if (rank[membership.role] < rank[minimumRole]) return res.status(403).json({ message: 'Insufficient workspace permission' });

    req.org = { id: organizationId, membershipId: membership.id, role: membership.role };
    next();
  };
}
