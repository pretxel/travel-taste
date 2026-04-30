import { SignJWT, jwtVerify } from 'jose';
import { JWT_ISSUER, VIEWER_COOKIE_MAX_AGE } from '@/lib/constants';

export interface ViewerClaims {
  viewer_code_id: string;
  label: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.VIEWER_JWT_SECRET;
  if (!secret) {
    throw new Error('VIEWER_JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signViewerJwt(
  claims: ViewerClaims,
  opts: { expiresInSec?: number } = {}
): Promise<string> {
  const expSec = opts.expiresInSec ?? VIEWER_COOKIE_MAX_AGE;
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${expSec}s`)
    .sign(getSecret());
}

export async function verifyViewerJwt(token: string): Promise<ViewerClaims> {
  const { payload } = await jwtVerify(token, getSecret(), { issuer: JWT_ISSUER });
  return {
    viewer_code_id: String(payload.viewer_code_id),
    label: String(payload.label ?? ''),
  };
}
