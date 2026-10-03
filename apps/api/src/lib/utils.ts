import crypto from 'node:crypto';

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function randomCode(length = 8) {
  return crypto.randomBytes(16).toString('base64url').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, length);
}

export function safeUser<T extends { passwordHash?: unknown; googleSub?: unknown }>(user: T) {
  const { passwordHash: _passwordHash, googleSub: _googleSub, ...safe } = user;
  return safe;
}
