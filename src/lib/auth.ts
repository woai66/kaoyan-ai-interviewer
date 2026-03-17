import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE_NAME = 'mianshi_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export interface SessionUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function isValidPassword(password: string) {
  return password.length >= 8 && /\d/.test(password);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, 'hex');

  if (derived.length !== original.length) {
    return false;
  }

  return timingSafeEqual(derived, original);
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  const role = await ensureAdminRole(session.user.id, session.user.email, session.user.role);
  return {
    ...session.user,
    role,
  };
}

export async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function isCurrentUserAdmin() {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function destroySession() {
  const token = await getSessionToken();
  const cookieStore = await cookies();

  if (token) {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getRoleForNewUser(email: string) {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || '');
  if (adminEmail && normalizeEmail(email) === adminEmail) {
    return 'admin';
  }

  const adminCount = await prisma.user.count({
    where: { role: 'admin' },
  });

  return adminCount === 0 ? 'admin' : 'user';
}

export async function ensureAdminRole(userId: number, email: string, currentRole: string) {
  if (currentRole === 'admin') {
    return currentRole;
  }

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || '');
  const adminCount = await prisma.user.count({
    where: { role: 'admin' },
  });

  if (adminCount > 0) {
    return currentRole;
  }

  const shouldPromote = adminEmail
    ? normalizeEmail(email) === adminEmail
    : true;

  if (!shouldPromote) {
    return currentRole;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: 'admin' },
    select: { role: true },
  });

  return updated.role;
}
