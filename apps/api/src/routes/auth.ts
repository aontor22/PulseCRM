import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/config.js';
import { clearRefreshCookie, hashToken, newRefreshToken, refreshExpiry, setRefreshCookie, signAccessToken } from '../lib/security.js';
import { safeUser } from '../lib/utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const google = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

const credentialsSchema = z.object({
  email: z.string().email().max(200).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(80).optional()
});

function requestMeta(req: Request) {
  return {
    userAgent: String(req.headers['user-agent'] || '').slice(0, 500) || null,
    ipAddress: String(req.ip || '').slice(0, 100) || null
  };
}


function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');
  if (origin && origin !== env.WEB_ORIGIN) {
    res.status(403).json({ message: 'Untrusted request origin' });
    return;
  }
  next();
}

async function createSession(userId: string, req: Request, res: Response) {
  const refreshToken = newRefreshToken();
  const meta = requestMeta(req);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiry(),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress
    }
  });
  setRefreshCookie(res, refreshToken);
}

router.post('/register', async (req, res) => {
  const body = credentialsSchema.extend({ name: z.string().min(2).max(80) }).parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: { email: body.email, name: body.name, passwordHash }
  });
  await createSession(user.id, req, res);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  res.status(201).json({ accessToken, user: safeUser(user) });
});

router.post('/login', async (req, res) => {
  const body = credentialsSchema.omit({ name: true }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user?.passwordHash || !(await bcrypt.compare(body.password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  await createSession(user.id, req, res);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  res.json({ accessToken, user: safeUser(user) });
});

router.post('/google', async (req, res) => {
  if (!google || !env.GOOGLE_CLIENT_ID) return res.status(503).json({ message: 'Google sign-in is not configured on the server' });
  const { credential } = z.object({ credential: z.string().min(20) }).parse(req.body);
  const ticket = await google.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    return res.status(401).json({ message: 'Google account could not be verified' });
  }

  const email = payload.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    if (user.googleSub && user.googleSub !== payload.sub) {
      return res.status(409).json({ message: 'This email is already linked to a different Google identity' });
    }
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleSub: user.googleSub || payload.sub, avatarUrl: user.avatarUrl || payload.picture }
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        name: payload.name || email.split('@')[0],
        avatarUrl: payload.picture,
        googleSub: payload.sub
      }
    });
  }

  await createSession(user.id, req, res);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  res.json({ accessToken, user: safeUser(user) });
});

router.post('/refresh', requireTrustedOrigin, async (req, res) => {
  const token = req.cookies?.crm_refresh;
  if (!token) return res.status(401).json({ message: 'No active session' });

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true }
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: 'Session expired' });
  }

  const rotated = newRefreshToken();
  const meta = requestMeta(req);
  await prisma.session.update({
    where: { id: session.id },
    data: {
      tokenHash: hashToken(rotated),
      expiresAt: refreshExpiry(),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress
    }
  });
  setRefreshCookie(res, rotated);

  const accessToken = signAccessToken({ sub: session.user.id, email: session.user.email, name: session.user.name });
  res.json({ accessToken, user: safeUser(session.user) });
});

router.post('/logout', requireTrustedOrigin, async (req, res) => {
  const token = req.cookies?.crm_refresh;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
  clearRefreshCookie(res);
  res.status(204).send();
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: safeUser(user) });
});

export default router;
