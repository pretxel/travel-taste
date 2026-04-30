import { VIEWER_COOKIE_MAX_AGE, OWNER_COOKIE_MAX_AGE } from '@/lib/constants';

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
}

const isProd = () => process.env.NODE_ENV === 'production';

export function viewerCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: VIEWER_COOKIE_MAX_AGE,
  };
}

export function ownerCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict',
    path: '/',
    maxAge: OWNER_COOKIE_MAX_AGE,
  };
}

export function expiredCookieOptions(): CookieOptions {
  return { httpOnly: true, secure: isProd(), path: '/', maxAge: 0 };
}
