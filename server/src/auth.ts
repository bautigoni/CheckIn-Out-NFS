import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { ADMIN_USER, ADMIN_PASSWORD, ADMIN_TOKEN_SALT } from './config';

/**
 * Derives a stateless session token from credentials + salt.
 * No DB / session store needed: the server can recompute and compare on each request.
 */
export function generateToken(user: string, pass: string): string {
  return crypto
    .createHash('sha256')
    .update(`${user}:${pass}:${ADMIN_TOKEN_SALT}`)
    .digest('hex');
}

const VALID_TOKEN = generateToken(ADMIN_USER, ADMIN_PASSWORD);

export function verifyCredentials(user: string, pass: string): boolean {
  return user === ADMIN_USER && pass === ADMIN_PASSWORD;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || token !== VALID_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
