import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/security.js';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      org?: {
        id: string;
        membershipId: string;
        role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });

  try {
    const claims = verifyAccessToken(header.slice(7));
    const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { id: true, email: true, name: true } });
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Access token is invalid or expired' });
  }
}
