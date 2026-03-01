import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { env } from './env';

const SESSION_COOKIE_NAME = 'portal_session';
const FOURTEEN_DAYS_SECONDS = 60 * 60 * 24 * 14;

export type PortalSessionPayload = {
  tenantId: string;
  customerId: string;
  email: string;
  expiresAt: string;
};

function sign(input: string) {
  return createHmac('sha256', env.portalSessionSecret).update(input).digest('hex');
}

function encode(payload: PortalSessionPayload) {
  const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${base}.${sign(base)}`;
}

export function verifyPortalSessionToken(raw: string): PortalSessionPayload | null {
  const [base, signature] = raw.split('.');
  if (!base || !signature) return null;

  const expected = sign(base);
  const provided = Buffer.from(signature);
  const exp = Buffer.from(expected);
  if (provided.length !== exp.length) return null;
  const sigOk = timingSafeEqual(provided, exp);
  if (!sigOk) return null;

  const payload = JSON.parse(Buffer.from(base, 'base64url').toString('utf8')) as PortalSessionPayload;
  if (new Date(payload.expiresAt).getTime() <= Date.now()) return null;
  return payload;
}

export function tokenHash(token: string) {
  return createHmac('sha256', env.portalSessionSecret).update(token).digest('hex');
}

export function createRawMagicToken() {
  return randomBytes(32).toString('base64url');
}

export function buildPortalSession(payload: Omit<PortalSessionPayload, 'expiresAt'>, tokenExpiresAt: Date) {
  const maxSessionExpiry = new Date(Date.now() + FOURTEEN_DAYS_SECONDS * 1000);
  const expiresAt = tokenExpiresAt < maxSessionExpiry ? tokenExpiresAt : maxSessionExpiry;

  return {
    value: encode({ ...payload, expiresAt: expiresAt.toISOString() }),
    expiresAt
  };
}

export function setPortalSessionCookie(payload: Omit<PortalSessionPayload, 'expiresAt'>, tokenExpiresAt: Date) {
  const session = buildPortalSession(payload, tokenExpiresAt);
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: session.value,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: session.expiresAt
  });
}

export function clearPortalSessionCookie() {
  cookies().set({ name: SESSION_COOKIE_NAME, value: '', httpOnly: true, secure: true, path: '/', maxAge: 0 });
}

export function getPortalSession() {
  const raw = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifyPortalSessionToken(raw);
}

export type MagicLinkRecord = {
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
};

export function isMagicLinkValid(record: MagicLinkRecord, rawToken: string, now = new Date()) {
  if (record.revoked_at) return false;
  if (new Date(record.expires_at).getTime() <= now.getTime()) return false;
  return tokenHash(rawToken) === record.token_hash;
}
