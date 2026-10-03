import { describe, expect, it } from 'vitest';
import { hashToken, newRefreshToken } from './security.js';

describe('refresh token helpers', () => {
  it('creates unpredictable tokens and deterministic hashes', () => {
    const a = newRefreshToken();
    const b = newRefreshToken();
    expect(a).not.toBe(b);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(hashToken(b));
  });
});
