import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db, toPlain } from './db';

const SECRET = process.env.JWT_SECRET || 'igleico-distrito-sabana-dev-secret-2026';

export type UserRole =
  | 'ADMIN_DISTRITO'
  | 'PASTOR_LOCAL'
  | 'TESORERO_LOCAL'
  | 'SECRETARIO_LOCAL';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  church_id: number | null;
  church_name?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function signToken(payload: Record<string, unknown>, expiresInSec = 60 * 60 * 24 * 7): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const body = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest();
  return `${header}.${body}.${base64UrlEncode(sig)}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = base64UrlEncode(
    crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest()
  );
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as Record<string, unknown>;
    if (typeof parsed.exp === 'number' && parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Sesión requerida. Inicia sesión para continuar.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload || typeof payload.userId !== 'number') {
    res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión nuevamente.' });
    return;
  }

  const row = db
    .prepare(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.church_id, u.is_active, c.name AS church_name
       FROM users u
       LEFT JOIN churches c ON c.id = u.church_id
       WHERE u.id = ?`
    )
    .get(payload.userId);

  if (!row) {
    res.status(401).json({ error: 'Usuario no encontrado.' });
    return;
  }
  const user = toPlain<AuthUser & { is_active: number }>(row);
  if (!user.is_active) {
    res.status(403).json({ error: 'Tu usuario está inactivo. Contacta a la directiva del Distrito.' });
    return;
  }

  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    church_id: user.church_id,
    church_name: user.church_name ?? null,
  };
  next();
}

export function requireDistrictAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN_DISTRITO') {
    res.status(403).json({ error: 'Solo la directiva del Distrito Sabana puede realizar esta acción.' });
    return;
  }
  next();
}

export function resolveChurchScope(req: Request, requestedChurchId?: unknown): number | null {
  if (!req.user) return null;
  if (req.user.role !== 'ADMIN_DISTRITO') {
    return req.user.church_id;
  }
  if (requestedChurchId !== undefined && requestedChurchId !== null && requestedChurchId !== '' && requestedChurchId !== 'all') {
    const n = Number(requestedChurchId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export function canAccessChurch(user: AuthUser, churchId: number | null | undefined): boolean {
  if (user.role === 'ADMIN_DISTRITO') return true;
  if (!churchId || !user.church_id) return false;
  return Number(user.church_id) === Number(churchId);
}
