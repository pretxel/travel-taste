import { SignJWT, jwtVerify } from 'jose';
import { JWT_ISSUER, OWNER_COOKIE_MAX_AGE } from '@/lib/constants';

export interface OwnerClaims {
  role: 'owner';
}

function getSecret(): Uint8Array {
  const secret = process.env.OWNER_JWT_SECRET;
  if (!secret) {
    throw new Error('OWNER_JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signOwnerJwt(opts: { expiresInSec?: number } = {}): Promise<string> {
  const expSec = opts.expiresInSec ?? OWNER_COOKIE_MAX_AGE;
  return new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setSubject('owner')
    .setIssuedAt()
    .setExpirationTime(`${expSec}s`)
    .sign(getSecret());
}

export async function verifyOwnerJwt(token: string): Promise<OwnerClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: JWT_ISSUER,
    subject: 'owner',
  });
  if (payload.role !== 'owner') throw new Error('not owner');
  return { role: 'owner' };
}
