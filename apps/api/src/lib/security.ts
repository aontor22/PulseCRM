import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from './config.js';

export type AccessClaims = {
  sub: string;
  email: string;
  name: string;
};

export function signAccessToken(payload: AccessClaims) {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'saas-crm-pro',
    audience: 'saas-crm-web'
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    algorithms: ['HS256'],
    issuer: 'saas-crm-pro',
    audience: 'saas-crm-web'
  }) as jwt.JwtPayload & AccessClaims;
}

export function newRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry() {
  return new Date(Date.now() + env.REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie('crm_refresh', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE === 'true',
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: env.REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth'
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie('crm_refresh', {
    httpOnly: true,
    secure: env.COOKIE_SECURE === 'true',
    sameSite: env.COOKIE_SAME_SITE,
    path: '/api/auth'
  });
}
